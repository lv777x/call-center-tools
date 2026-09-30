function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function send(grupo, msg, tag) {
  setStatus("Enviando...");
  chrome.runtime.sendMessage({ type: "runFlow", grupo, msg, tag }, (resp) => {
    if (chrome.runtime.lastError) {
      setStatus("Erro: " + chrome.runtime.lastError.message);
      return;
    }
    if (resp && resp.ok) {
      setStatus("Comando enviado!");
    } else {
      setStatus(resp && resp.error ? resp.error : "Falha ao enviar.");
    }
    setTimeout(() => setStatus(""), 3000);
  });
}

// ==========================================
// LÓGICA DE NAVEGAÇÃO ENTRE TELAS
// ==========================================
const telaPrincipal = document.getElementById("tela-principal");
const telaSecundaria = document.getElementById("tela-secundaria");

// Vai para a tela secundária
document.getElementById("btn-menu-relatos-mensagens").addEventListener("click", () => {
  telaPrincipal.style.display = "none";
  telaSecundaria.style.display = "block";
});

// Volta para a tela principal
document.getElementById("btn-voltar").addEventListener("click", () => {
  telaSecundaria.style.display = "none";
  telaPrincipal.style.display = "block";
});

// ==========================================
// FUNÇÕES DOS BOTÕES DA TELA PRINCIPAL
// ==========================================
document.getElementById("btnProx").addEventListener("click", () => {
  send("Turma Call Tarde", "prox", "prox");
});

document.getElementById("btnCheck").addEventListener("click", () => {
  send("Fila ligação", "\u2705", "check");
});

document.getElementById("btnSnippets").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("snippets.html") });
});

document.getElementById("btnHuawei").addEventListener("click", () => {
  setStatus("Configurando roteador...");
  chrome.runtime.sendMessage({ type: "runHuaweiConfig" }, (resp) => {
    if (chrome.runtime.lastError) {
      setStatus("Erro: " + chrome.runtime.lastError.message);
      return;
    }
    if (resp && resp.ok) {
      setStatus("Rodando! Aguarde o relatório na tela.");
    } else {
      setStatus(resp && resp.error ? resp.error : "Falha ao configurar.");
    }
    setTimeout(() => setStatus(""), 3000);
  });
});

document.getElementById("btnSenhaWifi").addEventListener("click", () => {
chrome.tabs.create({ url: "https://oquei-decodificar.lovable.app/" });
});

// ==========================================
// PREVENÇÃO DE BUG (FECHAR TELAS SOBREPOSTAS)
// ==========================================
// Esta função força o fechamento de qualquer painel de mensagem/relato
// que já esteja aberto na tela de fundo antes de injetar um novo.
function fecharPaineisAbertos(tabId, callback) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const possiveisIDs = ['skx-proto-panel', 'skx-proto-ov', 'wpp-quickreply-panel'];
      possiveisIDs.forEach(id => {
        let el = document.getElementById(id);
        if (el) el.remove();
      });
    }
  }, () => {
    if (callback) callback();
  });
}

// ==========================================
// FUNÇÕES DOS BOTÕES DA TELA SECUNDÁRIA
// ==========================================

// Injeta o novo script de relatos na guia ativa
document.getElementById("btn-relatos").addEventListener("click", () => {
  setStatus("Abrindo relatos...");
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    fecharPaineisAbertos(tabs[0].id, () => {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['relatos.js']
      });
      window.close(); // Fecha a janelinha da extensão automaticamente
    });
  });
});

// Aciona a ferramenta antiga de mensagens via background
document.getElementById("btn-mensagens").addEventListener("click", () => {
  setStatus("Abrindo mensagens...");
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    fecharPaineisAbertos(tabs[0].id, () => {
      chrome.runtime.sendMessage({ type: "runQuickReplyMenu" });
      window.close(); // Fecha a janelinha da extensão automaticamente
    });
  });
});
