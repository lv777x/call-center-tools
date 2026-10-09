// Chat onde os botões "prox" e ✅ enviam as mensagens (Rocket.Chat da Oquei)
const CHAT_URL_PATTERN = "https://chat.oquei.com.br/*";
// Nome EXATAMENTE como aparece na barra lateral do chat (grupo, canal ou DM).
// Para testar com uma DM, troque só o texto abaixo e recarregue a extensão.
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

    var caminhoAtual = function () {
      var path = "";
      try { path = decodeURIComponent(location.pathname).toLowerCase(); } catch (e) { path = location.pathname.toLowerCase(); }
      return path;
    };

    // Grupo/canal: a URL termina com /channel/<nome> ou /group/<nome>.
    // (Em DM a URL usa o usuário, ex: /direct/fulano, então isso não se aplica.)
    var urlEhDoAlvo = function () {
      var partes = caminhoAtual().split("/").filter(Boolean);
      return partes.length >= 2 && partes[partes.length - 1] === alvo;
    };

    var tituloDoCabecalho = function () {
      var h = document.querySelector("main header") || document.querySelector("header");
      return h ? norm(h.textContent) : "";
    };

    var achaItemSidebar = function () {
      var titulos = [].slice.call(document.querySelectorAll('[data-qa="sidebar-item-title"]'));
      var t = titulos.find(function (el) { return norm(el.textContent) === alvo; });
      if (!t) return null;
      return t.closest("a") || t.closest('[data-qa="sidebar-item"]') || t.closest('[role="listitem"]') || t;
    };

    // Abre a conversa clicando no item da barra lateral (funciona para grupo,
    // canal e DM) e confirma que abriu: a URL mudou, ou é a do alvo, ou o
    // cabeçalho da conversa mostra o nome procurado.
    var abrirConversa = function () {
      return new Promise(function (resolve, reject) {
        if (urlEhDoAlvo()) { resolve(); return; }
        var t0 = Date.now();
        var caminhoInicial = caminhoAtual();
        var clicou = false;
        var check = function () {
          if (clicou && (urlEhDoAlvo() || caminhoAtual() !== caminhoInicial || tituloDoCabecalho().indexOf(alvo) !== -1)) {
            resolve();
            return;
          }
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

// ==========================================
// SNIPPETS PADRÃO (sincronizados com o GitHub)
// ==========================================
// A lista padrão fica no repositório. A extensão baixa o arquivo e mescla com
// o que o usuário já tem, SEM mexer nos snippets criados/editados por ele:
//   - snippet padrão (padrao:true) e intocado  -> é atualizado / removido conforme o GitHub
//   - snippet criado ou editado pelo usuário    -> nunca é alterado
//   - snippet padrão que o usuário apagou       -> não volta (fica em IGNORADOS)
// Se o GitHub estiver fora do ar / JSON inválido, nada é alterado.
const SNIPPETS_STORAGE_KEY = "ccTools_snippets";
const PADRAO_IGNORADOS_KEY = "ccTools_padrao_ignorados";
const PADRAO_MIGRADO_KEY = "ccTools_padrao_migrado";
const PADRAO_STATUS_KEY = "ccTools_padrao_status";
const SNIPPETS_PADRAO_URL = "https://raw.githubusercontent.com/lv777x/call-center-tools/main/CALLCENTER%20-%20TOOLS/assets/snippets-padrao.json";
const SYNC_ALARM = "syncSnippetsPadrao";
const SYNC_INTERVALO_MIN = 60;

function gerarIdSnippet() {
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function normalizarAtalhoPadrao(v) {
  v = (v || "").toString().trim().replace(/\s+/g, "");
  if (!v) return "";
  if (!v.startsWith("/")) v = "/" + v;
  return v.toLowerCase();
}

// Valida e normaliza a lista vinda do JSON (ignora itens inválidos e atalhos repetidos)
function normalizarListaPadrao(dados) {
  if (!Array.isArray(dados)) throw new Error("O JSON precisa ser uma lista de snippets.");
  const vistos = new Set();
  const lista = [];
  dados.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const atalho = normalizarAtalhoPadrao(item.atalho);
    if (!atalho || vistos.has(atalho)) return;
    vistos.add(atalho);
    lista.push({
      atalho,
      titulo: (item.titulo || "").toString().trim(),
      conteudo: (item.conteudo || "").toString(),
      audio: typeof item.audio === "string" ? item.audio : null
    });
  });
  if (!lista.length) throw new Error("Nenhum snippet válido no JSON.");
  return lista;
}

async function lerListaPadraoEmbutida() {
  const resp = await fetch(chrome.runtime.getURL("assets/snippets-padrao.json"));
  return normalizarListaPadrao(await resp.json());
}

async function baixarListaPadraoRemota() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const resp = await fetch(SNIPPETS_PADRAO_URL, { cache: "no-cache", signal: ctrl.signal });
    if (!resp.ok) throw new Error("GitHub respondeu HTTP " + resp.status);
    return normalizarListaPadrao(JSON.parse(await resp.text()));
  } finally {
    clearTimeout(timer);
  }
}

// Instalações antigas guardaram a lista padrão sem a marca "padrao". Aqui
// marcamos como padrão só o que ainda é IDÊNTICO ao arquivo embutido; o que o
// usuário já alterou continua sendo dele.
async function migrarSnippetsAntigos(lista) {
  const flag = await chrome.storage.local.get([PADRAO_MIGRADO_KEY]);
  if (flag[PADRAO_MIGRADO_KEY]) return lista;
  try {
    const embutida = await lerListaPadraoEmbutida();
    const porAtalho = new Map(embutida.map((p) => [p.atalho, p]));
    lista.forEach((s) => {
      if (s.padrao !== undefined) return;
      const p = porAtalho.get(s.atalho);
      const igual = p && (s.titulo || "") === p.titulo && (s.conteudo || "") === p.conteudo && !s.audio;
      s.padrao = !!igual;
    });
  } catch (e) {
    console.warn("[snippets] migração ignorada:", e);
    return lista;
  }
  await chrome.storage.local.set({ [PADRAO_MIGRADO_KEY]: true });
  return lista;
}

let sincronizandoPadrao = null;

function sincronizarSnippetsPadrao(opcoes) {
  if (!sincronizandoPadrao) {
    sincronizandoPadrao = _sincronizarSnippetsPadrao(opcoes || {}).finally(() => { sincronizandoPadrao = null; });
  }
  return sincronizandoPadrao;
}

async function _sincronizarSnippetsPadrao(opcoes) {
  const resultado = { ok: false, adicionados: 0, atualizados: 0, removidos: 0, restaurados: 0 };
  try {
    const cfg = await chrome.storage.local.get([SNIPPETS_STORAGE_KEY, PADRAO_IGNORADOS_KEY]);
    let lista = Array.isArray(cfg[SNIPPETS_STORAGE_KEY]) ? cfg[SNIPPETS_STORAGE_KEY].slice() : [];
    let ignorados = Array.isArray(cfg[PADRAO_IGNORADOS_KEY]) ? cfg[PADRAO_IGNORADOS_KEY].slice() : [];

    // 1) Baixa a lista do GitHub. Offline? Só usa a embutida se o usuário não tem nenhum snippet ainda.
    let remoto;
    try {
      remoto = await baixarListaPadraoRemota();
    } catch (e) {
      if (lista.length === 0) {
        remoto = await lerListaPadraoEmbutida();
        console.warn("[snippets] GitHub indisponível, usando lista embutida:", e.message);
      } else {
        throw e;
      }
    }

    // 2) Marca os snippets antigos que ainda são o padrão original
    lista = await migrarSnippetsAntigos(lista);

    if (opcoes.restaurarApagados) {
      resultado.restaurados = ignorados.length;
      ignorados = [];
    }

    const ignoradosSet = new Set(ignorados);
    const remotoMap = new Map(remoto.map((r) => [r.atalho, r]));

    // 3) Remove padrões que saíram do GitHub (só os que são padrão e não foram editados)
    const antes = lista.length;
    lista = lista.filter((s) => s.padrao !== true || remotoMap.has(s.atalho));
    resultado.removidos = antes - lista.length;

    // 4) Atualiza padrões existentes
    lista.forEach((s) => {
      if (s.padrao !== true) return;
      const r = remotoMap.get(s.atalho);
      const audio = r.audio !== null ? r.audio : (s.audio || "");
      if ((s.titulo || "") !== r.titulo || (s.conteudo || "") !== r.conteudo || (s.audio || "") !== audio) {
        s.titulo = r.titulo;
        s.conteudo = r.conteudo;
        s.audio = audio;
        resultado.atualizados++;
      }
    });

    // 5) Adiciona padrões novos (pula os apagados pelo usuário e atalhos que o usuário já usa)
    const atalhosEmUso = new Set(lista.map((s) => s.atalho));
    remoto.forEach((r) => {
      if (ignoradosSet.has(r.atalho) || atalhosEmUso.has(r.atalho)) return;
      lista.push({
        id: gerarIdSnippet(),
        atalho: r.atalho,
        titulo: r.titulo,
        conteudo: r.conteudo,
        audio: r.audio || "",
        padrao: true
      });
      resultado.adicionados++;
    });

    // 6) Limpa da lista de ignorados o que não existe mais no GitHub
    ignorados = ignorados.filter((a) => remotoMap.has(a));

    const mudou = resultado.adicionados || resultado.atualizados || resultado.removidos;
    const dados = {
      [PADRAO_IGNORADOS_KEY]: ignorados,
      [PADRAO_STATUS_KEY]: { ok: true, quando: Date.now(), total: remoto.length }
    };
    if (mudou) dados[SNIPPETS_STORAGE_KEY] = lista;
    await chrome.storage.local.set(dados);

    resultado.ok = true;
    console.log("[snippets] sincronizado com o GitHub:", resultado);
  } catch (e) {
    console.error("[snippets] erro ao sincronizar lista padrão:", e);
    resultado.erro = e.message || String(e);
    try {
      const antigo = (await chrome.storage.local.get([PADRAO_STATUS_KEY]))[PADRAO_STATUS_KEY] || {};
      await chrome.storage.local.set({
        [PADRAO_STATUS_KEY]: { ok: false, quando: Date.now(), ultimoSucesso: antigo.ultimoSucesso || (antigo.ok ? antigo.quando : null), erro: resultado.erro }
      });
    } catch (_) { /* ignora */ }
  }
  return resultado;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "syncSnippetsPadrao") {
    sincronizarSnippetsPadrao({ restaurarApagados: !!message.restaurarApagados }).then(sendResponse);
    return true;
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) sincronizarSnippetsPadrao();
});

function garantirAlarmeSync() {
  chrome.alarms.get(SYNC_ALARM, (a) => {
    if (!a) chrome.alarms.create(SYNC_ALARM, { delayInMinutes: 1, periodInMinutes: SYNC_INTERVALO_MIN });
  });
}

chrome.runtime.onStartup.addListener(() => {
  garantirAlarmeSync();
  sincronizarSnippetsPadrao();
});

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
  garantirAlarmeSync();
  sincronizarSnippetsPadrao();
});
