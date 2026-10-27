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
        /* ================= TAREFAS, ATAS, RELATÓRIO, DIVULGAÇÃO, ARTES ================= */

        function carregarMinhasTarefas() {
            ouvir(db.collection('tarefas').where('atribuidoPara', '==', emailLogado), snap => {
                const c = document.getElementById('lista-minhas-tarefas');
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'Pendente' ? -1 : 1) || (a.prazo || '9999').localeCompare(b.prazo || '9999'));
                if (!docs.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma tarefa para você no momento.</p>'; return; }
                const hoje = hojeISO();
                c.innerHTML = '<div class="list-group">' + docs.map(t => {
                    const feita = t.status === 'Concluída', atras = !feita && t.prazo && t.prazo < hoje;
                    return `
                    <div class="list-group-item d-flex justify-content-between align-items-start gap-2">
                        <div style="${feita ? 'opacity:.6' : ''}">
                            <h6 class="fw-bold mb-1" style="color: var(--ifce-accent-green);">${esc(t.titulo)} ${feita ? '<span class="badge bg-success">Concluída</span>' : atras ? '<span class="badge bg-danger">Atrasada</span>' : ''}</h6>
                            ${t.descricao ? `<p class="mb-1 small text-white">${esc(t.descricao)}</p>` : ''}
                            <small class="text-muted-custom" style="font-size: 11px;">${t.prazo ? 'Prazo: ' + esc(dataBR(t.prazo)) + ' • ' : ''}Por: ${esc(t.criadaPor || 'Presidência')}</small>
                        </div>
                        <button data-acao="${feita ? 'reabrirTarefa' : 'concluirTarefa'}" data-id="${esc(t.id)}" class="btn btn-sm ${feita ? 'btn-outline-light' : 'btn-success'} py-0" style="font-size: 11px; white-space: nowrap;">${feita ? 'Reabrir' : '✔ Concluir'}</button>
                    </div>`;
                }).join('') + '</div>';
            });
        }

        let cacheCargos = {};
        function carregarTarefasAdmin() {
            ouvir(db.collection('cargos'), snap => {
                cacheCargos = {};
                snap.docs.forEach(d => cacheCargos[d.id] = d.data());
                const sel = document.getElementById('tar-para'), atual = sel.value;
                sel.innerHTML = '<option value="__todos">👥 Todos os diretores</option>' + snap.docs.map(d => `<option value="${esc(d.id)}">${esc(d.data().nome)} — ${esc(d.data().cargo)}</option>`).join('');
                if (atual) sel.value = atual;
            });
            ouvir(db.collection('tarefas').orderBy('criadoEm', 'desc').limit(100), snap => {
                const c = document.getElementById('lista-tarefas-admin');
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma tarefa atribuída ainda. Use "Atribuir Tarefas" para distribuir uma tarefa entre os diretores.</p>'; return; }
                const hoje = hojeISO();
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.status === b.status ? 0 : a.status === 'Pendente' ? -1 : 1));
                c.innerHTML = '<div class="list-group">' + docs.map(t => {
                    const feita = t.status === 'Concluída', atras = !feita && t.prazo && t.prazo < hoje;
                    return `
                    <div class="list-group-item d-flex justify-content-between align-items-start gap-2">
                        <div style="${feita ? 'opacity:.6' : ''}">
                            <strong class="text-white">${esc(t.titulo)}</strong> ${feita ? '<span class="badge bg-success">Concluída</span>' : atras ? '<span class="badge bg-danger">Atrasada</span>' : '<span class="badge bg-warning text-dark">Pendente</span>'}<br>
                            <small class="text-muted-custom">Para: ${esc(t.atribuidoNome || t.atribuidoPara)}${t.prazo ? ' • prazo ' + esc(dataBR(t.prazo)) : ''}</small>
                        </div>
                        <button data-acao="excluirTarefa" data-id="${esc(t.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                    </div>`;
                }).join('') + '</div>';
            });
        }
        async function criarTarefa() {
            const titulo = document.getElementById('tar-titulo').value.trim();
            const descricao = document.getElementById('tar-desc').value.trim();
            const prazo = document.getElementById('tar-prazo').value;
            const para = document.getElementById('tar-para').value;
            if (!titulo || !para) { toast('Preencha a tarefa e para quem é.', 'warning'); return; }
            const alvos = para === '__todos' ? Object.keys(cacheCargos) : [para];
            if (!alvos.length) { toast('Cadastre diretores primeiro.', 'warning'); return; }
            try {
                const batch = db.batch();
                alvos.forEach(email => batch.set(db.collection('tarefas').doc(), {
                    titulo, descricao, prazo, atribuidoPara: email, atribuidoNome: (cacheCargos[email] || {}).nome || email,
                    criadaPor: document.getElementById('user-name-display').textContent, status: 'Pendente', criadoEm: TS()
                }));
                await batch.commit();
                mostrarAlertaSucesso(`Tarefa atribuída (${alvos.length} pessoa${alvos.length > 1 ? 's' : ''}).`);
                registrarAcao('Tarefa atribuída', `${titulo} → ${para === '__todos' ? 'todos' : para}`);
                ['tar-titulo', 'tar-desc', 'tar-prazo'].forEach(i => document.getElementById(i).value = '');
            } catch (e) { erroDB(e, 'criarTarefa'); }
        }

        let cacheAtas = {};
        function criarAta() {
            const g = id => document.getElementById(id).value.trim();
            const titulo = g('ata-titulo');
            if (!titulo) { toast('Dê um título à ata.', 'warning'); return; }
            db.collection('atas').add({
                titulo, data: document.getElementById('ata-data').value, presentes: g('ata-presentes'), pauta: g('ata-pauta'), decisoes: g('ata-decisoes'),
                criadaPor: document.getElementById('user-name-display').textContent, criadoEm: TS()
            }).then(() => {
                mostrarAlertaSucesso('Ata salva!');
                registrarAcao('Ata criada', titulo);
                ['ata-titulo', 'ata-data', 'ata-presentes', 'ata-pauta', 'ata-decisoes'].forEach(i => document.getElementById(i).value = '');
            }).catch(e => erroDB(e, 'criarAta'));
        }
        function carregarAtas() {
            ouvir(db.collection('atas').orderBy('criadoEm', 'desc').limit(50), snap => {
                const c = document.getElementById('lista-atas-admin');
                cacheAtas = {};
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma ata registrada ainda. Registre a reunião com presentes, pauta e decisões.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const a = d.data(); cacheAtas[d.id] = a;
                    const bloco = (t, v) => v ? `<div class="mb-2"><strong class="small" style="color: var(--ifce-accent-green);">${t}</strong><div class="small text-white" style="white-space: pre-wrap;">${esc(v)}</div></div>` : '';
                    return `
                    <div class="list-group-item">
                        <details>
                            <summary class="fw-bold text-white" style="cursor: pointer;">${esc(a.titulo)} <small class="text-muted-custom">${a.data ? '• ' + esc(dataBR(a.data)) : ''}</small></summary>
                            <div class="mt-2">${bloco('Presentes', a.presentes)}${bloco('Pauta', a.pauta)}${bloco('Decisões', a.decisoes)}
                                <div class="d-flex gap-2">
                                    <button data-acao="pdfAta" data-id="${esc(d.id)}" class="btn btn-outline-light btn-sm py-0" style="font-size: 11px;">📄 PDF</button>
                                    <button data-acao="excluirAta" data-id="${esc(d.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                                </div>
                            </div>
                        </details>
                    </div>`;
                }).join('') + '</div>';
            });
        }
        function gerarPDFAta(id) {
            const a = cacheAtas[id]; if (!a) return;
            const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 20;
            const linha = t => doc.splitTextToSize(String(t), 170).forEach(p => { if (y > 280) { doc.addPage(); y = 20; } doc.text(p, 20, y); y += 6; });
            doc.setFont('Helvetica', 'bold'); doc.setFontSize(15); doc.text('Grêmio Estudantil - IFCE Crateús', 20, y); y += 9;
            doc.setFontSize(12); linha('ATA: ' + a.titulo); doc.setFont('Helvetica', 'normal'); linha('Data: ' + (a.data ? dataBR(a.data) : '-'));
            [['Presentes', a.presentes], ['Pauta', a.pauta], ['Decisões', a.decisoes]].forEach(([t, v]) => {
                if (!v) return; y += 3; doc.setFont('Helvetica', 'bold'); linha(t); doc.setFont('Helvetica', 'normal'); linha(v);
            });
            y += 6; linha('Registrada por: ' + (a.criadaPor || '-'));
            pdfFinalizar(doc, `ata_${(a.data || 'sem-data')}.pdf`);
        }

        async function gerarRelatorioMensal() {
            const mes = document.getElementById('rel-mes').value;
            if (!mes) { toast('Escolha o mês.', 'warning'); return; }
            const [ano, m] = mes.split('-').map(Number);
            const ini = new Date(ano, m - 1, 1), fim = new Date(ano, m, 1);
            const noMes = ts => ts && ts.toDate && ts.toDate() >= ini && ts.toDate() < fim;
            try {
                const T = d => firebase.firestore.Timestamp.fromDate(d);
                const [acoes, eventos, pautas, sugs, tarefas, alunos, jogos] = await Promise.all([
                    db.collection('acoes_admin').where('em', '>=', T(ini)).where('em', '<', T(fim)).get(),
                    db.collection('eventos').get(), db.collection('reivindicacoes').get(), db.collection('sugestoes').get(),
                    db.collection('tarefas').get(), db.collection('alunos').get(), db.collection('jogos').get()
                ]);
                const ev = eventos.docs.map(d => d.data()).filter(e => e.dataISO ? e.dataISO.startsWith(mes) : noMes(e.criadoEm));
                const pa = pautas.docs.map(d => d.data());
                const porAcao = {};
                acoes.docs.forEach(d => { const k = d.data().acao || 'Outras'; porAcao[k] = (porAcao[k] || 0) + 1; });
                const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 20;
                const checar = n => { if (y + n > 285) { doc.addPage(); y = 20; } };
                const linha = t => doc.splitTextToSize(String(t), 170).forEach(p => { checar(6); doc.text(p, 20, y); y += 6; });
                const titulo = t => { checar(14); y += 3; doc.setFont('Helvetica', 'bold'); doc.setFontSize(13); doc.text(t, 20, y); y += 8; doc.setFont('Helvetica', 'normal'); doc.setFontSize(11); };
                doc.setFont('Helvetica', 'bold'); doc.setFontSize(16); doc.text('Grêmio Estudantil - IFCE Crateús', 20, y); y += 9;
                doc.setFontSize(12); doc.text(`Relatório mensal - ${String(m).padStart(2, '0')}/${ano}`, 20, y); y += 8; doc.setFont('Helvetica', 'normal'); doc.setFontSize(11);
                titulo('Resumo');
                linha(`Alunos ativos no portal: ${alunos.docs.filter(d => d.data().ativo).length}`);
                linha(`Ações registradas pela diretoria: ${acoes.size}`);
                linha(`Eventos no mês: ${ev.length}`);
                linha(`Jogos cadastrados no mês: ${jogos.docs.filter(d => noMes(d.data().criadoEm)).length}`);
                titulo('Eventos');
                ev.length ? ev.forEach(e => linha(`- ${e.titulo} (${e.data || dataBR(e.dataISO)}) - ${(e.inscritos || []).length} inscrito(s)`)) : linha('Nenhum evento.');
                titulo('Pautas dos alunos');
                linha(`Novas pautas: ${pa.filter(p => noMes(p.criadoEm)).length}`);
                const movidas = pa.filter(p => noMes(p.statusEm));
                movidas.length ? movidas.forEach(p => linha(`- ${p.titulo}: ${p.status} (${(p.apoios || []).length} apoios)`)) : linha('Nenhuma pauta mudou de status.');
                titulo('Sugestões');
                const su = sugs.docs.map(d => d.data());
                linha(`Recebidas: ${su.filter(x => noMes(x.criadoEm)).length} | Respondidas: ${su.filter(x => noMes(x.respondidaEm)).length} | Aguardando resposta: ${su.filter(x => !x.resposta).length}`);
                titulo('Tarefas da diretoria');
                const ta = tarefas.docs.map(d => d.data());
                linha(`Concluídas no mês: ${ta.filter(x => noMes(x.concluidaEm)).length} | Pendentes agora: ${ta.filter(x => x.status === 'Pendente').length}`);
                titulo('Ações registradas');
                Object.keys(porAcao).length ? Object.entries(porAcao).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => linha(`- ${k}: ${v}`)) : linha('Nenhuma ação.');
                pdfFinalizar(doc, `relatorio_gremio_${mes}.pdf`);
                registrarAcao('Relatório mensal gerado', mes);
            } catch (e) { erroDB(e, 'relatorioMensal'); }
        }

        function criarDivulgacao() {
            const g = id => document.getElementById(id).value.trim();
            const titulo = g('div-titulo');
            if (!titulo) { toast('Diga o que será divulgado.', 'warning'); return; }
            db.collection('divulgacoes').add({
                titulo, canal: document.getElementById('div-canal').value, data: document.getElementById('div-data').value,
                responsavel: g('div-resp'), status: 'Planejado', criadoEm: TS()
            }).then(() => { toast('Adicionado ao calendário!'); ['div-titulo', 'div-data', 'div-resp'].forEach(i => document.getElementById(i).value = ''); })
              .catch(e => erroDB(e, 'criarDivulgacao'));
        }
        function carregarDivulgacoes() {
            ouvir(db.collection('divulgacoes').orderBy('criadoEm', 'desc').limit(100), snap => {
                const c = document.getElementById('lista-divulgacao');
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nada planejado ainda.</p>'; return; }
                const hoje = hojeISO();
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ((a.status === 'Publicado') - (b.status === 'Publicado')) || (a.data || '9999').localeCompare(b.data || '9999'));
                c.innerHTML = '<div class="list-group">' + docs.map(x => {
                    const atras = x.status !== 'Publicado' && x.data && x.data < hoje;
                    return `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start">
                            <div><strong class="text-white">${esc(x.titulo)}</strong> ${atras ? '<span class="badge bg-danger">Atrasado</span>' : ''}<br>
                            <small class="text-muted-custom">${esc(x.canal)}${x.data ? ' • ' + esc(dataBR(x.data)) : ''}${x.responsavel ? ' • ' + esc(x.responsavel) : ''}</small></div>
                            <button data-acao="excluirDivulgacao" data-id="${esc(x.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                        </div>
                        <select data-mudar="statusDivulgacao" data-id="${esc(x.id)}" class="form-select form-select-sm mt-2" style="max-width: 190px;">
                            ${['Planejado', 'Em produção', 'Pronto', 'Publicado'].map(st => `<option ${st === x.status ? 'selected' : ''}>${st}</option>`).join('')}
                        </select>
                    </div>`;
                }).join('') + '</div>';
            });
        }
        document.addEventListener('change', e => {
            const sd = e.target.closest('[data-mudar="statusDivulgacao"]');
            if (sd) db.collection('divulgacoes').doc(sd.dataset.id).update({ status: sd.value }).catch(err => erroDB(err, 'statusDivulgacao'));
        });

        function criarArte() {
            const nome = document.getElementById('arte-nome').value.trim(), link = document.getElementById('arte-link').value.trim();
            if (!nome || !/^https:\/\//i.test(link)) { toast('Informe o nome e um link que comece com https://', 'warning'); return; }
            db.collection('artes').add({ nome, link, criadoEm: TS() })
                .then(() => { toast('Link salvo!'); ['arte-nome', 'arte-link'].forEach(i => document.getElementById(i).value = ''); })
                .catch(e => erroDB(e, 'criarArte'));
        }
        function carregarArtes() {
            ouvir(db.collection('artes').orderBy('criadoEm', 'desc').limit(100), snap => {
                const c = document.getElementById('lista-artes');
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum link guardado.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const a = d.data(), ok = /^https:\/\//i.test(a.link || '');
                    return `<div class="list-group-item d-flex justify-content-between align-items-center gap-2">
                        <div><strong class="text-white">${esc(a.nome)}</strong><br>${ok ? `<a href="${esc(a.link)}" target="_blank" rel="noopener noreferrer" class="small">Abrir link ↗</a>` : '<small class="text-muted-custom">link inválido</small>'}</div>
                        <button data-acao="excluirArte" data-id="${esc(d.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                    </div>`;
                }).join('') + '</div>';
            });
        }

        function calcularClassificacao(jogos) {
            const por = {};
            jogos.filter(j => j.status === 'Encerrado').forEach(j => {
                const t = por[j.torneio || 'Geral'] = por[j.torneio || 'Geral'] || {};
                const reg = n => t[n] = t[n] || { time: n, J: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0, Pts: 0 };
                const a = reg(j.timeA), b = reg(j.timeB), pa = Number(j.placarA) || 0, pb = Number(j.placarB) || 0;
                a.J++; b.J++; a.GP += pa; a.GC += pb; b.GP += pb; b.GC += pa;
                if (pa > pb) { a.V++; a.Pts += 3; b.D++; } else if (pb > pa) { b.V++; b.Pts += 3; a.D++; } else { a.E++; b.E++; a.Pts++; b.Pts++; }
            });
            return Object.entries(por).map(([torneio, t]) => ({ torneio, times: Object.values(t).sort((x, y) => y.Pts - x.Pts || (y.GP - y.GC) - (x.GP - x.GC) || y.GP - x.GP) }));
        }
        function carregarClassificacao() {
            ouvir(db.collection('jogos'), snap => {
                const grupos = calcularClassificacao(snap.docs.map(d => d.data()));
                document.getElementById('classificacao-admin').innerHTML = grupos.map(({ torneio, times }) => `
                    <div class="mb-3"><h6 class="fw-bold text-white">Classificação — ${esc(torneio)}</h6>
                    <div style="overflow-x: auto;"><table class="table table-sm table-dark mb-0"><thead><tr><th>#</th><th>Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Pts</th></tr></thead><tbody>
                    ${times.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t.time)}</td><td>${t.J}</td><td>${t.V}</td><td>${t.E}</td><td>${t.D}</td><td>${t.GP - t.GC}</td><td><strong>${t.Pts}</strong></td></tr>`).join('')}
                    </tbody></table></div></div>`).join('') + (grupos.length ? '<hr style="border-color: var(--ifce-card-border);" class="my-3">' : '');
            });
        }

        /* ================= ABA DE ESTUDOS (materiais e provas) ================= */

        function criarEstudo() {
            const g = id => document.getElementById(id).value.trim();
            const titulo = g('est-titulo'), link = g('est-link');
            if (!titulo) { toast('Dê um título ao material.', 'warning'); return; }
            if (!/^https:\/\//i.test(link)) { toast('Cole um link que comece com https://', 'warning'); return; }
            db.collection('estudos').add({
                titulo, disciplina: g('est-disciplina'), tipo: document.getElementById('est-tipo-adm').value, link, descricao: g('est-desc'),
                autor: document.getElementById('user-name-display').textContent, criadoEm: TS()
            }).then(() => {
                toast('Material publicado para os alunos! 📚');
                registrarAcao('Material de estudo publicado', titulo);
                ['est-titulo', 'est-link', 'est-desc'].forEach(i => document.getElementById(i).value = '');
            }).catch(e => erroDB(e, 'criarEstudo'));
        }
        function criarProva() {
            const g = id => document.getElementById(id).value.trim();
            const disciplina = g('prova-disc'), dataISO = document.getElementById('prova-data').value;
            if (!disciplina || !dataISO) { toast('Informe a disciplina e a data da prova.', 'warning'); return; }
            db.collection('provas').add({ disciplina, dataISO, turma: g('prova-turma'), conteudo: g('prova-conteudo'), criadoEm: TS() })
                .then(() => {
                    toast('Prova adicionada.');
                    registrarAcao('Prova cadastrada', `${disciplina} em ${dataBR(dataISO)}`);
                    ['prova-disc', 'prova-data', 'prova-turma', 'prova-conteudo'].forEach(i => document.getElementById(i).value = '');
                }).catch(e => erroDB(e, 'criarProva'));
        }
        function carregarEstudosAdmin() {
            ouvir(db.collection('estudos').orderBy('criadoEm', 'desc').limit(100), snap => {
                const c = document.getElementById('lista-estudos-admin');
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                document.getElementById('est-disc-lista').innerHTML = [...new Set(docs.map(e => e.disciplina).filter(Boolean))].sort().map(d => `<option value="${esc(d)}">`).join('');
                if (!docs.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum material publicado.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + docs.map(e => `
                    <div class="list-group-item d-flex justify-content-between align-items-start gap-2">
                        <div><strong class="text-white">${esc(e.titulo)}</strong> <span class="badge bg-secondary">${esc(e.tipo || '')}</span><br>
                        <small class="text-muted-custom">${esc(e.disciplina || 'Sem disciplina')} • ${esc(fmtData(e.criadoEm))}</small></div>
                        <button data-acao="excluirEstudo" data-id="${esc(e.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                    </div>`).join('') + '</div>';
            });
            ouvir(db.collection('provas').orderBy('dataISO'), snap => {
                const c = document.getElementById('lista-provas-admin');
                const hoje = hojeISO();
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (!docs.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma prova cadastrada.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + docs.map(p => `
                    <div class="list-group-item d-flex justify-content-between align-items-start gap-2" style="${p.dataISO < hoje ? 'opacity:.55' : ''}">
                        <div><strong class="text-white">${esc(p.disciplina)}</strong> <span class="badge bg-info text-dark">${esc(dataBR(p.dataISO))}</span>${p.dataISO < hoje ? ' <span class="badge bg-secondary">Passou</span>' : ''}${p.turma ? ' <span class="badge bg-secondary">' + esc(p.turma) + '</span>' : ''}<br>
                        <small class="text-muted-custom">${esc(p.conteudo || '')}</small></div>
                        <button data-acao="excluirProva" data-id="${esc(p.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                    </div>`).join('') + '</div>';
            });
        }

        /* ================= VÍDEOS DE AULA PRÁTICA (YouTube / Drive) ================= */

        function embedDe(url) {
          url = String(url || '').trim();
          let m = url.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,15})/i);
          if (m) return { tipo: 'YouTube', src: 'https://www.youtube-nocookie.com/embed/' + m[1] };
          m = url.match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]{10,})/i);
          if (m) return { tipo: 'Google Drive', src: 'https://drive.google.com/file/d/' + m[1] + '/preview' };
          return null;
        }
        function playerHTML(url) {
          const e = embedDe(url);
          if (!e) return '';
          return `<div style="position:relative;padding-top:56.25%;border-radius:8px;overflow:hidden;background:#000"><iframe src="${e.src}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>`;
        }
        
        function publicarVideo() {
            const titulo = document.getElementById('vid-titulo').value.trim();
            const url = document.getElementById('vid-link').value.trim();
            const descricao = document.getElementById('vid-desc').value.trim();
            if (!titulo || !url) { toast('Dê um título e cole o link do vídeo.', 'warning'); return; }
            const e = embedDe(url);
            if (!e) { toast('Use um link do YouTube (youtu.be ou youtube.com) ou do Google Drive.', 'warning'); return; }
            db.collection('videos').add({
                titulo, descricao, url, tipo: e.tipo,
                autor: document.getElementById('user-name-display').textContent, criadoEm: TS()
            }).then(() => {
                toast('Vídeo publicado para os alunos! 🎬');
                registrarAcao('Vídeo publicado', titulo);
                ['vid-titulo', 'vid-link', 'vid-desc'].forEach(i => document.getElementById(i).value = '');
            }).catch(err => erroDB(err, 'publicarVideo'));
        }
        function carregarVideos() {
            ouvir(db.collection('videos').orderBy('criadoEm', 'desc').limit(50), snap => {
                const c = document.getElementById('lista-videos-admin');
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum vídeo publicado ainda.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const v = d.data();
                    return `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div><strong class="text-white">${esc(v.titulo)}</strong><br><small class="text-muted-custom">${esc(v.tipo || '')} • ${esc(v.autor || '')} • ${esc(fmtData(v.criadoEm))}</small></div>
                            <button data-acao="excluirVideo" data-id="${esc(d.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                        </div>
                        ${playerHTML(v.url)}
                    </div>`;
                }).join('') + '</div>';
            });
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

        /* ================= CENTRAL DE ALERTAS E UTILITÁRIOS (só o e-mail raiz) ================= */

        const VERSAO_SISTEMA = '2026.10.26-a';
        const DATA_ULTIMA_ATUALIZACAO = '18/10/2026';
        let nivelReal = null, travas = {};
        function aplicarVisibilidade() {
            if (!nivelReal) return;
            const raiz = emailLogado === ROOT_EMAIL, normal = raiz && !nivelPreview;
            const nivel = raiz && nivelPreview ? nivelPreview : nivelReal;
            document.querySelectorAll('[data-niveis]').forEach(c => {
                const permitido = normal || c.dataset.niveis.split(',').includes(nivel);
                const travado = !normal && c.id && travas[c.id] === true;
                c.style.display = permitido && !travado ? 'block' : 'none';
            });
        }

        async function carregarAlertasTI() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-alertas');
            if (!out) return;
            out.textContent = 'Verificando...';
            const todos = c => db.collection(c).get().then(s => s.docs.map(d => d.data())).catch(() => []);
            const [ch, er, su, ma, ta, pu, est, pen] = await Promise.all([
                todos('chamados'), db.collection('erros_app').orderBy('em', 'desc').limit(100).get().then(s => s.docs.map(d => d.data())).catch(() => []),
                todos('sugestoes'), todos('materiais'), todos('tarefas'), todos('membros_punidos'),
                db.collection('ti_privado').doc('estado').get().catch(() => null), db.collection('ti_privado').doc('pendencias').get().catch(() => null)
            ]);
            const hoje = hojeISO(), agora = Date.now(), L = [];
            const add = (nivel, txt) => L.push(`<div class="mb-1">${nivel === 'red' ? '🔴' : '🟡'} ${esc(txt)}</div>`);
            const abertos = ch.filter(c => c.status !== 'Resolvido').length;
            if (abertos) add('red', `${abertos} pedido(s) de ajuda em aberto.`);
            const erros24 = er.filter(e => e.em && e.em.toMillis() > agora - 864e5).length;
            if (erros24) add('red', `${erros24} erro(s) no portal dos alunos nas últimas 24 horas.`);
            const semResp = su.filter(x => !x.resposta && x.criadoEm && x.criadoEm.toMillis() < agora - 7 * 864e5).length;
            if (semResp) add('yellow', `${semResp} sugestão(ões) sem resposta há mais de 7 dias.`);
            const atrasM = ma.filter(m => m.status === 'Emprestado' && m.devolverAte && m.devolverAte < hoje).length;
            if (atrasM) add('yellow', `${atrasM} material(is) com devolução atrasada.`);
            const atrasT = ta.filter(t => t.status === 'Pendente' && t.prazo && t.prazo < hoje).length;
            if (atrasT) add('yellow', `${atrasT} tarefa(s) da diretoria atrasada(s).`);
            const venc = pu.filter(p => p.expiraEm && p.expiraEm.toMillis() <= agora).length;
            if (venc) add('yellow', `${venc} punição(ões) vencida(s) no banco (limpe no Verificador).`);
            const ub = est && est.exists && est.data().ultimoBackup ? est.data().ultimoBackup.toMillis() : 0;
            if (!ub) add('yellow', 'Nenhum backup registrado ainda.');
            else if (agora - ub > 30 * 864e5) add('yellow', `Último backup há ${Math.floor((agora - ub) / 864e5)} dias.`);
            const pends = pen && pen.exists ? (pen.data().itens || []) : [];
            const pv = pends.filter(p => !p.feito && p.data && p.data < hoje);
            if (pv.length) add('red', `${pv.length} pendência(s) sua(s) vencida(s): ${pv.map(p => p.texto).join(', ')}.`);
            out.innerHTML = (L.length ? L.join('') : '<div class="text-success fw-bold mb-1">Tudo em dia. 🎉</div>') + `<div class="text-muted-custom mt-2" style="font-size: 11px;">Sistema versão ${VERSAO_SISTEMA}</div>`;
        }

        async function carregarFeedTI() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-feed'); out.textContent = 'Carregando...';
            const q = (c, f) => db.collection(c).orderBy('criadoEm', 'desc').limit(6).get().then(s => s.docs.map(d => f(d.data()))).catch(() => []);
            const grupos = await Promise.all([
                q('sugestoes', d => ({ t: d.criadoEm, x: `💡 ${d.nome || 'Aluno'} sugeriu: ${d.texto}` })),
                q('reivindicacoes', d => ({ t: d.criadoEm, x: `✊ Nova pauta de ${d.autor || 'aluno'}: ${d.titulo}` })),
                q('eventos', d => ({ t: d.criadoEm, x: `📅 Evento criado: ${d.titulo}` })),
                q('chamados', d => ({ t: d.criadoEm, x: `📨 ${d.autorNome} pediu ajuda: ${d.categoria}` })),
                q('videos', d => ({ t: d.criadoEm, x: `🎬 Vídeo publicado: ${d.titulo}` })),
                q('mural', d => ({ t: d.criadoEm, x: `📢 Aviso: ${d.titulo}` }))
            ]);
            const itens = grupos.flat().filter(i => i.t && i.t.toMillis).sort((a, b) => b.t.toMillis() - a.t.toMillis()).slice(0, 15);
            out.innerHTML = itens.length ? itens.map(i => `<div class="mb-1 text-white">${esc(String(i.x).slice(0, 110))} <span class="text-muted-custom" style="font-size: 11px;">${esc(fmtData(i.t))}</span></div>`).join('') : '<div class="text-muted-custom">Nada recente.</div>';
        }

        async function carregarInventarioTI() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-inventario'); out.textContent = 'Contando...';
            const nomes = ['alunos', 'cargos', 'mural', 'enquetes', 'reivindicacoes', 'sugestoes', 'materiais', 'eventos', 'jogos', 'videos', 'tarefas', 'atas', 'divulgacoes', 'artes', 'chamados', 'acessos', 'aceites', 'erros_app', 'acoes_admin', 'membros_punidos'];
            const res = await Promise.all(nomes.map(n => db.collection(n).limit(1000).get().then(s => [n, s.size]).catch(() => [n, null])));
            out.innerHTML = '<table class="table table-sm table-dark mb-1"><tbody>' + res.map(([n, c]) => `<tr><td>${n}</td><td class="text-end">${c === null ? '—' : (c >= 1000 ? '1000+' : c)}</td></tr>`).join('') + '</tbody></table>' +
                '<div class="text-muted-custom" style="font-size: 11px;">Plano gratuito: 1 GiB guardados, 50 mil leituras e 20 mil gravações por dia.</div>';
        }

        let pendTI = [];
        async function carregarPendenciasTI() {
            try { const d = await db.collection('ti_privado').doc('pendencias').get(); pendTI = d.exists ? (d.data().itens || []) : []; } catch (e) { pendTI = []; }
            renderPendenciasTI();
        }
        function renderPendenciasTI() {
            const c = document.getElementById('ti-pendencias'); if (!c) return;
            c.innerHTML = pendTI.length ? pendTI.map((p, i) => `<div class="d-flex align-items-center gap-2 mb-1"><input type="checkbox" class="form-check-input mt-0" data-pend="${i}" ${p.feito ? 'checked' : ''}><span class="${p.feito ? 'text-decoration-line-through text-muted-custom' : 'text-white'}">${esc(p.texto)}${p.data ? ` <small class="text-muted-custom">(${esc(dataBR(p.data))})</small>` : ''}</span><button data-acao="excluirPendencia" data-id="${i}" class="btn btn-outline-danger btn-sm py-0 ms-auto" style="font-size: 11px;">✕</button></div>`).join('') : '<div class="text-muted-custom">Nada pendente.</div>';
        }
        function salvarPendenciasTI() { return db.collection('ti_privado').doc('pendencias').set({ itens: pendTI }).catch(e => erroDB(e, 'pendencias')); }
        function adicionarPendenciaTI() {
            if (!soRaiz()) return;
            const texto = document.getElementById('ti-pend-texto').value.trim();
            if (!texto) { toast('Escreva a pendência.', 'warning'); return; }
            pendTI.push({ texto, data: document.getElementById('ti-pend-data').value, feito: false });
            salvarPendenciasTI(); renderPendenciasTI();
            document.getElementById('ti-pend-texto').value = ''; document.getElementById('ti-pend-data').value = '';
        }
        document.addEventListener('change', e => {
            const p = e.target.closest('[data-pend]');
            if (p && soRaiz()) { pendTI[Number(p.dataset.pend)].feito = p.checked; salvarPendenciasTI(); renderPendenciasTI(); }
            const t = e.target.closest('[data-trava]');
            if (t && soRaiz()) db.collection('config').doc('sistema').set({ recursosDiretoria: { [t.dataset.trava]: t.checked } }, { merge: true }).catch(err => erroDB(err, 'trava'));
        });

        function organizarListaAlunos() {
            if (!soRaiz()) return;
            const turma = document.getElementById('ti-lista-turma').value.trim();
            const linhas = document.getElementById('ti-lista-bruta').value.split('\n').map(l => l.trim()).filter(Boolean);
            const vistos = new Set(), saida = [], sem = []; let dup = 0;
            const capitalizar = n => n.toLowerCase().split(' ').map(w => (['de', 'da', 'do', 'dos', 'das', 'e'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
            linhas.forEach(l => {
                const m = l.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
                if (!m) { sem.push(l); return; }
                const email = m[0].toLowerCase();
                if (vistos.has(email)) { dup++; return; }
                vistos.add(email);
                let nome = l.replace(m[0], ' ').replace(/[;,\t<>()\[\]|"]+/g, ' ').replace(/\s+/g, ' ').trim();
                if (!nome) nome = email.split('@')[0].replace(/[._-]+/g, ' ');
                saida.push(`${capitalizar(nome)};${email};;${turma}`);
            });
            document.getElementById('ti-lista-saida').value = saida.join('\n');
            document.getElementById('ti-lista-resumo').innerHTML = `✅ ${saida.length} aluno(s) prontos • ${dup} duplicado(s) removido(s) • ${sem.length} linha(s) sem e-mail` +
                (sem.length ? `<div class="text-warning">${sem.slice(0, 5).map(esc).join('<br>')}</div>` : '');
        }
        function copiarListaOrganizada() {
            const t = document.getElementById('ti-lista-saida').value;
            if (!t) { toast('Organize a lista primeiro.', 'warning'); return; }
            (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Lista copiada.')).catch(() => toast('Não consegui copiar.', 'warning'));
        }
        function enviarParaCadastroMassa() {
            const t = document.getElementById('ti-lista-saida').value;
            if (!t) { toast('Organize a lista primeiro.', 'warning'); return; }
            document.getElementById('ti-massa').value = t;
            document.getElementById('secao-ti-portal').scrollIntoView({ behavior: 'smooth' });
            toast('Lista enviada ao Cadastro em massa. Senhas vazias serão geradas.');
        }
        function gerarSenhaForte() { document.getElementById('ti-senha-gerada').value = gerarSenha(12); }
        function copiarSenhaGerada() {
            const v = document.getElementById('ti-senha-gerada').value;
            if (!v) { toast('Gere uma senha primeiro.', 'warning'); return; }
            (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('Senha copiada.')).catch(() => toast('Não consegui copiar.', 'warning'));
        }
        function carregarTravasUI() {
            ouvir(db.collection('config').doc('sistema'), doc => {
                const t = (doc.exists && doc.data().recursosDiretoria) || {};
                const c = document.getElementById('ti-travas'); if (!c) return;
                c.innerHTML = modulosSistema.filter(m => !m.soRaiz).map(m => `<div class="col-12 col-md-6"><div class="form-check"><input class="form-check-input" type="checkbox" data-trava="${m.id}" id="tv-${m.id}" ${t[m.id] ? 'checked' : ''}><label class="form-check-label small" for="tv-${m.id}">${esc(m.label)}</label></div></div>`).join('');
            });
        }

        function tipoDoErro(msg) {
            const t = String(msg || '').toLowerCase();
            if (t.includes('permission') || t.includes('insufficient')) return 'Permissão negada (regras)';
            if (t.includes('network') || t.includes('failed to fetch') || t.includes('offline') || t.includes('unavailable')) return 'Conexão';
            if (t.includes('cannot read') || t.includes('undefined') || t.includes('null') || t.includes('is not a function')) return 'Erro no código';
            return 'Outros';
        }
        async function resumoErrosPortal() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-erros');
            try {
                const snap = await db.collection('erros_app').orderBy('em', 'desc').limit(200).get();
                if (snap.empty) { out.innerHTML = '<p class="text-success mb-0">Nenhum erro registrado no portal.</p>'; return; }
                const grupos = {};
                snap.docs.forEach(d => {
                    const x = d.data();
                    const tipo = tipoDoErro(x.msg);
                    const tela = String(x.pagina || 'tela não informada').slice(0, 60);
                    const chave = tipo + '|' + tela + '|' + String(x.msg || '').slice(0, 100);
                    const quando = x.em && x.em.toDate ? x.em.toDate() : null;
                    grupos[chave] = grupos[chave] || { tipo, tela, msg: String(x.msg || '').slice(0, 100), n: 0, pessoas: new Set(), ultimo: quando };
                    grupos[chave].n++;
                    grupos[chave].pessoas.add(x.email);
                    if (quando && (!grupos[chave].ultimo || quando > grupos[chave].ultimo)) grupos[chave].ultimo = quando;
                });
                const porTipo = {};
                Object.values(grupos).forEach(g => { (porTipo[g.tipo] = porTipo[g.tipo] || []).push(g); });
                const total = snap.size;
                out.innerHTML = `<p class="small text-white mb-2">${total} erro(s) recente(s), em ${Object.keys(porTipo).length} tipo(s).</p>` +
                    Object.entries(porTipo).sort((p, q) => q[1].reduce((s, g) => s + g.n, 0) - p[1].reduce((s, g) => s + g.n, 0)).map(([tipo, lista]) => {
                        const qtd = lista.reduce((s, g) => s + g.n, 0);
                        return `<div class="mb-2"><strong class="text-warning small">${esc(tipo)}</strong> <span class="badge bg-secondary">${qtd}</span>
                            <ul class="list-group mt-1">${lista.sort((p, q) => q.n - p.n).map(g => `
                                <li class="list-group-item small"><span class="badge bg-warning text-dark me-1">${g.n}×</span>
                                <span class="text-white">${esc(g.msg)}</span><br>
                                <small class="text-muted-custom">Tela: ${esc(g.tela)} • ${g.pessoas.size} pessoa(s)${g.ultimo ? ' • última vez ' + esc(g.ultimo.toLocaleString('pt-BR')) : ''}</small></li>`).join('')}</ul></div>`;
                    }).join('');
            } catch (e) { erroDB(e, 'resumoErros'); }
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
