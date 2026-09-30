async function runFlow(grupo, msg, tag) {
  const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
  if (!tabs.length) {
    console.error("[" + tag + "] WhatsApp Web não está aberto em nenhuma aba");
    return { ok: false, error: "WhatsApp Web não está aberto em nenhuma aba." };
  }
  const tab = tabs[0];
  // Não troca de aba nem foca a janela: o envio roda na aba do WhatsApp
  // mesmo que o usuário continue em outra aba/janela.
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: sendWhatsAppMessage,
    args: [grupo, msg, tag]
  });
  return { ok: true };
}

// Esta função é injetada na página do WhatsApp Web (mundo MAIN).
function sendWhatsAppMessage(GRUPO, MSG, TAG) {
  try {
    var key = "__wppEnviadoEm_" + TAG;
    if (window[key] && Date.now() - window[key] < 15000) {
      console.warn("[" + TAG + "] Enviado ha menos de 15s, ignorando.");
      return;
    }

    var norm = function (s) { return (s || "").trim().toLowerCase(); };

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

    var findChatRow = function (nome) {
      var alvo = norm(nome);
      var spans = [...document.querySelectorAll('#pane-side span[title], #pane-side span[dir="auto"]')];
      var span = spans.find(function (s) {
        return norm(s.getAttribute("title") || s.textContent) === alvo;
      });
      if (!span) return null;
      return span.closest('div[role="listitem"]') ||
        span.closest('[data-testid="cell-frame-container"]') ||
        span.closest('div[tabindex="-1"]');
    };

    var waitForChat = function (nome) {
      return new Promise(function (resolve, reject) {
        var t0 = Date.now();
        var check = function () {
          var row = findChatRow(nome);
          if (row) { resolve(row); }
          else if (Date.now() - t0 > 10000) {
            var lista = [...document.querySelectorAll('#pane-side span[title]')]
              .map(function (s) { return s.getAttribute("title"); });
            console.log("[" + TAG + "] Conversas visiveis:", lista);
            reject("grupo nao encontrado na lista: " + nome);
          }
          else { setTimeout(check, 300); }
        };
        check();
      });
    };

    var confirmaChat = function (nome) {
      return new Promise(function (resolve, reject) {
        var t0 = Date.now();
        var alvo = norm(nome);
        var check = function () {
          var h = document.querySelector('#main header') || document.querySelector('header');
          if (h && norm(h.textContent).indexOf(alvo) !== -1) { resolve(); }
          else if (Date.now() - t0 > 6000) { reject("nao consegui confirmar que o grupo abriu"); }
          else { setTimeout(check, 200); }
        };
        check();
      });
    };

    var waitForInput = function () {
      return new Promise(function (resolve, reject) {
        var t0 = Date.now();
        var check = function () {
          var box = document.querySelector('footer div[contenteditable="true"]');
          if (box && box.offsetParent !== null) { box.focus(); resolve(box); }
          else if (Date.now() - t0 > 8000) { reject("campo de texto nao apareceu"); }
          else { setTimeout(check, 200); }
        };
        check();
      });
    };

    var findSendBtn = function () {
      var icon = document.querySelector(
        '[data-testid="wds-ic-send-filled"],span[data-icon="wds-ic-send-filled"],span[data-icon="wds-ic-filled-send"],span[data-icon="send"]'
      );
      if (icon) { return icon.closest('button,[role="button"]') || icon; }
      return document.querySelector('[data-testid="compose-btn-send"]') ||
        document.querySelector('[aria-label="Enviar"]');
    };

    var sendMsg = function () {
      return waitForInput().then(function (box) {
        box.focus();
        var ok = false;
        if (document.execCommand) { ok = document.execCommand("insertText", false, MSG); }
        if (!ok) {
          box.textContent += MSG;
          box.dispatchEvent(new InputEvent("input", { bubbles: true, data: MSG, inputType: "insertText" }));
        }
        return new Promise(function (resolve) {
          var tries = 0;
          var attempt = function () {
            tries++;
            var btn = findSendBtn();
            if (btn) {
              ["pointerdown", "mousedown", "pointerup", "mouseup"].forEach(function (t) { fire(btn, t); });
              btn.click();
              resolve("mensagem enviada por clique (tentativa " + tries + ")");
            }
            else if (tries > 40) {
              box.focus();
              ["keydown", "keypress", "keyup"].forEach(function (t) {
                box.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
              });
              resolve("botao nao encontrado, tentei Enter");
            }
            else { setTimeout(attempt, 150); }
          };
          setTimeout(attempt, 300);
        });
      });
    };

    console.log("[" + TAG + "] Iniciando. Grupo alvo: " + GRUPO);
    window[key] = Date.now();

    waitForChat(GRUPO)
      .then(function (row) {
        ["pointerover", "mouseenter", "pointerdown", "mousedown", "focus", "pointerup", "mouseup", "click"]
          .forEach(function (t) { fire(row, t); });
        row.click();
        return confirmaChat(GRUPO);
      })
      .then(function () { return sendMsg(); })
      .then(function (m) { console.log("[" + TAG + "] OK: " + m); })
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
    runFlow("Foda-se Alares", "prox", "prox");
  } else if (command === "send-check") {
    runFlow("Foda-se Alares", "\u2705", "check");
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

chrome.runtime.onInstalled.addListener(() => {
  semearSnippetsPadrao();
});
