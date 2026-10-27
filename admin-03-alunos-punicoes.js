/* ================= ALUNOS ================= */

        function cadastrarAluno() {
            const nome = document.getElementById('cad-nome').value.trim();
            const email = document.getElementById('cad-email').value.trim().toLowerCase();
            const senha = document.getElementById('cad-senha').value.trim();
            const turma = document.getElementById('cad-turma').value.trim();

            if (!nome || !email || !senha) { toast("Preencha todos os campos do aluno!", 'warning'); return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("E-mail inválido!", 'warning'); return; }
            if (senha.length < 6) { toast("A senha precisa ter pelo menos 6 caracteres.", 'warning'); return; }

            db.collection('alunos').doc(email).get().then(async existente => {
                if (existente.exists && !(await confirmar(`Já existe um aluno com ${email}. Sobrescrever?`))) return;
                // Cria a conta no Firebase Authentication usando um app secundário,
                // para não deslogar o admin. A senha NÃO é salva no Firestore.
                try {
                    const appSec = firebase.apps.find(a => a.name === 'sec') || firebase.initializeApp(firebaseConfig, 'sec');
                    await appSec.auth().createUserWithEmailAndPassword(email, senha);
                    await appSec.auth().signOut();
                } catch (err) {
                    if (err.code !== 'auth/email-already-in-use') { console.error(err); toast('Erro ao criar a conta: ' + (err.code || 'desconhecido'), 'danger'); return; }
                    toast('Esse e-mail já tinha conta; só o cadastro foi atualizado (a senha não mudou).', 'warning');
                }
                await db.collection('alunos').doc(email).set({ nome, email, turma, ativo: true });
                mostrarAlertaSucesso("Aluno cadastrado com sucesso!");
                registrarAcao('Aluno cadastrado', email);
                ['cad-nome', 'cad-email', 'cad-senha', 'cad-turma'].forEach(id => document.getElementById(id).value = '');
            }).catch(e => erroDB(e, 'cadastrarAluno'));
        }

        function carregarAlunos() {
            ouvir(db.collection('alunos').orderBy('nome'), snapshot => {
                cacheAlunos = snapshot.docs.map(d => d.data());
                renderAlunos();
            });
        }

        function renderAlunos() {
            const container = document.getElementById('lista-alunos-admin');
            const termo = document.getElementById('busca-alunos').value.trim().toLowerCase();
            const lista = cacheAlunos.filter(a => !termo || (a.nome || '').toLowerCase().includes(termo) || (a.email || '').toLowerCase().includes(termo));
            if (!lista.length) { container.innerHTML = `<p class="text-muted-custom small mb-0">${termo ? 'Nenhum resultado.' : 'Nenhum aluno cadastrado ainda. Use "Cadastrar Aluno" ou o cadastro em massa.'}</p>`; return; }
            let html = `<p class="small text-muted-custom">${lista.length} aluno(s)</p><ul class="list-group">`;
            lista.forEach(a => {
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div>
                            <strong style="font-size: 14px;" class="text-white">${esc(a.nome)}</strong><br>
                            <small class="text-muted-custom">${esc(a.email)}</small><br>
                            <input type="text" class="form-control form-control-sm mt-1" style="max-width: 170px;" placeholder="turma" value="${esc(a.turma || '')}" data-mudar="turmaAluno" data-id="${esc(a.email)}">
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge ${a.ativo ? 'bg-success' : 'bg-danger'}">${a.ativo ? 'Ativo' : 'Bloqueado'}</span>
                            <button data-acao="alternarAluno" data-id="${esc(a.email)}" data-valor="${!a.ativo}" class="btn btn-outline-warning btn-sm py-0" style="font-size: 11px;">${a.ativo ? 'Bloquear' : 'Desbloquear'}</button>
                            <button data-acao="excluirAluno" data-id="${esc(a.email)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                        </div>
                    </li>`;
            });
            container.innerHTML = html + '</ul>';
        }

        
/* ================= PUNIÇÕES ================= */

        function aplicarPunicaoMembro() {
            const email = document.getElementById('punicao-email').value.trim().toLowerCase();
            const tipo = document.getElementById('punicao-tipo').value.trim();
            const textoTempo = document.getElementById('punicao-tempo-texto').value.trim();
            const motivo = document.getElementById('punicao-motivo').value.trim();

            if (!email || !tipo || !textoTempo || !motivo) { toast("Preencha todos os campos da punição!", 'warning'); return; }
            const minutos = converterTextoParaMinutos(textoTempo);
            if (minutos === null) { toast("Tempo inválido. Use: 30min, 2h, 1d, 2sem, 1mes ou 1ano.", 'danger'); return; }

            const expiraEm = firebase.firestore.Timestamp.fromMillis(Date.now() + minutos * 60000);
            db.collection('membros_punidos').doc(email).set({
                email, punicao: tipo, motivo, expiraEm, punidoEm: TS(),
                punidoPor: auth.currentUser ? auth.currentUser.email : ''
            }).then(() => {
                mostrarAlertaSucesso(`Punição aplicada a ${email} (${textoTempo})!`);
                registrarAcao('Punição aplicada', `${email} | ${tipo} | ${textoTempo} | ${motivo}`);
                ['punicao-email', 'punicao-tipo', 'punicao-tempo-texto', 'punicao-motivo'].forEach(id => document.getElementById(id).value = '');
            }).catch(e => erroDB(e, 'aplicarPunicaoMembro'));
        }

        function carregarMembrosPunidosAdmin() {
            ouvir(db.collection('membros_punidos').orderBy('expiraEm'), snapshot => {
                cachePunidos = snapshot.docs.map(d => d.data());
                renderPunidos();
            });
        }

        function renderPunidos() {
            const container = document.getElementById('lista-membros-punidos-admin');
            const termo = document.getElementById('busca-punidos').value.trim().toLowerCase();
            const agora = Date.now();
            // Ignora punições já vencidas
            const lista = cachePunidos.filter(p => p.expiraEm && p.expiraEm.toMillis() > agora)
                .filter(p => !termo || `${p.email} ${p.punicao} ${p.motivo}`.toLowerCase().includes(termo));
            if (!lista.length) { container.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum membro punido no momento.</p>'; return; }
            let html = '<ul class="list-group">';
            lista.forEach(p => {
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong class="text-warning" style="font-size: 13px;">${esc(p.email)}</strong><br>
                            <small class="text-white">Punição: <strong>${esc(p.punicao)}</strong> | Motivo: ${esc(p.motivo)}</small><br>
                            <small class="text-muted-custom" style="font-size: 11px;">Expira em: ${esc(p.expiraEm.toDate().toLocaleString('pt-BR'))}${p.punidoPor ? ' • por ' + esc(p.punidoPor) : ''}</small>
                        </div>
                        <button data-acao="removerPunicao" data-id="${esc(p.email)}" class="btn btn-outline-success btn-sm py-0" style="font-size: 11px;">Remover</button>
                    </li>`;
            });
            container.innerHTML = html + '</ul>';
        }

        
/* ================= CADASTROS PENDENTES (somente o root) ================= */
        function carregarPendentesTI() {
            ouvir(db.collection('alunos').where('status', '==', 'pendente'), snap => {
                const c = document.getElementById('lista-pendentes');
                if (!c) return;
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum cadastro aguardando aprovação.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const x = d.data();
                    return `<div class="list-group-item d-flex justify-content-between align-items-center gap-2">
                        <div><strong class="text-white">${esc(x.nome || 'Sem nome')}</strong><br><small class="text-muted-custom">${esc(x.email || d.id)}</small></div>
                        <div class="d-flex gap-1">
                            <button onclick="aprovarAlunoTI('${esc(d.id)}')" class="btn btn-success btn-sm py-0" style="font-size:12px">Aprovar</button>
                            <button onclick="recusarAlunoTI('${esc(d.id)}')" class="btn btn-outline-danger btn-sm py-0" style="font-size:12px">Recusar</button>
                        </div></div>`;
                }).join('') + '</div>';
            });
        }
        function aprovarAlunoTI(email) {
            db.collection('alunos').doc(email).update({ ativo: true, status: 'aprovado', aprovadoEm: TS() })
                .then(() => { toast('Cadastro aprovado.'); registrarAcao('Cadastro de aluno aprovado', email); })
                .catch(e => falhaSec(e, 'aprovarAlunoTI'));
        }
        async function recusarAlunoTI(email) {
            if (!(await confirmar('Recusar este cadastro? O aluno não consegue entrar até você aprovar depois.'))) return;
            db.collection('alunos').doc(email).update({ ativo: false, status: 'recusado' })
                .then(() => { toast('Cadastro recusado.'); registrarAcao('Cadastro de aluno recusado', email); })
                .catch(e => falhaSec(e, 'recusarAlunoTI'));
        }

        
/* ================= E-MAILS PARA PUNIÇÃO (alunos e diretoria) ================= */
        let cacheEmailsAlunos = [], cacheEmailsCargos = [], assinadoEmailsPunicao = false;
        function carregarEmailsPunicao() {
            if (assinadoEmailsPunicao) { renderEmailsPunicao(); return; }
            assinadoEmailsPunicao = true;
            ouvir(db.collection('alunos'), snap => {
                cacheEmailsAlunos = snap.docs.map(d => ({ email: d.id, ...d.data() }));
                renderEmailsPunicao();
            });
            ouvir(db.collection('cargos'), snap => {
                cacheEmailsCargos = snap.docs.map(d => ({ email: d.id, ...d.data() }));
                renderEmailsPunicao();
            });
        }
        function renderEmailsPunicao() {
            const dl = document.getElementById('lista-emails-punicao');
            if (!dl) return;
            const opcoes = [
                ...cacheEmailsCargos.map(c => ({ email: c.email, rotulo: `${c.nome || 'Diretoria'} • ${c.cargo || c.nivel || 'Diretoria'}`, grupo: 'Diretoria' })),
                ...cacheEmailsAlunos.map(x => ({ email: x.email, rotulo: `${x.nome || 'Aluno'}${x.status === 'pendente' ? ' (pendente)' : ''}${x.ativo === false ? ' (bloqueado)' : ''}`, grupo: 'Aluno' }))
            ].sort((p, q) => p.grupo.localeCompare(q.grupo) || p.email.localeCompare(q.email));
            dl.innerHTML = opcoes.map(o => `<option value="${esc(o.email)}">${esc(o.rotulo)}</option>`).join('');
        }

        
/* ================= TI: SUPORTE, ALUNOS E PORTAL ================= */

        async function fichaUsuario() {
            if (!soRaiz()) return;
            const email = document.getElementById('ti-ficha-email').value.trim().toLowerCase();
            const out = document.getElementById('ti-ficha');
            if (!email) { toast('Digite um e-mail.', 'warning'); return; }
            out.textContent = 'Buscando...';
            try {
                const [al, ca, pu, su, ev, ma, ac] = await Promise.all([
                    db.collection('alunos').doc(email).get(), db.collection('cargos').doc(email).get(),
                    db.collection('membros_punidos').doc(email).get(), db.collection('sugestoes').where('email', '==', email).get(),
                    db.collection('eventos').get(), db.collection('materiais').get(),
                    db.collection('acoes_admin').where('autor', '==', email).limit(30).get()
                ]);
                const L = [];
                if (al.exists) { const a = al.data(); L.push(`🎓 <strong>${esc(a.nome)}</strong> • turma: ${esc(a.turma || '—')} • ${a.ativo ? '<span class="text-success">ativo</span>' : '<span class="text-danger">bloqueado</span>'}`); }
                else L.push('🎓 Não é aluno cadastrado.');
                if (ca.exists) { const c = ca.data(); L.push(`🪪 Cargo: <strong>${esc(c.cargo)}</strong> (${esc(c.nivel)})`); } else L.push('🪪 Sem cargo na diretoria.');
                const p = pu.exists ? pu.data() : null;
                if (p && p.expiraEm && p.expiraEm.toMillis() > Date.now()) L.push(`⚠️ Punição ativa: ${esc(p.punicao)} até ${esc(fmtData(p.expiraEm))}`);
                L.push(`💡 Sugestões: ${su.size} (${su.docs.filter(d => d.data().resposta).length} respondidas)`);
                const insc = ev.docs.filter(d => (d.data().inscritos || []).includes(email)).map(d => d.data().titulo);
                L.push(`📅 Eventos inscrito: ${insc.length ? esc(insc.join(', ')) : 'nenhum'}`);
                const mats = ma.docs.filter(d => (d.data().emprestadoPara || '').toLowerCase().includes(email)).map(d => `${d.data().nome} (${d.data().status})`);
                L.push(`🎲 Materiais: ${mats.length ? esc(mats.join(', ')) : 'nenhum'}`);
                const acs = ac.docs.map(d => d.data()).sort((a, b) => (b.em ? b.em.toMillis() : 0) - (a.em ? a.em.toMillis() : 0)).slice(0, 5);
                if (acs.length) L.push('🧾 Últimas ações no painel:<br>' + acs.map(a => `<span class="text-muted-custom">• ${esc(a.acao)} — ${esc(a.detalhes || '')} (${esc(fmtData(a.em))})</span>`).join('<br>'));
                let botoes = `<div class="d-flex gap-2 flex-wrap mt-2"><button data-acao="fichaSenha" data-id="${esc(email)}" class="btn btn-outline-info btn-sm py-0" style="font-size: 12px;">Enviar link de senha</button>`;
                if (al.exists) {
                    const a = al.data();
                    botoes += `<button data-acao="fichaAtivo" data-id="${esc(email)}" data-valor="${!a.ativo}" class="btn btn-outline-warning btn-sm py-0" style="font-size: 12px;">${a.ativo ? 'Bloquear aluno' : 'Desbloquear aluno'}</button></div>
                        <div class="input-group input-group-sm mt-2" style="max-width: 360px;"><input type="text" id="ficha-turma" class="form-control" maxlength="60" placeholder="Turma" value="${esc(a.turma || '')}"><button data-acao="fichaTurma" data-id="${esc(email)}" class="btn btn-outline-light">Salvar turma</button></div>
                        <div class="input-group input-group-sm mt-2" style="max-width: 360px;"><input type="text" id="ficha-nome" class="form-control" maxlength="80" placeholder="Nome" value="${esc(a.nome || '')}"><button data-acao="fichaNome" data-id="${esc(email)}" class="btn btn-outline-light">Salvar nome</button></div>`;
                } else botoes += '</div>';
                out.innerHTML = L.map(x => `<div class="mb-1">${x}</div>`).join('') + botoes;
            } catch (e) { out.textContent = ''; erroDB(e, 'fichaUsuario'); }
        }

        let logCache = [];
        async function carregarLogCompleto() {
            if (!soRaiz()) return;
            try {
                const snap = await db.collection('acoes_admin').orderBy('em', 'desc').limit(500).get();
                logCache = snap.docs.map(d => d.data());
                renderLogCompleto();
            } catch (e) { erroDB(e, 'logCompleto'); }
        }
        function renderLogCompleto() {
            const t = document.getElementById('ti-log-busca').value.trim().toLowerCase();
            const lista = logCache.filter(a => !t || `${a.acao} ${a.detalhes} ${a.autor}`.toLowerCase().includes(t));
            document.getElementById('ti-log').innerHTML = lista.length
                ? `<div class="text-muted-custom mb-2">${lista.length} registro(s)${lista.length > 100 ? ' (mostrando 100; filtre ou baixe o CSV)' : ''}</div><ul class="list-group">` +
                  lista.slice(0, 100).map(a => `<li class="list-group-item small"><strong style="color: var(--ifce-accent-green);">${esc(a.acao)}</strong> <span class="text-white">— ${esc(a.detalhes)}</span><br><small class="text-muted-custom" style="font-size: 11px;">${esc(a.autor)} • ${esc(fmtData(a.em))}</small></li>`).join('') + '</ul>'
                : '<p class="text-muted-custom mb-0">Nada encontrado. Toque em "Carregar últimas 500".</p>';
        }
        function baixarLogCSV() {
            if (!soRaiz()) return;
            if (!logCache.length) { toast('Carregue o log primeiro.', 'warning'); return; }
            baixarCSV(`log_gremio_${hojeISO()}.csv`, [['Data', 'Autor', 'Ação', 'Detalhes'], ...logCache.map(a => [fmtData(a.em), a.autor, a.acao, a.detalhes])]);
        }

        async function apagarLogAntigo() {
            if (!soRaiz()) return;
            const dias = parseInt(document.getElementById('ti-log-dias').value, 10);
            const corte = firebase.firestore.Timestamp.fromMillis(dias ? Date.now() - dias * 864e5 : Date.now());
            try {
                const snap = await db.collection('acoes_admin').where('em', '<', corte).get();
                if (snap.empty) { toast('Não há registros nesse período.', 'warning'); return; }
                if (!(await confirmar(`Apagar ${snap.size} registro(s) do log${dias ? ' com mais de ' + dias + ' dias' : ' (todos)'}? Não dá para desfazer. Baixe o CSV antes se quiser guardar.`))) return;
                await apagarEmLotes(snap.docs.map(d => d.ref));
                logCache = [];
                document.getElementById('ti-log').innerHTML = '';
                mostrarAlertaSucesso(snap.size + ' registro(s) do log apagado(s).');
                registrarAcao('Log apagado', `${snap.size} registros${dias ? ' com mais de ' + dias + ' dias' : ' (todos)'}`);
            } catch (e) { erroDB(e, 'apagarLog'); }
        }

        async function carregarErrosPortal() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-erros');
            try {
                const snap = await db.collection('erros_app').orderBy('em', 'desc').limit(50).get();
                out.innerHTML = snap.empty ? '<p class="text-success mb-0">Nenhum erro registrado no portal.</p>'
                    : '<ul class="list-group">' + snap.docs.map(d => { const x = d.data(); return `<li class="list-group-item small"><span class="text-warning">${esc(x.msg)}</span><br><small class="text-muted-custom" style="font-size: 11px;">${esc(x.email)} • ${esc(fmtData(x.em))}<br>${esc(x.ua)}</small></li>`; }).join('') + '</ul>';
            } catch (e) { erroDB(e, 'errosPortal'); }
        }
        async function limparErrosPortal() {
            if (!soRaiz()) return;
            if (!(await confirmar('Apagar todos os erros registrados?'))) return;
            try {
                const snap = await db.collection('erros_app').get();
                await apagarEmLotes(snap.docs.map(d => d.ref));
                document.getElementById('ti-erros').innerHTML = '';
                toast(snap.size + ' erro(s) apagado(s).');
            } catch (e) { erroDB(e, 'limparErros'); }
        }

        async function carregarNotasTI() {
            try {
                const d = await db.collection('ti_privado').doc('notas').get();
                document.getElementById('ti-notas').value = d.exists ? (d.data().texto || '') : '';
            } catch (e) { console.error(e); }
        }
        async function salvarNotasTI() {
            if (!soRaiz()) return;
            try {
                await db.collection('ti_privado').doc('notas').set({ texto: document.getElementById('ti-notas').value, atualizadoEm: TS() });
                toast('Anotações salvas.');
            } catch (e) { erroDB(e, 'salvarNotas'); }
        }

        async function cadastrarAlunosMassa() {
            if (!soRaiz()) return;
            const linhas = document.getElementById('ti-massa').value.split('\n').map(l => l.trim()).filter(Boolean);
            const out = document.getElementById('ti-massa-out');
            if (!linhas.length) { toast('Cole a lista de alunos.', 'warning'); return; }
            if (linhas.length > 150) { toast('Máximo de 150 alunos por vez.', 'warning'); return; }
            let criados = 0, existiam = 0, ok = 0;
            const erros = [], batch = db.batch(), credenciais = [];
            for (let i = 0; i < linhas.length; i++) {
                out.textContent = `Processando ${i + 1} de ${linhas.length}...`;
                const [nome, emailRaw, senhaRaw, turma = ''] = linhas[i].split(';').map(x => x.trim());
                const email = (emailRaw || '').toLowerCase();
                if (!nome || !email.includes('@') || (senhaRaw && senhaRaw.length < 6)) { erros.push(`Linha ${i + 1}: dados inválidos`); continue; }
                const senha = senhaRaw || gerarSenha();
                try {
                    const res = await criarContaAuth(email, senha);
                    if (res === 'criada') { criados++; credenciais.push([nome, email, senha, turma]); } else existiam++;
                    batch.set(db.collection('alunos').doc(email), { nome, email, turma, ativo: true }, { merge: true });
                    ok++;
                } catch (e) { erros.push(`${email}: ${e.code || 'erro'}`); }
            }
            try { if (ok) await batch.commit(); } catch (e) { erroDB(e, 'alunosMassa'); return; }
            registrarAcao('Alunos em massa', `${criados} criados, ${existiam} já existiam, ${erros.length} erros`);
            out.innerHTML = `✅ ${criados} conta(s) criada(s) • ${existiam} já existia(m) (senha não mudou) • ${erros.length} erro(s)` +
                (erros.length ? '<ul class="mt-2 text-warning">' + erros.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '') +
                (credenciais.length ? '<div class="mt-2"><button onclick="baixarCredenciais()" class="btn btn-warning btn-sm fw-bold">⬇️ Baixar credenciais (CSV)</button><div class="text-warning mt-1">Entregue as senhas aos alunos e apague o arquivo depois. Eles podem trocar em "Esqueci minha senha".</div></div>' : '');
            ultimasCredenciais = credenciais;
            if (!erros.length) document.getElementById('ti-massa').value = '';
        }
        async function baixarCSVAlunos() {
            if (!soRaiz()) return;
            try {
                const snap = await db.collection('alunos').orderBy('nome').get();
                baixarCSV(`alunos_${hojeISO()}.csv`, [['Nome', 'E-mail', 'Turma', 'Situação'], ...snap.docs.map(d => { const a = d.data(); return [a.nome, a.email || d.id, a.turma || '', a.ativo ? 'Ativo' : 'Bloqueado']; })]);
            } catch (e) { erroDB(e, 'csvAlunos'); }
        }
        async function excluirAlunosBloqueados() {
            if (!soRaiz()) return;
            try {
                const snap = await db.collection('alunos').where('ativo', '==', false).get();
                if (snap.empty) { toast('Não há alunos bloqueados.', 'warning'); return; }
                if (!(await confirmar(`Excluir ${snap.size} aluno(s) bloqueado(s)? Eles perdem o acesso de vez (a conta de login continua no Authentication).`))) return;
                await apagarEmLotes(snap.docs.map(d => d.ref));
                registrarAcao('Alunos bloqueados excluídos', snap.size + ' alunos');
                mostrarAlertaSucesso(snap.size + ' aluno(s) excluído(s).');
            } catch (e) { erroDB(e, 'excluirBloqueados'); }
        }

        function carregarPortalConfig() {
            ouvir(db.collection('config').doc('sistema'), doc => {
                const d = doc.exists ? doc.data() : {};
                const campo = document.getElementById('ti-banner');
                if (document.activeElement !== campo) campo.value = d.banner || '';
                const rec = d.recursos || {};
                document.querySelectorAll('[data-recurso]').forEach(c => c.checked = rec[c.dataset.recurso] !== false);
            });
        }
        async function salvarPortalConfig() {
            if (!soRaiz()) return;
            const recursos = {};
            document.querySelectorAll('[data-recurso]').forEach(c => recursos[c.dataset.recurso] = c.checked);
            try {
                await db.collection('config').doc('sistema').set({ banner: document.getElementById('ti-banner').value.trim(), recursos, por: emailLogado, em: TS() }, { merge: true });
                toast('Portal atualizado.');
                registrarAcao('Configuração do portal alterada', Object.entries(recursos).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'tudo visível');
            } catch (e) { erroDB(e, 'portalConfig'); }
        }

        
