// Expande snippets configurados na dashboard assim que o atalho fica
// completo — igual ao Text Blaze: intercepta ANTES do caractere ser
// inserido (evento "beforeinput"), então é instantâneo e não disputa
// com o framework do próprio site (WhatsApp, SZ.chat, etc.).
// Funciona em qualquer site: <input>, <textarea> e "contenteditable".
(function () {
  var STORAGE_KEY = "ccTools_snippets";
  var TAG = "[CCTools Snippets]";
  var snippetsMap = {};
  var bloqueado = false;
  var ultimoElExpandido = null;
  var ultimoTempoExpandido = 0;
  var COOLDOWN_MS = 500;

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

  // NOVA FUNÇÃO: Captura estritamente o texto do início do campo até onde o cursor está piscando
  function getTextoAntesDoCursor(el) {
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      return (el.value || "").substring(0, el.selectionStart);
    } else {
      var sel = window.getSelection();
      if (sel.rangeCount > 0) {
        var range = sel.getRangeAt(0);
        if (range.startContainer.nodeType === 3) {
          return range.startContainer.nodeValue.substring(0, range.startOffset);
        }
        return range.startContainer.textContent;
      }
    }
    return "";
  }

  function formatarSnippetParaHTML(texto) {
      let formatado = texto.replace(/\*{1,2}([^*]+)\*{1,2}/g, '<strong>$1</strong>');
      formatado = formatado.replace(/\n/g, '<br>');
      return formatado;
  }

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

  // ATUALIZADO: Recebe a 'chave' que ativou o snippet para saber exatamente o que apagar
  function expandir(el, textoSnippet, chave) {
    var agora = Date.now();
    if (el === ultimoElExpandido && (agora - ultimoTempoExpandido) < COOLDOWN_MS) {
      console.log(TAG, "expansão duplicada ignorada (cooldown).");
      return;
    }
    ultimoElExpandido = el;
    ultimoTempoExpandido = agora;

    bloqueado = true;
    el.focus();

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
        var cursor = el.selectionStart || 0;
        var valAtual = el.value || "";
        var textoAntes = valAtual.substring(0, cursor);
        var textoDepois = valAtual.substring(cursor);

        // Remove apenas os caracteres referentes ao atalho colado no final da string antes do cursor
        if (textoAntes.toLowerCase().endsWith(chave)) {
            textoAntes = textoAntes.slice(0, -chave.length);
        }

        setValorNativo(el, textoAntes + textoSnippet + textoDepois);
        
        if (typeof el.setSelectionRange === "function") {
            var novaPos = textoAntes.length + textoSnippet.length;
            try { el.setSelectionRange(novaPos, novaPos); } catch (err) {}
        }
    } else {
        // ContentEditable (Rich Text / SZ.chat / WhatsApp)
        var sel = window.getSelection();
        if (sel.rangeCount > 0 && document.execCommand) {
            var range = sel.getRangeAt(0);
            var textNode = range.startContainer;
            
            // Remove o atalho do DOM antes de injetar o conteúdo real
            if (textNode.nodeType === 3) {
                var offset = range.startOffset;
                var textoAntes = textNode.nodeValue.substring(0, offset);
                
                if (textoAntes.toLowerCase().endsWith(chave)) {
                    textNode.nodeValue = textoAntes.slice(0, -chave.length) + textNode.nodeValue.slice(offset);
                    range.setStart(textNode, offset - chave.length);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
            
            const textoHTML = formatarSnippetParaHTML(textoSnippet);
            let sucessoHTML = false;
            
            if (textoHTML !== textoSnippet) {
                sucessoHTML = document.execCommand("insertHTML", false, textoHTML);
            }
            if (!sucessoHTML) {
                document.execCommand("insertText", false, textoSnippet);
            }
        } else {
            el.innerHTML = formatarSnippetParaHTML(textoSnippet);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            moverCursorParaFinalContentEditable(el);
        }
    }

    console.log(TAG, "snippet expandido.");
    setTimeout(function () { bloqueado = false; }, 0);
  }

  // ATUALIZADO: Verifica se a string atual TERMINA com uma das chaves configuradas
  function bateComAtalho(texto) {
    var textoMin = (texto || "").toLowerCase();
    var chaveEncontrada = null;
    Object.keys(snippetsMap).forEach(function(chave) {
        if (textoMin.endsWith(chave)) {
            chaveEncontrada = chave;
        }
    });
    return chaveEncontrada;
  }

  function aoBeforeInput(e) {
    if (bloqueado) return;
    var raiz = getRaizEditavel(e.target);
    if (!raiz || !elementoEhEditavel(raiz)) return;
    if (e.inputType !== "insertText" && e.inputType !== "insertCompositionText") return;
    if (!e.data) return;

    // Concatena a última letra ao que já existe ATÉ o cursor
    var textoFinal = getTextoAntesDoCursor(raiz) + e.data;
    var chave = bateComAtalho(textoFinal);
    if (!chave) return;

    e.preventDefault();
    e.stopPropagation();
    expandir(raiz, snippetsMap[chave], chave);
  }

  function aoInputOuKeyup(e) {
    if (bloqueado) return;
    var raiz = getRaizEditavel(e.target);
    if (!raiz || !elementoEhEditavel(raiz)) return;
    
    var textoAtual = getTextoAntesDoCursor(raiz);
    var chave = bateComAtalho(textoAtual);
    if (!chave) return;
    
    expandir(raiz, snippetsMap[chave], chave);
  }

  window.addEventListener("beforeinput", aoBeforeInput, true);
  window.addEventListener("input", aoInputOuKeyup, true);
  window.addEventListener("keyup", function (e) {
    if (e.key && e.key.length === 1) aoInputOuKeyup(e);
  }, true);

  console.log(TAG, "content script carregado em", location.href);
})();
