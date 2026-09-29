const STORAGE_KEY = "ccTools_snippets";

let snippets = [];   // { id, atalho, titulo, conteudo }
let ativoId = null;
let filtro = "";
let selecionados = new Set();
let ultimosFiltrados = [];

const $lista = document.getElementById("lista");
const $busca = document.getElementById("busca");
const $contagem = document.getElementById("contagem");
const $btnNovo = document.getElementById("btnNovo");
const $chkTodos = document.getElementById("chkTodos");
const $btnApagarSelecionados = document.getElementById("btnApagarSelecionados");

const $editorVazio = document.getElementById("editor-vazio");
const $editorForm = document.getElementById("editor-form");
const $campoAtalho = document.getElementById("campoAtalho");
const $campoTitulo = document.getElementById("campoTitulo");
const $campoConteudo = document.getElementById("campoConteudo");
const $btnSalvar = document.getElementById("btnSalvar");
const $btnExcluir = document.getElementById("btnExcluir");
const $msgSalvo = document.getElementById("msgSalvo");

function uid() {
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function normalizarAtalho(v) {
  v = (v || "").trim().replace(/\s+/g, "");
  if (!v) return "";
  if (!v.startsWith("/")) v = "/" + v;
  return v.toLowerCase();
}

function storageIndisponivel() {
  return !window.chrome || !chrome.storage || !chrome.storage.local;
}

function mostrarErroStorage(msg) {
  $lista.innerHTML =
    '<div style="padding:16px;color:#f87171;font-size:13px;line-height:1.5;">' +
    "⚠ " + escapeHtml(msg) +
    '<br><br>Vá em <strong>chrome://extensions</strong>, clique em <strong>Recarregar</strong> nesta extensão' +
    " e, se aparecer um aviso de novas permissões, clique em <strong>Manter</strong>/<strong>Permitir</strong>." +
    "</div>";
  $contagem.textContent = "Erro ao acessar armazenamento";
}

function carregar() {
  if (storageIndisponivel()) {
    mostrarErroStorage("Não foi possível acessar chrome.storage (permissão 'storage' ausente ou extensão desatualizada).");
    return;
  }
  chrome.storage.local.get([STORAGE_KEY], (res) => {
    if (chrome.runtime.lastError) {
      mostrarErroStorage("Falha ao carregar snippets: " + chrome.runtime.lastError.message);
      return;
    }
    snippets = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
    renderLista();
  });
}

function salvarNoStorage(cb) {
  if (storageIndisponivel()) {
    alert("Não foi possível salvar: chrome.storage não está disponível. Recarregue a extensão em chrome://extensions.");
    return;
  }
  chrome.storage.local.set({ [STORAGE_KEY]: snippets }, () => {
    if (chrome.runtime.lastError) {
      alert("Erro ao salvar: " + chrome.runtime.lastError.message);
      return;
    }
    if (cb) cb();
  });
}

function renderLista() {
  const termo = filtro.trim().toLowerCase();
  const filtrados = snippets
    .filter(s => !termo || s.atalho.toLowerCase().includes(termo) ||
      (s.titulo || "").toLowerCase().includes(termo) ||
      (s.conteudo || "").toLowerCase().includes(termo))
    .sort((a, b) => a.atalho.localeCompare(b.atalho));

  $contagem.textContent = snippets.length + (snippets.length === 1 ? " snippet salvo" : " snippets salvos") + " (ilimitado)";

  $lista.innerHTML = "";
  if (!filtrados.length) {
    const vazio = document.createElement("div");
    vazio.id = "vazio";
    vazio.textContent = snippets.length ? "Nenhum snippet encontrado." : "Nenhum snippet ainda. Clique em + Novo para criar o primeiro.";
    $lista.appendChild(vazio);
    atualizarBarraSelecao(filtrados);
    return;
  }

  filtrados.forEach(s => {
    const el = document.createElement("div");
    el.className = "item" + (s.id === ativoId ? " ativo" : "");
    const preview = (s.titulo ? s.titulo + " — " : "") + (s.conteudo || "").replace(/\n/g, " ");

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "chk-item";
    chk.checked = selecionados.has(s.id);
    chk.addEventListener("click", (e) => e.stopPropagation());
    chk.addEventListener("change", () => {
      if (chk.checked) selecionados.add(s.id);
      else selecionados.delete(s.id);
      atualizarBarraSelecao(filtrados);
    });

    const textos = document.createElement("div");
    textos.className = "item-textos";
    textos.innerHTML =
      '<div class="item-shortcut">' + escapeHtml(s.atalho) + '</div>' +
      '<div class="item-preview">' + escapeHtml(preview || "(vazio)") + '</div>';

    el.appendChild(chk);
    el.appendChild(textos);
    el.addEventListener("click", () => selecionar(s.id));
    $lista.appendChild(el);
  });

  atualizarBarraSelecao(filtrados);
}

function atualizarBarraSelecao(filtrados) {
  ultimosFiltrados = filtrados;
  // Mantém no Set apenas ids que ainda existem
  selecionados.forEach(id => {
    if (!snippets.find(s => s.id === id)) selecionados.delete(id);
  });

  $btnApagarSelecionados.textContent = `🗑 Apagar selecionados (${selecionados.size})`;
  $btnApagarSelecionados.disabled = selecionados.size === 0;

  const idsVisiveis = filtrados.map(s => s.id);
  const todosVisiveisSelecionados = idsVisiveis.length > 0 && idsVisiveis.every(id => selecionados.has(id));
  $chkTodos.checked = todosVisiveisSelecionados;
  $chkTodos.indeterminate = !todosVisiveisSelecionados && idsVisiveis.some(id => selecionados.has(id));
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function selecionar(id) {
  ativoId = id;
  const s = snippets.find(x => x.id === id);
  if (!s) return;
  $editorVazio.style.display = "none";
  $editorForm.style.display = "block";
  $campoAtalho.value = s.atalho;
  $campoTitulo.value = s.titulo || "";
  $campoConteudo.value = s.conteudo || "";
  renderLista();
}

function novo() {
  const s = { id: uid(), atalho: "", titulo: "", conteudo: "" };
  snippets.push(s);
  selecionar(s.id);
  $campoAtalho.focus();
}

function salvar() {
  const s = snippets.find(x => x.id === ativoId);
  if (!s) return;

  const atalho = normalizarAtalho($campoAtalho.value);
  if (!atalho) {
    alert("Informe um atalho para o snippet (ex: /saudacao).");
    return;
  }
  const duplicado = snippets.find(x => x.id !== s.id && x.atalho === atalho);
  if (duplicado) {
    alert("Já existe um snippet com o atalho \"" + atalho + "\". Escolha outro.");
    return;
  }

  s.atalho = atalho;
  s.titulo = $campoTitulo.value.trim();
  s.conteudo = $campoConteudo.value;

  salvarNoStorage(() => {
    $campoAtalho.value = s.atalho;
    renderLista();
    $msgSalvo.style.opacity = "1";
    setTimeout(() => { $msgSalvo.style.opacity = "0"; }, 1800);
  });
}

function excluir() {
  const s = snippets.find(x => x.id === ativoId);
  if (!s) return;
  if (!confirm("Excluir o snippet \"" + (s.atalho || "sem atalho") + "\"?")) return;
  snippets = snippets.filter(x => x.id !== ativoId);
  ativoId = null;
  $editorForm.style.display = "none";
  $editorVazio.style.display = "flex";
  salvarNoStorage(renderLista);
}

$btnNovo.addEventListener("click", novo);
$btnSalvar.addEventListener("click", salvar);
$btnExcluir.addEventListener("click", excluir);
$busca.addEventListener("input", () => { filtro = $busca.value; renderLista(); });

// ===== Exportar / Importar =====
const $btnExportar = document.getElementById("btnExportar");
const $btnImportar = document.getElementById("btnImportar");
const $inputImportar = document.getElementById("inputImportar");

function exportar() {
  if (!snippets.length) {
    alert("Não há snippets para exportar ainda.");
    return;
  }
  const dados = snippets.map(s => ({ atalho: s.atalho, titulo: s.titulo || "", conteudo: s.conteudo || "" }));
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const data = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `snippets-call-center-tools-${data}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importar() {
  $inputImportar.value = "";
  $inputImportar.click();
}

function validarItemImportado(item) {
  return item && typeof item === "object" && typeof item.atalho === "string" && item.atalho.trim();
}

$inputImportar.addEventListener("change", () => {
  const arquivo = $inputImportar.files && $inputImportar.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = () => {
    let dados;
    try {
      dados = JSON.parse(leitor.result);
    } catch (err) {
      alert("Arquivo inválido: não é um JSON válido.");
      return;
    }
    if (!Array.isArray(dados)) {
      alert("Arquivo inválido: esperado um JSON com uma lista de snippets.");
      return;
    }

    const validos = dados.filter(validarItemImportado);
    if (!validos.length) {
      alert("Nenhum snippet válido encontrado no arquivo.");
      return;
    }

    let adicionados = 0;
    let atualizados = 0;

    validos.forEach(item => {
      const atalho = normalizarAtalho(item.atalho);
      if (!atalho) return;
      const existente = snippets.find(s => s.atalho === atalho);
      if (existente) {
        existente.titulo = (item.titulo || "").toString().trim();
        existente.conteudo = (item.conteudo || "").toString();
        atualizados++;
      } else {
        snippets.push({
          id: uid(),
          atalho,
          titulo: (item.titulo || "").toString().trim(),
          conteudo: (item.conteudo || "").toString()
        });
        adicionados++;
      }
    });

    salvarNoStorage(() => {
      renderLista();
      alert(`Importação concluída: ${adicionados} novo(s), ${atualizados} atualizado(s).`);
    });
  };
  leitor.readAsText(arquivo);
});

$btnExportar.addEventListener("click", exportar);
$btnImportar.addEventListener("click", importar);

// ===== Seleção em massa / apagar vários =====
$chkTodos.addEventListener("change", () => {
  if ($chkTodos.checked) {
    ultimosFiltrados.forEach(s => selecionados.add(s.id));
  } else {
    ultimosFiltrados.forEach(s => selecionados.delete(s.id));
  }
  renderLista();
});

$btnApagarSelecionados.addEventListener("click", () => {
  const qtd = selecionados.size;
  if (!qtd) return;
  const confirmMsg = qtd === 1
    ? "Apagar o snippet selecionado?"
    : `Apagar os ${qtd} snippets selecionados?`;
  if (!confirm(confirmMsg)) return;

  snippets = snippets.filter(s => !selecionados.has(s.id));
  if (ativoId && selecionados.has(ativoId)) {
    ativoId = null;
    $editorForm.style.display = "none";
    $editorVazio.style.display = "flex";
  }
  selecionados.clear();

  salvarNoStorage(renderLista);
});

// Atalho de teclado: Ctrl/Cmd+S salva o snippet em edição
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && $editorForm.style.display !== "none") {
    e.preventDefault();
    salvar();
  }
});

carregar();
