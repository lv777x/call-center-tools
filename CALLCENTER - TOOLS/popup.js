function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function send(msg, tag) {
  setStatus("Enviando...");
  chrome.runtime.sendMessage({ type: "runFlow", msg, tag }, (resp) => {
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
// TELA "LINKS"
// ==========================================
// Para adicionar um botão novo, basta incluir uma linha nesta lista.
//   Um link:       { nome: "Texto do botão", url: "https://endereco" },
//   Vários links:  { nome: "Texto do botão", urls: ["https://link1", "https://link2"] },

const LINKS = [
  { nome: "Ramais", url: "https://docs.google.com/spreadsheets/d/1r7gK3W7Q5K-5r6qd-3sj5lklAxlcHnM7EArm-D_3Jwk/edit?pli=1&gid=1858272844#gid=1858272844" },
  { nome: "Links", url: "https://docs.google.com/spreadsheets/d/1hdpzDmJ8u1q-0JxcqQIhHcdPtNGa05IfEm-BFl3v3_k/edit?gid=0#gid=0" },
  { nome: "Recados/Roteiro", url: "https://docs.google.com/document/d/1eYtQZxso1gCsfOMilhDBHvlo2P8HBy0iTmlATlNYgRM/edit?tab=t.0" }
];
const telaLinks = document.getElementById("tela-links");
const listaLinks = document.getElementById("lista-links");

LINKS.forEach((link) => {
  const botao = document.createElement("button");
  botao.className = "sua-classe-de-botao";
  botao.textContent = link.nome;
  botao.addEventListener("click", () => {
    // aceita "url" (um link) ou "urls" (lista de links); cada um abre em uma aba
    const enderecos = Array.isArray(link.urls) ? link.urls : [link.url];
    enderecos.filter(Boolean).forEach((endereco, i) => {
      chrome.tabs.create({ url: endereco, active: i === 0 });
    });
  });
  listaLinks.appendChild(botao);
});

// Vai para a tela de links
document.getElementById("btn-menu-links").addEventListener("click", () => {
  telaPrincipal.style.display = "none";
  telaLinks.style.display = "block";
});

// Volta para a tela principal
document.getElementById("btn-voltar-links").addEventListener("click", () => {
  telaLinks.style.display = "none";
  telaPrincipal.style.display = "block";
});

// ==========================================
// FUNÇÕES DOS BOTÕES DA TELA PRINCIPAL
// ==========================================
document.getElementById("btnProx").addEventListener("click", () => {
  send("prox", "prox");
});

document.getElementById("btnCheck").addEventListener("click", () => {
  send("\u2705", "check");
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

// ==========================================
// VOLUME DO ÁUDIO DOS SNIPPETS
// ==========================================
const VOLUME_STORAGE_KEY = "ccTools_volume";
const rangeVolume = document.getElementById("rangeVolume");
const volumeValor = document.getElementById("volumeValor");

function mostrarVolume(v) {
  volumeValor.textContent = v + "%";
}

chrome.storage.local.get([VOLUME_STORAGE_KEY], (res) => {
  const v = typeof res[VOLUME_STORAGE_KEY] === "number" ? res[VOLUME_STORAGE_KEY] : 70;
  rangeVolume.value = v;
  mostrarVolume(v);
});

rangeVolume.addEventListener("input", () => {
  const v = Number(rangeVolume.value);
  mostrarVolume(v);
  chrome.storage.local.set({ [VOLUME_STORAGE_KEY]: v });
});
