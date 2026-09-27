(function () {
    var overlay, panel;

    function colar(m) {
        var c = document.getElementById('twemoji-textarea') || document.querySelector('[contenteditable="true"]');
        fechar();
        if (!c) { mostrarAviso('Clique no campo de texto do WhatsApp antes de usar.'); return; }
        c.focus();
        c.textContent = m;
        ['input', 'keyup', 'change'].forEach(function (t) { c.dispatchEvent(new Event(t, { bubbles: true })); });
    }

    function getNome() {
        var el = document.querySelector('div.header.text-ellipsis.name');
        if (el) {
            var t = el.getAttribute('title') || el.innerText || '';
            var p = t.trim().split(/\s+/)[0];
            if (p) return p;
        }
        return '';
    }

    function pedirNome(cb) {
        var nome = getNome();
        if (nome) return cb(nome);
        mostrarInput('Qual é o nome do cliente?', 'Nome', function (n) { if (n) cb(n); });
    }

    function fechar() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    function criarOverlay() {
        fechar();
        overlay = document.createElement('div');
        // Mantém transparente e sem fechar ao clicar fora
        overlay.style.cssText = 'position:fixed;inset:0;background:transparent;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;';
        
        panel = document.createElement('div');
        panel.style.cssText = 'background:linear-gradient(145deg, #4a2c82, #29154f) !important;border:1px solid #6c46b5 !important;border-radius:12px !important;box-shadow:0 16px 60px rgba(0,0,0,.6) !important;overflow:hidden !important;width:360px !important;max-height:80vh !important;display:flex !important;flex-direction:column !important;';
        
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        return panel;
    }

    function menuHeader(titulo, sub) {
        var h = document.createElement('div');
        h.style.cssText = 'padding:18px 16px 4px !important;text-align:center !important;';
        h.innerHTML = '<div style="color:#42d3a5;font-size:16px;font-weight:700;">' + titulo + '</div>' + (sub ? '<div style="color:#d1d5db;font-size:13px;margin-top:4px;">' + sub + '</div>' : '');
        panel.appendChild(h);
    }

    function addSearch(fns) {
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = 'Digite o número e pressione Enter...';
        inp.style.cssText = 'margin:12px 16px 8px !important;width:calc(100% - 32px) !important;background:rgba(0,0,0,0.25) !important;border:1px solid #6c46b5 !important;border-radius:6px !important;padding:10px 14px !important;color:#ffffff !important;font-size:13px !important;outline:none !important;box-sizing:border-box !important;transition:all 0.2s ease !important;';
        
        inp.onfocus = function () { inp.style.setProperty('border-color', '#42d3a5', 'important'); };
        inp.onblur = function () { inp.style.setProperty('border-color', '#6c46b5', 'important'); };
        
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                var n = parseInt(inp.value.trim());
                if (n === 0) { fechar(); return; }
                if (!isNaN(n) && n >= 1 && n <= fns.length) setTimeout(function () { fns[n - 1](); }, 0);
            }
        });
        
        panel.appendChild(inp);
        setTimeout(function () { inp.focus(); }, 100);
    }

    function getListContainer() {
        var list = panel.querySelector('.menu-list');
        if(!list) {
            list = document.createElement('div');
            list.className = 'menu-list';
            list.style.cssText = 'overflow-y:auto !important;padding:4px 0 8px !important;display:flex !important;flex-direction:column !important;scrollbar-width:thin !important;scrollbar-color:#6c46b5 transparent !important;';
            panel.appendChild(list);
        }
        return list;
    }

    function menuItem(num, nome, fn) {
        var list = getListContainer();
        var el = document.createElement('div');
        el.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px !important;border-bottom:1px solid rgba(255,255,255,0.06) !important;cursor:pointer !important;font-size:14px !important;color:#e6e6e6 !important;transition:all 0.15s !important;';
        el.innerHTML = '<span style="color:#a88be8;font-weight:600;min-width:18px;">' + num + ' -</span><span>' + nome + '</span>';
        
        el.addEventListener('mouseenter', function () {
            el.style.setProperty('background', '#42d3a5', 'important');
            el.style.setProperty('color', '#000000', 'important');
            el.style.setProperty('font-weight', '600', 'important');
            el.style.setProperty('padding-left', '22px', 'important');
            el.children[0].style.setProperty('color', '#000000', 'important');
        });
        el.addEventListener('mouseleave', function () {
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('color', '#e6e6e6', 'important');
            el.style.setProperty('font-weight', '400', 'important');
            el.style.setProperty('padding-left', '16px', 'important');
            el.children[0].style.setProperty('color', '#a88be8', 'important');
        });
        
        el.addEventListener('click', fn);
        list.appendChild(el);
    }

    function btnFechar() {
        var list = getListContainer();
        var el = document.createElement('div');
        el.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px !important;border-bottom:1px solid rgba(255,255,255,0.06) !important;cursor:pointer !important;font-size:14px !important;color:#f87171 !important;transition:all 0.15s !important;';
        el.innerHTML = '<span style="color:#f87171;font-weight:600;min-width:18px;">0 -</span><span>Fechar</span>';
        
        el.addEventListener('mouseenter', function () {
            el.style.setProperty('background', '#f87171', 'important');
            el.style.setProperty('color', '#000000', 'important');
            el.style.setProperty('font-weight', '600', 'important');
            el.style.setProperty('padding-left', '22px', 'important');
            el.children[0].style.setProperty('color', '#000000', 'important');
        });
        el.addEventListener('mouseleave', function () {
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('color', '#f87171', 'important');
            el.style.setProperty('font-weight', '400', 'important');
            el.style.setProperty('padding-left', '16px', 'important');
            el.children[0].style.setProperty('color', '#f87171', 'important');
        });
        
        el.addEventListener('click', fechar);
        list.appendChild(el);
    }

    function btnVoltar(fn) {
        var list = getListContainer();
        var el = document.createElement('div');
        el.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px !important;border-bottom:1px solid rgba(255,255,255,0.06) !important;cursor:pointer !important;font-size:14px !important;color:#f87171 !important;transition:all 0.15s !important;';
        el.innerHTML = '<span style="color:#f87171;font-weight:600;min-width:18px;">0 -</span><span>Voltar</span>';
        
        el.addEventListener('mouseenter', function () {
            el.style.setProperty('background', '#f87171', 'important');
            el.style.setProperty('color', '#000000', 'important');
            el.style.setProperty('font-weight', '600', 'important');
            el.style.setProperty('padding-left', '22px', 'important');
            el.children[0].style.setProperty('color', '#000000', 'important');
        });
        el.addEventListener('mouseleave', function () {
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('color', '#f87171', 'important');
            el.style.setProperty('font-weight', '400', 'important');
            el.style.setProperty('padding-left', '16px', 'important');
            el.children[0].style.setProperty('color', '#f87171', 'important');
        });
        
        el.addEventListener('click', fn);
        list.appendChild(el);
    }

    function mostrarInput(titulo, placeholder, cb) {
        criarOverlay();
        menuHeader(titulo, '');
        var wrap = document.createElement('div');
        wrap.style.cssText = 'padding:12px 16px 16px !important;';
        
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = placeholder;
        inp.style.cssText = 'width:100% !important;background:rgba(0,0,0,0.25) !important;border:1px solid #6c46b5 !important;border-radius:6px !important;padding:10px 14px !important;color:#ffffff !important;font-size:14px !important;outline:none !important;box-sizing:border-box !important;transition:all 0.2s ease !important;';
        inp.onfocus = function () { inp.style.setProperty('border-color', '#42d3a5', 'important'); };
        inp.onblur = function () { inp.style.setProperty('border-color', '#6c46b5', 'important'); };
        
        var btn = document.createElement('button');
        btn.innerText = 'Confirmar';
        btn.style.cssText = 'margin-top:12px !important;width:100% !important;padding:10px !important;background:#42d3a5 !important;border:1px solid #42d3a5 !important;border-radius:7px !important;color:#000000 !important;font-size:14px !important;font-weight:600 !important;cursor:pointer !important;transition:all 0.15s !important;';
        
        btn.addEventListener('click', function () { cb(inp.value.trim()); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                cb(inp.value.trim());
            }
        });
        
        wrap.appendChild(inp);
        wrap.appendChild(btn);
        panel.appendChild(wrap);
        setTimeout(function () { inp.focus(); }, 100);
    }

    function mostrarAviso(msg) {
        criarOverlay();
        menuHeader('Aviso', '');
        var el = document.createElement('div');
        el.style.cssText = 'padding:12px 16px 20px !important;font-size:14px !important;color:#d1d5db !important;text-align:center !important;line-height:1.4 !important;';
        el.innerText = msg;
        panel.appendChild(el);
    }

    function menuGrupos() {
        criarOverlay();
        menuHeader('Mensagens rápidas', 'Clique ou digite o número');
        var fns = [menuSaudacao, menuTecnico, menuServicos, menuFinanceiro, menuComercial, menuUtilitarias, menuInformativo, menuChip, menuCancelamento, menuSuporte];
        addSearch(fns);
        btnFechar();
        menuItem(1, 'Saudação e Encerramento', menuSaudacao);
        menuItem(2, 'Técnico', menuTecnico);
        menuItem(3, 'Serviços Digitais', menuServicos);
        menuItem(4, 'Financeiro', menuFinanceiro);
        menuItem(5, 'Comercial/BackOffice', menuComercial);
        menuItem(6, 'Utilitárias', menuUtilitarias);
        menuItem(7, 'Informativo', menuInformativo);
        menuItem(8, 'Chip', menuChip);
        menuItem(9, 'Cancelamento', menuCancelamento);
        menuItem(10, 'Suporte', menuSuporte);
    }

    function menuSaudacao() {
        criarOverlay();
        menuHeader('Saudação e Encerramento', 'Clique ou digite o número');
        var fns = [function () {
            pedirNome(function (n) { colar('Olá, *' + n + '*! Tudo bem? Como podemos lhe ajudar hoje?'); });
        }, function () {
            pedirNome(function (n) {
                mostrarInput('Número do protocolo:', 'Ex: 1842389', function (p) {
                    if (!p) return; colar('Foi um prazer te ajudar, *' + n + '*!\n\nSegue o número do seu protocolo: *' + p + '*.\n\nSe precisar de algo mais, conte conosco — nossa equipe de suporte está disponível *24h*.\n\nSua avaliação me ajuda muito a melhorar meu trabalho. Se puder dedicar um minutinho para avaliar meu atendimento, agradeço demais!');
                });
            });
        }, function () {
            pedirNome(function (n) {
                mostrarInput('Dia da semana disponível:', 'Ex: Segunda-feira', function (diaSemana) {
                    if (!diaSemana) return; mostrarInput('Dia do mês:', 'Ex: 14', function (diaMes) {
                        if (!diaMes) return; mostrarInput('Período (manhã/tarde):', 'Ex: Manhã', function (periodo) {
                            if (!periodo) return; colar('Tenho uma vaga disponível para ' + diaSemana + ', dia ' + diaMes + ', no período da ' + periodo + ', qual fica melhor, ' + n + '?\n\nVai ter alguém responsável e maior de idade para acompanhar os técnicos no local?');
                        });
                    });
                });
            });
        }];
        addSearch(fns);
        btnVoltar(menuGrupos);
        menuItem(1, 'Saudação', fns[0]);
        menuItem(2, 'Protocolo', fns[1]);
        menuItem(3, 'Data de Visita', fns[2]);
    }

    function menuTecnico() {
        criarOverlay();
        menuHeader('Técnico', 'Clique ou digite o número');
        var fns = [function () {
            colar('Dica para testar sua velocidade corretamente! 📶\nPara atingir o máximo do seu plano no Wi-Fi, certifique-se de estar conectado à *rede 5G* e *próximo ao roteador*.\nVale lembrar que a rede *2.4GHz* tem um limite técnico de até *60 Mbps*. Já no *5G*, a velocidade pode variar de acordo com o modelo do seu celular. O teste mais fiel é sempre *via cabo em um computador*, onde o sinal chega sem perdas! 💻');
        }, function () {
            pedirNome(function (n) { colar('Identificamos uma possível *falha física no sinal (Link Loss)*. 🔧\nPara tentarmos restabelecer sua conexão agora, por favor, realize este procedimento com bastante cuidado:\n\n1. *No Modem (aparelho menor):* Localize o cabo fino (geralmente amarelo com ponta verde ou azul). Retire-o com cuidado, aguarde *10 segundos* e conecte-o novamente até ouvir um *"click"*.\n\n2. *Na Parede (caixinha branca):* Faça o mesmo processo. Retire o cabo amarelo, espere *10 segundos* e recoloque.\n\n*Atenção:* A ponta do cabo é de vidro e muito sensível. Evite tocar na extremidade ou dobrar o cabo bruscamente.\n\nAssim que terminar, me avise, *' + n + '*, para eu verificar se o sinal voltou aqui!'); });
        }, function () {
            pedirNome(function (n) { colar('Vamos realizar um teste de conexão no seu roteador X6! 🛠\n\n1. *No Roteador (o que tem as antenas):* Na parte de baixo dele, você encontrará um *cabo amarelo fino* com a *ponta azul ou verde*. Retire-o com cuidado, aguarde *10 segundos* e encaixe-o novamente até sentir que travou.\n\n⚠ *Atenção:* Certifique-se de que o cabo entrou totalmente. Assim que concluir, observe se as luzes do roteador mudaram e me avise aqui, *' + n + '*!'); });
        }, function () {
            pedirNome(function (n) { colar('Vamos fazer um procedimento agora, *' + n + '*, consegue me ajudar? 😊\n\nPreciso que reinicie seus equipamentos:\n\n1. Retire os equipamentos da *tomada*\n2. Aguarde *30 segundos*\n3. Conecte novamente\n\nAcompanhe se a conexão vai estabilizar e me avisa por favor!'); });
        }, function () {
            pedirNome(function (n) {
                mostrarInput('Nome da cidade:', 'Ex: São Paulo', function (cidade) {
                    if (!cidade) return; mostrarInput('Previsão de normalização:', 'Ex: 18:00', function (hora) {
                        if (!hora) return; colar('🔴 *INTERRUPÇÃO NA REDE* 🔴\n\nCaso seu contato seja referente à falta de conexão, informamos que estamos com uma *interrupção na cidade de ' + cidade + '*, onde afeta algumas rotas.\n\nSó aguardar com os equipamentos na tomada que a conexão será restabelecida automaticamente. A *previsão inicial para normalização é às ' + hora + 'hrs*.\n\nSinto muito, *' + n + '*, pelo que está acontecendo. Eu, em nome da Oquei, peço *sinceras desculpas*! 🙏');
                    });
                });
            });
        }, function () {
            colar('Pode acontecer também do aparelho estar precisando de *atualização*, se estiver desatualizado esses travamentos podem ser *mais frequentes*, oriento a entrar em contato com *quem forneceu o aparelho* para verificar.\n\nComo nos outros aparelhos a conexão está normal, o problema será os *servidores que fazem a distribuição dos canais*, reiniciando a TV pode melhorar, mas *não é garantia*. Reforço a procurar o *técnico que realizou a instalação* para verificar se tem alguma atualização, pois será um problema diretamente nos servidores, mas mesmo assim, *não tem garantia de funcionamento e segurança*, pois seus dados podem ficar *vulneráveis a vazamentos*, por *não ser homologado pela ANATEL* no país.');
        }];
        addSearch(fns);
        btnVoltar(menuGrupos);
        menuItem(1, 'Teste de Banda', fns[0]);
        menuItem(2, 'Teste do Cordão', fns[1]);
        menuItem(3, 'Teste do Cordão X6', fns[2]);
        menuItem(4, 'Reiniciar Equipamentos', fns[3]);
        menuItem(5, 'Interrupção na Rede', fns[4]);
        menuItem(6, 'TV BOX', fns[5]);
    }

    function menuServicos() {
        criarOverlay();
        menuHeader('Serviços Digitais', 'Clique ou digite o número');
        var fns = [function () {
            colar('O Globo Play que oferecemos é o *plano básico*, nele você consegue assistir *canais da Globo ao vivo*, filmes e séries. Mas *não dá acesso a canais pagos* como SporTV, Premiere, entre outros. Para isso você precisaria de um *plano Premium* da Globo Play.');
        }, function () {
            mostrarInput('Usuário/senha do cliente:', 'Ex: 42533614807', function (u) {
                if (!u) return; colar('Abaixo estão seus dados de acesso ao *Oquei TV*! 📺\n\n*USUÁRIO:* ' + u + '\n*SENHA:* ' + u + '\n\n*Passo a passo para acessar:*\n\n📺 *Smart TV*\n1. Baixe o app *CDN TV* na loja da sua TV\n2. Abra o app e no campo "Provedor" pesquise por *tv.oquei.com.br*\n3. Preencha usuário e senha e clique em *Entrar*\n\n📱 *Celular*\n1. Baixe o app *Oquei TV* na Google Play ou App Store\n2. Abra o app e faça login com usuário e senha\n\n💻 *Computador*\n1. Acesse *tv.oquei.com.br* pelo navegador\n2. Faça login com usuário e senha para assistir');
            });
        }, function () {
            colar('🎬 *ATIVAÇÃO DA CONTA GLOBOPLAY* 🎬\n\n1. Verifique a *caixa de entrada* do e-mail cadastrado conosco.\n\n2. Procure um e-mail enviado por *CeletiHUB* (confira também a pasta *Spam / Lixo Eletrônico* caso não encontre).\n\n3. Abra o e-mail e clique no botão *ATIVAR*.\n\n4. Em seguida aparecerá o botão *"Começar"* — clique nele para ir à tela de login.\n\n5. Na tela de login, selecione a opção *"Criar uma conta"*.\n\n6. Preencha os dados solicitados para concluir o cadastro.\n\n7. Pronto! Agora é só baixar o aplicativo do *GloboPlay* no celular e na TV. 📱📺\n\n💡 *DICA:* Deixe seu *e-mail e senha salvos* para evitar problemas de acesso caso precise logar em outros dispositivos.\n\n⚠ O GloboPlay que oferecemos é o *plano básico*: dá acesso aos *canais da Globo ao vivo*, filmes e séries, mas *não inclui canais pagos* como SporTV, Premiere, entre outros — para esses seria necessário o *plano Premium*.');
        }];
        addSearch(fns);
        btnVoltar(menuGrupos);
        menuItem(1, 'Globo Play', fns[0]);
        menuItem(2, 'Oquei TV', fns[1]);
        menuItem(3, 'Ativação Globo Play', fns[2]);
    }

    function menuFinanceiro() {
        criarOverlay();
        menuHeader('Financeiro', 'Clique ou digite o número');
        var fns = [function () {
            colar('Segue o boleto para pagamento da fatura! 💰\nLembrando que sempre que precisar, você pode acessar o portal *pix.oquei.com.br*, entrar com o *CPF/CNPJ du titular* e fazer o pagamento por lá!');
        }, function () {
            colar('Processo de *liberação por confiança* realizado com sucesso! ✅\n\nVale ressaltar que esse procedimento tem validade de *3 dias*. Se o pagamento não for compensado até essa data, o bloqueio ocorre novamente e só conseguimos liberar com *apresentação do comprovante de pagamento*.');
        }, function () {
            colar('A liberação é feita de forma *automática* em até *10 minutos* após o pagamento. Se não voltar após esse tempo, nos informe, por gentileza. 😊');
        }];
        addSearch(fns);
        btnVoltar(menuGrupos);
        menuItem(1, 'Boleto/Fatura', fns[0]);
        menuItem(2, 'Liberação por confiança', fns[1]);
        menuItem(3, 'Liberação após pagamento', fns[2]);
    }

    function menuComercial() {
        criarOverlay();
        menuHeader('Comercial/BackOffice', 'Clique ou digite o número');
        var fns = [function () {
            colar('Segue solicitação de *troca de titularidade* para análise:\n\n📋 *Informações da Solicitação*\n• *Motivo da troca:*\n• *Autorização do titular atual:*\n\n👤 *Dados do Novo Titular*\n• *Nome completo:*\n• *Data de nascimento:*\n• *CPF:*\n• *RG:*\n• *Telefone:*\n• *E-mail:*\n\n📎 *Documentação necessária*\n• *Foto do RG ou CNH* (frente e verso obrigatório):\n\n📍 *Endereço*\n• *Permanece no mesmo endereço?*');
        }];
        addSearch(fns);
        btnVoltar(menuGrupos);
        menuItem(1, 'Troca de Titularidade', fns[0]);
    }

    function menuUtilitarias() {
        criarOverlay();
        menuHeader('Utilitárias', 'Clique ou digite o número');
        var fns = [function () {
            pedirNome(function (n) { colar('*' + n + '*, infelizmente a conexão não retornou. 😔\n\nVamos precisar agendar uma *visita técnica* para averiguação no local.\n\nQual é a sua *disponibilidade de horário*?'); });
        }, function () {
            colar('Para realizar a *troca de senha do Wi-Fi*, a nova senha precisa seguir os seguintes requisitos:\n\n📏 No mínimo *8 caracteres*\n🔠 Uma letra *maiúscula*\n🔡 Uma letra *minúscula*\n🔢 Um *número*\n🔣 Um *caractere especial* (ex: @, #, !, $)\n\nQual será a *nova senha*? 🔐');
        }, function () {
            pedirNome(function (n) { colar('*' + n + '*, siga o passo a passo para verificar a velocidade da sua conexão: 💻\n\n1. Pressione *Windows + R* no teclado\n2. No campo que abrir, digite: *ncpa.cpl* e pressione *Enter*\n3. Clique *duas vezes* na opção *Ethernet*\n4. Verifique o campo *Velocidade* — ele deve mostrar *100 Mbps* ou *1 Gbps*\n\nMe informe o que está aparecendo para eu verificar! 😊'); });
        }, function () {
            pedirNome(function (n) { colar('*' + n + '*, para a mudança de endereço temos uma *taxa no valor de R$ 100,00* que pode ser cobrada de três formas:\n\n1. *À vista no boleto:* R$ 100,00 no ato da mudança\n\n2. *No boleto (com juros):*\n• Entrada de *R$ 50,00* no dia da instalação\n• *2 parcelas de R$ 40,00* nos dois próximos vencimentos\n\n3. *No cartão:* em até *3x sem juros*\n\nCaso prefira, podemos *isentar essa taxa* mediante *renovação de fidelidade*. 😊'); });
        }];
        addSearch(fns);
        btnVoltar(menuGrupos);
        menuItem(1, 'Agendar Visita Técnica', fns[0]);
        menuItem(2, 'Troca de Senha Wi-Fi', fns[1]);
        menuItem(3, 'Verificar Velocidade (PC)', fns[2]);
        menuItem(4, 'Cobrança Mudança de Endereço', fns[3]);
    }

    function menuInformativo() {
        criarOverlay();
        menuHeader('Informativo', 'Clique ou digite o número');
        var fns = [function () {
            pedirNome(function (n) {
                mostrarInput('Nome da cidade:', 'Ex: Ubarana', function (cidade) {
                    if (!cidade) return; mostrarInput('Previsão de normalização:', 'Ex: 18:00', function (hora) {
                        if (!hora) return; colar('🔴 *QUEDA DE ENERGIA* 🔴\n\n*' + n + '*, caso seu contato seja referente à falta de conexão, informamos que estamos com uma *queda de energia na cidade de ' + cidade + '*, onde afeta algumas rotas.\n\nSó aguardar com os equipamentos na tomada que a conexão será restabelecida automaticamente. A *previsão inicial para normalização é às ' + hora + '*.\n\nSinto muito pelo que está acontecendo com você. Eu, em nome da *Oquei*, peço *sinceras desculpas*! 🙏\n\nCaso seu contato seja referente a outro assunto, informe abaixo que eu já verifico pra você.');
                    });
                });
            });
        }, function () {
            colar('⚠ *INSTABILIDADE NO LINK* ⚠\n\nInformamos que estamos passando por uma *instabilidade em nosso link de internet*. Entendemos o transtorno que isso pode causar e nossa equipe já está *trabalhando para solucionar o problema* o mais rápido possível.\n\nDurante esse período, você pode notar *lentidão e oscilações* na conexão. Por enquanto, pedimos que *mantenha seus equipamentos conectados na tomada* e aguarde — não é necessário realizar nenhum procedimento.\n\nAgradecemos pela sua *paciência e compreensão*! 🙏');
        }];
        addSearch(fns);
        btnVoltar(menuGrupos);
        menuItem(1, 'Queda de Energia', fns[0]);
        menuItem(2, 'Instabilidade no Link', fns[1]);
    }

    function menuChip() {
        criarOverlay();
        menuHeader('Chip', 'Clique ou digite o número');
        var fns = [menuAPN];
        addSearch(fns);
        btnVoltar(menuGrupos);
        menuItem(1, 'APN', menuAPN);
    }

    function menuAPN() {
        criarOverlay();
        menuHeader('APN — Configuração', 'Clique ou digite o número');
        var apnBase = '*Nome:* Oquei\n*APN:* oquei\n*MCC:* 724\n*MNC:* 40\n\n*Não é necessário nome de usuário e senha.*';
        var fns = [function () {
            pedirNome(function (n) { colar('Olá, *' + n + '*! Segue o passo a passo para configurar o *APN* no seu *Motorola*: 📱\n\nMenu > Configurações > Redes > Redes móveis > Pontos de Acesso > Menu (Quatro Quadrados no Teclado Físico) > *Adicionar APN*\n\nPreencha os campos:\n' + apnBase + '\n*Type:* default\n\nSalve as alterações e pronto! Qualquer dúvida é só chamar 😊'); });
        }, function () {
            pedirNome(function (n) { colar('Olá, *' + n + '*! Segue o passo a passo para configurar o *APN* no seu *Samsung*: 📱\n\nConfigurações > Conexões > Redes móveis > Pontos de acesso > *Adicionar APN*\n\nPreencha os campos:\n' + apnBase + '\n*Tipo de autenticação:* PAP ou CHAP\n*Tipo de APN:* default\n\nSalve as alterações e pronto! Qualquer dúvida é só chamar 😊'); });
        }, function () {
            pedirNome(function (n) { colar('Olá, *' + n + '*! Segue o passo a passo para configurar o *APN* no seu *Xiaomi*: 📱\n\nConfigurações > Cartão SIM e redes móveis > selecione o chip da Oquei > Nomes dos pontos de acesso > APN > *+ Novo APN*\n\nPreencha os campos:\n' + apnBase + '\n*Tipo de autenticação:* PAP ou CHAP\n\nMais > *Salvar*\n\nQualquer dúvida é só chamar 😊'); });
        }, function () {
            pedirNome(function (n) { colar('Olá, *' + n + '*! Segue o passo a passo para configurar o *APN* no seu *Asus*: 📱\n\nConfigurações > Conexões > Redes móveis > Pontos de acesso > *Adicionar APN*\n\nPreencha os campos:\n' + apnBase + '\n*Tipo de autenticação:* PAP ou CHAP\n*Tipo de APN:* default\n\nSalve as alterações e pronto! Qualquer dúvida é só chamar 😊'); });
        }, function () {
            pedirNome(function (n) { colar('Olá, *' + n + '*! Segue o passo a passo para configurar o *APN* no seu *LG*: 📱\n\nConfigurações > Mais > Redes móveis > Nomes dos pontos de acesso > *Adicionar (+)*\n\nPreencha os campos:\n' + apnBase + '\n*Tipo de autenticação:* PAP ou CHAP\n*Tipo de APN:* default\n\nSalve as alterações e pronto! Qualquer dúvida é só chamar 😊'); });
        }, function () {
            pedirNome(function (n) { colar('Olá, *' + n + '*! Segue o passo a passo para configurar o *APN* no seu *iPhone*: 📱\n\nAjustes > Celular > Ative os *Dados Celulares* > Rede de Dados Celulares\n\nPreencha manualmente:\n*Nome:* Oquei\n*APN:* oquei\n\n*Não é necessário nome de usuário e senha.*\n\nToque em *"Celular"* no canto superior esquerdo para salvar. Qualquer dúvida é só chamar 😊'); });
        }];
        addSearch(fns);
        btnVoltar(menuChip);
        menuItem(1, 'Motorola', fns[0]);
        menuItem(2, 'Samsung', fns[1]);
        menuItem(3, 'Xiaomi', fns[2]);
        menuItem(4, 'Asus', fns[3]);
        menuItem(5, 'LG', fns[4]);
        menuItem(6, 'iPhone', fns[5]);
    }

    function menuCancelamento() {
        criarOverlay();
        menuHeader('Cancelamento', 'Clique ou digite o número');
        var fns = [function () {
            pedirNome(function (n) { colar('Nossa, que pena, *' + n + '*, que tomou essa decisão de cancelamento. 😔\n\nAntes de qualquer coisa, posso saber o que motivou você a tomar essa decisão?'); });
        }];
        addSearch(fns);
        btnVoltar(menuGrupos);
        menuItem(1, 'Retenção', fns[0]);
    }

    function menuSuporte() {
        criarOverlay();
        menuHeader('Suporte', 'Clique ou digite o número');
        var fns = [function () {
            colar('Como é uma *solicitação de serviço*, há um custo referente à visita técnica:\n\n🔧 *Taxa no valor de R$50,00* — primeira hora do técnico no local\n➕ *R$40,00 adicional* (ou o seu proporcional), caso o técnico fique um período a mais no local\n💰 *+ o custo dos materiais*');
        }];
        addSearch(fns);
        btnVoltar(menuGrupos);
        menuItem(1, 'Valores de Cabeamento', fns[0]);
    }

    menuGrupos();
})();