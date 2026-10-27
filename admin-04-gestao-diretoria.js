/* ================= DIRETORIA E CARGOS ================= */

        async function criarContaAuth(email, senha) {
            const appSec = firebase.apps.find(a => a.name === 'sec') || firebase.initializeApp(firebaseConfig, 'sec');
            try {
                await appSec.auth().createUserWithEmailAndPassword(email, senha);
                await appSec.auth().signOut();
                return 'criada';
            } catch (err) {
                if (err.code === 'auth/email-already-in-use') return 'existia';
                throw err;
            }
        }
        async function salvarDiretor() {
            const g = id => document.getElementById(id).value.trim();
            const nome = g('dir-nome'), email = g('dir-email').toLowerCase(), cargo = g('dir-cargo'), nivel = g('dir-nivel'), senha = document.getElementById('dir-senha').value;
            if (!nome || !email || !cargo) { toast('Preencha nome, e-mail e cargo!', 'warning'); return; }
            if (senha && senha.length < 6) { toast('A senha precisa ter 6+ caracteres.', 'warning'); return; }
            try {
                let msg = '';
                if (senha) msg = (await criarContaAuth(email, senha)) === 'criada' ? ' Conta de login criada.' : ' (a conta já existia; a senha não mudou)';
                await db.collection('cargos').doc(email).set({ nome, cargo, nivel, niveisExtras: (emailLogado === ROOT_EMAIL) ? [...document.querySelectorAll('.dir-extra:checked')].map(x => x.value).filter(v => v !== nivel) : [], fimMandato: (document.getElementById('dir-fim') && document.getElementById('dir-fim').value) ? firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('dir-fim').value + 'T23:59:59')) : null });
                mostrarAlertaSucesso(`${nome} salvo como ${nivel}.${msg}`);
                registrarAcao('Diretor salvo', `${email} (${nivel})`);
                ['dir-nome', 'dir-email', 'dir-cargo', 'dir-senha'].forEach(i => document.getElementById(i).value = '');
            } catch (e) { erroDB(e, 'salvarDiretor'); }
        }
        function carregarDiretoria() {
            ouvir(db.collection('cargos'), snap => {
                const c = document.getElementById('lista-diretoria-admin');
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum cargo no banco ainda. Toque em "Importar diretoria atual".</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const x = d.data(), raiz = d.id === ROOT_EMAIL, id = esc(d.id);
                    return `
                    <div class="list-group-item d-flex justify-content-between align-items-center gap-2">
                        <div><strong class="text-white">${esc(x.nome)}</strong> <small class="text-muted-custom">— ${esc(x.cargo)}</small><br><small class="text-muted-custom">${id}</small></div>
                        <div class="d-flex gap-1 align-items-center">
                            <select data-mudar="nivelCargo" data-id="${id}" class="form-select form-select-sm" style="width: auto;" ${raiz ? 'disabled' : ''}>
                                ${['admin', 'membro', 'marketing', 'tesouraria', 'cultura', 'racial', 'secretaria', 'mulheres', 'generos'].map(n => `<option value="${n}" ${n === x.nivel ? 'selected' : ''}>${ROTULO_NIVEL[n]}</option>`).join('')}
                            </select>
                            ${raiz ? '' : `<button data-acao="removerCargo" data-id="${id}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Remover</button>`}
                        </div>
                    </div>`;
                }).join('') + '</div>';
            });
        }

        
/* ================= NOVA GESTÃO (somente o e-mail raiz) ================= */

        function soRaiz() {
            if (emailLogado !== ROOT_EMAIL) { toast('Função restrita ao e-mail raiz.', 'danger'); return false; }
            return true;
        }
        function paraJSON(v) {
            if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
            if (Array.isArray(v)) return v.map(paraJSON);
            if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, paraJSON(x)]));
            return v;
        }
        async function baixarBackup() {
            if (!soRaiz()) return;
            const nomes = ['cargos', 'alunos', 'reivindicacoes', 'eventos', 'sugestoes', 'materiais', 'jogos', 'enquetes', 'mural', 'membros_punidos', 'acoes_admin'];
            toast('Gerando backup...');
            try {
                const out = { geradoEm: new Date().toISOString(), geradoPor: emailLogado };
                for (const n of nomes) {
                    const snap = await db.collection(n).get();
                    out[n] = snap.docs.map(d => { const x = { id: d.id, ...paraJSON(d.data()) }; delete x.senha; return x; });
                }
                const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
                const a = document.createElement('a');
                a.href = url; a.download = `backup_gremio_${hojeISO()}.json`;
                document.body.appendChild(a); a.click(); a.remove();
                URL.revokeObjectURL(url);
                registrarAcao('Backup baixado', nomes.length + ' coleções');
                registrarUltimoBackup();
            } catch (e) { erroDB(e, 'baixarBackup'); }
        }
        
/* ================= AJUDA ENTRE OS CARGOS E O TI ================= */

        const COR_CHAMADO = { 'Aberto': 'bg-warning text-dark', 'Em andamento': 'bg-info text-dark', 'Resolvido': 'bg-success' };

        function criarChamado() {
            const descricao = document.getElementById('aj-desc').value.trim();
            if (descricao.length < 5) { toast('Descreva o problema com um pouco mais de detalhe.', 'warning'); return; }
            db.collection('chamados').add({
                categoria: document.getElementById('aj-cat').value, descricao, autorEmail: emailLogado,
                autorNome: document.getElementById('user-name-display').textContent,
                cargo: document.getElementById('user-role-display').textContent, status: 'Aberto', criadoEm: TS()
            }).then(() => { toast('Pedido enviado ao TI! ✅'); document.getElementById('aj-desc').value = ''; })
              .catch(e => erroDB(e, 'criarChamado'));
        }
        function carregarMeusChamados() {
            ouvir(db.collection('chamados').where('autorEmail', '==', emailLogado), snap => {
                const c = document.getElementById('lista-meus-chamados');
                const docs = snap.docs.map(d => d.data()).sort((a, b) => (b.criadoEm ? b.criadoEm.toMillis() : Infinity) - (a.criadoEm ? a.criadoEm.toMillis() : Infinity));
                if (!docs.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Você ainda não enviou pedidos.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + docs.map(x => `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start"><strong class="text-white small">${esc(x.categoria)}</strong><span class="badge ${COR_CHAMADO[x.status] || 'bg-secondary'}">${esc(x.status)}</span></div>
                        <p class="small text-white mb-1 mt-1" style="white-space: pre-wrap;">${esc(x.descricao)}</p>
                        <small class="text-muted-custom" style="font-size: 11px;">${esc(fmtData(x.criadoEm))}</small>
                        ${x.resposta ? `<div class="small p-2 rounded mt-2" style="background: rgba(0,230,118,.1); border: 1px solid var(--ifce-card-border);">🛠️ <strong>Resposta do TI:</strong> ${esc(x.resposta)}</div>` : ''}
                    </div>`).join('') + '</div>';
            });
        }
        function carregarChamadosTI() {
            ouvir(db.collection('chamados').orderBy('criadoEm', 'desc').limit(100), snap => {
                const c = document.getElementById('lista-chamados-ti');
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.status === 'Resolvido') - (b.status === 'Resolvido'));
                document.getElementById('ti-chamados-qtd').textContent = docs.filter(x => x.status !== 'Resolvido').length + ' em aberto';
                if (!docs.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum pedido de ajuda no momento.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + docs.map(x => `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start">
                            <div><strong class="text-white">${esc(x.autorNome)}</strong> <small class="text-muted-custom">— ${esc(x.cargo)} • ${esc(x.autorEmail)}</small></div>
                            <span class="badge ${COR_CHAMADO[x.status] || 'bg-secondary'}">${esc(x.status)}</span>
                        </div>
                        <small class="text-info">${esc(x.categoria)} • ${esc(fmtData(x.criadoEm))}</small>
                        <p class="small text-white mb-2" style="white-space: pre-wrap;">${esc(x.descricao)}</p>
                        <div class="input-group input-group-sm">
                            <select class="form-select" style="max-width: 130px;" data-st-ch="${esc(x.id)}">${['Aberto', 'Em andamento', 'Resolvido'].map(st => `<option ${st === x.status ? 'selected' : ''}>${st}</option>`).join('')}</select>
                            <input type="text" class="form-control" maxlength="500" data-resp-ch="${esc(x.id)}" placeholder="Responder..." value="${esc(x.resposta || '')}">
                            <button class="btn btn-outline-info" data-acao="salvarChamado" data-id="${esc(x.id)}">Salvar</button>
                        </div>
                    </div>`).join('') + '</div>';
            });
        }

        let nivelPreview = null;
        function verComo(nivel) {
            if (!soRaiz()) return;
            nivelPreview = nivel || null;
            aplicarVisibilidade();
            document.querySelectorAll('.card-root').forEach(c => c.style.display = nivelPreview ? 'none' : 'block');
            atualizarAbas();
            renderizarMenuLateral({ nivel: nivelPreview || 'admin' });
            renderizarBarraInferior(nivelPreview || 'admin');
            document.getElementById('banner-preview').classList.toggle('d-none', !nivelPreview);
            document.getElementById('preview-nome').textContent = nivelPreview ? ROTULO_NIVEL[nivelPreview] : '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function carregarAvisoTI() {
            ouvir(db.collection('config').doc('sistema'), doc => {
                const d = doc.exists ? doc.data() : {};
                travas = d.recursosDiretoria || {};
                aplicarVisibilidade();
                if (nivelReal) renderizarMenuLateral({ nivel: nivelReal });
                const el = document.getElementById('aviso-ti');
                el.textContent = d.avisoDiretoria ? '📣 Aviso do TI: ' + d.avisoDiretoria : '';
                el.classList.toggle('d-none', !d.avisoDiretoria);
                painelCongelado = d.painelCongelado === true;
                aplicarCongelamento();
                const stc = document.getElementById('ti-congelado-status'); if (stc) stc.innerHTML = painelCongelado ? '🧊 <strong>CONGELADO</strong>' : '🟢 normal';
                const btc = document.getElementById('ti-congelar-btn'); if (btc) btc.textContent = painelCongelado ? 'Descongelar painel' : 'Congelar painel';
                const pp = document.getElementById('ti-palavras'); if (pp && document.activeElement !== pp) pp.value = (d.palavrasProibidas || []).join('\n');
                const bd = document.getElementById('ti-banner-de'), ba = document.getElementById('ti-banner-ate');
                if (bd && document.activeElement !== bd) bd.value = d.bannerDe || '';
                if (ba && document.activeElement !== ba) ba.value = d.bannerAte || '';
                const campo = document.getElementById('ti-aviso-dir');
                if (campo && document.activeElement !== campo) campo.value = d.avisoDiretoria || '';
            });
        }
        async function salvarAvisoDiretoria() {
            if (!soRaiz()) return;
            try {
                await db.collection('config').doc('sistema').set({ avisoDiretoria: document.getElementById('ti-aviso-dir').value.trim() }, { merge: true });
                toast('Aviso atualizado para a diretoria.');
                registrarAcao('Aviso do TI alterado', '');
            } catch (e) { erroDB(e, 'avisoDiretoria'); }
        }

        
/* ================= CONGELAR PAINEL, FILTRO, AGENDA, ROTEIRO E MANUAL (só o e-mail raiz) ================= */

        function aplicarCongelamento() {
            const ov = document.getElementById('painel-congelado');
            if (ov) ov.style.display = (painelCongelado && emailLogado !== ROOT_EMAIL) ? 'flex' : 'none';
        }
        async function alternarCongelamento() {
            if (!soRaiz()) return;
            const ligar = !painelCongelado;
            if (!(await confirmar(ligar ? 'Congelar o painel? Todos os diretores perdem o acesso até você descongelar.' : 'Descongelar e liberar o painel para a diretoria?'))) return;
            try { await db.collection('config').doc('sistema').set({ painelCongelado: ligar }, { merge: true }); registrarAcao(ligar ? 'Painel congelado' : 'Painel descongelado', ''); toast(ligar ? 'Painel congelado.' : 'Painel liberado.'); }
            catch (e) { erroDB(e, 'congelar'); }
        }
        async function salvarPalavras() {
            if (!soRaiz()) return;
            const lista = [...new Set(document.getElementById('ti-palavras').value.split('\n').map(x => x.trim().toLowerCase()).filter(Boolean))].slice(0, 200);
            try { await db.collection('config').doc('sistema').set({ palavrasProibidas: lista }, { merge: true }); toast(lista.length + ' palavra(s) no filtro.'); registrarAcao('Filtro de palavras alterado', lista.length + ' palavras'); }
            catch (e) { erroDB(e, 'palavras'); }
        }
        async function salvarAgendaBanner() {
            if (!soRaiz()) return;
            const de = document.getElementById('ti-banner-de').value, ate = document.getElementById('ti-banner-ate').value;
            if (de && ate && de > ate) { toast('A data inicial não pode ser depois da final.', 'warning'); return; }
            try { await db.collection('config').doc('sistema').set({ bannerDe: de, bannerAte: ate }, { merge: true }); toast('Período do aviso salvo.'); }
            catch (e) { erroDB(e, 'agendaBanner'); }
        }

        const ROTEIRO = [
            ['Aluno (portal)', [
                ['a1', 'Entrar com e-mail e senha de um aluno de teste'], ['a2', 'Mural, enquetes e eventos carregam'],
                ['a3', 'Votar em uma enquete e conferir que não deixa votar de novo'], ['a4', 'Criar uma pauta e apoiar outra'],
                ['a5', 'Enviar uma sugestão e vê-la em "Minhas sugestões"'], ['a6', 'Pedir um material emprestado'],
                ['a7', 'Inscrever-se em um evento'], ['a8', 'Ver placar e classificação dos jogos'], ['a9', 'Assistir a um vídeo'],
                ['a10', 'Abrir o sininho de novidades'], ['a11', 'Usar "Esqueci minha senha"'], ['a12', 'Enviar um pedido em "Preciso de ajuda"'],
                ['a13', 'Instalar o portal como app (botão "Instalar" ou menu do navegador)']
            ]],
            ['Presidência', [
                ['p1', 'Entrar no painel e ver só os cards da presidência'], ['p2', 'Cadastrar um aluno e entrar com ele no portal'],
                ['p3', 'Bloquear e desbloquear um aluno'], ['p4', 'Aplicar e remover uma punição em um diretor de teste'],
                ['p5', 'Responder uma sugestão (o aluno vê a resposta)'], ['p6', 'Mudar o status de uma pauta (aparece no portal)'],
                ['p7', 'Atribuir uma tarefa e ver o diretor concluir'], ['p8', 'Criar uma ata e baixar o PDF'],
                ['p9', 'Gerar o Relatório do Mês em PDF'], ['p10', 'Cadastrar um diretor novo em Diretoria e Cargos'], ['p11', 'Ver o log de auditoria']
            ]],
            ['Esportes/Eventos', [
                ['e1', 'Entrar e ver só jogos, eventos, materiais, tarefas e enquetes'], ['e2', 'Criar um evento com "Dia no calendário"'],
                ['e3', 'Baixar o CSV de inscritos'], ['e4', 'Criar um jogo, salvar o placar e marcar "Encerrado"'], ['e5', 'Conferir a classificação no portal'],
                ['e6', 'Aprovar um pedido de material com prazo e marcar como devolvido']
            ]],
            ['Marketing', [
                ['m1', 'Entrar e ver só mural, divulgação, artes, vídeos, tarefas e enquetes'], ['m2', 'Publicar um aviso e fixá-lo (📌 no portal)'],
                ['m3', 'Adicionar item no Calendário de Divulgação e mudar o status'], ['m4', 'Salvar um link no Banco de Artes'],
                ['m5', 'Publicar um vídeo (link do YouTube "Não listado") e vê-lo no portal'], ['m6', 'Criar uma enquete']
            ]],
            ['TI (você)', [
                ['t1', 'Rodar o Diagnóstico e o Verificador de integridade'], ['t2', 'Ver como Presidência, Esportes e Marketing'],
                ['t3', 'Ligar e desligar o modo manutenção (aluno vê a tela)'], ['t4', 'Congelar e descongelar o painel (diretor vê a tela)'],
                ['t5', 'Baixar um backup'], ['t6', 'Responder um pedido de ajuda (de aluno e de diretor)'],
                ['t7', 'Publicar um termo de uso e conferir o aceite'], ['t8', 'Conferir a Adoção do portal'],
                ['t9', 'Testar o filtro de palavras com uma palavra da lista'], ['t10', 'Usar a Busca global']
            ]]
        ];
        function atualizarProgressoRoteiro() {
            const todos = [...document.querySelectorAll('[data-tst]')];
            document.getElementById('ti-roteiro-prog').textContent = todos.filter(c => c.checked).length + '/' + todos.length;
            document.querySelectorAll('[data-grupo]').forEach(g => {
                const cs = [...g.querySelectorAll('[data-tst]')];
                g.querySelector('.cont').textContent = cs.filter(c => c.checked).length + '/' + cs.length;
            });
        }
        async function carregarRoteiroTI() {
            const c = document.getElementById('ti-roteiro');
            if (!c) return;
            document.getElementById('ti-versao').textContent = VERSAO_SISTEMA;
            let feitos = {};
            try { const d = await db.collection('ti_privado').doc('testes').get(); feitos = d.exists ? (d.data().feitos || {}) : {}; } catch (e) {}
            c.innerHTML = ROTEIRO.map(([grupo, itens]) => `
                <details class="mb-2" data-grupo><summary class="fw-bold text-white" style="cursor: pointer;">${esc(grupo)} <span class="cont badge bg-secondary ms-1"></span></summary>
                    <div class="mt-2">${itens.map(([id, txt]) => `<div class="form-check mb-1 small"><input class="form-check-input" type="checkbox" data-tst="${id}" id="tst-${id}" ${feitos[id] ? 'checked' : ''}><label class="form-check-label" for="tst-${id}">${esc(txt)}</label></div>`).join('')}</div>
                </details>`).join('');
            atualizarProgressoRoteiro();
        }
        document.addEventListener('change', e => {
            const c = e.target.closest('[data-tst]');
            if (!c || !soRaiz()) return;
            db.collection('ti_privado').doc('testes').set({ feitos: { [c.dataset.tst]: c.checked }, atualizadoEm: TS() }, { merge: true }).catch(err => erroDB(err, 'roteiro'));
            atualizarProgressoRoteiro();
        });
        async function limparRoteiro() {
            if (!soRaiz()) return;
            if (!(await confirmar('Limpar todas as marcações do roteiro?'))) return;
            try { await db.collection('ti_privado').doc('testes').set({ feitos: {}, atualizadoEm: TS() }); carregarRoteiroTI(); } catch (e) { erroDB(e, 'limparRoteiro'); }
        }
        function baixarManual() {
            if (!soRaiz()) return;
            const corpo = [...document.querySelectorAll('#ti-manual-corpo details')].map(d => d.querySelector('summary').innerText.trim() + '\n' + d.querySelector('div').innerText.trim().replace(/\s+/g, ' ')).join('\n\n');
            const txt = `MANUAL DO TI - GRÊMIO IFCE CRATEÚS\nVersão ${VERSAO_SISTEMA} - gerado em ${new Date().toLocaleDateString('pt-BR')}\n\n${corpo}\n`;
            const url = URL.createObjectURL(new Blob(['\ufeff' + txt], { type: 'text/plain;charset=utf-8' }));
            const a = document.createElement('a'); a.href = url; a.download = 'manual_ti_gremio.txt'; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }
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

        
