// Expande snippets configurados na dashboard assim que o atalho fica
// completo — igual ao Text Blaze: intercepta ANTES do caractere ser
// inserido (evento "beforeinput"), então é instantâneo e não disputa
// com o framework do próprio site (WhatsApp, SZ.chat, etc.).
// Funciona em qualquer site: <input>, <textarea> e "contenteditable".
(function () {
  var STORAGE_KEY = "ccTools_snippets";
  var TAG = "[CCTools Snippets]";
  var snippetsMap = {};
  var bloqueado = false; // evita reentrância síncrona durante nossa própria expansão
  var ultimoElExpandido = null;
  var ultimoTempoExpandido = 0;
  var COOLDOWN_MS = 500; // trava contra dupla expansão (ex: beforeinput + input do mesmo site)

  function carregar() {
    if (!window.chrome || !chrome.storage || !chrome.storage.local) {
      console.warn(TAG, "chrome.storage indisponível — recarregue a extensão e dê F5 na página.");
      return;
    }
    chrome.storage.local.get([STORAGE_KEY], function (res) {
      var arr = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
      snippetsMap = {};
      arr.forEach(function (s) {
        if (s && s.atalho) snippetsMap[s.atalho.toLowerCase()] = s.conteudo || "";
      });
      console.log(TAG, "atalhos carregados:", Object.keys(snippetsMap));
    });
  }
  carregar();

  if (window.chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === "local" && changes[STORAGE_KEY]) carregar();
    });
  }

  var TIPOS_INPUT_VALIDOS = ["text", "search", "email", "url", "tel", "number", ""];

  function elementoEhEditavel(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName;
    if (tag === "TEXTAREA") return true;
    if (tag === "INPUT") {
      var tipo = (el.type || "text").toLowerCase();
      return TIPOS_INPUT_VALIDOS.indexOf(tipo) !== -1;
    }
    return !!el.isContentEditable;
  }

  // Sobe até achar a raiz "contenteditable=true" real (não um filho que só
  // herdou a propriedade), para pegarmos o texto completo do campo mesmo
  // quando o evento chega em um <span>/<p> interno do editor do site.
  function getRaizEditavel(el) {
    if (!el) return null;
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el;
    var cur = el;
    while (cur) {
      if (cur.getAttribute && cur.getAttribute("contenteditable") === "true") return cur;
      cur = cur.parentElement;
    }
    return el.isContentEditable ? el : null;
  }

  function getValor(el) {
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value || "";
    return el.textContent || "";
  }

  // Converte marcadores de asterisco para <strong> e quebras de linha para <br>
  function formatarSnippetParaHTML(texto) {
      let formatado = texto.replace(/\*{1,2}([^*]+)\*{1,2}/g, '<strong>$1</strong>');
      formatado = formatado.replace(/\n/g, '<br>');
      return formatado;
  }

  // Usa o setter nativo do input/textarea para que frameworks como React/Vue
  // (que sobrescrevem o setter padrão) também percebam a mudança de valor.
  function setValorNativo(el, texto) {
    var proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    var descritor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descritor && descritor.set) {
      descritor.set.call(el, texto);
    } else {
      el.value = texto;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function moverCursorParaFinalContentEditable(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function expandir(el, texto) {
    var agora = Date.now();
    // Trava definitiva: se este mesmo campo já expandiu um snippet há pouco
    // (menos de COOLDOWN_MS), ignora — evita colar a frase 2x quando mais de
    // um listener (beforeinput/input/keyup) detecta o mesmo atalho.
    if (el === ultimoElExpandido && (agora - ultimoTempoExpandido) < COOLDOWN_MS) {
      console.log(TAG, "expansão duplicada ignorada (cooldown).");
      return;
    }
    ultimoElExpandido = el;
    ultimoTempoExpandido = agora;

    bloqueado = true;
    el.focus();

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
        // Inputs e Textareas comuns não suportam HTML visual, insere texto normal
        setValorNativo(el, texto);
        if (typeof el.setSelectionRange === "function") {
            try { el.setSelectionRange(texto.length, texto.length); } catch (err) {}
        }
    } else {
        // Elementos ContentEditable (Rich Text / SZ.chat)
        if (document.execCommand) {
            document.execCommand("selectAll", false, null);
            
            const textoHTML = formatarSnippetParaHTML(texto);
            
            // Tenta inserir como HTML primeiro se houver modificações.
            // Se o navegador barrar o insertHTML ou não for diferente, faz fallback no texto normal.
            let sucessoHTML = false;
            if (textoHTML !== texto) {
                sucessoHTML = document.execCommand("insertHTML", false, textoHTML);
            }
            
            if (!sucessoHTML) {
                document.execCommand("insertText", false, texto);
            }
        } else {
            // Fallback caso execCommand seja obsoleto no navegador futuro
            el.innerHTML = formatarSnippetParaHTML(texto);
            el.dispatchEvent(new Event("input", { bubbles: true }));
        }
        moverCursorParaFinalContentEditable(el);
    }

    console.log(TAG, "snippet expandido.");
    setTimeout(function () { bloqueado = false; }, 0);
  }

  function bateComAtalho(texto) {
    var chave = (texto || "").trim().toLowerCase();
    if (!chave || chave.charAt(0) !== "/") return null;
    return Object.prototype.hasOwnProperty.call(snippetsMap, chave) ? chave : null;
  }

  // MÉTODO PRINCIPAL: intercepta o caractere ANTES de ele ser inserido pelo
  // navegador/site. Assim que o texto atual + o caractere prestes a entrar
  // formam um atalho salvo, cancelamos a digitação nativa e já expandimos —
  // instantâneo, sem disputa com o framework da página.
  function aoBeforeInput(e) {
    if (bloqueado) return;
    var raiz = getRaizEditavel(e.target);
    if (!raiz || !elementoEhEditavel(raiz)) return;
    if (e.inputType !== "insertText" && e.inputType !== "insertCompositionText") return;
    if (!e.data) return;

    var textoFinal = getValor(raiz) + e.data;
    var chave = bateComAtalho(textoFinal);
    if (!chave) return;

    e.preventDefault();
    e.stopPropagation();
    expandir(raiz, snippetsMap[chave]);
  }

  // MÉTODO DE REFORÇO: alguns sites/navegadores não disparam 'beforeinput'
  // de forma confiável (ex: certas IMEs, autopreenchimentos). Confere de
  // novo depois que o caractere já foi inserido, como rede de segurança.
  function aoInputOuKeyup(e) {
    if (bloqueado) return;
    var raiz = getRaizEditavel(e.target);
    if (!raiz || !elementoEhEditavel(raiz)) return;
    var chave = bateComAtalho(getValor(raiz));
    if (!chave) return;
    expandir(raiz, snippetsMap[chave]);
  }

  // Registrado em "window" (o nível mais alto da fase de captura) para
  // rodar antes de qualquer listener que o próprio site adicione.
  window.addEventListener("beforeinput", aoBeforeInput, true);
  window.addEventListener("input", aoInputOuKeyup, true);
  window.addEventListener("keyup", function (e) {
    if (e.key && e.key.length === 1) aoInputOuKeyup(e);
  }, true);

  console.log(TAG, "content script carregado em", location.href);
})();
