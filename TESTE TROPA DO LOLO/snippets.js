const STORAGE_KEY = "ccTools_snippets";
const IGNORADOS_KEY = "ccTools_padrao_ignorados";   // atalhos padrão que o usuário apagou (não voltam sozinhos)
const STATUS_KEY = "ccTools_padrao_status";         // resultado da última sincronização com o GitHub

let ignorados = [];

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
const $campoAudio = document.getElementById("campoAudio");
const $btnTestarAudio = document.getElementById("btnTestarAudio");

const VOLUME_STORAGE_KEY = "ccTools_volume";
let listaAudios = [];

// Lê assets/audios.json (lista de arquivos de áudio disponíveis na pasta assets)
async function carregarListaAudios() {
  try {
    const resp = await fetch(chrome.runtime.getURL("assets/audios.json"));
    const dados = await resp.json();
    listaAudios = Array.isArray(dados) ? dados.filter(a => typeof a === "string" && a.trim()) : [];
  } catch (e) {
    console.warn("Não foi possível ler assets/audios.json:", e);
    listaAudios = [];
  }
  preencherSelectAudio("");
}

function preencherSelectAudio(valorAtual) {
  $campoAudio.innerHTML = "";
  const nenhum = document.createElement("option");
  nenhum.value = "";
  nenhum.textContent = "Nenhum";
  $campoAudio.appendChild(nenhum);

  const nomes = listaAudios.slice();
  const faltando = valorAtual && nomes.indexOf(valorAtual) === -1;
  nomes.forEach(nome => {
    const o = document.createElement("option");
    o.value = nome;
    o.textContent = nome;
    $campoAudio.appendChild(o);
  });
  if (faltando) {
    const o = document.createElement("option");
    o.value = valorAtual;
    o.textContent = valorAtual + " (não está em audios.json)";
    $campoAudio.appendChild(o);
  }
  $campoAudio.value = valorAtual || "";
}

let audioTeste = null;
function testarAudio() {
  const arquivo = $campoAudio.value;
  if (!arquivo) { alert("Selecione um áudio para testar."); return; }
  chrome.storage.local.get([VOLUME_STORAGE_KEY], (res) => {
    const vol = typeof res[VOLUME_STORAGE_KEY] === "number" ? res[VOLUME_STORAGE_KEY] : 70;
    if (audioTeste) { audioTeste.pause(); }
    audioTeste = new Audio(chrome.runtime.getURL("assets/" + encodeURIComponent(arquivo)));
    audioTeste.volume = vol / 100;
    audioTeste.play().catch(() => alert("Não foi possível tocar o arquivo \"" + arquivo + "\". Confira se ele existe na pasta assets."));
  });
}
$btnTestarAudio.addEventListener("click", testarAudio);

// Se o snippet apagado era padrão, guarda o atalho para a sincronização não recriá-lo
function registrarApagados(lista) {
  const atalhos = lista.filter(x => x.padrao === true && x.atalho).map(x => x.atalho);
  if (!atalhos.length) return null;
  ignorados = Array.from(new Set(ignorados.concat(atalhos)));
  return { [IGNORADOS_KEY]: ignorados };
}

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
  chrome.storage.local.get([STORAGE_KEY, IGNORADOS_KEY, STATUS_KEY], (res) => {
    if (chrome.runtime.lastError) {
      mostrarErroStorage("Falha ao carregar snippets: " + chrome.runtime.lastError.message);
      return;
    }
    snippets = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
    ignorados = Array.isArray(res[IGNORADOS_KEY]) ? res[IGNORADOS_KEY] : [];
    mostrarStatusSync(res[STATUS_KEY]);
    renderLista();
  });
}

function mostrarStatusSync(st) {
  const el = document.getElementById("statusSync");
  if (!el) return;
  const fmt = (t) => new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  if (!st) { el.textContent = "Lista padrão: ainda não sincronizada"; return; }
  if (st.ok) { el.textContent = "Lista padrão atualizada em " + fmt(st.quando); return; }
  el.textContent = "Não consegui atualizar a lista padrão (" + fmt(st.quando) + ")" +
    (st.ultimoSucesso ? " — última vez com sucesso: " + fmt(st.ultimoSucesso) : "");
}

// Quando o background sincroniza com o GitHub, recarrega a lista aqui sem
// perder o que está sendo digitado (o snippet em edição fica como está).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[STATUS_KEY]) mostrarStatusSync(changes[STATUS_KEY].newValue);
  if (changes[IGNORADOS_KEY]) ignorados = Array.isArray(changes[IGNORADOS_KEY].newValue) ? changes[IGNORADOS_KEY].newValue : [];
  if (!changes[STORAGE_KEY]) return;
  const novos = Array.isArray(changes[STORAGE_KEY].newValue) ? changes[STORAGE_KEY].newValue : [];
  if (JSON.stringify(novos) === JSON.stringify(snippets)) return; // foi a própria página que salvou
  const emEdicao = snippets.find(x => x.id === ativoId);
  const aindaExiste = novos.find(x => x.id === ativoId);
  snippets = novos.slice();
  if (emEdicao && !aindaExiste && !emEdicao.atalho) snippets.push(emEdicao); // "novo" ainda não salvo
  renderLista();
});

function salvarNoStorage(cb, extras) {
  if (storageIndisponivel()) {
    alert("Não foi possível salvar: chrome.storage não está disponível. Recarregue a extensão em chrome://extensions.");
    return;
  }
  chrome.storage.local.set(Object.assign({ [STORAGE_KEY]: snippets }, extras || {}), () => {
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
      '<div class="item-shortcut">' + escapeHtml(s.atalho) + (s.padrao === true ? '<span class="tag-padrao" title="Snippet padrão (atualizado automaticamente)">padrão</span>' : '') + '</div>' +
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
  preencherSelectAudio(s.audio || "");
  document.getElementById("avisoPadrao").style.display = s.padrao === true ? "block" : "none";
  renderLista();
}

function novo() {
  const s = { id: uid(), atalho: "", titulo: "", conteudo: "", audio: "", padrao: false };
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

  const novoTitulo = $campoTitulo.value.trim();
  const novoConteudo = $campoConteudo.value;
  const novoAudio = $campoAudio.value;
  // Alterou um snippet padrão? Ele passa a ser do usuário e deixa de receber atualizações.
  if (s.padrao === true && (atalho !== s.atalho || novoTitulo !== (s.titulo || "") || novoConteudo !== (s.conteudo || "") || novoAudio !== (s.audio || ""))) {
    s.padrao = false;
  }

  s.atalho = atalho;
  s.titulo = novoTitulo;
  s.conteudo = novoConteudo;
  s.audio = novoAudio;

  salvarNoStorage(() => {
    $campoAtalho.value = s.atalho;
    document.getElementById("avisoPadrao").style.display = s.padrao === true ? "block" : "none";
    renderLista();
    $msgSalvo.style.opacity = "1";
    setTimeout(() => { $msgSalvo.style.opacity = "0"; }, 1800);
  });
}

function excluir() {
  const s = snippets.find(x => x.id === ativoId);
  if (!s) return;
  if (!confirm("Excluir o snippet \"" + (s.atalho || "sem atalho") + "\"?")) return;
  const extras = registrarApagados([s]);
  snippets = snippets.filter(x => x.id !== ativoId);
  ativoId = null;
  $editorForm.style.display = "none";
  $editorVazio.style.display = "flex";
  salvarNoStorage(renderLista, extras);
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
  const dados = snippets.map(s => ({ atalho: s.atalho, titulo: s.titulo || "", conteudo: s.conteudo || "", audio: s.audio || "" }));
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
        if (typeof item.audio === "string") existente.audio = item.audio;
        existente.padrao = false; // importado pelo usuário: não é mais sobrescrito pela lista padrão
        atualizados++;
      } else {
        snippets.push({
          id: uid(),
          atalho,
          titulo: (item.titulo || "").toString().trim(),
          conteudo: (item.conteudo || "").toString(),
          audio: typeof item.audio === "string" ? item.audio : "",
          padrao: false
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

// ===== Atualizar lista padrão (GitHub) =====
const $btnSincronizar = document.getElementById("btnSincronizar");
$btnSincronizar.addEventListener("click", () => {
  let restaurar = false;
  if (ignorados.length) {
    restaurar = confirm(
      "Você apagou " + ignorados.length + " snippet(s) padrão antes.\n\n" +
      "OK = restaurá-los junto com a atualização\nCancelar = manter apagados (só atualizar o resto)"
    );
  }
  $btnSincronizar.disabled = true;
  const textoOriginal = $btnSincronizar.textContent;
  $btnSincronizar.textContent = "⏳ Atualizando...";
  chrome.runtime.sendMessage({ type: "syncSnippetsPadrao", restaurarApagados: restaurar }, (r) => {
    $btnSincronizar.disabled = false;
    $btnSincronizar.textContent = textoOriginal;
    if (chrome.runtime.lastError || !r) {
      alert("Não foi possível falar com a extensão. Recarregue-a em chrome://extensions.");
      return;
    }
    carregar();
    if (!r.ok) {
      alert("Não consegui buscar a lista padrão no GitHub.\n" + (r.erro || "") + "\n\nSeus snippets continuam como estavam.");
      return;
    }
    alert("Lista padrão atualizada!\n" + r.adicionados + " novo(s), " + r.atualizados + " atualizado(s), " + r.removidos + " removido(s).\nSeus snippets criados/editados não foram alterados.");
  });
});
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

  const extras = registrarApagados(snippets.filter(s => selecionados.has(s.id)));
  snippets = snippets.filter(s => !selecionados.has(s.id));
  if (ativoId && selecionados.has(ativoId)) {
    ativoId = null;
    $editorForm.style.display = "none";
    $editorVazio.style.display = "flex";
  }
  selecionados.clear();

  salvarNoStorage(renderLista, extras);
});

// Atalho de teclado: Ctrl/Cmd+S salva o snippet em edição
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && $editorForm.style.display !== "none") {
    e.preventDefault();
    salvar();
  }
});

carregarListaAudios();
carregar();
