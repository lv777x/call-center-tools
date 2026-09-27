(function() {
    'use strict';

    // Evita reexecução
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
            } catch (err) {
                // Ignora cross-origin
            }
        }
        return null;
    }

    // Deixa o texto mais enxuto no relatório: PreSharedKey -> PSK, & -> /
    function abreviar(texto) {
        if (!texto) return texto;
        return texto.replace(/PreSharedKey/gi, "PSK").replace(/&/g, "/");
    }

    // Retorna { tipo:"valor", label, antes, depois } quando muda, ou null se já estava certo
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

    // Tenta os valores em ordem de preferência; usa o primeiro que realmente existir
    // entre as <option> disponíveis no momento (útil quando outro campo, como o
    // Auth Mode, altera dinamicamente quais opções de criptografia existem).
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

    // Retorna { tipo:"check", label } quando habilita, ou null se já estava habilitado
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

    // Copia para a área de transferência. Tenta a Clipboard API moderna primeiro;
    // como a página do roteador normalmente é http://IP-local (contexto não seguro),
    // a Clipboard API pode nem existir ali, então cai para o método clássico via
    // textarea + execCommand, que funciona em qualquer contexto.
    async function copiar(texto) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(texto);
                return true;
            }
        } catch (err) {
            console.warn("[huawei] navigator.clipboard indisponível/falhou, tentando fallback:", err);
        }
        try {
            let ta = document.createElement("textarea");
            ta.value = texto;
            ta.style.position = "fixed";
            ta.style.top = "-9999px";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            let ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return ok;
        } catch (err2) {
            console.warn("[huawei] Falha ao copiar para a área de transferência:", err2);
            return false;
        }
    }

    function formatarMudanca(m) {
        if (m.tipo === "valor") return m.label + " de " + m.antes + " para " + m.depois;
        return "Habilitado " + m.label + ".";
    }

    function montarRelato(mudancas) {
        if (!mudancas.length) {
            return "Alterações feitas no roteador\n\nNenhuma alteração necessária, o roteador já estava configurado.";
        }
        return "Alterações feitas no roteador\n\n" + mudancas.map(formatarMudanca).join("\n");
    }

    function mostrarToast(texto, copiou) {
        let toast = document.createElement("div");
        toast.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999999;background:#131313;color:#eee;border:1px solid #333;border-radius:10px;padding:14px 16px;max-width:320px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5;white-space:pre-wrap;box-shadow:0 6px 20px rgba(0,0,0,0.4);";

        let titulo = document.createElement("div");
        titulo.style.cssText = "font-weight:600;margin-bottom:6px;color:#fff;";
        titulo.textContent = copiou ? "✅ Relatório copiado!" : "⚠️ Relatório pronto (copie manualmente)";
        toast.appendChild(titulo);

        let corpo = document.createElement("div");
        corpo.style.cssText = "color:#bbb;max-height:220px;overflow-y:auto;";
        corpo.textContent = texto;
        toast.appendChild(corpo);

        let fechar = document.createElement("div");
        fechar.style.cssText = "margin-top:8px;font-size:11px;color:#666;cursor:pointer;";
        fechar.textContent = "Fechar";
        fechar.addEventListener("click", function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        });
        toast.appendChild(fechar);

        document.body.appendChild(toast);
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 10000);
    }

    // Ajusta Autenticação (WPA/WPA2 PSK) e Criptografia (TKIP/AES, ou AES se TKIP não estiver
    // disponível para essa banda) na aba Basic da banda informada
    async function configurarSeguranca(sufixoBanda, mudancas) {
        let m;
        m = setSelect("wlAuthMode", "wpa/wpa2-psk", "Autenticação (" + sufixoBanda + ")");
        if (m) mudancas.push(m);

        // authModeChange() reconstrói as opções de wlEncryption com base no Auth Mode;
        // precisamos esperar isso acontecer antes de mexer na criptografia.
        await sleep(600);

        m = setSelectPreferido("wlEncryption", ["TKIPandAESEncryption", "AESEncryption"], "Criptografia (" + sufixoBanda + ")");
        if (m) mudancas.push(m);
    }

    // Ajusta domínio, largura de canal, modo e airtime fairness (+ band steering no 5G) na aba Advanced
    function configurarAvancado(sufixoBanda, larguraCanalValor, temBandSteering, mudancas) {
        let m;
        m = setSelect("RegulatoryDomain", "BR", "Domínio regulatório (" + sufixoBanda + ")");
        if (m) mudancas.push(m);
        m = setSelect("X_HW_HT20", larguraCanalValor, "Largura de canal (" + sufixoBanda + ")");
        if (m) mudancas.push(m);
        m = setSelect("X_HW_Standard", "11ax", "Modo (" + sufixoBanda + ")");
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

        // Passo 1: Navegar até configurações
        await sleep(3000);
        clickElement(find("name_addconfig"));

        await sleep(4000);
        clickElement(find("name_wlanconfig")); // já cai na aba "2.4G Basic"

        // Espera a seção WLAN carregar
        await sleep(5000);

        // --- 2.4G Basic: Autenticação e Criptografia ---
        let antesBasic2g = mudancas.length;
        await configurarSeguranca("2.4G", mudancas);
        if (mudancas.length > antesBasic2g) {
            applySettings();
            await sleep(1500);
        }

        // --- 2.4G Advanced ---
        // X_HW_Standard "11ax" -> "802.11b/g/n/ax" | X_HW_HT20 "0" -> "Auto 20/40 MHz"
        clickElement(find("wlan2adv"));
        await sleep(4000); // espera o AJAX repopular o formulário com os dados de 2.4G
        let antesAdv2g = mudancas.length;
        configurarAvancado("2.4G", "0", false, mudancas);
        if (mudancas.length > antesAdv2g) {
            applySettings();
            await sleep(1500);
        }

        await sleep(2500);

        // --- 5G Basic: Autenticação e Criptografia ---
        clickElement(find("wlan5basic"));
        await sleep(4000); // espera o AJAX repopular o formulário com os dados de 5G
        let antesBasic5g = mudancas.length;
        await configurarSeguranca("5G", mudancas);
        if (mudancas.length > antesBasic5g) {
            applySettings();
            await sleep(1500);
        }

        await sleep(2500);

        // --- 5G Advanced ---
        // X_HW_Standard "11ax" -> "802.11a/n/ac/ax" | X_HW_HT20 "4" -> "Auto 20/40/80/160 MHz"
        clickElement(find("wlan5adv"));
        await sleep(4000); // espera o AJAX repopular o formulário com os dados de 5G Advanced
        let antesAdv5g = mudancas.length;
        configurarAvancado("5G", "4", true, mudancas);
        if (mudancas.length > antesAdv5g) {
            applySettings();
            await sleep(1500);
        }

        await sleep(5000);

        let texto = montarRelato(mudancas);
        let copiou = await copiar(texto);
        mostrarToast(texto, copiou);
        window.__huaweiConfigRunning = false;
    }

    // Inicia
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", configurar);
    } else {
        configurar();
    }
})();
