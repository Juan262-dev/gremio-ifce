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

        
/* ================= ENCERRAR TODAS AS SESSÕES (somente o root) ================= */
        async function encerrarTodasSessoes() {
            if (!(await confirmar('Encerrar TODAS as sessões? Alunos, diretoria e você terão de entrar de novo com a senha.'))) return;
            try {
                await db.collection('config').doc('seguranca').set({
                    sessoesDesdeSeg: Math.floor(Date.now() / 1000),
                    atualizadoPor: emailLogado,
                    atualizadoEm: TS()
                }, { merge: true });
                await auth.signOut();
                location.reload();
            } catch (e) { falhaSec(e, 'encerrarTodasSessoes'); }
        }

        
/* ================= PLANTÃO, VERSÕES E EXCLUSÕES (somente o root) ================= */
        function carregarPlantaoTI() {
            db.collection('config').doc('sistema').get().then(d => {
                const t = document.getElementById('plantao-texto');
                if (t && d.exists) t.value = d.data().plantao || '';
            });
        }
        function salvarPlantaoTI() {
            const texto = document.getElementById('plantao-texto').value.trim();
            db.collection('config').doc('sistema').set({ plantao: texto }, { merge: true })
                .then(() => { toast('Plantão salvo.'); registrarAcao('Plantão do TI atualizado', texto ? 'texto definido' : 'removido'); })
                .catch(e => falhaSec(e, 'salvarPlantaoTI'));
        }
        function carregarVersoesTI() {
            document.getElementById('ver-numero').value = VERSAO_SISTEMA;
            ouvir(db.collection('versoes_publicadas').orderBy('criadoEm', 'desc').limit(20), snap => {
                const c = document.getElementById('lista-versoes');
                if (!c) return;
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma versão registrada.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const x = d.data();
                    const quando = x.criadoEm && x.criadoEm.toDate ? x.criadoEm.toDate().toLocaleString('pt-BR') : '';
                    return `<div class="list-group-item"><strong class="text-white">${esc(x.versao)}</strong> <small class="text-muted-custom">${esc(quando)}</small><br><small class="text-white">${esc(x.nota || 'Sem descrição')}</small></div>`;
                }).join('') + '</div>';
            });
        }
        function registrarVersaoTI() {
            const versao = document.getElementById('ver-numero').value.trim();
            const nota = document.getElementById('ver-nota').value.trim();
            if (!versao) { toast('Informe o número da versão.', 'warning'); return; }
            db.collection('versoes_publicadas').add({ versao, nota, criadoEm: TS(), criadoPorEmail: emailLogado })
                .then(() => { toast('Versão registrada.'); document.getElementById('ver-nota').value = ''; })
                .catch(e => falhaSec(e, 'registrarVersaoTI'));
        }
        function carregarExclusoesTI() {
            ouvir(db.collection('pedidos_exclusao').where('status', '==', 'Aberto'), snap => {
                const c = document.getElementById('lista-exclusoes');
                if (!c) return;
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum pedido em aberto.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const x = d.data();
                    return `<div class="list-group-item d-flex justify-content-between align-items-center gap-2">
                        <div><strong class="text-white">${esc(x.nome || x.email)}</strong><br><small class="text-muted-custom">${esc(x.email)}</small></div>
                        <button onclick="concluirExclusaoTI('${esc(d.id)}','${esc(x.email)}')" class="btn btn-danger btn-sm py-0" style="font-size:12px">Concluir</button>
                    </div>`;
                }).join('') + '</div>';
            });
        }
        async function concluirExclusaoTI(pedidoId, email) {
            if (!(await confirmar(`Concluir a exclusão dos dados de ${email}? Isso apaga o perfil e o aniversário e desativa o cadastro.`))) return;
            try {
                await db.collection('perfis').doc(email).delete().catch(() => {});
                await db.collection('aniversarios').doc(email).delete().catch(() => {});
                await db.collection('alunos').doc(email).update({ ativo: false, status: 'excluido', nome: 'Dados excluídos' });
                await db.collection('pedidos_exclusao').doc(pedidoId).update({ status: 'Concluído', concluidoEm: TS() });
                registrarAcao('Exclusão de dados concluída', email);
                toast('Pedido concluído. Apague também a conta de login no console do Firebase.');
            } catch (e) { falhaSec(e, 'concluirExclusaoTI'); }
        }

        
/* ================= FONTE SUBSTITUTA (somente o root) ================= */
        function carregarFontesTI() {
            ouvir(db.collection('cargos').where('nivel', '==', 'desenvolvedor'), snap => {
                const c = document.getElementById('lista-fontes');
                if (!c) return;
                const outras = snap.docs.filter(d => d.id !== ROOT_EMAIL);
                if (!outras.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma fonte substituta cadastrada.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + outras.map(d => {
                    const x = d.data();
                    const ate = x.fonteAte && x.fonteAte.toDate ? x.fonteAte.toDate().toLocaleDateString('pt-BR') : '—';
                    return `<div class="list-group-item d-flex justify-content-between align-items-center gap-2">
                        <div><strong class="text-white">${esc(x.nome || d.id)}</strong><br><small class="text-muted-custom">${esc(d.id)} • vale até ${esc(ate)}</small></div>
                        <button onclick="revogarFonteTI('${esc(d.id)}')" class="btn btn-outline-danger btn-sm py-0" style="font-size:12px">Revogar</button>
                    </div>`;
                }).join('') + '</div>';
            });
        }
        async function criarFonteTI() {
            if (emailLogado !== ROOT_EMAIL) return;
            const email = document.getElementById('fonte-email').value.trim().toLowerCase();
            const nome = document.getElementById('fonte-nome').value.trim();
            const senha = document.getElementById('fonte-senha').value;
            const fim = document.getElementById('fonte-fim').value;
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Informe um e-mail válido.', 'warning'); return; }
            if (email === ROOT_EMAIL) { toast('Esse é o seu próprio e-mail.', 'warning'); return; }
            if (!nome) { toast('Informe o nome da pessoa.', 'warning'); return; }
            if (senha.length < 6) { toast('A senha precisa ter 6 ou mais caracteres.', 'warning'); return; }
            if (!fim) { toast('Defina até quando a fonte vale.', 'warning'); return; }
            try {
                const ts = firebase.firestore.Timestamp.fromDate(new Date(fim + 'T23:59:59'));
                await criarContaAuth(email, senha);
                await db.collection('cargos').doc(email).set({ nome, cargo: 'Fonte substituta', nivel: 'desenvolvedor', fimMandato: ts, fonteAte: ts });
                registrarAcao('Fonte substituta cadastrada', email);
                ['fonte-email', 'fonte-nome', 'fonte-senha', 'fonte-fim'].forEach(i => document.getElementById(i).value = '');
                toast('Fonte substituta cadastrada. Envie a senha só para essa pessoa.');
            } catch (e) { falhaSec(e, 'criarFonteTI'); }
        }
        async function revogarFonteTI(email) {
            if (emailLogado !== ROOT_EMAIL) return;
            if (!(await confirmar(`Revogar o acesso de ${email} agora?`))) return;
            db.collection('cargos').doc(email).delete()
                .then(() => { toast('Acesso revogado.'); registrarAcao('Fonte substituta revogada', email); })
                .catch(e => falhaSec(e, 'revogarFonteTI'));
        }

        
/* ================= FERRAMENTAS DE TI (só o e-mail raiz) ================= */

        async function rodarDiagnostico() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-diag');
            out.textContent = 'Testando...';
            const nomes = ['cargos', 'alunos', 'reivindicacoes', 'eventos', 'sugestoes', 'materiais', 'jogos', 'enquetes', 'mural', 'membros_punidos', 'acoes_admin', 'config'];
            const linhas = [`<div class="mb-2">👤 <strong>${esc(emailLogado)}</strong> • cargo: <strong>${esc(document.getElementById('user-role-display').textContent)}</strong></div>`];
            let problemas = 0;
            for (const n of nomes) {
                const t0 = performance.now();
                try {
                    const snap = await db.collection(n).limit(500).get();
                    linhas.push(`<div>✅ ${n} — ${snap.size} doc(s) • ${Math.round(performance.now() - t0)} ms</div>`);
                    if (n === 'alunos') {
                        const comSenha = snap.docs.filter(d => d.data().senha !== undefined).length;
                        const semAtivo = snap.docs.filter(d => d.data().ativo === undefined).length;
                        if (comSenha) { problemas++; linhas.push(`<div class="text-warning">⚠️ ${comSenha} aluno(s) ainda com senha em texto puro no banco. Rode o migrar_alunos.js.</div>`); }
                        if (semAtivo) { problemas++; linhas.push(`<div class="text-warning">⚠️ ${semAtivo} aluno(s) sem o campo "ativo" (não conseguem entrar).</div>`); }
                    }
                } catch (e) {
                    problemas++;
                    linhas.push(`<div class="text-danger">❌ ${n} — ${esc(e.code || 'erro')}</div>`);
                }
            }
            linhas.push(problemas ? `<div class="mt-2 text-warning fw-bold">${problemas} ponto(s) de atenção.</div>` : '<div class="mt-2 text-success fw-bold">Tudo certo! 🎉</div>');
            out.innerHTML = linhas.join('');
        }

        async function redefinirSenha() {
            if (!soRaiz()) return;
            const email = document.getElementById('ti-reset-email').value.trim().toLowerCase();
            if (!email || !email.includes('@')) { toast('Digite um e-mail válido.', 'warning'); return; }
            try {
                await auth.sendPasswordResetEmail(email);
                toast('Link enviado para ' + email + '. Peça para olhar o spam também.');
                registrarAcao('Redefinição de senha enviada', email);
                document.getElementById('ti-reset-email').value = '';
            } catch (e) { erroDB(e, 'redefinirSenha'); }
        }

        function carregarManutencao() {
            ouvir(db.collection('config').doc('sistema'), doc => {
                const d = doc.exists ? doc.data() : {};
                document.getElementById('ti-manut-status').innerHTML = d.manutencao ? '🔴 <strong>LIGADO</strong>' : '🟢 desligado';
                document.getElementById('ti-manut-btn').textContent = d.manutencao ? 'Desativar manutenção' : 'Ativar manutenção';
                const campo = document.getElementById('ti-manut-msg');
                if (document.activeElement !== campo) campo.value = d.mensagem || '';
            });
        }
        async function alternarManutencao() {
            if (!soRaiz()) return;
            try {
                const ref = db.collection('config').doc('sistema');
                const snap = await ref.get();
                const ligar = !(snap.exists && snap.data().manutencao === true);
                if (!(await confirmar(ligar ? 'Ligar a manutenção? Os alunos ficam sem acesso até você desligar.' : 'Desligar a manutenção e liberar os alunos?'))) return;
                await ref.set({ manutencao: ligar, mensagem: document.getElementById('ti-manut-msg').value.trim(), por: emailLogado, em: TS() }, { merge: true });
                registrarAcao(ligar ? 'Manutenção ligada' : 'Manutenção desligada', '');
            } catch (e) { erroDB(e, 'alternarManutencao'); }
        }

        const CAMPOS_DATA = ['criadoEm', 'expiraEm', 'punidoEm', 'em', 'statusEm', 'respondidaEm'];
        function deJSON(o) {
            const r = { ...o };
            delete r.id; delete r.senha;
            CAMPOS_DATA.forEach(k => { if (typeof r[k] === 'string' && !isNaN(Date.parse(r[k]))) r[k] = firebase.firestore.Timestamp.fromDate(new Date(r[k])); });
            return r;
        }
        async function restaurarBackup() {
            if (!soRaiz()) return;
            const arq = document.getElementById('ti-arquivo').files[0];
            if (!arq) { toast('Escolha o arquivo de backup (.json).', 'warning'); return; }
            let dados;
            try { dados = JSON.parse(await arq.text()); } catch (e) { toast('Arquivo inválido.', 'danger'); return; }
            const nomes = ['cargos', 'alunos', 'reivindicacoes', 'eventos', 'sugestoes', 'materiais', 'jogos', 'enquetes', 'mural', 'membros_punidos'];
            const total = nomes.reduce((t, n) => t + (Array.isArray(dados[n]) ? dados[n].length : 0), 0);
            if (!total) { toast('Esse arquivo não tem dados para restaurar.', 'warning'); return; }
            if (!(await confirmar(`Restaurar ${total} registro(s) do backup de ${String(dados.geradoEm || '').slice(0, 10)}? Eles substituem os atuais com o mesmo ID.`))) return;
            try {
                for (const n of nomes) {
                    const docs = (Array.isArray(dados[n]) ? dados[n] : []).filter(d => d && d.id);
                    for (let i = 0; i < docs.length; i += 400) {
                        const b = db.batch();
                        docs.slice(i, i + 400).forEach(d => b.set(db.collection(n).doc(d.id), deJSON(d), { merge: true }));
                        await b.commit();
                    }
                }
                mostrarAlertaSucesso(`${total} registro(s) restaurado(s).`);
                registrarAcao('Backup restaurado', `${total} registros`);
                document.getElementById('ti-arquivo').value = '';
            } catch (e) { erroDB(e, 'restaurarBackup'); }
        }

        async function apagarEmLotes(refs) {
            for (let i = 0; i < refs.length; i += 400) {
                const b = db.batch();
                refs.slice(i, i + 400).forEach(r => b.delete(r));
                await b.commit();
            }
        }
        async function limparGestao() {
            if (!soRaiz()) return;
            const marcados = [...document.querySelectorAll('[data-limpar]:checked')].map(c => c.dataset.limpar);
            if (!marcados.length) { toast('Marque o que deseja limpar.', 'warning'); return; }
            if (!(await confirmar('Isso apaga de forma definitiva o que você marcou. Você já baixou o backup?'))) return;
            const hoje = hojeISO(), agora = Date.now();
            const regras = {
                mural: ['mural', () => true],
                eventos: ['eventos', d => d.dataISO && d.dataISO < hoje],
                jogos: ['jogos', d => d.status === 'Encerrado'],
                enquetes: ['enquetes', d => d.ativa === false],
                punicoes: ['membros_punidos', d => d.expiraEm && d.expiraEm.toMillis() < agora]
            };
            let total = 0;
            try {
                for (const m of marcados) {
                    const [col, filtro] = regras[m];
                    const snap = await db.collection(col).get();
                    const alvo = snap.docs.filter(d => filtro(d.data()));
                    await apagarEmLotes(alvo.map(d => d.ref));
                    total += alvo.length;
                }
                mostrarAlertaSucesso(`${total} item(ns) apagado(s).`);
                registrarAcao('Limpeza de gestão', `${marcados.join(', ')}: ${total} itens`);
                document.querySelectorAll('[data-limpar]').forEach(c => c.checked = false);
                carregarResumo();
            } catch (e) { erroDB(e, 'limparGestao'); }
        }
        async function desativarTurma() {
            if (!soRaiz()) return;
            const turma = document.getElementById('ng-turma').value.trim();
            if (!turma) { toast('Digite o nome da turma.', 'warning'); return; }
            try {
                const snap = await db.collection('alunos').where('turma', '==', turma).get();
                const alvo = snap.docs.filter(d => d.data().ativo);
                if (!alvo.length) { toast('Nenhum aluno ativo nessa turma.', 'warning'); return; }
                if (!(await confirmar(`Desativar ${alvo.length} aluno(s) da turma "${turma}"?`))) return;
                for (let i = 0; i < alvo.length; i += 400) {
                    const b = db.batch();
                    alvo.slice(i, i + 400).forEach(d => b.update(d.ref, { ativo: false }));
                    await b.commit();
                }
                mostrarAlertaSucesso(`${alvo.length} aluno(s) da turma "${turma}" desativado(s).`);
                registrarAcao('Turma desativada', `${turma}: ${alvo.length} alunos`);
                document.getElementById('ng-turma').value = '';
            } catch (e) { erroDB(e, 'desativarTurma'); }
        }
        async function trocarDiretoria() {
            if (!soRaiz()) return;
            const linhas = document.getElementById('ng-lista').value.split('\n').map(l => l.trim()).filter(Boolean);
            const novos = [];
            for (const l of linhas) {
                const [nome, email, cargo, nivel, senha] = l.split(';').map(x => (x || '').trim());
                const em = (email || '').toLowerCase();
                if (em === ROOT_EMAIL) continue;
                if (!nome || !em.includes('@') || !cargo || !['admin', 'membro', 'marketing'].includes(nivel) || (senha && senha.length < 6)) {
                    toast(`Linha inválida: "${l.slice(0, 40)}". Formato: Nome;email;cargo;nivel;senha`, 'danger'); return;
                }
                novos.push({ nome, email: em, cargo, nivel, senha });
            }
            if (!novos.length) { toast('Cole pelo menos uma linha.', 'warning'); return; }
            const remover = document.getElementById('ng-remover').checked;
            if (!(await confirmar(`Cadastrar ${novos.length} diretor(es)${remover ? ' e REMOVER os cargos antigos' : ''}?`))) return;
            try {
                let contas = 0;
                for (const n of novos) {
                    if (n.senha && (await criarContaAuth(n.email, n.senha)) === 'criada') contas++;
                    await db.collection('cargos').doc(n.email).set({ nome: n.nome, cargo: n.cargo, nivel: n.nivel });
                }
                let removidos = 0;
                if (remover) {
                    const manter = new Set([ROOT_EMAIL, ...novos.map(n => n.email)]);
                    const snap = await db.collection('cargos').get();
                    const alvo = snap.docs.filter(d => !manter.has(d.id));
                    await apagarEmLotes(alvo.map(d => d.ref));
                    removidos = alvo.length;
                }
                mostrarAlertaSucesso(`${novos.length} diretor(es) salvo(s), ${contas} conta(s) criada(s), ${removidos} removido(s).`);
                registrarAcao('Diretoria trocada', `${novos.length} novos, ${removidos} removidos`);
                document.getElementById('ng-lista').value = '';
            } catch (e) { erroDB(e, 'trocarDiretoria'); }
        }
/* ================= AUDITORIA ================= */

        function carregarAuditoria() {
            ouvir(db.collection('acoes_admin').orderBy('em', 'desc').limit(30), snapshot => {
                const container = document.getElementById('lista-auditoria-admin');
                if (snapshot.empty) { container.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma ação registrada ainda.</p>'; return; }
                let html = '<ul class="list-group">';
                snapshot.forEach(doc => {
                    const a = doc.data();
                    html += `
                        <li class="list-group-item small">
                            <strong style="color: var(--ifce-accent-green);">${esc(a.acao)}</strong>
                            <span class="text-white"> — ${esc(a.detalhes)}</span><br>
                            <small class="text-muted-custom" style="font-size: 11px;">${esc(a.autor)} • ${esc(fmtData(a.em))}</small>
                        </li>`;
                });
                container.innerHTML = html + '</ul>';
            });
        }

        

/* ================= PAINEL DE SAÚDE DO SISTEMA (somente o root) ================= */
async function atualizarSaudeSistema() {
    const box = document.getElementById('saude-lista');
    if (!box || emailLogado !== ROOT_EMAIL) return;
    const itens = [];
    const add = (cor, titulo, texto) => itens.push({ cor, titulo, texto });
    const agora = Date.now(), DIA = 864e5;
    try {
        // 1. backup
        const est = await db.collection('ti_privado').doc('estado').get();
        const ub = est.exists && est.data().ultimoBackup ? est.data().ultimoBackup.toMillis() : 0;
        if (!ub) add('yellow', 'Backup', 'Nenhum backup registrado ainda.');
        else {
            const dias = Math.floor((agora - ub) / DIA);
            add(dias > 30 ? 'red' : dias > 14 ? 'yellow' : 'green', 'Backup', dias === 0 ? 'feito hoje' : `último há ${dias} dia(s)`);
        }
        // 2. versão
        const vers = await db.collection('versoes_publicadas').orderBy('criadoEm', 'desc').limit(1).get();
        const ultima = vers.empty ? null : vers.docs[0].data().versao;
        if (!ultima) add('yellow', 'Versão', `em uso ${VERSAO_SISTEMA}; nenhuma versão registrada`);
        else add(ultima === VERSAO_SISTEMA ? 'green' : 'yellow', 'Versão',
            ultima === VERSAO_SISTEMA ? `em uso ${VERSAO_SISTEMA}, igual à última registrada` : `em uso ${VERSAO_SISTEMA}, mas a última registrada é ${ultima}`);
        // 3. cadastros pendentes
        const pend = await db.collection('alunos').where('status', '==', 'pendente').get();
        const velhos = pend.docs.filter(d => d.data().criadoEm && d.data().criadoEm.toMillis() < agora - 3 * DIA).length;
        add(velhos ? 'yellow' : 'green', 'Cadastros pendentes',
            velhos ? `${velhos} esperando há mais de 3 dias` : (pend.size ? `${pend.size} aguardando, dentro do prazo` : 'nenhum aguardando'));
        // 4. eleição
        const ele = await db.collection('eleicoes').orderBy('criadoEm', 'desc').limit(1).get();
        if (ele.empty) add('green', 'Eleição', 'nenhuma eleição criada');
        else {
            const e = ele.docs[0].data();
            if (e.status === 'aberta' && e.fim && e.fim.toMillis() < agora) add('red', 'Eleição', 'ainda aberta depois do horário de fim: encerre');
            else if (e.status === 'aberta') add('yellow', 'Eleição', 'votação aberta agora');
            else add('green', 'Eleição', `situação: ${e.status}`);
        }
        // 5. erros do portal nas últimas 24 horas
        const err = await db.collection('erros_app').where('em', '>', firebase.firestore.Timestamp.fromMillis(agora - DIA)).get();
        add(err.size > 50 ? 'red' : err.size > 10 ? 'yellow' : 'green', 'Erros do portal (24 h)', `${err.size} registro(s)`);
        // 6. contas de cargo vencidas ou perto de vencer
        const cargos = await db.collection('cargos').get();
        const vencendo = cargos.docs.filter(d => d.data().fimMandato && d.data().fimMandato.toMillis() < agora + 7 * DIA).length;
        add(vencendo ? 'yellow' : 'green', 'Contas de cargo',
            vencendo ? `${vencendo} vencida(s) ou vencendo em até 7 dias` : 'todas dentro do prazo');
    } catch (e) {
        console.error('saude', e);
        add('red', 'Verificação', 'não foi possível checar tudo agora');
    }
    const cores = { green: '#198754', yellow: '#ffc107', red: '#dc3545' };
    const legenda = { green: 'Tudo certo', yellow: 'Atenção', red: 'Agir agora' };
    box.innerHTML = itens.map(x => `<div class="mb-2">
        <span class="badge" style="background:${cores[x.cor]};color:${x.cor === 'yellow' ? '#000' : '#fff'}">${legenda[x.cor]}</span>
        <strong class="text-white small">${esc(x.titulo)}</strong><br>
        <small class="text-muted-custom">${esc(x.texto)}</small></div>`).join('');
}
