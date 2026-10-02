// Chat onde os botões "prox" e ✅ enviam as mensagens (Rocket.Chat da Oquei)
const CHAT_URL_PATTERN = "https://chat.oquei.com.br/*";
const GRUPO_CHAT = "rodizio_ligacoes_callcenter_tarde";

async function runFlow(grupo, msg, tag) {
  grupo = grupo || GRUPO_CHAT;
  const tabs = await chrome.tabs.query({ url: CHAT_URL_PATTERN });
  if (!tabs.length) {
    console.error("[" + tag + "] chat.oquei.com.br não está aberto em nenhuma aba");
    return { ok: false, error: "Abra o chat.oquei.com.br em uma aba." };
  }
  // Prefere a aba que está ativa na janela atual; senão, a primeira encontrada.
  const tab = tabs.find((t) => t.active) || tabs[0];
  // Não troca de aba nem foca a janela: o envio roda na aba do chat
  // mesmo que o usuário continue em outra aba/janela.
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: sendChatMessage,
      args: [grupo, msg, tag]
    });
  } catch (e) {
    console.error("[" + tag + "] erro ao injetar:", e);
    return { ok: false, error: "Não foi possível rodar na aba do chat (" + e.message + ")." };
  }
  return { ok: true };
}

// Esta função é injetada na página do chat (mundo MAIN): abre a conversa
// pelo nome na barra lateral, escreve a mensagem e envia.
function sendChatMessage(GRUPO, MSG, TAG) {
  try {
    var key = "__chatEnviadoEm_" + TAG;
    if (window[key] && Date.now() - window[key] < 5000) {
      console.warn("[" + TAG + "] Enviado ha menos de 5s, ignorando.");
      return;
    }

    var norm = function (s) { return (s || "").trim().toLowerCase(); };
    var alvo = norm(GRUPO);

    var fire = function (el, type) {
      var r = el.getBoundingClientRect();
      var Ev = type.indexOf("pointer") === 0 ? PointerEvent : MouseEvent;
      el.dispatchEvent(new Ev(type, {
        bubbles: true, cancelable: true, composed: true, view: window,
        pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0,
        buttons: (type === "pointerup" || type === "mouseup") ? 0 : 1,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
      }));
    };

    var esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    // A conversa já está aberta? (URL termina com /channel/<nome> ou /group/<nome>)
    var conversaAberta = function () {
      var path = "";
      try { path = decodeURIComponent(location.pathname).toLowerCase(); } catch (e) { path = location.pathname.toLowerCase(); }
      var partes = path.split("/").filter(Boolean);
      return partes.length >= 2 && partes[partes.length - 1] === alvo;
    };

    var achaItemSidebar = function () {
      var titulos = [].slice.call(document.querySelectorAll('[data-qa="sidebar-item-title"]'));
      var t = titulos.find(function (el) { return norm(el.textContent) === alvo; });
      if (!t) return null;
      return t.closest("a") || t.closest('[data-qa="sidebar-item"]') || t.closest('[role="listitem"]') || t;
    };

    var abrirConversa = function () {
      return new Promise(function (resolve, reject) {
        if (conversaAberta()) { resolve(); return; }
        var t0 = Date.now();
        var clicou = false;
        var check = function () {
          if (conversaAberta()) { resolve(); return; }
          if (!clicou) {
            var item = achaItemSidebar();
            if (item) {
              clicou = true;
              ["pointerover", "mouseover", "pointerdown", "mousedown", "pointerup", "mouseup", "click"]
                .forEach(function (t) { fire(item, t); });
              if (item.click) item.click();
            }
          }
          if (Date.now() - t0 > 12000) {
            var lista = [].slice.call(document.querySelectorAll('[data-qa="sidebar-item-title"]'))
              .map(function (s) { return s.textContent; });
            console.log("[" + TAG + "] Conversas visiveis:", lista);
            reject(clicou ? "nao consegui confirmar que a conversa abriu: " + GRUPO
                          : "conversa nao encontrada na barra lateral: " + GRUPO);
          } else {
            setTimeout(check, 300);
          }
        };
        check();
      });
    };

    var SELETORES_CAIXA = [
      "textarea.rc-message-box__textarea",
      'textarea[name="msg"]',
      ".rc-message-box textarea",
      "footer textarea",
      "textarea"
    ];

    var achaCaixa = function () {
      for (var i = 0; i < SELETORES_CAIXA.length; i++) {
        var lista = [].slice.call(document.querySelectorAll(SELETORES_CAIXA[i]));
        // ignora o campo de resposta em thread, se existir
        var box = lista.find(function (el) { return el.offsetParent !== null && !el.closest(".rcx-vertical-bar, [data-qa-id='thread']"); });
        if (box) return box;
      }
      return null;
    };

    var esperaCaixa = function () {
      return new Promise(function (resolve, reject) {
        var t0 = Date.now();
        var check = function () {
          var box = achaCaixa();
          if (box) { box.focus(); resolve(box); }
          else if (Date.now() - t0 > 8000) { reject("campo de mensagem nao apareceu"); }
          else { setTimeout(check, 200); }
        };
        check();
      });
    };

    var achaBotaoEnviar = function (box) {
      var raiz = box.closest(".rc-message-box, footer, form") || document;
      return raiz.querySelector(".js-send, button.rc-message-box__icon.js-send") ||
        raiz.querySelector('button[aria-label="Send"], button[aria-label="Enviar"], button[title="Send"], button[title="Enviar"]') ||
        raiz.querySelector('[data-qa-id="send"], [data-qa="message-composer-send"]');
    };

    var apertaEnter = function (box) {
      box.focus();
      ["keydown", "keypress", "keyup"].forEach(function (t) {
        box.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      });
    };

    var enviar = function () {
      return esperaCaixa().then(function (box) {
        // setter nativo: faz o React do Rocket.Chat perceber o novo valor
        var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setter.call(box, MSG);
        box.dispatchEvent(new Event("input", { bubbles: true }));

        return esperar(350).then(function () {
          var btn = achaBotaoEnviar(box);
          var how;
          if (btn) {
            ["pointerdown", "mousedown", "pointerup", "mouseup"].forEach(function (t) { fire(btn, t); });
            btn.click();
            how = "clique no botao enviar";
          } else {
            apertaEnter(box);
            how = "Enter";
          }
          return esperar(900).then(function () {
            // Se o texto ainda está lá, o envio não aconteceu: tenta Enter.
            var atual = achaCaixa();
            if (atual && atual.value && atual.value.indexOf(MSG) !== -1 && how !== "Enter") {
              apertaEnter(atual);
              how += " + Enter";
            }
            return how;
          });
        });
      });
    };

    console.log("[" + TAG + "] Iniciando. Conversa alvo: " + GRUPO);
    window[key] = Date.now();

    abrirConversa()
      .then(function () { return esperar(500); })
      .then(enviar)
      .then(function (m) { console.log("[" + TAG + "] OK: mensagem enviada (" + m + ")"); })
      .catch(function (e) {
        window[key] = 0;
        console.error("[" + TAG + "] Falha:", e);
      });

  } catch (e) {
    console.error("[" + TAG + "] Erro:", e);
  }
}

async function runQuickReplyMenu() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    console.error("[quickreply] Nenhuma aba ativa encontrada");
    return { ok: false, error: "Nenhuma aba ativa encontrada." };
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["quickreply.js"],
      world: "MAIN"
    });
  } catch (e) {
    console.error("[quickreply] erro ao injetar:", e);
    return { ok: false, error: "Não foi possível rodar nesta aba (" + e.message + ")." };
  }
  return { ok: true };
}

async function runHuaweiConfig() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    console.error("[huawei] Nenhuma aba ativa encontrada");
    return { ok: false, error: "Nenhuma aba ativa encontrada." };
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["huaweiconfig.js"],
      world: "MAIN"
    });
  } catch (e) {
    console.error("[huawei] erro ao injetar:", e);
    return { ok: false, error: "Não foi possível rodar nesta aba (" + e.message + ")." };
  }
  return { ok: true };
}

// Atalhos de teclado continuam funcionando (Alt+Shift+P e Alt+Shift+O)
chrome.commands.onCommand.addListener((command) => {
  if (command === "send-prox") {
    runFlow(GRUPO_CHAT, "prox", "prox");
  } else if (command === "send-check") {
    runFlow(GRUPO_CHAT, "\u2705", "check");
  }
});

// Mensagens vindas do popup (os 2 botões)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "runFlow") {
    runFlow(message.grupo, message.msg, message.tag).then(sendResponse);
    return true; // resposta assíncrona
  }
  if (message && message.type === "runQuickReplyMenu") {
    runQuickReplyMenu().then(sendResponse);
    return true; // resposta assíncrona
  }
  if (message && message.type === "runHuaweiConfig") {
    runHuaweiConfig().then(sendResponse);
    return true; // resposta assíncrona
  }
});

// Popula a lista de snippets com o padrão da empresa na primeira vez que a
// extensão é instalada/atualizada — só se o usuário ainda não tiver nenhum
// snippet salvo, para nunca sobrescrever uma lista já personalizada.
const SNIPPETS_STORAGE_KEY = "ccTools_snippets";

function gerarIdSnippet() {
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

async function semearSnippetsPadrao() {
  try {
    const atual = await chrome.storage.local.get([SNIPPETS_STORAGE_KEY]);
    const jaTemSnippets = Array.isArray(atual[SNIPPETS_STORAGE_KEY]) && atual[SNIPPETS_STORAGE_KEY].length > 0;
    if (jaTemSnippets) return;

    const resp = await fetch(chrome.runtime.getURL("assets/snippets-padrao.json"));
    const dados = await resp.json();
    const comIds = dados.map((item) => ({
      id: gerarIdSnippet(),
      atalho: item.atalho,
      titulo: item.titulo || "",
      conteudo: item.conteudo || ""
    }));
    await chrome.storage.local.set({ [SNIPPETS_STORAGE_KEY]: comIds });
    console.log("[snippets] lista padrão carregada:", comIds.length, "itens");
  } catch (e) {
    console.error("[snippets] erro ao carregar lista padrão:", e);
  }
}

// ==========================================
// ÁUDIO DOS SNIPPETS (tocado via documento offscreen)
// ==========================================
const VOLUME_STORAGE_KEY = "ccTools_volume";
const VOLUME_PADRAO = 70;
let criandoOffscreen = null;

async function garantirOffscreen() {
  const existentes = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (existentes.length) return;
  if (!criandoOffscreen) {
    criandoOffscreen = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Tocar o áudio configurado no snippet."
    }).finally(() => { criandoOffscreen = null; });
  }
  await criandoOffscreen;
}

async function tocarAudioSnippet(arquivo) {
  // aceita só nome de arquivo simples (sem pastas) dentro de assets/
  if (!arquivo || !/^[\w\-. ]+\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(arquivo)) {
    return { ok: false, error: "Nome de áudio inválido." };
  }
  try {
    const cfg = await chrome.storage.local.get([VOLUME_STORAGE_KEY]);
    const vol = typeof cfg[VOLUME_STORAGE_KEY] === "number" ? cfg[VOLUME_STORAGE_KEY] : VOLUME_PADRAO;
    await garantirOffscreen();
    const msg = {
      target: "offscreen",
      type: "play",
      url: chrome.runtime.getURL("assets/" + encodeURIComponent(arquivo)),
      volume: vol / 100
    };
    try {
      await chrome.runtime.sendMessage(msg);
    } catch (e) {
      await new Promise((r) => setTimeout(r, 200));
      await chrome.runtime.sendMessage(msg);
    }
    return { ok: true };
  } catch (e) {
    console.error("[audio] erro ao tocar:", e);
    return { ok: false, error: e.message };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "playSnippetAudio") {
    tocarAudioSnippet(message.audio).then(sendResponse);
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  semearSnippetsPadrao();
});
