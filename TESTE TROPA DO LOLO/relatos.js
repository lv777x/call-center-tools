(function(){
    var PID='skx-proto-panel';
    var old=document.getElementById(PID);
    if(old){old.remove();return;}
    
    var MENU=[{t:'Financeiro',items:[{t:'Desbloqueio por Confiança',m:'Cliente solicita desbloqueio por confiança.\n\nInformado ao mesmo que o desbloqueio ocorre por **3 dias** e que, se após essa data o pagamento não for efetuado, o **bloqueio acontece novamente**, sendo a liberação possível apenas **mediante o comprovante de pagamento**.'},{t:'2ª Via de Boleto',m:'Cliente entrou em contato solicitando segunda via de boleto.\n\n**Encaminhada a segunda via ao mesmo.**\n\nAtendimento encerrado.'},{t:'Liberação após Pagamento',m:'Cliente entrou em contato informando pagamento da fatura e solicitando liberação da conexão.\n\nInformado ao mesmo que a liberação ocorre de forma automática em **até 10 minutos** após a compensação do pagamento.\n\nConfirmado em sistema que o **pagamento já foi baixado e o contrato encontra-se liberado**.'}]},{t:'Suporte',items:[{t:'Troca de Senha do Wi-Fi',m:'Cliente entrou em contato solicitando a troca da senha do Wi-Fi.\n\nConfirmados os dados de segurança com o cliente e **senha alterada com sucesso**.\n\n**Nova senha:** {{SENHA}}\n\nCliente confirma que a conexão foi estabelecida normalmente.'},{t:'Conexão',items:[{t:'Link Loss',m:'Cliente entrou em contato relatando estar sem conexão.\nVerificamos que constava erro de "link loss".\nSolicitamos o teste do cordão óptico, porém não houve sucesso.\nDiante da situação, encaminhando para visita técnica.\nHorário pré-agendado com o cliente.\nOrientado sobre maior de idade para receber os técnicos.\nAtendimento finalizado.'},{t:'TV Box',m:'Cliente em contato relatando utilização de dispositivo TV Box/IPTV na rede. Cliente orientado de que o serviço contratado não possui homologação para operação com esse tipo de equipamento, podendo ocasionar instabilidades não cobertas por suporte técnico.\n\nCliente compreendeu a orientação prestada, sem questionamentos adicionais.\n\nAtendimento finalizado.'},{t:'Não Havia Problema',m:'Cliente em contato relatando ausência de conexão.\n\nRealizada verificação na plataforma de monitoramento, não sendo identificadas anormalidades ou falhas no link do cliente.\n\nDurante o atendimento, foi constatada a reautenticação da conexão, normalizando o acesso.\n\nOrientado o cliente a testar a navegação após a reautenticação.\n\nAtendimento finalizado.'}]},{t:'Serviços Digitais',items:[{t:'OQUEI TV',m:'Cliente entrou em contato solicitando dados de acesso da OQUEI TV.\n\nInformados ao mesmo os dados de acesso.\n\nUsuário: **{{CPF}}**\nSenha: **{{CPF}}**\n\nCliente informa que conseguiu conectar normalmente.'},{t:'Globo Play',m:'Cliente entrou em contato solicitando ativação da Globo Play.\n\n**Reencaminhado link de ativação via e-mail.**\n\nCliente informa que recebeu e **conseguiu vincular a conta normalmente**.'},{t:'OQUEI Saúde',m:'Cliente entrou em contato solicitando a ativação do OQUEI Saúde.\n\n**Encaminhado ao cliente o manual com o passo a passo** e gerado o código de ativação: **{{CÓDIGO}}**\n\nCliente informa que conseguiu realizar a conexão normalmente.'},{t:'Deezer',m:'Cliente entrou em contato o mesmo pedindo o acesso ao Deezer.\nDados confirmados, encaminhado o link de ativação, o mesmo conseguiu o acesso ao serviço.\nAtendimento finalizado.'}]}]},{t:'Telemarketing',items:[{t:'Migração de Plano',m:'Cliente entrou em contato solicitando a migração do plano atual.\n\nInformado ao mesmo que este setor não possui acesso a valores e que o **time comercial entrará em contato**.\n\n**Solicitado ao time comercial que entre em contato com o cliente e siga com a solicitação.**'}]},{t:'Cancelamento',items:[{t:'Solicitação de Cancelamento',m:'Cliente entrou em contato **solicitando o cancelamento do serviço**.\n\nMotivo: **{{MOTIVO}}**\n\n{{INDICAÇÃO DE PONTO|Não=Cliente informa **não possuir ninguém para indicar o ponto** e **deseja seguir com o cancelamento**.|Sim=Cliente informa **possuir indicação para o ponto**. Repassados os dados ao setor responsável para prosseguimento.}}\n\n{{MELHOR MEIO DE CONTATO|WhatsApp=Cliente prefere o contato por Whats App.|Ligação=Cliente prefere o contato por ligação.}}\n\nCliente prefere o contato no horário: {{HORÁRIO}}'}]},{t:'Interrupções',items:[{t:'Rompimento',m:'Verificado o rompimento no local, informamos ao cliente a previsão inicial.\n\nAtendimento finalizado'},{t:'Queda de energia',m:'Cliente em contato o mesmo sem conexão,\nVerificado que houve queda de energia na região, orientado a deixar os equipamentos ligados na tomada, e sobre o tempo para a conexão normalizar. \nO mesmo compreendeu. \nAtendimento finalizado.'},{t:'Instabilidade Link',m:'Cliente em contato o mesmo lentidão.\nVerificado que estamos com instabilidade no link no momento.\nOrientado que o nossos técnicos já estão verificando e não foi informado sobre tempo para a conexão normalizar.\nCliente compreendeu.\nAtendimento finalizado.'}]}];
    
    var SELS=['.ql-editor.dx-htmleditor-content[contenteditable="true"]','.dx-htmleditor .ql-editor[contenteditable="true"]','.fix-ckeditor [contenteditable="true"]','.ql-editor[contenteditable="true"]'];
    
    function visible(el){var r=el.getBoundingClientRect();return r.width>0&&r.height>0;}
    
    function byLabel(doc){
        var LABELS=['relato de atendimento','relato','relato *'];
        var cands=doc.querySelectorAll('span,div,label,p,legend,h1,h2,h3,h4,h5,h6');
        for(var i=0;i<cands.length;i++){
            var node=cands[i];
            var t=(node.textContent||'').trim().toLowerCase();
            if(LABELS.indexOf(t)<0){continue;}
            var n=node.parentElement;
            while(n&&n!==doc.body){
                var eds=n.querySelectorAll('.ql-editor[contenteditable="true"]');
                if(eds.length){
                    for(var j=0;j<eds.length;j++){
                        if(node.compareDocumentPosition(eds[j])&Node.DOCUMENT_POSITION_FOLLOWING&&visible(eds[j])){return eds[j];}
                    }
                    return eds[0];
                }
                n=n.parentElement;
            }
        }
        return null;
    }
    
    function findIn(doc){
        var lab=byLabel(doc);
        if(lab){return lab;}
        var hidden=null;
        for(var i=0;i<SELS.length;i++){
            var els=doc.querySelectorAll(SELS[i]);
            for(var j=0;j<els.length;j++){
                if(visible(els[j])){return els[j];}
                if(!hidden){hidden=els[j];}
            }
        }
        return hidden;
    }
    
    function getEditor(){
        function scan(win){
            var el=null;
            try{el=findIn(win.document);}catch(e){}
            if(el){return el;}
            for(var i=0;i<win.frames.length;i++){
                var r=scan(win.frames[i]);
                if(r){return r;}
            }
            return null;
        }
        return scan(window);
    }
    
    function esch(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function bold(s){return s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');}
    function stripB(s){return s.replace(/\*\*/g,'');}
    function toHTML(parts){
        var h='';
        for(var i=0;i<parts.length;i++){
            h+='<p>'+(parts[i]?bold(esch(parts[i])):'<br>')+'</p>';
        }
        return h;
    }
    function norm(s){return s.replace(/\s+/g,' ').trim();}
    function formatTime(v){
        v=(v||'').trim();
        if(/^\d{1,2}$/.test(v)){return v.padStart(2,'0')+':00';}
        if(/^\d{3,4}$/.test(v)){var p=v.padStart(4,'0');return p.slice(0,2)+':'+p.slice(2);}
        if(/^\d{1,2}:\d{1,2}$/.test(v)){var parts=v.split(':');return parts[0].padStart(2,'0')+':'+parts[1].padStart(2,'0');}
        return v;
    }
    function txtOf(el){return norm(el.innerText||el.textContent||'');}
    function allIn(el,parts){
        var t=txtOf(el);
        for(var i=0;i<parts.length;i++){
            if(!parts[i].trim()){continue;}
            if(t.indexOf(norm(parts[i]))<0){return false;}
        }
        return true;
    }
    function caretEnd(el){
        try{
            var doc=el.ownerDocument;
            var win=doc.defaultView;
            el.focus();
            var s=win.getSelection();
            var r=doc.createRange();
            r.selectNodeContents(el);
            r.collapse(false);
            s.removeAllRanges();
            s.addRange(r);
        }catch(e){}
    }
    
    function insertText(raw,done){
        var el=getEditor();
        if(!el){modalAlert('Campo "Relato" não encontrado','Abra a tela do protocolo com o campo Relato visível e tente novamente.');done(false,null);return;}
        var doc=el.ownerDocument;
        var win=doc.defaultView;
        var host=el.closest('.dx-htmleditor');
        var rawParts=raw.split('\n');
        var plain=stripB(raw);
        var parts=plain.split('\n');
        var inst=null;
        var qi=null;
        try{
            if(win.DevExpress&&host&&win.DevExpress.ui&&win.DevExpress.ui.dxHtmlEditor){
                inst=win.DevExpress.ui.dxHtmlEditor.getInstance(host);
                if(inst&&inst.getQuillInstance){qi=inst.getQuillInstance();}
            }
        }catch(e){}
        var snapV=null;
        try{if(inst){snapV=inst.option('value');}}catch(e){}
        var snapH=el.innerHTML;
        function restore(){
            try{if(inst&&snapV!==null){inst.option('value',snapV);return;}}catch(e){}
            try{el.innerHTML=snapH;}catch(e){}
        }
        function fire(){
            try{
                el.dispatchEvent(new Event('input',{bubbles:true}));
                el.dispatchEvent(new Event('change',{bubbles:true}));
            }catch(e){}
        }
        var tries=[];
        if(inst){
            tries.push(function(){
                var cur=inst.option('value')||'';
                var pre=norm(cur.replace(/<[^>]*>/g,' '))?cur:'';
                inst.option('value',pre+toHTML(rawParts));
            });
        }
        if(qi){
            tries.push(function(){qi.clipboard.dangerouslyPasteHTML(qi.getLength()-1,toHTML(rawParts),'user');});
        }
        tries.push(function(){
            caretEnd(el);
            var dt=new win.DataTransfer();
            dt.setData('text/plain',plain);
            dt.setData('text/html',toHTML(rawParts));
            el.dispatchEvent(new win.ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}));
        });
        tries.push(function(){
            caretEnd(el);
            for(var j=0;j<parts.length;j++){
                if(j>0){if(!doc.execCommand('insertParagraph',false,null)){doc.execCommand('insertHTML',false,'<br>');}}
                if(parts[j]){doc.execCommand('insertText',false,parts[j]);}
            }
        });
        function run(i){
            if(i>=tries.length){restore();done(false,el);return;}
            try{tries[i]();}catch(e){}
            setTimeout(function(){
                fire();
                setTimeout(function(){
                    if(allIn(el,parts)){caretEnd(el);done(true,el);}else{restore();setTimeout(function(){run(i+1);},80);}
                },300);
            },60);
        }
        run(0);
    }
    
    function copyRich(raw,cb){
        var html=toHTML(raw.split('\n'));
        var plain=stripB(raw);
        try{
            if(hasCI()){
                var bh=new Blob([html],{type:'text/html'});
                var bt=new Blob([plain],{type:'text/plain'});
                navigator.clipboard.write([new ClipboardItem({'text/html':bh,'text/plain':bt})]).then(function(){cb(true);},function(){pl();});
                return;
            }
        }catch(e){}
        pl();
        function pl(){
            try{navigator.clipboard.writeText(plain).then(function(){cb(true);},function(){cb(false);});}catch(e){cb(false);}
        }
    }
    
    function hasCI(){try{return typeof ClipboardItem!=='undefined'&&navigator.clipboard&&navigator.clipboard.write;}catch(e){return false;}}
    
    var OV='skx-proto-ov';
    function killOv(){var o=document.getElementById(OV);if(o){o.remove();}}
    
    function shell(title,sub){
        killOv();
        var ov=document.createElement('div');
        ov.id=OV;
        ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:2147483647;font:14px/1.45 system-ui,sans-serif;';
        var box=document.createElement('div');
        box.style.cssText='width:380px;max-width:88vw;background:linear-gradient(145deg, #4a2c82, #29154f) !important;border:1px solid #6c46b5 !important;border-radius:12px !important;box-shadow:0 24px 70px rgba(0,0,0,.7) !important;overflow:hidden !important;';
        var h=document.createElement('div');
        h.textContent=title;
        h.style.cssText='padding:16px 18px 6px !important;color:#42d3a5 !important;font-size:15px !important;font-weight:700 !important;';
        box.appendChild(h);
        if(sub){
            var s=document.createElement('div');
            s.textContent=sub;
            s.style.cssText='padding:0 18px 4px !important;color:#d1d5db !important;font-size:13px !important;';
            box.appendChild(s);
        }
        ov.appendChild(box);
        document.body.appendChild(ov);
        return {ov:ov,box:box};
    }
    
    function btnRow(box){
        var r=document.createElement('div');
        r.style.cssText='display:flex;gap:8px;justify-content:flex-end;padding:14px 18px 16px;';
        box.appendChild(r);
        return r;
    }
    
    function mkBtn(label,primary){
        var b=document.createElement('button');
        b.textContent=label;
        b.style.cssText='padding:8px 16px !important;border-radius:7px !important;font:600 13px system-ui,sans-serif !important;cursor:pointer !important;border:1px solid '+(primary?'#42d3a5':'#6c46b5')+' !important;background:'+(primary?'#42d3a5':'transparent')+' !important;color:'+(primary?'#000000':'#ffffff')+' !important;';
        return b;
    }
    
    function modalAlert(title,msg,cb){
        var s=shell(title,msg);
        var r=btnRow(s.box);
        var okb=mkBtn('OK',1);
        okb.onclick=function(){killOv();if(cb){cb();}};
        r.appendChild(okb);
        okb.focus();
        s.ov.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();okb.click();}});
    }
    
    function modalPrompt(label,cb){
        var s=shell('Preencher campo','Informe o valor de '+label+':');
        var inp=document.createElement('input');
        inp.type='text';
        inp.style.cssText='display:block;width:calc(100% - 36px) !important;margin:10px 18px 2px !important;padding:10px 12px !important;background:rgba(0,0,0,0.25) !important;border:1px solid #6c46b5 !important;border-radius:7px !important;color:#ffffff !important;font-size:14px !important;outline:none !important;';
        inp.onfocus=function(){inp.style.setProperty('border-color', '#42d3a5', 'important');};
        inp.onblur=function(){inp.style.setProperty('border-color', '#6c46b5', 'important');};
        s.box.appendChild(inp);
        var r=btnRow(s.box);
        var cb2=mkBtn('Cancelar');
        var okb=mkBtn('Confirmar',1);
        r.appendChild(cb2);
        r.appendChild(okb);
        cb2.onclick=function(){killOv();cb(null);};
        okb.onclick=function(){
            var v=inp.value.trim();
            if(!v){inp.style.setProperty('border-color', '#f87171', 'important');inp.focus();return;}
            killOv();cb(v);
        };
        inp.addEventListener('keydown',function(e){
            if(e.key==='Enter'){e.preventDefault();okb.click();}
            if(e.key==='Escape'){e.preventDefault();cb2.click();}
        });
        setTimeout(function(){inp.focus();},30);
    }
    
    function modalChoice(label,opts,cb){
        var s=shell(label,'Selecione uma opção:');
        var wrap=document.createElement('div');
        wrap.style.cssText='display:flex;flex-direction:column;gap:8px;padding:10px 18px 2px;';
        opts.forEach(function(o,i){
            var b=document.createElement('div');
            b.style.cssText='padding:11px 13px !important;border:1px solid #6c46b5 !important;border-radius:8px !important;background:rgba(0,0,0,0.25) !important;color:#e6e6e6 !important;font-size:13px !important;cursor:pointer !important;transition:all 0.15s !important;';
            b.innerHTML='<div style="font-weight:600;margin-bottom:3px;">'+(i+1)+' - '+esch(o.l)+'</div><div style="color:#d1d5db;font-size:12px;line-height:1.4;">'+esch(stripB(o.v))+'</div>';
            b.onmouseenter=function(){b.style.setProperty('border-color', '#42d3a5', 'important');b.style.setProperty('background', '#42d3a5', 'important');b.style.setProperty('color', '#000000', 'important');};
            b.onmouseleave=function(){b.style.setProperty('border-color', '#6c46b5', 'important');b.style.setProperty('background', 'rgba(0,0,0,0.25)', 'important');b.style.setProperty('color', '#e6e6e6', 'important');};
            b.onclick=function(){killOv();cb(o.v);};
            wrap.appendChild(b);
        });
        s.box.appendChild(wrap);
        var r=btnRow(s.box);
        var cb2=mkBtn('Cancelar');
        r.appendChild(cb2);
        cb2.onclick=function(){killOv();cb(null);};
        s.ov.setAttribute('tabindex','-1');
        s.ov.addEventListener('keydown',function(e){
            if(e.key==='Escape'){e.preventDefault();cb2.click();return;}
            var n=parseInt(e.key,10);
            if(n>=1&&n<=opts.length){e.preventDefault();killOv();cb(opts[n-1].v);}
        });
        setTimeout(function(){s.ov.focus();},30);
    }
    
    function modalCopy(raw,cb){
        var s=shell('Inserção automática falhou','O texto foi copiado. Clique no campo Relato e pressione Ctrl+V.');
        var ta=document.createElement('textarea');
        ta.value=stripB(raw);
        ta.rows=6;
        ta.style.cssText='display:block;width:calc(100% - 36px) !important;margin:10px 18px 2px !important;padding:10px 12px !important;background:rgba(0,0,0,0.25) !important;border:1px solid #6c46b5 !important;border-radius:7px !important;color:#ffffff !important;font:12px/1.5 ui-monospace,monospace !important;resize:vertical !important;outline:none !important;';
        s.box.appendChild(ta);
        var r=btnRow(s.box);
        var okb=mkBtn('Fechar',1);
        r.appendChild(okb);
        okb.onclick=function(){killOv();if(cb){cb();}};
        ta.focus();
        ta.select();
    }
    
    function toast(msg,bad){
        var t=document.createElement('div');
        t.textContent=msg;
        t.style.cssText='position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:'+(bad?'#fbbf24':'#42d3a5')+' !important;color:#0b1220 !important;padding:10px 16px !important;border-radius:8px !important;font:600 13px/1.3 system-ui,sans-serif !important;z-index:2147483647 !important;box-shadow:0 4px 16px rgba(0,0,0,.4) !important;max-width:80vw !important;text-align:center !important;';
        document.body.appendChild(t);
        setTimeout(function(){t.remove();},bad?4200:1800);
    }
    
    var panel=document.createElement('div');
    panel.id=PID;
    
    panel.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:360px !important;max-height:80vh !important;display:flex !important;flex-direction:column !important;background:linear-gradient(145deg, #4a2c82, #29154f) !important;color:#ffffff !important;border:1px solid #6c46b5 !important;border-radius:12px !important;box-shadow:0 16px 60px rgba(0,0,0,.6) !important;font:14px/1.4 system-ui,sans-serif !important;z-index:2147483646 !important;overflow:hidden !important;';
    
    var head=document.createElement('div');
    head.style.cssText='padding:18px 16px 4px !important;color:#42d3a5 !important;font-size:16px !important;font-weight:700 !important;text-align:center !important;';
    
    var search=document.createElement('input');
    search.type='text';
    search.placeholder='Digite o número e pressione Enter...';
    search.style.cssText='margin:12px 16px 8px !important;width:calc(100% - 32px) !important;padding:10px 14px !important;background:rgba(0,0,0,0.25) !important;border:1px solid #6c46b5 !important;border-radius:6px !important;color:#ffffff !important;font-size:13px !important;outline:none !important; transition: all 0.2s ease !important;box-sizing:border-box !important;';
    
    search.onfocus=function(){search.style.setProperty('border-color', '#42d3a5', 'important');};
    search.onblur=function(){search.style.setProperty('border-color', '#6c46b5', 'important');};
    
    var list=document.createElement('div');
    list.style.cssText='overflow-y:auto !important;padding:4px 0 8px !important;display:flex !important;flex-direction:column !important;scrollbar-width:thin !important;scrollbar-color:#6c46b5 transparent !important;';
    var path=[];
    var current=[];
    var busy=false;
    
    function close(){killOv();var p=document.getElementById(PID);if(p){p.remove();}}
    
    function row(label,fn,color){
        var b=document.createElement('div');
        b.textContent=label;
        b.style.cssText='padding:12px 16px !important;border-bottom:1px solid rgba(255,255,255,0.06) !important;color:'+(color||'#e6e6e6')+' !important;font-size:14px !important;cursor:pointer !important;transition:all 0.15s !important;';
        
        b.onmouseenter=function(){
            b.style.setProperty('background', '#42d3a5', 'important');
            b.style.setProperty('color', '#000000', 'important');
            b.style.setProperty('font-weight', '600', 'important');
            b.style.setProperty('padding-left', '22px', 'important');
        };
        b.onmouseleave=function(){
            b.style.setProperty('background', 'transparent', 'important');
            b.style.setProperty('color', (color||'#e6e6e6'), 'important');
            b.style.setProperty('font-weight', '400', 'important');
            b.style.setProperty('padding-left', '16px', 'important');
        };
        b.onclick=fn;
        list.appendChild(b);
    }
    
    function nodeList(){
        var arr=MENU;
        for(var i=0;i<path.length;i++){arr=arr[path[i]].items;}
        return arr;
    }
    
    function crumb(){
        var arr=MENU;
        var s=[];
        for(var i=0;i<path.length;i++){s.push(arr[path[i]].t);arr=arr[path[i]].items;}
        return s.length?s.join(' › '):'Relatos Rápidos';
    }
    
    function doInsert(raw){
        busy=true;
        head.textContent='Inserindo...';
        insertText(raw,function(good,el){
            busy=false;
            if(good){toast('Inserido ✓');close();return;}
            copyRich(raw,function(okc){
                if(el){caretEnd(el);}
                if(okc){toast('Copiado — pressione Ctrl+V no campo Relato',1);close();}
                else{modalCopy(raw,close);}
            });
        });
    }
    
    function pick(item){
        if(busy){return;}
        var specs=[];
        var re=/\{\{([^}]+)\}\}/g;
        var mm;
        while((mm=re.exec(item.m))!==null){if(specs.indexOf(mm[1])<0){specs.push(mm[1]);}}
        var txt=item.m;
        var i=0;
        function apply(spec,v){txt=txt.split('{{'+spec+'}}').join(v);i++;next();}
        function next(){
            if(i>=specs.length){doInsert(txt);return;}
            var spec=specs[i];
            var bits=spec.split('|');
            var name=bits[0];
            if(bits.length>1){
                var opts=[];
                for(var k=1;k<bits.length;k++){
                    var p=bits[k];
                    var eq=p.indexOf('=');
                    var o=eq>=0?{l:p.slice(0,eq),v:p.slice(eq+1)}:{l:p,v:p};
                    opts.push(o);
                }
                modalChoice(name,opts,function(v){if(v===null){return;}apply(spec,v);});
            }else{
                modalPrompt(name,function(v){
                    if(v===null){return;}
                    if(/HOR[ÁA]RIO/i.test(name)){v=formatTime(v);}
                    apply(spec,v);
                });
            }
        }
        next();
    }
    
    function render(){
        list.innerHTML='';
        current=[];
        head.textContent=crumb();
        var arr=nodeList();
        if(path.length){row('0 - Voltar',function(){path.pop();render();});}else{row('0 - Fechar',close,'#f87171');}
        arr.forEach(function(it,i){
            var fn=it.items?function(){path.push(i);render();}:function(){pick(it);};
            current.push(fn);
            row((i+1)+' - '+it.t+(it.items?'  ›':''),fn);
        });
        search.value='';
        search.focus();
    }
    
    search.addEventListener('keydown',function(e){
        if(e.key!=='Enter'){return;}
        e.preventDefault();
        var v=search.value.trim();
        if(!/^\d+$/.test(v)){return;}
        var n=parseInt(v,10);
        if(n===0){if(path.length){path.pop();render();}else{close();}return;}
        if(n>=1&&n<=current.length){current[n-1]();}
    });
    
    panel.appendChild(head);
    panel.appendChild(search);
    panel.appendChild(list);
    document.body.appendChild(panel);
    render();
    
    document.addEventListener('keydown',function esc2(e){
        if(e.key==='Escape'){if(document.getElementById(OV)){return;}close();document.removeEventListener('keydown',esc2);}
    });
})();