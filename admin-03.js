        /* ================= DADOS, CONFORMIDADE E CONTROLE DO PAINEL (só o e-mail raiz) ================= */

        const RULES_TEMPLATE = "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n\n    function signedIn() { return request.auth != null && request.auth.token.email != null; }\n    function mail() { return request.auth.token.email.lower(); }\n\n    function temCargo() { return signedIn() && exists(/databases/$(database)/documents/cargos/$(mail())); }\n    function nivelCargo() { return get(/databases/$(database)/documents/cargos/$(mail())).data.nivel; }\n\n    function isAdmin() {\n      return signedIn() && (mail() == 'kevin.silva10@aluno.ifce.edu.br' || (temCargo() && nivelCargo() == 'admin'));\n    }\n    function isDiretoria() {\n      return isAdmin() || (temCargo() && nivelCargo() in ['membro', 'marketing']);\n    }\n    // Aluno s\u00f3 acessa se o cadastro existir e estiver ativo (bloqueio vale de verdade).\n    // Modo manuten\u00e7\u00e3o: quando ligado (config/sistema), s\u00f3 a diretoria acessa os dados.\n    function emManutencao() {\n      return exists(/databases/$(database)/documents/config/sistema) &&\n        get(/databases/$(database)/documents/config/sistema).data.manutencao == true;\n    }\n    function ativo() {\n      return isDiretoria() || (signedIn() && !emManutencao() &&\n        exists(/databases/$(database)/documents/alunos/$(mail())) &&\n        get(/databases/$(database)/documents/alunos/$(mail())).data.ativo == true);\n    }\n    function isMkt() { return isAdmin() || (temCargo() && nivelCargo() == 'marketing'); }\n    function isGestor() { return isAdmin() || (temCargo() && nivelCargo() == 'membro'); }\n    function isRoot() { return signedIn() && mail() == 'kevin.silva10@aluno.ifce.edu.br'; }\n    function onlyKeys(keys) {\n      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys);\n    }\n\n    match /cargos/{email} {\n      allow read: if signedIn() && (mail() == email || isDiretoria());\n      allow create, update: if isAdmin() && request.resource.data.nivel in ['admin', 'membro', 'marketing'];\n      allow delete: if isAdmin();\n    }\n\n    match /alunos/{email} {\n      allow read: if isAdmin() || (signedIn() && mail() == email);\n      allow write: if isAdmin();\n    }\n\n    match /mural/{id} {\n      allow read: if ativo();\n      allow write: if isMkt();\n    }\n\n    match /enquetes/{id} {\n      allow read: if ativo();\n      allow create, delete: if isDiretoria();\n      allow update: if isDiretoria() || (ativo() && onlyKeys(['votosAlunos', 'opcoes']));\n    }\n\n    match /reivindicacoes/{id} {\n      allow read: if ativo();\n      allow create: if ativo();\n      allow update: if isAdmin() || (ativo() && onlyKeys(['apoios']));\n      allow delete: if isAdmin();\n    }\n\n    match /materiais/{id} {\n      allow read: if ativo();\n      allow create, delete: if isGestor();\n      allow update: if isGestor() || (ativo() && onlyKeys(['status', 'emprestadoPara'])\n        && resource.data.status == 'Dispon\u00edvel' && request.resource.data.status == 'Solicitado');\n    }\n\n    match /eventos/{id} {\n      allow read: if ativo();\n      allow create, delete: if isGestor();\n      allow update: if isGestor() || (ativo() && onlyKeys(['inscritos']));\n    }\n\n    match /jogos/{id} {\n      allow read: if ativo();\n      allow write: if isGestor();\n    }\n\n    match /sugestoes/{id} {\n      allow create: if ativo() && request.resource.data.email == mail();\n      allow read: if isAdmin() || (ativo() && resource.data.email == mail());\n      allow update, delete: if isAdmin();\n    }\n\n    match /config/{id} {\n      allow read: if signedIn();\n      allow write: if isRoot();\n    }\n\n    // Erros que o portal dos alunos reporta sozinho (s\u00f3 o TI l\u00ea).\n    match /erros_app/{id} {\n      allow create: if ativo() && request.resource.data.keys().hasOnly(['email', 'msg', 'pagina', 'ua', 'em'])\n        && request.resource.data.email == mail() && request.resource.data.msg.size() < 400;\n      allow read, delete: if isRoot();\n    }\n\n    // Anota\u00e7\u00f5es privadas do TI.\n    match /ti_privado/{id} {\n      allow read, write: if isRoot();\n    }\n\n    // Tarefas por cargo: a presid\u00eancia atribui; cada diretor s\u00f3 l\u00ea e conclui as suas.\n    match /tarefas/{id} {\n      allow read: if isAdmin() || (isDiretoria() && resource.data.atribuidoPara == mail());\n      allow create, delete: if isAdmin();\n      allow update: if isAdmin() || (isDiretoria() && resource.data.atribuidoPara == mail() && onlyKeys(['status', 'concluidaEm']));\n    }\n\n    match /atas/{id} {\n      allow read, write: if isAdmin();\n    }\n\n    match /divulgacoes/{id} {\n      allow read, write: if isMkt();\n    }\n\n    match /artes/{id} {\n      allow read, write: if isMkt();\n    }\n\n    // V\u00eddeos de aula pr\u00e1tica (arquivos ficam no Firebase Storage).\n    match /videos/{id} {\n      allow read: if ativo();\n      allow write: if isMkt();\n    }\n\n    // Pedidos de ajuda ao TI: o diretor cria e l\u00ea os seus; s\u00f3 o TI responde.\n    match /chamados/{id} {\n      allow create: if isDiretoria() && request.resource.data.autorEmail == mail() && request.resource.data.status == 'Aberto'\n        && request.resource.data.keys().hasOnly(['categoria', 'descricao', 'autorEmail', 'autorNome', 'cargo', 'status', 'criadoEm']);\n      allow read: if isRoot() || (isDiretoria() && resource.data.autorEmail == mail());\n      allow update, delete: if isRoot();\n    }\n\n    // Quando cada aluno entrou pela \u00faltima vez (s\u00f3 o TI l\u00ea).\n    match /acessos/{email} {\n      allow create, update: if ativo() && mail() == email && request.resource.data.keys().hasOnly(['ultimoAcesso', 'total', 'nome']);\n      allow read, delete: if isRoot();\n    }\n\n    // Aceite do termo de uso.\n    match /aceites/{email} {\n      allow create, update: if ativo() && mail() == email && request.resource.data.keys().hasOnly(['versao', 'em', 'nome']);\n      allow read: if isRoot() || (signedIn() && mail() == email);\n      allow delete: if isRoot();\n    }\n\n    // \u00daltimo acesso de cada diretor ao painel (s\u00f3 o TI l\u00ea).\n    match /acessos_painel/{email} {\n      allow create, update: if isDiretoria() && mail() == email && request.resource.data.keys().hasOnly(['ultimoAcesso', 'total', 'nome', 'cargo']);\n      allow read: if isRoot();\n    }\n\n    match /membros_punidos/{email} {\n      allow read: if isDiretoria();\n      allow write: if isAdmin();\n    }\n\n    match /acoes_admin/{id} {\n      allow create: if isDiretoria();\n      allow read: if isAdmin();\n      allow delete: if isRoot();\n    }\n  }\n}\n";
        const COLECOES_EDITOR = ['alunos', 'cargos', 'mural', 'enquetes', 'reivindicacoes', 'materiais', 'eventos', 'jogos', 'sugestoes', 'videos', 'tarefas', 'atas', 'divulgacoes', 'artes', 'chamados', 'membros_punidos', 'acessos', 'aceites', 'acessos_painel', 'config', 'ti_privado'];

        function preencherEditor() {
            document.getElementById('ed-col').innerHTML = COLECOES_EDITOR.map(c => `<option>${c}</option>`).join('');
        }
        function serializar(v) {
            if (v && typeof v.toDate === 'function') return { __ts: v.toDate().toISOString() };
            if (Array.isArray(v)) return v.map(serializar);
            if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serializar(x)]));
            return v;
        }
        function desserializar(v) {
            if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.__ts === 'string') return firebase.firestore.Timestamp.fromDate(new Date(v.__ts));
            if (Array.isArray(v)) return v.map(desserializar);
            if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, desserializar(x)]));
            return v;
        }
        async function editorListar() {
            if (!soRaiz()) return;
            const col = document.getElementById('ed-col').value, box = document.getElementById('ed-lista');
            box.textContent = 'Carregando...';
            try {
                const snap = await db.collection(col).limit(60).get();
                box.innerHTML = snap.empty ? '<span class="text-muted-custom">Coleção vazia.</span>' : snap.docs.map(d => `<button class="btn btn-outline-secondary btn-sm py-0 me-1 mb-1" style="font-size: 11px;" data-acao="editorEscolher" data-id="${esc(d.id)}">${esc(d.id.length > 38 ? d.id.slice(0, 36) + '…' : d.id)}</button>`).join('') + (snap.size === 60 ? '<div class="text-muted-custom">Mostrando os 60 primeiros.</div>' : '');
            } catch (e) { box.textContent = ''; erroDB(e, 'editorListar'); }
        }
        async function editorAbrir() {
            if (!soRaiz()) return;
            const col = document.getElementById('ed-col').value, id = document.getElementById('ed-id').value.trim();
            if (!id) { toast('Informe o ID do documento.', 'warning'); return; }
            try {
                const d = await db.collection(col).doc(id).get();
                document.getElementById('ed-json').value = d.exists ? JSON.stringify(serializar(d.data()), null, 2) : '{\n  \n}';
                if (!d.exists) toast('Esse documento não existe. Se salvar, ele será criado.', 'warning');
            } catch (e) { erroDB(e, 'editorAbrir'); }
        }
        async function editorSalvar() {
            if (!soRaiz()) return;
            const col = document.getElementById('ed-col').value, id = document.getElementById('ed-id').value.trim();
            let obj;
            try { obj = desserializar(JSON.parse(document.getElementById('ed-json').value)); } catch (e) { toast('O texto não é um JSON válido.', 'danger'); return; }
            if (!id || !obj || typeof obj !== 'object' || Array.isArray(obj)) { toast('Informe o ID e um objeto JSON.', 'warning'); return; }
            if (!(await confirmar(`Substituir o documento ${col}/${id} por este conteúdo?`))) return;
            try { await db.collection(col).doc(id).set(obj); toast('Documento salvo.'); registrarAcao('Documento editado', `${col}/${id}`); }
            catch (e) { erroDB(e, 'editorSalvar'); }
        }
        async function editorExcluir() {
            if (!soRaiz()) return;
            const col = document.getElementById('ed-col').value, id = document.getElementById('ed-id').value.trim();
            if (!id) { toast('Informe o ID do documento.', 'warning'); return; }
            if (!(await confirmar(`Excluir ${col}/${id}? Não dá para desfazer.`))) return;
            try { await db.collection(col).doc(id).delete(); toast('Documento excluído.'); registrarAcao('Documento excluído', `${col}/${id}`); document.getElementById('ed-json').value = ''; }
            catch (e) { erroDB(e, 'editorExcluir'); }
        }

        async function inventarioBanco() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-inventario-medir');
            out.textContent = 'Medindo...';
            const nomes = [...new Set([...COLECOES_EDITOR, 'acoes_admin', 'erros_app'])];
            let totalDocs = 0, totalBytes = 0;
            const linhas = [];
            for (const n of nomes) {
                try {
                    const snap = await db.collection(n).get();
                    const bytes = snap.docs.reduce((t, d) => t + JSON.stringify(serializar(d.data())).length + d.id.length, 0);
                    totalDocs += snap.size; totalBytes += bytes;
                    linhas.push(`<tr><td>${n}</td><td>${snap.size}</td><td>${(bytes / 1024).toFixed(1)} KB</td></tr>`);
                } catch (e) { linhas.push(`<tr><td>${n}</td><td colspan="2" class="text-danger">${esc(e.code || 'erro')}</td></tr>`); }
            }
            const pct = (totalBytes / (1024 ** 3) * 100).toFixed(4);
            out.innerHTML = `<table class="table table-sm table-dark mb-2"><thead><tr><th>Coleção</th><th>Docs</th><th>Tamanho</th></tr></thead><tbody>${linhas.join('')}</tbody></table>
                <div><strong>${totalDocs}</strong> documento(s) • <strong>${(totalBytes / 1024).toFixed(1)} KB</strong> (${pct}% do 1 GB gratuito)</div>
                <div class="text-muted-custom mt-1" style="font-size: 11px;">Limites diários gratuitos do Firestore: 50 mil leituras e 20 mil gravações. Tamanho estimado pelo conteúdo dos documentos.</div>`;
        }

        async function apagarDadosAluno() {
            if (!soRaiz()) return;
            const email = document.getElementById('ti-lgpd-email').value.trim().toLowerCase();
            const out = document.getElementById('ti-lgpd-out');
            if (!email.includes('@')) { toast('Digite o e-mail do aluno.', 'warning'); return; }
            if (!(await confirmar(`Apagar TODOS os dados de ${email}? Isso não pode ser desfeito.`))) return;
            out.textContent = 'Apagando...';
            try {
                const FV = firebase.firestore.FieldValue;
                const [sug, rei, eve, enq, mat] = await Promise.all([
                    db.collection('sugestoes').where('email', '==', email).get(), db.collection('reivindicacoes').get(),
                    db.collection('eventos').get(), db.collection('enquetes').get(), db.collection('materiais').get()
                ]);
                const batch = db.batch(); let n = 0;
                ['alunos', 'acessos', 'aceites'].forEach(c => { batch.delete(db.collection(c).doc(email)); n++; });
                sug.docs.forEach(d => { batch.delete(d.ref); n++; });
                rei.docs.forEach(d => {
                    const x = d.data(), up = {};
                    if ((x.apoios || []).includes(email)) up.apoios = FV.arrayRemove(email);
                    if ((x.autorEmail || '').toLowerCase() === email) { up.autorEmail = ''; up.autor = 'Aluno removido'; }
                    if (Object.keys(up).length) { batch.update(d.ref, up); n++; }
                });
                eve.docs.forEach(d => { if ((d.data().inscritos || []).includes(email)) { batch.update(d.ref, { inscritos: FV.arrayRemove(email) }); n++; } });
                enq.docs.forEach(d => {
                    const v = d.data().votosAlunos || [], quem = e => (typeof e === 'string' ? e : e && e.email);
                    if (v.some(e => quem(e) === email)) {
                        batch.update(d.ref, { votosAlunos: v.map(e => (quem(e) === email ? (typeof e === 'string' ? 'removido' : { ...e, email: 'removido' }) : e)) }); n++;
                    }
                });
                mat.docs.forEach(d => { if ((d.data().emprestadoPara || '').toLowerCase().includes(email)) { batch.update(d.ref, { emprestadoPara: '(aluno removido)' }); n++; } });
                if (n > 480) throw new Error('muitos registros');
                await batch.commit();
                registrarAcao('Dados de aluno apagados (LGPD)', n + ' registros');
                document.getElementById('ti-lgpd-email').value = '';
                out.innerHTML = `✅ ${n} registro(s) alterado(s). <strong>Falta apagar a conta de login</strong> em Firebase > Authentication > Usuários (o painel não consegue fazer isso).`;
            } catch (e) { out.textContent = ''; erroDB(e, 'lgpd'); }
        }

        function gerarRegrasNovoRaiz() {
            if (!soRaiz()) return;
            const novo = document.getElementById('ti-novo-raiz').value.trim().toLowerCase();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(novo)) { toast('Digite um e-mail válido.', 'warning'); return; }
            document.getElementById('ti-regras-out').value = RULES_TEMPLATE.split(ROOT_EMAIL).join(novo);
            toast('Regras geradas. Copie e publique no Firebase.');
        }
        function copiarRegras() {
            const t = document.getElementById('ti-regras-out').value;
            if (!t) { toast('Gere as regras primeiro.', 'warning'); return; }
            (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Regras copiadas.')).catch(() => toast('Não consegui copiar. Selecione e copie manualmente.', 'warning'));
        }
        function copiarDiagnostico() {
            const corpo = document.getElementById('ti-diag').innerText.trim();
            if (!corpo) { toast('Rode o diagnóstico primeiro.', 'warning'); return; }
            const t = ['Diagnóstico do painel Grêmio IFCE', new Date().toLocaleString('pt-BR'), location.href, navigator.userAgent, '', corpo].join('\n');
            (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Relatório copiado.')).catch(() => toast('Não consegui copiar.', 'warning'));
        }

        function registrarAcessoPainel(dados) {
            try { if (sessionStorage.getItem('painel-reg:' + emailLogado)) return; sessionStorage.setItem('painel-reg:' + emailLogado, '1'); } catch (e) {}
            db.collection('acessos_painel').doc(emailLogado).set({
                ultimoAcesso: TS(), total: firebase.firestore.FieldValue.increment(1), nome: (dados && dados.nome) || '', cargo: (dados && dados.cargo) || ''
            }, { merge: true }).catch(() => {});
        }
        async function atividadeDiretoria() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-atividade');
            out.textContent = 'Calculando...';
            try {
                const [ca, ap, ta, lg] = await Promise.all([
                    db.collection('cargos').get(), db.collection('acessos_painel').get(), db.collection('tarefas').get(),
                    db.collection('acoes_admin').orderBy('em', 'desc').limit(500).get()
                ]);
                const acesso = {}; ap.docs.forEach(d => acesso[d.id] = d.data());
                const acoes = {}; lg.docs.forEach(d => { const a = d.data().autor; acoes[a] = (acoes[a] || 0) + 1; });
                const pend = {}; ta.docs.forEach(d => { const t = d.data(); if (t.status === 'Pendente') pend[t.atribuidoPara] = (pend[t.atribuidoPara] || 0) + 1; });
                const agora = Date.now();
                const linhas = ca.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.nome).localeCompare(String(b.nome))).map(c => {
                    const a = acesso[c.id], t = a && a.ultimoAcesso ? a.ultimoAcesso.toMillis() : 0;
                    const dias = t ? Math.floor((agora - t) / 864e5) : null;
                    const alerta = dias === null || dias > 14;
                    return `<tr class="${alerta ? 'text-warning' : ''}"><td>${esc(c.nome)}<br><small class="text-muted-custom">${esc(c.cargo)}</small></td><td>${dias === null ? 'nunca' : dias === 0 ? 'hoje' : dias + ' d'}</td><td>${a ? a.total || 0 : 0}</td><td>${acoes[c.id] || 0}</td><td>${pend[c.id] || 0}</td></tr>`;
                });
                out.innerHTML = '<table class="table table-sm table-dark mb-1"><thead><tr><th>Diretor</th><th>Último acesso</th><th>Acessos</th><th>Ações</th><th>Tarefas pend.</th></tr></thead><tbody>' + linhas.join('') + '</tbody></table><div class="text-muted-custom" style="font-size: 11px;">Acessos contam a partir desta versão do painel. Ações = últimas 500 do log.</div>';
            } catch (e) { out.textContent = ''; erroDB(e, 'atividade'); }
        }


        /* ================= ANÁLISE, COMUNICAÇÃO E CONFORMIDADE (só o e-mail raiz) ================= */

        let adocaoNunca = [];
        async function calcularAdocao() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-adocao');
            out.textContent = 'Calculando...';
            try {
                const [al, ac] = await Promise.all([db.collection('alunos').get(), db.collection('acessos').get()]);
                const mapa = {}; ac.docs.forEach(d => mapa[d.id] = d.data());
                const ativos = al.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => a.ativo);
                const agora = Date.now();
                const ms = a => (mapa[a.id] && mapa[a.id].ultimoAcesso ? mapa[a.id].ultimoAcesso.toMillis() : 0);
                const entraram = ativos.filter(a => ms(a)), s7 = ativos.filter(a => ms(a) > agora - 7 * 864e5), s30 = ativos.filter(a => ms(a) > agora - 30 * 864e5);
                adocaoNunca = ativos.filter(a => !ms(a));
                const pct = n => (ativos.length ? Math.round(n / ativos.length * 100) : 0) + '%';
                const turmas = {};
                ativos.forEach(a => { const t = a.turma || 'Sem turma'; turmas[t] = turmas[t] || { total: 0, entrou: 0 }; turmas[t].total++; if (ms(a)) turmas[t].entrou++; });
                const caixa = (n, t) => `<div class="col-6 col-md-3"><div class="p-2 rounded text-center" style="background: #121a14; border: 1px solid var(--ifce-card-border);"><div class="fs-5 fw-bold" style="color: var(--ifce-accent-green);">${n}</div><div class="text-muted-custom" style="font-size: 11px;">${t}</div></div></div>`;
                out.innerHTML = `<div class="row g-2 mb-3">${caixa(ativos.length, 'alunos ativos')}${caixa(entraram.length + ' (' + pct(entraram.length) + ')', 'já entraram')}${caixa(s7.length + ' (' + pct(s7.length) + ')', 'últimos 7 dias')}${caixa(s30.length + ' (' + pct(s30.length) + ')', 'últimos 30 dias')}</div>` +
                    '<table class="table table-sm table-dark mb-2"><thead><tr><th>Turma</th><th>Entraram</th><th>Total</th></tr></thead><tbody>' +
                    Object.entries(turmas).sort().map(([t, v]) => `<tr><td>${esc(t)}</td><td>${v.entrou}</td><td>${v.total}</td></tr>`).join('') + '</tbody></table>' +
                    (adocaoNunca.length ? `<button onclick="baixarNuncaEntraram()" class="btn btn-outline-light btn-sm">⬇️ Baixar lista de quem nunca entrou (${adocaoNunca.length})</button> <button data-acao="senhaNunca" class="btn btn-outline-info btn-sm mt-1">✉️ Enviar link de senha a quem nunca entrou (${Math.min(adocaoNunca.length, 50)})</button>` : '<div class="text-success fw-bold">Todos os alunos ativos já entraram! 🎉</div>') +
                    '<div class="text-muted-custom mt-2" style="font-size: 11px;">Só conta acessos a partir da versão nova do portal.</div>';
            } catch (e) { out.textContent = ''; erroDB(e, 'adocao'); }
        }
        function baixarNuncaEntraram() {
            if (!soRaiz() || !adocaoNunca.length) return;
            baixarCSV(`nunca_entraram_${hojeISO()}.csv`, [['Nome', 'E-mail', 'Turma'], ...adocaoNunca.map(a => [a.nome, a.email || a.id, a.turma || ''])]);
        }

        async function buscaGlobal() {
            if (!soRaiz()) return;
            const termo = document.getElementById('ti-busca').value.trim().toLowerCase();
            const out = document.getElementById('ti-busca-out');
            if (termo.length < 2) { toast('Digite pelo menos 2 letras.', 'warning'); return; }
            out.textContent = 'Buscando...';
            const defs = [
                ['alunos', '🎓 Alunos', d => [d.nome, d.email, d.turma], d => `${d.nome} — ${d.email}`],
                ['sugestoes', '💡 Sugestões', d => [d.texto, d.nome, d.email, d.resposta], d => `${d.nome}: ${d.texto}`],
                ['reivindicacoes', '✊ Pautas', d => [d.titulo, d.descricao, d.autor], d => d.titulo],
                ['mural', '📢 Mural', d => [d.titulo, d.mensagem], d => d.titulo],
                ['eventos', '📅 Eventos', d => [d.titulo, d.descricao], d => d.titulo],
                ['materiais', '🎲 Materiais', d => [d.nome, d.emprestadoPara], d => `${d.nome} (${d.status})`],
                ['videos', '🎬 Vídeos', d => [d.titulo, d.descricao], d => d.titulo],
                ['atas', '📝 Atas', d => [d.titulo, d.pauta, d.decisoes], d => d.titulo],
                ['chamados', '📨 Pedidos de ajuda', d => [d.descricao, d.autorNome, d.autorEmail], d => `${d.autorNome}: ${d.descricao}`]
            ];
            const res = await Promise.all(defs.map(async ([c, rot, campos, titulo]) => {
                try {
                    const s = await db.collection(c).limit(500).get();
                    return [rot, s.docs.map(d => d.data()).filter(d => campos(d).some(v => String(v || '').toLowerCase().includes(termo))).map(titulo)];
                } catch (e) { return [rot, null]; }
            }));
            const achou = res.filter(([, l]) => l && l.length);
            out.innerHTML = achou.length ? achou.map(([rot, l]) => `<div class="mb-2"><strong class="text-white">${rot}</strong> <span class="badge bg-info text-dark">${l.length}</span>${l.slice(0, 8).map(t => `<div class="text-muted-custom">• ${esc(String(t).slice(0, 110))}</div>`).join('')}${l.length > 8 ? '<div class="text-muted-custom">... e mais ' + (l.length - 8) + '</div>' : ''}</div>`).join('')
                : '<div class="text-muted-custom">Nada encontrado.</div>';
        }

        async function gerarBalanco() {
            if (!soRaiz()) return;
            try {
                const nomes = ['alunos', 'cargos', 'eventos', 'reivindicacoes', 'sugestoes', 'enquetes', 'jogos', 'tarefas', 'videos', 'atas', 'acessos'];
                const snaps = await Promise.all(nomes.map(n => db.collection(n).get().catch(() => ({ docs: [] }))));
                const [al, ca, ev, pa, su, en, jo, ta, vi, at, ac] = snaps.map(s => s.docs.map(d => d.data()));
                const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 20;
                const checar = n => { if (y + n > 285) { doc.addPage(); y = 20; } };
                const linha = t => doc.splitTextToSize(String(t), 170).forEach(p => { checar(6); doc.text(p, 20, y); y += 6; });
                const titulo = t => { checar(14); y += 3; doc.setFont('Helvetica', 'bold'); doc.setFontSize(13); doc.text(t, 20, y); y += 8; doc.setFont('Helvetica', 'normal'); doc.setFontSize(11); };
                doc.setFont('Helvetica', 'bold'); doc.setFontSize(16); doc.text('Grêmio Estudantil - IFCE Crateús', 20, y); y += 9;
                doc.setFontSize(12); doc.text('Balanço da gestão - ' + new Date().toLocaleDateString('pt-BR'), 20, y); y += 8; doc.setFont('Helvetica', 'normal'); doc.setFontSize(11);
                titulo('Diretoria');
                ca.forEach(c => linha(`- ${c.nome} (${c.cargo})`));
                titulo('Alunos e uso do portal');
                const ativos = al.filter(a => a.ativo).length, entraram = ac.filter(a => a.ultimoAcesso).length;
                linha(`Alunos ativos: ${ativos} | Já acessaram o portal: ${entraram}`);
                titulo('Eventos');
                linha(`Eventos criados: ${ev.length} | Inscrições totais: ${ev.reduce((t, e) => t + (e.inscritos || []).length, 0)}`);
                titulo('Pautas dos alunos');
                const st = s => pa.filter(p => (p.status || 'Em análise') === s).length;
                linha(`Total: ${pa.length} | Em análise: ${st('Em análise')} | Encaminhadas: ${st('Encaminhada')} | Resolvidas: ${st('Resolvida')}`);
                linha(`Apoios somados: ${pa.reduce((t, p) => t + (p.apoios || []).length, 0)}`);
                titulo('Sugestões');
                linha(`Recebidas: ${su.length} | Respondidas: ${su.filter(x => x.resposta).length}`);
                titulo('Enquetes e jogos');
                linha(`Enquetes: ${en.length} (votos: ${en.reduce((t, e) => t + (e.votosAlunos || []).length, 0)}) | Jogos registrados: ${jo.length}`);
                titulo('Organização interna');
                linha(`Tarefas: ${ta.length} (concluídas: ${ta.filter(t => t.status === 'Concluída').length}) | Atas: ${at.length} | Vídeos: ${vi.length}`);
                pdfFinalizar(doc, `balanco_gremio_${hojeISO()}.pdf`);
                registrarAcao('Balanço da gestão gerado', '');
            } catch (e) { erroDB(e, 'balanco'); }
        }

        function carregarTermoTI() {
            ouvir(db.collection('config').doc('sistema'), doc => {
                const t = doc.exists ? doc.data().termo : null;
                const campo = document.getElementById('ti-termo');
                if (campo && document.activeElement !== campo) campo.value = t ? t.texto : '';
                const out = document.getElementById('ti-termo-out');
                if (out && !out.dataset.fixo) out.innerHTML = t ? `<span class="text-success">Termo ativo (versão de ${esc(new Date(t.versao).toLocaleDateString('pt-BR'))}).</span>` : '<span class="text-muted-custom">Nenhum termo ativo.</span>';
            });
        }
        async function publicarTermo() {
            if (!soRaiz()) return;
            const texto = document.getElementById('ti-termo').value.trim();
            if (texto.length < 30) { toast('Escreva o termo completo (mínimo de 30 letras).', 'warning'); return; }
            if (!(await confirmar('Publicar esta versão? Todos os alunos terão que aceitar de novo no próximo acesso.'))) return;
            try {
                await db.collection('config').doc('sistema').set({ termo: { texto, versao: Date.now() } }, { merge: true });
                registrarAcao('Termo de uso publicado', '');
                toast('Termo publicado.');
            } catch (e) { erroDB(e, 'publicarTermo'); }
        }
        async function removerTermo() {
            if (!soRaiz()) return;
            if (!(await confirmar('Remover o termo? Os alunos deixam de ver a tela de aceite.'))) return;
            try { await db.collection('config').doc('sistema').set({ termo: firebase.firestore.FieldValue.delete() }, { merge: true }); registrarAcao('Termo de uso removido', ''); toast('Termo removido.'); }
            catch (e) { erroDB(e, 'removerTermo'); }
        }
        async function verAceites() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-termo-out'); out.dataset.fixo = '1';
            try {
                const [cfg, al, ac] = await Promise.all([db.collection('config').doc('sistema').get(), db.collection('alunos').get(), db.collection('aceites').get()]);
                const t = cfg.exists ? cfg.data().termo : null;
                if (!t) { out.textContent = 'Não há termo publicado.'; return; }
                const aceitou = new Set(ac.docs.filter(d => Number(d.data().versao) === Number(t.versao)).map(d => d.id));
                const pend = al.docs.filter(d => d.data().ativo && !aceitou.has(d.id));
                out.innerHTML = `✅ Aceitaram a versão atual: <strong>${aceitou.size}</strong> • ⏳ Pendentes: <strong>${pend.length}</strong>` +
                    (pend.length ? `<div class="text-muted-custom mt-1">${pend.slice(0, 15).map(d => esc(d.data().nome || d.id)).join(', ')}${pend.length > 15 ? '...' : ''}</div>` : '');
            } catch (e) { erroDB(e, 'verAceites'); }
        }

        function carregarNovidades() {
            ouvir(db.collection('config').doc('sistema'), doc => {
                const lista = (doc.exists && doc.data().novidades) || [];
                const c = document.getElementById('lista-novidades');
                c.innerHTML = lista.length ? '<ul class="list-unstyled mb-0">' + lista.slice(0, 6).map(n => `<li class="mb-2 small text-white">🆕 ${esc(n.texto)} <span class="text-muted-custom" style="font-size: 11px;">(${esc(new Date(n.em).toLocaleDateString('pt-BR'))})</span></li>`).join('') + '</ul>'
                    : '<p class="text-muted-custom small mb-0">Nenhuma novidade no momento.</p>';
                const t = document.getElementById('lista-novidades-ti');
                if (t) t.innerHTML = lista.map((n, i) => `<div class="d-flex justify-content-between align-items-center mb-1"><span class="text-white">${esc(n.texto)}</span><button data-acao="excluirNovidade" data-id="${i}" class="btn btn-outline-danger btn-sm py-0 ms-2" style="font-size: 11px;">Excluir</button></div>`).join('');
            });
        }
        async function publicarNovidade() {
            if (!soRaiz()) return;
            const texto = document.getElementById('ti-novidade').value.trim();
            if (!texto) { toast('Escreva a novidade.', 'warning'); return; }
            try {
                const ref = db.collection('config').doc('sistema');
                const atual = ((await ref.get()).data() || {}).novidades || [];
                await ref.set({ novidades: [{ texto, em: new Date().toISOString() }, ...atual].slice(0, 15) }, { merge: true });
                document.getElementById('ti-novidade').value = '';
                toast('Novidade publicada para a diretoria.');
            } catch (e) { erroDB(e, 'novidade'); }
        }

        function gerarQR() {
            const url = document.getElementById('ti-qr-url').value.trim();
            const box = document.getElementById('ti-qr'); box.innerHTML = '';
            if (!/^https:\/\//i.test(url)) { toast('O endereço precisa começar com https://', 'warning'); return; }
            if (typeof QRCode === 'undefined') { toast('A biblioteca do QR não carregou. Verifique a internet.', 'danger'); return; }
            new QRCode(box, { text: url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
        }
        function baixarQR() {
            const c = document.querySelector('#ti-qr canvas'), i = document.querySelector('#ti-qr img');
            const src = c ? c.toDataURL('image/png') : (i ? i.src : null);
            if (!src) { toast('Gere o QR primeiro.', 'warning'); return; }
            const a = document.createElement('a'); a.href = src; a.download = 'qr_portal_gremio.png'; a.click();
        }
        function copiarConvite() {
            const url = document.getElementById('ti-qr-url').value.trim();
            const texto = `Olá! 👋 O Grêmio Estudantil do IFCE Crateús tem um portal para você ver avisos, votar em enquetes, apoiar pautas, pedir materiais e acompanhar eventos e jogos.\n\n🔗 ${url}\n\nEntre com seu e-mail institucional e a senha que você recebeu. Se esquecer a senha, toque em "Esqueci minha senha" na tela de entrada.`;
            (navigator.clipboard ? navigator.clipboard.writeText(texto) : Promise.reject()).then(() => toast('Convite copiado! Cole no WhatsApp.')).catch(() => toast('Não consegui copiar. Copie manualmente.', 'warning'));
        }

        /* ================= MANUTENÇÃO AVANÇADA (só o e-mail raiz) ================= */

        let ultimasCredenciais = [];
        function gerarSenha(n = 8) {
            const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            const b = new Uint32Array(n); crypto.getRandomValues(b);
            return Array.from(b, x => abc[x % abc.length]).join('');
        }
        function baixarCredenciais() {
            if (!soRaiz()) return;
            if (!ultimasCredenciais.length) { toast('Não há credenciais novas para baixar.', 'warning'); return; }
            baixarCSV(`credenciais_${hojeISO()}.csv`, [['Nome', 'E-mail', 'Senha inicial', 'Turma'], ...ultimasCredenciais]);
        }

        async function verificarIntegridade() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-integridade');
            out.textContent = 'Verificando...';
            try {
                const q = c => db.collection(c).get();
                const [al, ca, pu, ta, ev, ma, en, jo] = await Promise.all(['alunos', 'cargos', 'membros_punidos', 'tarefas', 'eventos', 'materiais', 'enquetes', 'jogos'].map(q));
                const hoje = hojeISO(), agora = Date.now(), itens = [];
                const add = (nivel, txt, fix) => itens.push({ nivel, txt, fix });

                const semAtivo = al.docs.filter(d => typeof d.data().ativo !== 'boolean');
                if (semAtivo.length) add('warn', `${semAtivo.length} aluno(s) sem o campo "ativo" (não conseguem entrar).`, { acao: 'fixAtivo', rotulo: 'Marcar como ativos' });
                const idErrado = al.docs.filter(d => d.id !== d.id.toLowerCase() || (d.data().email && d.data().email.toLowerCase() !== d.id));
                if (idErrado.length) add('warn', `${idErrado.length} aluno(s) com ID diferente do e-mail em minúsculas: ${idErrado.slice(0, 5).map(d => d.id).join(', ')}. Recadastre-os.`);
                const semNome = al.docs.filter(d => !d.data().nome);
                if (semNome.length) add('info', `${semNome.length} aluno(s) sem nome.`);

                const dominio = al.docs.filter(d => !/@(aluno\.)?ifce\.edu\.br$/i.test(d.id));
                if (dominio.length) add('info', `${dominio.length} aluno(s) com e-mail fora do domínio do IFCE: ${dominio.slice(0, 5).map(d => d.id).join(', ')}.`);

                const nivelRuim = ca.docs.filter(d => !['admin', 'membro', 'marketing'].includes(d.data().nivel));
                if (nivelRuim.length) add('warn', `${nivelRuim.length} cargo(s) com nível inválido: ${nivelRuim.map(d => d.id).join(', ')}.`);

                const vencidas = pu.docs.filter(d => d.data().expiraEm && d.data().expiraEm.toMillis() <= agora);
                if (vencidas.length) add('info', `${vencidas.length} punição(ões) vencida(s) ainda no banco.`, { acao: 'fixPunicoes', rotulo: 'Apagar vencidas' });

                const emails = new Set(ca.docs.map(d => d.id));
                const orfas = ta.docs.filter(d => !emails.has(d.data().atribuidoPara));
                if (orfas.length) add('info', `${orfas.length} tarefa(s) de diretores que não estão mais no cargo.`, { acao: 'fixTarefas', rotulo: 'Apagar tarefas órfãs' });

                const atrasados = ma.docs.filter(d => d.data().status === 'Emprestado' && d.data().devolverAte && d.data().devolverAte < hoje);
                if (atrasados.length) add('info', `${atrasados.length} material(is) com devolução atrasada: ${atrasados.map(d => d.data().nome).join(', ')}.`);
                const legado = ma.docs.filter(d => d.data().status === 'Reservado/Em uso');
                if (legado.length) add('info', `${legado.length} material(is) com status antigo "Reservado/Em uso" (pedidos do sistema anterior).`);

                const semData = ev.docs.filter(d => !d.data().dataISO);
                if (semData.length) add('info', `${semData.length} evento(s) sem "Dia no calendário" (não ordenam nem encerram sozinhos).`);

                const votosRuins = en.docs.filter(d => { const x = d.data(); return (x.opcoes || []).reduce((t, o) => t + (o.votos || 0), 0) !== (x.votosAlunos || []).length; });
                if (votosRuins.length) add('warn', `${votosRuins.length} enquete(s) com contagem de votos que não bate com a lista de votantes: ${votosRuins.map(d => d.data().titulo).join(', ')}.`);

                const jogosSemPlacar = jo.docs.filter(d => d.data().status === 'Encerrado' && d.data().placarA === undefined);
                if (jogosSemPlacar.length) add('info', `${jogosSemPlacar.length} jogo(s) encerrado(s) sem placar.`);

                const icone = { warn: '⚠️', info: 'ℹ️' };
                out.innerHTML = itens.length
                    ? itens.map(i => `<div class="mb-2">${icone[i.nivel]} ${esc(i.txt)}${i.fix ? ` <button data-acao="${i.fix.acao}" class="btn btn-outline-info btn-sm py-0 ms-1" style="font-size: 11px;">${esc(i.fix.rotulo)}</button>` : ''}</div>`).join('')
                    : '<div class="text-success fw-bold">Nenhum problema encontrado. 🎉</div>';
            } catch (e) { out.textContent = ''; erroDB(e, 'integridade'); }
        }
        async function corrigirEm(colecao, filtro, acaoLog, fn) {
            if (!soRaiz()) return;
            try {
                const snap = await db.collection(colecao).get();
                const alvo = snap.docs.filter(d => filtro(d));
                if (!alvo.length) { toast('Nada para corrigir.', 'warning'); return; }
                if (!(await confirmar(`Corrigir ${alvo.length} registro(s)?`))) return;
                const batch = db.batch();
                alvo.forEach(d => fn(batch, d));
                await batch.commit();
                registrarAcao(acaoLog, alvo.length + ' registros');
                toast(alvo.length + ' registro(s) corrigido(s).');
                verificarIntegridade();
            } catch (e) { erroDB(e, acaoLog); }
        }

        async function aplicarPreset(nome) {
            if (!soRaiz()) return;
            const todos = ['avisos', 'enquetes', 'pautas', 'materiais', 'eventos', 'jogos', 'videos', 'ajuda', 'sugestoes'];
            const rec = {}; todos.forEach(k => rec[k] = true);
            let banner = '';
            if (nome === 'provas') { rec.pautas = false; rec.sugestoes = false; rec.materiais = false; banner = '📚 Semana de provas: boa sorte! Alguns serviços do Grêmio estão pausados.'; }
            if (nome === 'recesso') { rec.materiais = false; rec.eventos = false; rec.jogos = false; banner = '🏖️ Grêmio em recesso. Voltamos em breve!'; }
            if (!(await confirmar(`Aplicar o modo "${nome}" no portal dos alunos?`))) return;
            try {
                await db.collection('config').doc('sistema').set({ banner, recursos: rec, por: emailLogado, em: TS() }, { merge: true });
                toast('Modo "' + nome + '" aplicado.');
                registrarAcao('Modo do portal', nome);
            } catch (e) { erroDB(e, 'preset'); }
        }

        function registrarUltimoBackup() {
            db.collection('ti_privado').doc('estado').set({ ultimoBackup: TS() }, { merge: true }).then(verificarLembreteBackup).catch(() => {});
        }
        async function verificarLembreteBackup() {
            const el = document.getElementById('ti-backup-status');
            if (!el) return;
            try {
                const d = await db.collection('ti_privado').doc('estado').get();
                const t = d.exists && d.data().ultimoBackup ? d.data().ultimoBackup.toMillis() : 0;
                const dias = t ? Math.floor((Date.now() - t) / 864e5) : null;
                if (dias === null) { el.innerHTML = '<span class="text-warning fw-bold">⚠️ Nenhum backup registrado ainda.</span>'; toast('Você ainda não fez nenhum backup do sistema.', 'warning'); }
                else if (dias > 30) { el.innerHTML = `<span class="text-warning fw-bold">⚠️ Último backup há ${dias} dias.</span>`; toast(`Faz ${dias} dias do último backup.`, 'warning'); }
                else el.innerHTML = `<span class="text-success">✅ Último backup há ${dias} dia(s).</span>`;
            } catch (e) { el.textContent = 'Não foi possível verificar.'; }
        }

        const ITENS_CHECKLIST = [
            ['apikey', 'Restringi a apiKey ao domínio do site (Google Cloud > Credenciais)'],
            ['chave', 'Apaguei o serviceAccountKey.json do computador'],
            ['regras', 'Publiquei as regras mais recentes do Firestore'],
            ['posse', 'Firebase e GitHub têm 2+ donos (Grêmio e professor orientador)'],
            ['imagem', 'Combinei com a escola o uso de imagem e dados dos alunos'],
            ['sucessor', 'Defini quem será o TI da próxima gestão'],
            ['backup', 'Fiz um backup este mês']
        ];
        async function carregarChecklistTI() {
            const c = document.getElementById('ti-checklist');
            let feitos = {};
            try { const d = await db.collection('ti_privado').doc('checklist').get(); feitos = d.exists ? (d.data().feitos || {}) : {}; } catch (e) {}
            c.innerHTML = ITENS_CHECKLIST.map(([id, txt]) => `<div class="form-check mb-1"><input class="form-check-input" type="checkbox" data-chk="${id}" id="chk-${id}" ${feitos[id] ? 'checked' : ''}><label class="form-check-label" for="chk-${id}">${esc(txt)}</label></div>`).join('');
        }
        document.addEventListener('change', e => {
            const c = e.target.closest('[data-chk]');
            if (!c || !soRaiz()) return;
            db.collection('ti_privado').doc('checklist').set({ feitos: { [c.dataset.chk]: c.checked }, atualizadoEm: TS() }, { merge: true }).catch(err => erroDB(err, 'checklist'));
        });

        /* ================= PDF: RODAPÉ PADRÃO ================= */
        function pdfFinalizar(doc, arquivo) {
            const total = doc.getNumberOfPages();
            const hoje = new Date().toLocaleDateString('pt-BR');
            for (let i = 1; i <= total; i++) {
                doc.setPage(i);
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(110);
                doc.text(`Grêmio Estudantil IFCE Crateús · gerado em ${hoje}`, 20, 290);
                doc.text(`Página ${i} de ${total}`, 190, 290, { align: 'right' });
                doc.setTextColor(0);
            }
            doc.save(arquivo);
        }

        /* ================= TESOURARIA, CULTURA E IGUALDADE RACIAL ================= */

        const moeda = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');
        const EIXO = { cultura: 'Cultura', racial: 'Igualdade racial' };
        const PALAVRAS_RACIAIS = /racis|racial|neg[rx]|pret[oa]s?\b|cota|quilomb|ind[ií]gen|etnic|igualdade|diversidade/i;
        let cacheCaixa = [], cacheAtividades = {};

        /* ---- caixa ---- */
        function criarLancamento() {
            const tipo = document.getElementById('cx-tipo').value;
            const valor = parseFloat(document.getElementById('cx-valor').value);
            const data = document.getElementById('cx-data').value || hojeISO();
            const categoria = document.getElementById('cx-categoria').value;
            const descricao = document.getElementById('cx-desc').value.trim();
            const comprovante = document.getElementById('cx-comp').value.trim();
            if (!(valor > 0)) { toast('Informe um valor maior que zero.', 'warning'); return; }
            if (!descricao) { toast('Descreva o lançamento.', 'warning'); return; }
            if (tipo === 'Saída' && !/^https:\/\//i.test(comprovante)) { toast('Toda saída precisa de um link de comprovante (https://).', 'warning'); return; }
            if (comprovante && !/^https:\/\//i.test(comprovante)) { toast('O comprovante precisa começar com https://', 'warning'); return; }
            db.collection('caixa').add({
                tipo, valor: Math.round(valor * 100) / 100, data, categoria, descricao, comprovante: comprovante || '', orcamento: document.getElementById('cx-orc').value || '',
                lancadoPor: emailLogado, criadoEm: TS()
            }).then(() => {
                toast('Lançamento registrado.');
                registrarAcao('Caixa: ' + tipo, `${moeda(valor)} — ${descricao}`);
                ['cx-valor', 'cx-desc', 'cx-comp'].forEach(i => document.getElementById(i).value = '');
            }).catch(e => erroDB(e, 'criarLancamento'));
        }
        let saldoMinimo = null;
        function carregarSaldoMinimo() {
            ouvir(db.collection('caixa_config').doc('tesouraria'), doc => {
                const v = doc.exists ? doc.data().saldoMinimo : null;
                saldoMinimo = typeof v === 'number' ? v : null;
                const campo = document.getElementById('cx-min');
                if (campo && document.activeElement !== campo) campo.value = saldoMinimo !== null ? saldoMinimo : '';
                renderCaixa();
            });
        }
        function salvarSaldoMinimo() {
            const v = document.getElementById('cx-min').value.trim();
            const n = v === '' ? null : parseFloat(v);
            if (n !== null && (isNaN(n) || n < 0)) { toast('Informe um valor igual ou maior que zero.', 'warning'); return; }
            if (n === null) { toast('Deixe um valor para ativar o alerta.', 'warning'); return; }
            db.collection('caixa_config').doc('tesouraria').set({ saldoMinimo: Math.round(n * 100) / 100, atualizadoEm: TS() })
                .then(() => { toast('Alerta de saldo salvo.'); registrarAcao('Saldo mínimo do caixa definido', moeda(n)); })
                .catch(e => erroDB(e, 'salvarSaldoMinimo'));
        }
        function carregarCaixa() {
            carregarSaldoMinimo();
            const mes = document.getElementById('cx-mes');
            if (!mes.value) mes.value = hojeISO().slice(0, 7);
            ouvir(db.collection('caixa').orderBy('data', 'desc').limit(1000), snap => {
                cacheCaixa = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderCaixa(); renderOrcamentos();
            });
        }
        function renderCaixa() {
            const mes = document.getElementById('cx-mes').value || hojeISO().slice(0, 7);
            const soma = (lista, t) => lista.filter(x => x.tipo === t).reduce((s, x) => s + (Number(x.valor) || 0), 0);
            const doMes = cacheCaixa.filter(x => (x.data || '').startsWith(mes));
            const ent = soma(doMes, 'Entrada'), sai = soma(doMes, 'Saída');
            document.getElementById('cx-saldo-geral').textContent = moeda(soma(cacheCaixa, 'Entrada') - soma(cacheCaixa, 'Saída'));
            document.getElementById('cx-saldo-mes').textContent = moeda(ent - sai);
            document.getElementById('cx-ent-mes').textContent = moeda(ent);
            document.getElementById('cx-sai-mes').textContent = moeda(sai);
            const semComp = doMes.filter(x => x.tipo === 'Saída' && !x.comprovante).length;
            const alertas = [];
            if (semComp) alertas.push(`⚠️ ${semComp} saída(s) sem comprovante`);
            if (saldoMinimo !== null && soma(cacheCaixa, 'Entrada') - soma(cacheCaixa, 'Saída') < saldoMinimo) alertas.push(`🔴 Saldo abaixo do mínimo (${moeda(saldoMinimo)})`);
            document.getElementById('cx-alerta').textContent = alertas.join(' • ');
            const c = document.getElementById('lista-caixa');
            if (!doMes.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum lançamento neste mês. Use o formulário acima para registrar uma entrada ou saída.</p>'; return; }
            const podeExcluir = true;
            c.innerHTML = '<div class="list-group">' + doMes.map(x => `
                <div class="list-group-item d-flex justify-content-between align-items-center gap-2">
                    <div>
                        <span class="badge ${x.tipo === 'Entrada' ? 'bg-success' : 'bg-danger'}">${esc(x.tipo)}</span>
                        <strong class="text-white ms-1">${moeda(x.valor)}</strong>
                        <small class="text-muted-custom">${esc(x.categoria || '')} • ${esc(dataBR(x.data))}</small><br>
                        <small class="text-white">${esc(x.descricao)}</small>
                        ${x.comprovante ? ` <a href="${esc(x.comprovante)}" target="_blank" rel="noopener noreferrer" class="small">comprovante ↗</a>` : (x.tipo === 'Saída' ? ' <span class="badge bg-warning text-dark">sem comprovante</span>' : '')}
                    </div>
                    ${podeExcluir ? `<button data-acao="excluirLancamento" data-id="${esc(x.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>` : ''}
                </div>`).join('') + '</div>';
        }
        function prestacaoContas() {
            const mes = document.getElementById('cx-mes').value || hojeISO().slice(0, 7);
            const doMes = cacheCaixa.filter(x => (x.data || '').startsWith(mes)).sort((a, b) => a.data.localeCompare(b.data));
            if (!doMes.length) { toast('Não há lançamentos neste mês.', 'warning'); return; }
            const soma = t => doMes.filter(x => x.tipo === t).reduce((s, x) => s + (Number(x.valor) || 0), 0);
            const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 20;
            const linha = t => doc.splitTextToSize(String(t), 170).forEach(p => { if (y > 280) { doc.addPage(); y = 20; } doc.text(p, 20, y); y += 6; });
            doc.setFont('Helvetica', 'bold'); doc.setFontSize(15); doc.text('Grêmio Estudantil - IFCE Crateús', 20, y); y += 9;
            doc.setFontSize(12); doc.text('Prestação de contas - ' + mes.split('-').reverse().join('/'), 20, y); y += 8;
            doc.setFont('Helvetica', 'normal'); doc.setFontSize(11);
            linha('Entradas: ' + moeda(soma('Entrada')));
            linha('Saídas: ' + moeda(soma('Saída')));
            linha('Saldo do mês: ' + moeda(soma('Entrada') - soma('Saída')));
            y += 4; doc.setFont('Helvetica', 'bold'); linha('Lançamentos'); doc.setFont('Helvetica', 'normal');
            doMes.forEach(x => linha(`${dataBR(x.data)} | ${x.tipo} | ${moeda(x.valor)} | ${x.categoria || ''} | ${x.descricao} | comprovante: ${x.comprovante ? 'sim' : 'não'}`));
            y += 8;
            linha('Responsável pelo caixa: ' + document.getElementById('user-name-display').textContent);
            linha('Assinatura: ______________________________');
            pdfFinalizar(doc, `prestacao_contas_${mes}.pdf`);
            registrarAcao('Prestação de contas gerada', mes);
        }
        function baixarCaixaCSV() {
            const mes = document.getElementById('cx-mes').value || hojeISO().slice(0, 7);
            const doMes = cacheCaixa.filter(x => (x.data || '').startsWith(mes)).sort((a, b) => a.data.localeCompare(b.data));
            if (!doMes.length) { toast('Não há lançamentos neste mês.', 'warning'); return; }
            baixarCSV(`caixa_${mes}.csv`, [['Data', 'Tipo', 'Valor', 'Categoria', 'Descrição', 'Comprovante'],
                ...doMes.map(x => [dataBR(x.data), x.tipo, (Number(x.valor) || 0).toFixed(2).replace('.', ','), x.categoria || '', x.descricao, x.comprovante || ''])]);
        }

        /* ---- atividades (cultura e igualdade racial) ---- */
        function criarAtividade(p) {
            const g = id => document.getElementById(`${p}-${id}`).value.trim();
            const titulo = g('titulo'), iso = document.getElementById(`${p}-data`).value, local = g('local'), desc = g('desc');
            if (!titulo || !iso) { toast('Informe o título e o dia da atividade.', 'warning'); return; }
            db.collection('eventos').add({
                titulo, data: dataBR(iso), dataISO: iso,
                descricao: (local ? 'Local: ' + local + '\n' : '') + desc,
                eixo: EIXO[p], criadoPor: document.getElementById('user-name-display').textContent, criadoPorEmail: emailLogado,
                registroLink: '', inscritos: [], criadoEm: TS()
            }).then(() => {
                toast('Atividade publicada para os alunos! 🎉');
                registrarAcao('Atividade publicada', `${EIXO[p]}: ${titulo}`);
                ['titulo', 'data', 'local', 'desc'].forEach(i => document.getElementById(`${p}-${i}`).value = '');
            }).catch(e => erroDB(e, 'criarAtividade'));
        }
        function carregarAtividades(p) {
            ouvir(db.collection('eventos').where('criadoPorEmail', '==', emailLogado), snap => {
                const c = document.getElementById(`lista-atividades-${p}`);
                const hoje = hojeISO();
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.eixo === EIXO[p])
                    .sort((a, b) => (b.dataISO || '').localeCompare(a.dataISO || ''));
                cacheAtividades[p] = docs;
                if (!docs.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma atividade publicada ainda. Publique a primeira acima.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + docs.map(x => {
                    const semRegistro = x.dataISO && x.dataISO < hoje && !x.registroLink;
                    const presentes = (x.presentes || []).length;
                    return `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div>
                                <strong class="text-white">${esc(x.titulo)}</strong>
                                ${semRegistro ? ' <span class="badge bg-warning text-dark">sem registro</span>' : ''}<br>
                                <small class="text-muted-custom">${esc(x.data || '')} • ${(x.inscritos || []).length} inscrito(s) • ${presentes} presente(s)</small>
                            </div>
                            <div class="d-flex gap-1 flex-wrap justify-content-end">
                                <button data-acao="abrirPresenca" data-id="${esc(x.id)}" class="btn btn-outline-info btn-sm py-0" style="font-size: 11px;">✔ Presença</button>
                                <button data-acao="relatorioAtividade" data-id="${esc(x.id)}" data-p="${p}" class="btn btn-outline-light btn-sm py-0" style="font-size: 11px;">📄 Relatório</button>
                                <button data-acao="excluirAtividade" data-id="${esc(x.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                            </div>
                        </div>
                        <div id="pres-${esc(x.id)}" class="mt-2"></div>
                        <div class="input-group input-group-sm mt-2">
                            <input type="url" class="form-control" data-link="${esc(x.id)}" value="${esc(x.registroLink || '')}" placeholder="Link das fotos e registros (Drive)">
                            <button data-acao="salvarRegistro" data-id="${esc(x.id)}" class="btn btn-outline-success">Salvar link</button>
                        </div>
                    </div>`;
                }).join('') + '</div>';
            });
        }
        function abrirPresenca(id) {
            const x = Object.values(cacheAtividades).flat().find(a => a.id === id);
            const box = document.getElementById('pres-' + id);
            if (!x || !box) return;
            if (!(x.inscritos || []).length) { box.innerHTML = '<small class="text-muted-custom">Ainda não há inscritos nesta atividade.</small>'; return; }
            const presentes = new Set(x.presentes || []);
            box.innerHTML = '<div class="p-2 rounded" style="background: #121a14; border: 1px solid var(--ifce-card-border);">' +
                '<div class="small text-muted-custom mb-1">Marque quem compareceu:</div>' +
                x.inscritos.map((e, i) => `<div class="form-check"><input class="form-check-input" type="checkbox" id="pr-${esc(id)}-${i}" data-pres="${esc(id)}" value="${esc(e)}" ${presentes.has(e) ? 'checked' : ''}><label class="form-check-label small" for="pr-${esc(id)}-${i}">${esc(e)}</label></div>`).join('') +
                `<button data-acao="salvarPresenca" data-id="${esc(id)}" class="btn btn-success btn-sm py-0 mt-2" style="font-size: 11px;">Salvar presença</button></div>`;
        }
        function salvarPresenca(id) {
            const marcados = [...document.querySelectorAll(`[data-pres="${CSS.escape(id)}"]:checked`)].map(c => c.value);
            db.collection('eventos').doc(id).update({ presentes: marcados })
                .then(() => { toast(`Presença salva (${marcados.length} presente(s)).`); registrarAcao('Presença registrada', id); })
                .catch(e => erroDB(e, 'salvarPresenca'));
        }

        function gerarRelatorioAtividade(id) {
            const x = Object.values(cacheAtividades).flat().find(a => a.id === id);
            if (!x) return;
            const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 20;
            const linha = t => doc.splitTextToSize(String(t), 170).forEach(p => { if (y > 280) { doc.addPage(); y = 20; } doc.text(p, 20, y); y += 6; });
            doc.setFont('Helvetica', 'bold'); doc.setFontSize(15); doc.text('Grêmio Estudantil - IFCE Crateús', 20, y); y += 9;
            doc.setFontSize(12); linha('Relatório de atividade: ' + x.titulo);
            doc.setFont('Helvetica', 'normal'); doc.setFontSize(11);
            linha('Eixo: ' + (x.eixo || '-'));
            linha('Data: ' + (x.data || '-'));
            linha('Inscritos: ' + (x.inscritos || []).length);
            y += 3; linha(x.descricao || '(sem descrição)');
            if (x.registroLink) { y += 3; linha('Registros (fotos e materiais): ' + x.registroLink); }
            y += 6; linha('Responsável: ' + (x.criadoPor || '-'));
            pdfFinalizar(doc, `relatorio_${(x.eixo || 'atividade').toLowerCase().replace(/\s+/g, '_')}_${x.dataISO || 'sem-data'}.pdf`);
            registrarAcao('Relatório de atividade gerado', x.titulo);
        }

        /* ---- pautas sobre o tema (somente leitura) ---- */
        function carregarPautasRacial() {
            ouvir(db.collection('reivindicacoes').orderBy('criadoEm', 'desc'), snap => {
                const c = document.getElementById('lista-pautas-racial');
                const docs = snap.docs.map(d => d.data()).filter(p => PALAVRAS_RACIAIS.test(`${p.titulo || ''} ${p.descricao || ''}`));
                if (!docs.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma pauta sobre o tema no momento.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + docs.map(p => `
                    <div class="list-group-item">
                        <strong class="text-white">${esc(p.titulo)}</strong>
                        <span class="badge bg-primary ms-1">${esc(p.status || 'Em análise')}</span>
                        <span class="badge bg-secondary ms-1">👍 ${(p.apoios || []).length}</span>
                        <p class="small text-muted-custom mb-0 mt-1">${esc(p.descricao || '')}</p>
                    </div>`).join('') + '</div>';
            });
        }
