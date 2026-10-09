(function() {
    'use strict';

    if (window.__huaweiConfigRunning) return;
    window.__huaweiConfigRunning = true;

    function sleep(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    function clickElement(e) {
        if (e) {
            e.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            e.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
            e.click();
        }
    }

    function find(id) {
        let e = document.getElementById(id);
        if (e) return e;
        for (let f of document.querySelectorAll("iframe")) {
            try {
                let d = f.contentDocument || f.contentWindow.document;
                e = d.getElementById(id);
                if (e) return e;
            } catch (err) {}
        }
        return null;
    }

    // Igual ao find, mas busca por seletor CSS (documento principal + iframes)
    function findAll(selector) {
        let resultado = Array.prototype.slice.call(document.querySelectorAll(selector));
        for (let f of document.querySelectorAll("iframe")) {
            try {
                let d = f.contentDocument || f.contentWindow.document;
                resultado = resultado.concat(Array.prototype.slice.call(d.querySelectorAll(selector)));
            } catch (err) {}
        }
        return resultado;
    }

    function abreviar(texto) {
        if (!texto) return texto;
        return texto.replace(/PreSharedKey/gi, "PSK").replace(/&/g, "/");
    }

    // ---------- Leitura do sinal da fibra ----------
    // Procura na tabela da página Optical a linha de potência de recepção (Rx).
    // Se não achar pelo rótulo, usa a primeira célula "table_right" com dBm.
    function lerSinalFibra() {
        let celulas = findAll("td.table_right");
        if (!celulas.length) return null;

        let extrairNumero = function(txt) {
            let m = (txt || "").replace(/\u00a0/g, " ").match(/-?\d+(?:[.,]\d+)?/);
            return m ? m[0].replace(",", ".") : null;
        };

        // 1ª tentativa: linha cujo rótulo fala de recepção (Rx / Receive)
        for (let i = 0; i < celulas.length; i++) {
            let linha = celulas[i].parentElement;
            let rotulo = linha ? (linha.textContent || "") : "";
            if (/rx|receiv|recep/i.test(rotulo) && /pot|power|optical|óptic|optic/i.test(rotulo)) {
                let n = extrairNumero(celulas[i].textContent);
                if (n !== null) return n;
            }
        }

        // 2ª tentativa: primeira célula que tenha "dBm"
        for (let i = 0; i < celulas.length; i++) {
            if (/dbm/i.test(celulas[i].textContent)) {
                let n = extrairNumero(celulas[i].textContent);
                if (n !== null) return n;
            }
        }

        // 3ª tentativa: primeira célula com valor numérico
        for (let i = 0; i < celulas.length; i++) {
            let n = extrairNumero(celulas[i].textContent);
            if (n !== null) return n;
        }
        return null;
    }

    async function capturarSinalFibra() {
        clickElement(find("name_Systeminfo"));
        await sleep(2500);
        clickElement(find("name_opticinfo"));

        // Aguarda a tabela carregar (até ~10s)
        let t0 = Date.now();
        while (Date.now() - t0 < 10000) {
            await sleep(500);
            let valor = lerSinalFibra();
            if (valor !== null) return valor;
        }
        console.warn("[huawei] Não foi possível ler o sinal da fibra.");
        return null;
    }

    function setSelect(id, value, label) {
        let e = find(id);
        if (!e) return null;
        let antes = abreviar(e.options[e.selectedIndex] ? e.options[e.selectedIndex].text : e.value);
        if (e.value === value) return null;
        e.value = value;
        e.dispatchEvent(new Event("change", { bubbles: true }));
        let depois = abreviar(e.options[e.selectedIndex] ? e.options[e.selectedIndex].text : value);
        return { tipo: "valor", label: label, antes: antes, depois: depois };
    }

    function setSelectPreferido(id, valoresPreferidos, label) {
        let e = find(id);
        if (!e) return null;
        let disponiveis = Array.prototype.map.call(e.options, function(o) { return o.value; });
        let valorAlvo = null;
        for (let i = 0; i < valoresPreferidos.length; i++) {
            if (disponiveis.indexOf(valoresPreferidos[i]) !== -1) {
                valorAlvo = valoresPreferidos[i];
                break;
            }
        }
        if (!valorAlvo) {
            console.warn("[huawei] Nenhuma das opções preferidas está disponível em #" + id + ":", valoresPreferidos, "opções atuais:", disponiveis);
            return null;
        }
        return setSelect(id, valorAlvo, label);
    }

    function enableCheckbox(id, label) {
        let e = find(id);
        if (!e || e.checked) return null;
        e.checked = true;
        e.dispatchEvent(new Event("change", { bubbles: true }));
        return { tipo: "check", label: label };
    }

    function applySettings() {
        let b = find("applyButton") || find("btnApplySubmit");
        if (b) {
            clickElement(b);
            return true;
        }
        if (typeof SubmitWlanAdvance === "function") {
            SubmitWlanAdvance();
            return true;
        }
        if (typeof ApplySubmit === "function") {
            ApplySubmit();
            return true;
        }
        console.warn("[huawei] Botão/função de Apply não encontrado nesta aba.");
        return false;
    }

    function formatarMudanca(m) {
        if (m.tipo === "valor") return m.label + " de " + m.antes + " para " + m.depois;
        return "Habilitado " + m.label + ".";
    }

    function montarRelato(mudancas, sinal) {
        let linhaSinal = sinal !== null
            ? "Sinal " + sinal + " dBm"
            : "Sinal não identificado";

        let corpo;
        if (!mudancas.length) {
            corpo = "Alterações feitas no roteador\n\nNenhuma alteração necessária, o roteador já estava configurado.";
        } else {
            corpo = "Alterações feitas no roteador\n\n" + mudancas.map(formatarMudanca).join("\n");
        }
        return linhaSinal + "\n\n" + corpo;
    }

    function mostrarToast(texto) {
        let toast = document.createElement("div");
        toast.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999999;background:#131313;color:#eee;border:1px solid #333;border-radius:10px;padding:16px 18px;max-width:340px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5;white-space:pre-wrap;box-shadow:0 8px 24px rgba(0,0,0,0.6);";

        let titulo = document.createElement("div");
        titulo.style.cssText = "font-weight:700;margin-bottom:8px;color:#f59e0b;font-size:14px;text-align:center;";
        titulo.textContent = "⚠️ Relatório Pronto (Some em 20s)";
        toast.appendChild(titulo);

        let corpo = document.createElement("div");
        corpo.style.cssText = "color:#d1d5db;max-height:220px;overflow-y:auto;margin-bottom:14px;padding-right:4px;";
        corpo.textContent = texto;
        toast.appendChild(corpo);

        let relatorioTimer = setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 20000);

        let btnCopiar = document.createElement("button");
        btnCopiar.textContent = "📋 Copiar Relatório";
        btnCopiar.style.cssText = "display:block;width:100%;padding:10px;background:#42d3a5;color:#000000;border:none;border-radius:6px;font-weight:700;font-size:14px;cursor:pointer;margin-bottom:10px;transition:background 0.2s;";
        btnCopiar.addEventListener("click", function() {
            let ta = document.createElement("textarea");
            ta.value = texto;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);

            clearTimeout(relatorioTimer);
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        });
        toast.appendChild(btnCopiar);

        let fechar = document.createElement("div");
        fechar.style.cssText = "font-size:13px;color:#888;cursor:pointer;text-align:center;font-weight:500;transition:color 0.2s;";
        fechar.textContent = "Fechar Notificação";
        fechar.onmouseenter = function() { fechar.style.color = "#f87171"; };
        fechar.onmouseleave = function() { fechar.style.color = "#888"; };
        fechar.addEventListener("click", function() {
            clearTimeout(relatorioTimer);
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        });
        toast.appendChild(fechar);

        document.body.appendChild(toast);
    }

    async function configurarSeguranca(sufixoBanda, mudancas) {
        let m;
        m = setSelect("wlAuthMode", "wpa/wpa2-psk", "Autenticação (" + sufixoBanda + ")");
        if (m) mudancas.push(m);

        await sleep(600);

        m = setSelectPreferido("wlEncryption", ["TKIPandAESEncryption", "AESEncryption"], "Criptografia (" + sufixoBanda + ")");
        if (m) mudancas.push(m);
    }

    async function configurarAvancado(sufixoBanda, larguraCanalValor, temBandSteering, mudancas) {
        let m;
        m = setSelect("RegulatoryDomain", "BR", "Domínio regulatório (" + sufixoBanda + ")");
        if (m) mudancas.push(m);

        m = setSelect("X_HW_Standard", "11ax", "Modo (" + sufixoBanda + ")");
        if (m) mudancas.push(m);

        await sleep(400);

        m = setSelect("X_HW_HT20", larguraCanalValor, "Largura de canal (" + sufixoBanda + ")");
        if (m) mudancas.push(m);

        m = enableCheckbox("X_HW_AirtimeFairness", "airtime fairness (" + sufixoBanda + ")");
        if (m) mudancas.push(m);
        
        if (temBandSteering) {
            m = enableCheckbox("BandSteeringPolicy", "band steering");
            if (m) mudancas.push(m);
        }
    }

    async function configurar() {
        let mudancas = [];

        await sleep(3000);

        // --- Sinal da fibra (System Information > Optical) ---
        let sinal = await capturarSinalFibra();
        await sleep(1000);

        clickElement(find("name_addconfig"));

        await sleep(4000);
        clickElement(find("name_wlanconfig"));

        await sleep(5000);

        // --- 2.4G Basic ---
        let antesBasic2g = mudancas.length;
        await configurarSeguranca("2.4G", mudancas);
        if (mudancas.length > antesBasic2g) {
            applySettings();
            await sleep(1500);
        }

        // --- 2.4G Advanced ---
        clickElement(find("wlan2adv"));
        await sleep(4000);
        let antesAdv2g = mudancas.length;
        await configurarAvancado("2.4G", "0", false, mudancas);
        if (mudancas.length > antesAdv2g) {
            applySettings();
            await sleep(1500);
        }

        await sleep(2500);

        // --- 5G Advanced (Invertido para executar antes) ---
        clickElement(find("wlan5adv"));
        await sleep(4000);
        let antesAdv5g = mudancas.length;
        await configurarAvancado("5G", "4", true, mudancas);
        if (mudancas.length > antesAdv5g) {
            applySettings();
            await sleep(1500);
        }

        await sleep(2500);

        // --- 5G Basic (Invertido para executar depois) ---
        clickElement(find("wlan5basic"));
        await sleep(4000);
        let antesBasic5g = mudancas.length;
        await configurarSeguranca("5G", mudancas);
        if (mudancas.length > antesBasic5g) {
            applySettings();
            await sleep(1500);
        }

        await sleep(5000);

        let texto = montarRelato(mudancas, sinal);
        mostrarToast(texto);
        window.__huaweiConfigRunning = false;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", configurar);
    } else {
        configurar();
    }
})();
