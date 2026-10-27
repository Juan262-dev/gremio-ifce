/* ================= RELATÓRIO ================= */

        function gerarPDFRelatorio() {
            const texto = document.getElementById('texto-relatorio').value;
            const nome = document.getElementById('user-name-display').textContent;
            const cargo = document.getElementById('user-role-display').textContent;
            if (!texto.trim()) { toast("Digite alguma coisa no relatório antes de gerar o PDF.", 'warning'); return; }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(16);
            doc.text("Grêmio Estudantil - IFCE Crateús", 20, 20);
            doc.setFontSize(12);
            doc.setFont("Helvetica", "normal");
            doc.text(`Relatório de Atividades`, 20, 30);
            doc.text(`Responsável: ${nome} (${cargo})`, 20, 40);
            doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 50);
            doc.line(20, 55, 190, 55);
            doc.text(doc.splitTextToSize(texto, 170), 20, 65);
            pdfFinalizar(doc, `relatorio_${nome.toLowerCase().replace(/\s+/g, '_')}.pdf`);
        }

        function enviarWhatsAppRelatorio() {
            const texto = document.getElementById('texto-relatorio').value;
            const nome = document.getElementById('user-name-display').textContent;
            const cargo = document.getElementById('user-role-display').textContent;
            if (!texto.trim()) { toast("Escreva o relatório antes de enviar no WhatsApp.", 'warning'); return; }
            const mensagem = `*RELATÓRIO - GRÊMIO IFCE*\n\n*Nome:* ${nome}\n*Cargo:* ${cargo}\n\n*Conteúdo:*\n${texto}`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`, '_blank');
        }

        
/* ================= ENQUETES ================= */

        function resetarOpcoes() {
            const c = document.getElementById('container-opcoes');
            c.innerHTML = '';
            adicionarCampoOpcao(); adicionarCampoOpcao();
        }

        function adicionarCampoOpcao() {
            const container = document.getElementById('container-opcoes');
            const total = container.querySelectorAll('.opcao-enquete').length + 1;
            const div = document.createElement('div');
            div.className = 'input-group mb-2';
            div.innerHTML = `
                <input type="text" class="form-control opcao-enquete" placeholder="Opção ${total}">
                <button class="btn btn-outline-danger fw-bold" type="button" onclick="removerCampoOpcao(this)">✕</button>`;
            container.appendChild(div);
        }

        function removerCampoOpcao(btn) {
            const container = document.getElementById('container-opcoes');
            if (container.querySelectorAll('.opcao-enquete').length > 2) btn.parentElement.remove();
            else toast("A enquete precisa ter pelo menos 2 opções!", 'warning');
        }

        function criarEnquete() {
            const titulo = document.getElementById('enquete-titulo').value.trim();
            const opcoes = [];
            document.querySelectorAll('.opcao-enquete').forEach(input => {
                const val = input.value.trim();
                if (val) opcoes.push({ id: opcoes.length, texto: val, votos: 0 });
            });
            if (!titulo || opcoes.length < 2) { toast("Preencha o título e pelo menos 2 opções de voto!", 'warning'); return; }

            db.collection('enquetes').add({
                titulo, opcoes, ativa: true, votosAlunos: [], criadoEm: TS()
            }).then(() => {
                mostrarAlertaSucesso("Enquete criada com sucesso!");
                registrarAcao('Enquete criada', titulo);
                document.getElementById('enquete-titulo').value = '';
                resetarOpcoes();
            }).catch(e => erroDB(e, 'criarEnquete'));
        }

        function carregarEnquetesAdmin() {
            ouvir(db.collection('enquetes').orderBy('criadoEm', 'desc'), snapshot => {
                const container = document.getElementById('lista-enquetes-admin');
                if (snapshot.empty) { container.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma enquete ainda. Crie uma pergunta com pelo menos duas opções para os alunos votarem.</p>'; return; }
                let html = '';
                snapshot.forEach(doc => {
                    const e = doc.data();
                    const totalVotos = (e.opcoes || []).reduce((acc, op) => acc + (op.votos || 0), 0);
                    html += `
                        <div class="border rounded p-3 mb-3" style="background-color: #121a14; border-color: var(--ifce-card-border) !important;">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="fw-bold m-0" style="color: var(--ifce-accent-green);">${esc(e.titulo)}</h6>
                                <span class="badge ${e.ativa ? 'bg-success' : 'bg-secondary'}">${e.ativa ? 'Ativa' : 'Encerrada'}</span>
                            </div>
                            <ul class="list-group mb-2">`;
                    (e.opcoes || []).forEach(op => {
                        const v = op.votos || 0;
                        const pct = totalVotos > 0 ? Math.round((v / totalVotos) * 100) : 0;
                        html += `<li class="list-group-item d-flex justify-content-between small py-1 bg-dark text-white border-secondary">
                                    <span>${esc(op.texto)}</span><strong>${v} votos (${pct}%)</strong></li>`;
                    });
                    html += `</ul>
                            <div class="d-flex gap-2 justify-content-end">
                                <button data-acao="alternarEnquete" data-id="${esc(doc.id)}" data-valor="${!e.ativa}" class="btn btn-outline-secondary btn-sm py-0" style="font-size: 11px;">${e.ativa ? 'Encerrar' : 'Reabrir'}</button>
                                <button data-acao="excluirEnquete" data-id="${esc(doc.id)}" data-titulo="${esc(e.titulo)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                            </div>
                        </div>`;
                });
                container.innerHTML = html;
            });
        }

        
/* ================= MURAL ================= */

        function publicarAviso() {
            const titulo = document.getElementById('aviso-titulo').value.trim();
            const mensagem = document.getElementById('aviso-mensagem').value.trim();
            const autor = document.getElementById('user-name-display').textContent;
            if (!titulo || !mensagem) { toast("Preencha título e mensagem do aviso!", 'warning'); return; }

            db.collection('mural').add({ titulo, mensagem, autor, criadoEm: TS() }).then(() => {
                mostrarAlertaSucesso("Aviso/Vídeo publicado no mural com sucesso!");
                registrarAcao('Aviso publicado', titulo);
                document.getElementById('aviso-titulo').value = '';
                document.getElementById('aviso-mensagem').value = '';
            }).catch(e => erroDB(e, 'publicarAviso'));
        }

        function carregarAvisosAdmin() {
            ouvir(db.collection('mural').orderBy('criadoEm', 'desc'), snapshot => {
                const container = document.getElementById('lista-avisos-admin');
                if (snapshot.empty) { container.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum aviso publicado ainda. Os avisos aparecem aqui e no mural dos alunos.</p>'; return; }
                let html = '<div class="list-group">';
                snapshot.forEach(doc => {
                    const a = doc.data();
                    const dh = fmtData(a.criadoEm);
                    html += `
                        <div class="list-group-item d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="fw-bold mb-1" style="color: var(--ifce-accent-green);">${a.fixado ? '📌 ' : ''}${esc(a.titulo)}</h6>
                                <p class="mb-1 small text-white">${esc(a.mensagem)}</p>
                                <small class="text-muted-custom d-block" style="font-size: 11px;">Publicado por: ${esc(a.autor || 'Diretoria')} ${dh ? '• ' + esc(dh) : ''}</small>
                            </div>
                            <button data-acao="fixarAviso" data-id="${esc(doc.id)}" data-fixar="${!a.fixado}" class="btn btn-outline-warning btn-sm py-0 ms-2" style="font-size: 11px;">${a.fixado ? 'Desafixar' : '📌 Fixar'}</button>
                            <button data-acao="excluirAviso" data-id="${esc(doc.id)}" data-titulo="${esc(a.titulo)}" class="btn btn-outline-danger btn-sm py-0 ms-2" style="font-size: 11px;">Excluir</button>
                        </div>`;
                });
                container.innerHTML = html + '</div>';
            });
        }

        
/* ================= SUGESTÕES ================= */

        function carregarSugestoesAdmin() {
            ouvir(db.collection('sugestoes').orderBy('criadoEm', 'desc'), snapshot => {
                cacheSugestoes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                renderSugestoes();
            });
        }

        function renderSugestoes() {
            const container = document.getElementById('lista-sugestoes-admin');
            const termo = document.getElementById('busca-sugestoes').value.trim().toLowerCase();
            const lista = cacheSugestoes.filter(s => !termo || `${s.nome} ${s.email} ${s.texto}`.toLowerCase().includes(termo));
            if (!lista.length) { container.innerHTML = `<p class="text-muted-custom small mb-0">${termo ? 'Nenhum resultado.' : 'Nenhuma sugestão por enquanto. As sugestões dos alunos chegam aqui.'}</p>`; return; }
            let html = '<div class="list-group">';
            lista.forEach(s => {
                const dh = fmtData(s.criadoEm);
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <strong style="font-size: 13px; color: var(--ifce-accent-green);">${esc(s.nome || 'Aluno')} (${esc(s.email || 'Sem e-mail')})</strong>
                            <p class="m-0 text-white small mt-1">${esc(s.texto)}</p>
                            ${dh ? `<small class="text-muted-custom mt-1 d-block" style="font-size: 11px;">📅 ${esc(dh)}</small>` : ''}
                            <div class="mt-2">
                                ${s.resposta ? `<div class="small p-2 rounded mb-2" style="background: rgba(0,230,118,.1); border: 1px solid var(--ifce-card-border);">💬 <strong>Resposta${s.respondidaPor ? ' de ' + esc(s.respondidaPor) : ''}:</strong> ${esc(s.resposta)}</div>` : ''}
                                <div class="input-group input-group-sm">
                                    <input type="text" class="form-control" maxlength="500" data-resp="${esc(s.id)}" placeholder="${s.resposta ? 'Editar resposta...' : 'Responder ao aluno...'}">
                                    <button class="btn btn-outline-success" data-acao="responderSugestao" data-id="${esc(s.id)}">Responder</button>
                                </div>
                            </div>
                        </div>
                        <button data-acao="excluirSugestao" data-id="${esc(s.id)}" class="btn btn-outline-danger btn-sm py-0 ms-2" style="font-size: 11px;">Excluir</button>
                    </div>`;
            });
            container.innerHTML = html + '</div>';
        }

        
/* ================= PAUTAS ================= */

        const STATUS_PAUTA = ['Em análise', 'Encaminhada', 'Resolvida'];

        function carregarPautasAdmin() {
            ouvir(db.collection('reivindicacoes'), snapshot => {
                cachePautas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (b.apoios ? b.apoios.length : 0) - (a.apoios ? a.apoios.length : 0));
                const container = document.getElementById('lista-pautas-admin');
                if (!cachePautas.length) { container.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma pauta ainda. Quando os alunos criarem reivindicações, elas aparecem aqui, ordenadas pelos apoios.</p>'; return; }
                let html = '<div class="list-group">';
                cachePautas.forEach(p => {
                    const n = p.apoios ? p.apoios.length : 0;
                    const status = p.status || STATUS_PAUTA[0];
                    html += `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="fw-bold mb-1" style="color: var(--ifce-accent-green);">${esc(p.titulo)} <span class="badge bg-primary">👍 ${n} Apoios</span></h6>
                                    <p class="mb-1 small text-white">${esc(p.descricao)}</p>
                                    <small class="text-muted-custom" style="font-size: 11px;">Criado por: ${esc(p.autor || 'Aluno')}</small>
                                </div>
                                <button data-acao="excluirPauta" data-id="${esc(p.id)}" class="btn btn-outline-danger btn-sm py-0 ms-2" style="font-size: 11px;">Excluir</button>
                            </div>
                            <select data-mudar="statusPauta" data-id="${esc(p.id)}" class="form-select form-select-sm mt-2" style="max-width: 200px;">
                                ${STATUS_PAUTA.map(s => `<option ${s === status ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                            </select>
                        </div>`;
                });
                container.innerHTML = html + '</div>';
            });
        }

        
/* ================= MATERIAIS ================= */

        function cadastrarMaterial() {
            const nome = document.getElementById('mat-nome').value.trim();
            const qtd = document.getElementById('mat-qtd').value.trim() || '1 un';
            if (!nome) { toast("Preencha o nome do material!", 'warning'); return; }

            db.collection('materiais').add({
                nome, qtd, status: 'Disponível', emprestadoPara: '', criadoEm: TS()
            }).then(() => {
                mostrarAlertaSucesso("Material cadastrado com sucesso!");
                registrarAcao('Material cadastrado', nome);
                document.getElementById('mat-nome').value = '';
                document.getElementById('mat-qtd').value = '';
            }).catch(e => erroDB(e, 'cadastrarMaterial'));
        }

        const hojeISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const dataBR = iso => (iso ? iso.split('-').reverse().join('/') : '');

        
/* ================= MATERIAIS: pedido -> aprovação -> devolução ================= */

        function carregarMateriaisAdmin() {
            ouvir(db.collection('materiais').orderBy('criadoEm', 'desc'), snapshot => {
                const container = document.getElementById('lista-materiais-admin');
                if (snapshot.empty) { container.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum material cadastrado. Cadastre bolas, jogos e equipamentos para os alunos pedirem emprestado.</p>'; return; }
                const hoje = hojeISO();
                const prazoPadrao = new Date(Date.now() + 2 * 864e5 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
                container.innerHTML = '<ul class="list-group">' + snapshot.docs.map(doc => {
                    const m = doc.data(), id = esc(doc.id), nome = esc(m.nome);
                    const disp = m.status === 'Disponível', pedido = m.status === 'Solicitado';
                    const atrasado = m.devolverAte && m.devolverAte < hoje && !disp && !pedido;
                    const badge = disp ? 'bg-success' : pedido ? 'bg-info text-dark' : 'bg-warning text-dark';
                    const aprovar = pedido ? `
                        <div class="d-flex gap-1 mt-2 align-items-center flex-wrap">
                            <input type="date" class="form-control form-control-sm" style="max-width: 150px;" data-prazo="${id}" value="${prazoPadrao}">
                            <button data-acao="aprovarMaterial" data-id="${id}" data-titulo="${nome}" class="btn btn-success btn-sm py-0" style="font-size: 11px;">Aprovar</button>
                            <button data-acao="recusarMaterial" data-id="${id}" data-titulo="${nome}" class="btn btn-outline-warning btn-sm py-0" style="font-size: 11px;">Recusar</button>
                        </div>` : '';
                    return `
                        <li class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong class="text-white">${nome}</strong> (${esc(m.qtd)})
                                    <span class="badge ${badge}">${esc(m.status)}</span>${atrasado ? ' <span class="badge bg-danger">Atrasado</span>' : ''}<br>
                                    ${!disp ? `<small class="text-muted-custom">Com: ${esc(m.emprestadoPara)}${m.devolverAte ? ' • devolver até ' + esc(dataBR(m.devolverAte)) : ''}</small>` : ''}
                                </div>
                                <div class="d-flex gap-1">
                                    ${(!disp && !pedido) ? `<button data-acao="devolverMaterial" data-id="${id}" data-titulo="${nome}" class="btn btn-outline-success btn-sm py-0" style="font-size: 11px;">Devolvido</button>` : ''}
                                    <button data-acao="excluirMaterial" data-id="${id}" data-titulo="${nome}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                                </div>
                            </div>${aprovar}
                        </li>`;
                }).join('') + '</ul>';
            });
        }

        
/* ================= JOGOS / PLACAR ================= */

        function criarJogo() {
            const g = id => document.getElementById(id).value.trim();
            const torneio = g('jogo-torneio'), data = g('jogo-data'), timeA = g('jogo-timea'), timeB = g('jogo-timeb');
            if (!torneio || !timeA || !timeB) { toast('Preencha torneio e os dois times!', 'warning'); return; }
            db.collection('jogos').add({ torneio, data, timeA, timeB, placarA: 0, placarB: 0, status: 'Agendado', criadoEm: TS() })
                .then(() => {
                    mostrarAlertaSucesso('Jogo adicionado!');
                    registrarAcao('Jogo criado', `${timeA} x ${timeB} (${torneio})`);
                    ['jogo-torneio', 'jogo-data', 'jogo-timea', 'jogo-timeb'].forEach(i => document.getElementById(i).value = '');
                }).catch(e => erroDB(e, 'criarJogo'));
        }
        function carregarJogosAdmin() {
            ouvir(db.collection('jogos').orderBy('criadoEm', 'desc'), snap => {
                const c = document.getElementById('lista-jogos-admin');
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum jogo ainda. Adicione os jogos do torneio para acompanhar o placar e a classificação.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const j = d.data(), id = esc(d.id);
                    return `
                    <div class="list-group-item">
                        <small class="text-muted-custom">${esc(j.torneio)}${j.data ? ' • ' + esc(j.data) : ''}</small>
                        <div class="d-flex align-items-center gap-2 my-2">
                            <strong class="flex-grow-1 text-end">${esc(j.timeA)}</strong>
                            <input type="number" min="0" class="form-control form-control-sm text-center" style="width: 64px;" data-pa="${id}" value="${Number(j.placarA) || 0}">
                            <span>x</span>
                            <input type="number" min="0" class="form-control form-control-sm text-center" style="width: 64px;" data-pb="${id}" value="${Number(j.placarB) || 0}">
                            <strong class="flex-grow-1">${esc(j.timeB)}</strong>
                        </div>
                        <div class="d-flex gap-2 align-items-center flex-wrap">
                            <select class="form-select form-select-sm" style="max-width: 170px;" data-st="${id}">
                                ${['Agendado', 'Em andamento', 'Encerrado'].map(x => `<option ${x === j.status ? 'selected' : ''}>${x}</option>`).join('')}
                            </select>
                            <button data-acao="salvarJogo" data-id="${id}" class="btn btn-success btn-sm py-0" style="font-size: 11px;">Salvar placar</button>
                            <button data-acao="excluirJogo" data-id="${id}" class="btn btn-outline-danger btn-sm py-0 ms-auto" style="font-size: 11px;">Excluir</button>
                        </div>
                    </div>`;
                }).join('') + '</div>';
            });
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

        
/* ================= RELATÓRIO MENSAL DE CADA CARGO NOVO ================= */

        async function gerarRelatorioCargo(nivel) {
            const mes = document.getElementById(`rel-${nivel}-mes`).value || hojeISO().slice(0, 7);
            const noMes = d => (d || '').startsWith(mes);
            const mesDeTs = ts => ts && ts.toDate ? new Date(ts.toDate().getTime() - ts.toDate().getTimezoneOffset() * 60000).toISOString().slice(0, 7) : '';
            const soma = (lista, f) => lista.reduce((s, x) => s + (Number(f(x)) || 0), 0);
            const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 20;
            const linha = t => doc.splitTextToSize(String(t), 170).forEach(p => { if (y > 280) { doc.addPage(); y = 20; } doc.text(p, 20, y); y += 6; });
            const titulo = t => { if (y > 270) { doc.addPage(); y = 20; } y += 3; doc.setFont('Helvetica', 'bold'); doc.setFontSize(12); doc.text(t, 20, y); y += 7; doc.setFont('Helvetica', 'normal'); doc.setFontSize(11); };
            const rotulo = { tesouraria: 'Tesouraria', cultura: 'Cultura', racial: 'Igualdade Racial' }[nivel];
            doc.setFont('Helvetica', 'bold'); doc.setFontSize(15); doc.text('Grêmio Estudantil - IFCE Crateús', 20, y); y += 9;
            doc.setFontSize(12); doc.text(`Relatório mensal - ${rotulo} - ${mes.split('-').reverse().join('/')}`, 20, y); y += 8;
            doc.setFont('Helvetica', 'normal'); doc.setFontSize(11);
            linha('Responsável: ' + document.getElementById('user-name-display').textContent + ' (' + document.getElementById('user-role-display').textContent + ')');
            try {
                if (nivel === 'tesouraria') {
                    const lanc = cacheCaixa.filter(x => noMes(x.data));
                    const ent = soma(lanc.filter(x => x.tipo === 'Entrada'), x => x.valor), sai = soma(lanc.filter(x => x.tipo === 'Saída'), x => x.valor);
                    titulo('Caixa do mês');
                    linha(`Entradas: ${moeda(ent)} | Saídas: ${moeda(sai)} | Saldo do mês: ${moeda(ent - sai)}`);
                    linha(`Lançamentos: ${lanc.length} | Saídas sem comprovante: ${lanc.filter(x => x.tipo === 'Saída' && !x.comprovante).length}`);
                    titulo('Gasto por orçamento');
                    if (!cacheOrc.length) linha('Nenhum orçamento cadastrado.');
                    cacheOrc.forEach(o => {
                        const g = soma(lanc.filter(x => x.tipo === 'Saída' && x.orcamento === o.nome), x => x.valor);
                        linha(`- ${o.nome}: ${moeda(g)} de ${moeda(o.teto)}${g > o.teto ? ' (estourado)' : ''}`);
                    });
                    titulo('Contas com vencimento no mês');
                    const cs = cacheContas.filter(k => noMes(k.vencimento));
                    linha(`Total: ${cs.length} | Pagas: ${cs.filter(k => k.pago).length} | Pendentes: ${cs.filter(k => !k.pago).length}`);
                } else if (nivel === 'cultura') {
                    const atv = (cacheAtividades.cultura || []).filter(x => noMes(x.dataISO));
                    titulo('Atividades do mês');
                    linha(`Atividades: ${atv.length} | Inscritos: ${soma(atv, x => (x.inscritos || []).length)} | Com lista de presença: ${atv.filter(x => (x.presentes || []).length).length}`);
                    atv.forEach(x => linha(`- ${x.titulo} (${x.data || '-'}): ${(x.inscritos || []).length} inscrito(s), ${(x.presentes || []).length} presente(s)${x.registroLink ? '' : ' — sem registro de fotos'}`));
                    if (!atv.length) linha('Nenhuma atividade publicada neste mês.');
                } else if (nivel === 'racial') {
                    const atv = (cacheAtividades.racial || []).filter(x => noMes(x.dataISO));
                    titulo('Ações do mês');
                    linha(`Ações: ${atv.length} | Inscritos: ${soma(atv, x => (x.inscritos || []).length)} | Com lista de presença: ${atv.filter(x => (x.presentes || []).length).length}`);
                    atv.forEach(x => linha(`- ${x.titulo} (${x.data || '-'}): ${(x.inscritos || []).length} inscrito(s)`));
                    titulo('Encaminhamentos à direção');
                    const enc = cacheEnc.filter(e => noMes(e.data) || mesDeTs(e.criadoEm) === mes);
                    linha(`Registrados: ${enc.length} | Concluídos: ${enc.filter(e => e.status === 'Concluído').length} | Abertos: ${enc.filter(e => e.status !== 'Concluído').length}`);
                    enc.forEach(e => linha(`- ${e.titulo} → ${e.destinatario}: ${e.status}`));
                    titulo('Materiais de apoio publicados');
                    const snap = await db.collection('estudos').where('criadoPorEmail', '==', emailLogado).get();
                    const mats = snap.docs.map(d => d.data()).filter(m => mesDeTs(m.criadoEm) === mes);
                    linha(`Publicados no mês: ${mats.length}`);
                    mats.forEach(m => linha(`- ${m.titulo} (${m.tipo || '-'})`));
                }
                pdfFinalizar(doc, `relatorio_${nivel}_${mes}.pdf`);
                registrarAcao('Relatório mensal gerado', `${rotulo} ${mes}`);
            } catch (e) { erroDB(e, 'relatorioCargo'); }
        }

        
/* ================= CARTÕES DE REVISÃO (quiz do portal) ================= */

        let cacheFlashcards = [];
        function criarFlashcard() {
            const disciplina = document.getElementById('fc-disc').value.trim();
            const frente = document.getElementById('fc-frente').value.trim();
            const verso = document.getElementById('fc-verso').value.trim();
            if (!disciplina || !frente || !verso) { toast('Preencha a disciplina, a frente e o verso.', 'warning'); return; }
            db.collection('flashcards').add({ disciplina, frente, verso, criadoPorEmail: emailLogado, criadoEm: TS() })
                .then(() => {
                    toast('Cartão adicionado. ✅');
                    registrarAcao('Cartão de revisão adicionado', disciplina);
                    ['fc-frente', 'fc-verso'].forEach(i => document.getElementById(i).value = '');
                }).catch(e => erroDB(e, 'criarFlashcard'));
        }
        function carregarFlashcardsAdmin() {
            ouvir(db.collection('flashcards').orderBy('criadoEm', 'desc').limit(300), snap => {
                const c = document.getElementById('lista-flashcards-admin');
                cacheFlashcards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                document.getElementById('fc-disc-lista').innerHTML = [...new Set(cacheFlashcards.map(f => f.disciplina).filter(Boolean))].sort().map(d => `<option value="${esc(d)}">`).join('');
                if (!cacheFlashcards.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum cartão ainda. Adicione o primeiro acima.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + cacheFlashcards.map(f => `
                    <div class="list-group-item d-flex justify-content-between align-items-start gap-2">
                        <div><strong class="text-white">${esc(f.frente)}</strong><br><small class="text-muted-custom">${esc(f.disciplina)} • resposta: ${esc(f.verso)}</small></div>
                        <button data-acao="excluirFlashcard" data-id="${esc(f.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                    </div>`).join('') + '</div>';
            });
        }

        
/* ================= SECRETARIA: ALUNOS (LEITURA) E RELATÓRIO EM PDF ================= */
        let cacheSecAlunos = [];
        function carregarSecAlunos() {
            ouvir(db.collection('alunos'), snap => {
                cacheSecAlunos = snap.docs.map(d => ({ email: d.id, ...d.data() }))
                    .sort((x, y) => String(x.nome || '').localeCompare(String(y.nome || ''), 'pt-BR'));
                renderSecAlunos();
            });
        }
        function renderSecAlunos() {
            const c = document.getElementById('lista-sec-alunos');
            if (!c) return;
            const t = (document.getElementById('sec-alunos-busca').value || '').trim().toLowerCase();
            const lista = cacheSecAlunos.filter(a => !t || `${a.nome || ''} ${a.email || ''}`.toLowerCase().includes(t));
            if (!lista.length) { c.innerHTML = `<p class="text-muted-custom small mb-0">${cacheSecAlunos.length ? 'Nenhum aluno com esse nome ou e-mail.' : 'Nenhum aluno cadastrado.'}</p>`; return; }
            c.innerHTML = `<p class="text-muted-custom small mb-2">${lista.length} de ${cacheSecAlunos.length} aluno(s)</p><div class="list-group">` + lista.map(a => `
                <div class="list-group-item d-flex justify-content-between align-items-center gap-2">
                    <div><strong class="text-white">${esc(a.nome || 'Sem nome')}</strong><br><small class="text-muted-custom">${esc(a.email)}</small></div>
                    <span class="badge ${a.ativo ? 'bg-success' : 'bg-danger'}">${a.ativo ? 'Ativo' : 'Bloqueado'}</span>
                </div>`).join('') + '</div>';
        }

        async function gerarRelatorioSecretaria() {
            const mes = document.getElementById('rel-sec-mes').value;
            if (!mes) { toast('Escolha o mês do relatório.', 'warning'); return; }
            const [ano, m] = mes.split('-');
            const inicio = `${mes}-01`, fim = `${mes}-31`;
            const noMes = dt => { if (!dt) return false; const d = dt.toDate ? dt.toDate() : new Date(dt); return d.getFullYear() == Number(ano) && d.getMonth() + 1 == Number(m); };
            try {
                const [atasS, reunS, docsS, presS, alunosS] = await Promise.all([
                    db.collection('atas').get(),
                    db.collection('reunioes').where('data', '>=', inicio).where('data', '<=', fim).get(),
                    db.collection('documentos').where('data', '>=', inicio).where('data', '<=', fim).get(),
                    db.collection('listas_presenca').where('data', '>=', inicio).where('data', '<=', fim).get(),
                    db.collection('alunos').get()
                ]);
                const atas = atasS.docs.map(d => d.data()).filter(a => noMes(a.criadoEm));
                const reunioes = reunS.docs.map(d => d.data()).sort((a, b) => a.data.localeCompare(b.data));
                const docs = docsS.docs.map(d => d.data()).sort((a, b) => a.data.localeCompare(b.data));
                const presencas = presS.docs.map(d => d.data()).sort((a, b) => a.data.localeCompare(b.data));
                const alunos = alunosS.docs.map(d => d.data());
                const porStatus = { Pendente: 0, Respondido: 0, Arquivado: 0 };
                docs.forEach(d => { if (porStatus[d.status] !== undefined) porStatus[d.status]++; });
                const br = iso => iso ? iso.split('-').reverse().join('/') : '—';

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();
                let y = 20;
                const linha = (txt, tam = 10, negrito = false) => {
                    pdf.setFont('Helvetica', negrito ? 'bold' : 'normal');
                    pdf.setFontSize(tam);
                    pdf.splitTextToSize(String(txt), 170).forEach(p => {
                        if (y > 275) { pdf.addPage(); y = 20; pdf.setFont('Helvetica', negrito ? 'bold' : 'normal'); pdf.setFontSize(tam); }
                        pdf.text(p, 20, y);
                        y += tam * 0.45 + 2;
                    });
                };
                const secao = t => { y += 4; linha(t, 12, true); y += 1; };

                linha('Grêmio Estudantil IFCE Crateús', 16, true);
                linha('Relatório da Secretaria', 12);
                linha(`Mês de referência: ${m}/${ano}`);
                linha(`Gerado por ${emailLogado} em ${new Date().toLocaleDateString('pt-BR')}`, 9);

                secao(`Atas de reunião (${atas.length})`);
                if (!atas.length) linha('Nenhuma ata registrada neste mês.');
                atas.forEach(a => linha(`• ${a.titulo || 'Sem título'}`));

                secao(`Reuniões (${reunioes.length})`);
                if (!reunioes.length) linha('Nenhuma reunião agendada neste mês.');
                reunioes.forEach(r => linha(`• ${br(r.data)}${r.hora ? ' às ' + r.hora : ''} – ${r.titulo}${r.local ? ' (' + r.local + ')' : ''}`));

                secao(`Documentos e ofícios (${docs.length})`);
                linha(`Pendentes: ${porStatus.Pendente} • Respondidos: ${porStatus.Respondido} • Arquivados: ${porStatus.Arquivado}`);
                docs.forEach(d => linha(`• ${br(d.data)} – ${d.tipo} ${d.sentido.toLowerCase()}: ${d.assunto} [${d.status}]`));

                secao(`Listas de presença (${presencas.length})`);
                if (!presencas.length) linha('Nenhuma lista de presença salva neste mês.');
                presencas.forEach(p => linha(`• ${br(p.data)} – ${p.evento}: ${p.total || (p.nomes || []).length} presente(s)`));

                secao('Alunos');
                linha(`Cadastrados: ${alunos.length} • Ativos: ${alunos.filter(a => a.ativo).length} • Bloqueados: ${alunos.filter(a => !a.ativo).length}`);

                const paginas = pdf.getNumberOfPages();
                for (let i = 1; i <= paginas; i++) {
                    pdf.setPage(i); pdf.setFont('Helvetica', 'normal'); pdf.setFontSize(8);
                    pdf.text(`Grêmio Estudantil IFCE Crateús · Página ${i} de ${paginas}`, 105, 290, { align: 'center' });
                }
                pdf.save(`relatorio_secretaria_${mes}.pdf`);
                registrarAcao('Relatório da secretaria gerado', mes);
            } catch (e) {
                console.error('gerarRelatorioSecretaria', e);
                toast('Não foi possível gerar o relatório. Tente de novo.', 'danger');
            }
        }

        
/* ================= AVISOS POR WHATSAPP (serviço seguro; só a presidência) ================= */
        const WHATSAPP_URL = ''; // cole aqui a URL do Worker de WhatsApp depois de publicar
        let cacheContatosWpp = [];
        let cacheCargosWpp = [], cacheAvisosWpp = {};
        function montarContatosWpp() {
            cacheContatosWpp = cacheCargosWpp.map(c => ({
                ...c,
                telefone: (cacheAvisosWpp[c.email] || {}).telefone || '',
                whatsappOptIn: (cacheAvisosWpp[c.email] || {}).whatsappOptIn === true
            }));
            renderContatosWpp();
            renderDestinatariosWpp();
        }
        function carregarAvisosWpp() {
            ouvir(db.collection('cargos'), snap => {
                cacheCargosWpp = snap.docs.map(d => ({ email: d.id, ...d.data() }))
                    .sort((x, y) => String(x.nome || '').localeCompare(String(y.nome || ''), 'pt-BR'));
                montarContatosWpp();
            });
            ouvir(db.collection('contatos_avisos'), snap => {
                cacheAvisosWpp = {};
                snap.docs.forEach(d => cacheAvisosWpp[d.id] = d.data());
                montarContatosWpp();
            });
        }
        function renderContatosWpp() {
            const c = document.getElementById('lista-contatos-wpp');
            if (!c) return;
            if (!cacheContatosWpp.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum cargo cadastrado.</p>'; return; }
            c.innerHTML = '<div class="list-group mb-3">' + cacheContatosWpp.map((x, i) => `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                        <div><strong class="text-white">${esc(x.nome || x.email)}</strong><br><small class="text-muted-custom">${esc(x.cargo || '')}</small></div>
                        <div class="d-flex align-items-center gap-2 flex-wrap">
                            <input type="tel" id="wpp-tel-${i}" class="form-control form-control-sm" style="width:170px" maxlength="15" placeholder="5588999999999" value="${esc(x.telefone || '')}">
                            <label class="small text-white d-flex align-items-center gap-1"><input type="checkbox" id="wpp-opt-${i}" ${x.whatsappOptIn ? 'checked' : ''}> Autoriza</label>
                            <button onclick="salvarContatoWpp(${i})" class="btn btn-outline-success btn-sm py-0">Salvar</button>
                        </div>
                    </div>
                </div>`).join('') + '</div>';
        }
        function salvarContatoWpp(i) {
            const x = cacheContatosWpp[i];
            const tel = document.getElementById('wpp-tel-' + i).value.replace(/\D/g, '');
            const opt = document.getElementById('wpp-opt-' + i).checked;
            if (tel && !/^\d{10,15}$/.test(tel)) { toast('Telefone inválido. Use DDI, DDD e número, só números.', 'warning'); return; }
            if (opt && !tel) { toast('Para autorizar, informe o telefone.', 'warning'); return; }
            db.collection('contatos_avisos').doc(x.email).set({ telefone: tel, whatsappOptIn: opt }, { merge: true })
                .then(() => { toast('Contato salvo.'); registrarAcao('Contato de WhatsApp atualizado', x.email); })
                .catch(e => falhaSec(e, 'salvarContatoWpp'));
        }
        function renderDestinatariosWpp() {
            const c = document.getElementById('lista-destinatarios-wpp');
            if (!c) return;
            const aptos = cacheContatosWpp.filter(x => x.telefone && x.whatsappOptIn);
            if (!aptos.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum contato autorizado ainda.</p>'; return; }
            c.innerHTML = aptos.map(x => `
                <div class="form-check"><input class="form-check-input wpp-dest" type="checkbox" value="${esc(x.email)}" checked id="wpp-d-${esc(x.email.replace(/[^a-z0-9]/gi, ''))}">
                <label class="form-check-label small text-white" for="wpp-d-${esc(x.email.replace(/[^a-z0-9]/gi, ''))}">${esc(x.nome || x.email)} <span class="text-muted-custom">(${esc(x.cargo || '')})</span></label></div>`).join('');
        }
        function marcarTodosWpp(marcar) {
            document.querySelectorAll('.wpp-dest').forEach(el => el.checked = marcar);
        }
        async function enviarAvisoWpp() {
            if (!WHATSAPP_URL) { toast('O serviço de WhatsApp ainda não foi configurado.', 'warning'); return; }
            const titulo = document.getElementById('wpp-titulo').value.trim();
            const mensagem = document.getElementById('wpp-mensagem').value.trim();
            const dest = [...document.querySelectorAll('.wpp-dest:checked')].map(el => el.value);
            if (!titulo || !mensagem) { toast('Preencha o título e a mensagem.', 'warning'); return; }
            if (!dest.length) { toast('Escolha pelo menos um destinatário.', 'warning'); return; }
            if (!(await confirmar(`Enviar este aviso pelo WhatsApp para ${dest.length} pessoa(s)?`))) return;
            const btn = document.getElementById('btn-enviar-wpp');
            btn.disabled = true;
            try {
                const user = db.app.auth().currentUser;
                const token = await user.getIdToken();
                const r = await fetch(WHATSAPP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ template: 'aviso_gremio', destinatarios: dest, variaveis: [titulo, mensagem] })
                });
                const d = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(d.erro || 'Falha no envio');
                toast(`Enviado para ${d.enviados} de ${dest.length} pessoa(s).`);
                registrarAcao('Aviso enviado pelo WhatsApp', titulo);
            } catch (e) {
                console.error('enviarAvisoWpp', e);
                toast('Não foi possível enviar. Tente de novo.', 'danger');
            } finally {
                btn.disabled = false;
            }
        }

        
/* ================= BANCO DE QUESTÕES (quiz do portal) ================= */

        let cacheQuestoes = [];
        function criarQuestao() {
            const g = id => document.getElementById(id).value.trim();
            const disciplina = g('q-disc'), enunciado = g('q-enun'), explicacao = g('q-expl');
            const alternativas = [0, 1, 2, 3].map(i => g('q-alt' + i));
            const correta = Number(document.getElementById('q-corr').value);
            if (!disciplina || enunciado.length < 5) { toast('Preencha a disciplina e o enunciado.', 'warning'); return; }
            if (alternativas.some(a => !a)) { toast('Preencha as quatro alternativas.', 'warning'); return; }
            const imagem = document.getElementById('q-img').value.trim();
            if (imagem && !/^(https:\/\/|imagens\/)/i.test(imagem)) { toast('A imagem precisa ser um link https:// ou um caminho imagens/...', 'warning'); return; }
            db.collection('questoes').add({ disciplina, enunciado, alternativas, correta, explicacao, ...(imagem ? { imagem } : {}), criadoPorEmail: emailLogado, criadoEm: TS() })
                .then(() => {
                    toast('Questão publicada no quiz. ✅');
                    registrarAcao('Questão publicada', disciplina);
                    ['q-disc', 'q-enun', 'q-alt0', 'q-alt1', 'q-alt2', 'q-alt3', 'q-expl', 'q-img'].forEach(i => document.getElementById(i).value = '');
                }).catch(e => erroDB(e, 'criarQuestao'));
        }
        function carregarQuestoesAdmin() {
            ouvir(db.collection('questoes').orderBy('criadoEm', 'desc').limit(200), snap => {
                const c = document.getElementById('lista-questoes-admin');
                cacheQuestoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                document.getElementById('q-disc-lista').innerHTML = [...new Set(cacheQuestoes.map(q => q.disciplina).filter(Boolean))].sort().map(d => `<option value="${esc(d)}">`).join('');
                if (!cacheQuestoes.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma questão ainda. Cadastre a primeira acima; ela aparece no quiz do portal.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + cacheQuestoes.map(q => `
                    <div class="list-group-item d-flex justify-content-between align-items-start gap-2">
                        <div><strong class="text-white">${esc(q.enunciado)}</strong><br><small class="text-muted-custom">${esc(q.disciplina)} • resposta certa: ${'ABCD'[q.correta]}</small></div>
                        <button data-acao="excluirQuestao" data-id="${esc(q.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                    </div>`).join('') + '</div>';
            });
        }

        
