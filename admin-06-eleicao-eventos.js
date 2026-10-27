/* ================= AGENDA COMPARTILHADA ================= */
        let cacheAgendaEv = [], cacheAgendaReu = [];
        function carregarAgenda() {
            ouvir(db.collection('eventos').orderBy('dataISO').limit(300), snap => {
                cacheAgendaEv = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderAgenda();
            });
            if (nivelReal === 'admin' || nivelReal === 'secretaria' || emailLogado === ROOT_EMAIL) {
                db.collection('reunioes').orderBy('data').limit(300).get()
                    .then(s => { cacheAgendaReu = s.docs.map(d => ({ id: d.id, ...d.data() })); renderAgenda(); })
                    .catch(e => console.error('agenda reunioes', e));
            }
        }
        function renderAgenda() {
            const c = document.getElementById('lista-agenda');
            if (!c) return;
            const iso = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
            const hoje = new Date();
            const hojeISO = iso(hoje), limiteISO = iso(new Date(hoje.getTime() + 60 * 86400000));
            const itens = [
                ...cacheAgendaEv.filter(e => e.dataISO).map(e => ({ tipo: 'Evento', data: e.dataISO, hora: '', titulo: e.titulo, local: e.local || '' })),
                ...cacheAgendaReu.filter(r => r.data).map(r => ({ tipo: 'Reunião', data: r.data, hora: r.hora || '', titulo: r.titulo, local: r.local || '' }))
            ].filter(x => x.data >= hojeISO && x.data <= limiteISO).sort((p, q) => (p.data + p.hora).localeCompare(q.data + q.hora));
            if (!itens.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma atividade nos próximos 60 dias.</p>'; return; }
            const porDia = {};
            itens.forEach(x => porDia[x.data] = (porDia[x.data] || 0) + 1);
            c.innerHTML = '<div class="list-group">' + itens.map(x => {
                const alertas = [];
                if (porDia[x.data] > 1) alertas.push('mais de uma atividade neste dia');
                if (x.local && itens.some(o => o !== x && o.data === x.data && o.local === x.local)) alertas.push('mesmo local');
                return `<div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start gap-2">
                        <div><strong class="text-white">${esc(x.titulo)}</strong><br>
                        <small class="text-muted-custom">${esc(x.tipo)} • ${esc(x.data.split('-').reverse().join('/'))}${x.hora ? ' às ' + esc(x.hora) : ''}${x.local ? ' • ' + esc(x.local) : ''}</small></div>
                        ${alertas.length ? `<span class="badge bg-warning text-dark" style="white-space:normal">⚠ ${esc(alertas.join('; '))}</span>` : ''}
                    </div></div>`;
            }).join('') + '</div>';
        }

        
/* ================= ELEIÇÃO DO GRÊMIO (somente o root) ================= */
        let eleicaoTI = null, chapasTI = [];
        const ALFABETO_CEDULA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        function codigoCedula() {
            const v = new Uint32Array(8); crypto.getRandomValues(v);
            return Array.from(v, n => ALFABETO_CEDULA[n % ALFABETO_CEDULA.length]).join('');
        }
        async function sha256Hex(txt) {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
            return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
        }
        function dataHoraEle(v) { return v ? firebase.firestore.Timestamp.fromDate(new Date(v)) : null; }
        function fmtDataHora(ts) { if (!ts) return '—'; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleString('pt-BR'); }

        function carregarEleicaoTI() {
            ouvir(db.collection('eleicoes').orderBy('criadoEm', 'desc').limit(1), snap => {
                eleicaoTI = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
                renderEleicaoTI();
                if (eleicaoTI) carregarChapasTI();
            });
        }
        function carregarChapasTI() {
            db.collection('eleicoes').doc(eleicaoTI.id).collection('chapas').get().then(s => {
                chapasTI = s.docs.map(d => ({ id: d.id, ...d.data() }));
                renderChapasTI();
            });
        }
        function renderEleicaoTI() {
            const c = document.getElementById('ele-atual');
            if (!c) return;
            if (!eleicaoTI) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma eleição criada ainda.</p>'; return; }
            const rot = { rascunho: 'Rascunho', aberta: 'Aberta', encerrada: 'Encerrada' };
            c.innerHTML = `<div class="mb-2"><strong class="text-white">${esc(eleicaoTI.nome)}</strong> <span class="badge bg-secondary">${rot[eleicaoTI.status] || eleicaoTI.status}</span><br>
                <small class="text-muted-custom">Votação de ${fmtDataHora(eleicaoTI.inicio)} até ${fmtDataHora(eleicaoTI.fim)} • Cédulas geradas: ${eleicaoTI.cedulasGeradas || 0}</small></div>`;
            if (eleicaoTI.status === 'aberta') apurarEleicaoTI();
        }
        function renderChapasTI() {
            const c = document.getElementById('ele-chapas');
            if (!c) return;
            if (!eleicaoTI) { c.innerHTML = ''; return; }
            if (!chapasTI.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma chapa cadastrada.</p>'; return; }
            c.innerHTML = '<div class="list-group">' + chapasTI.map(ch => `
                <div class="list-group-item d-flex justify-content-between align-items-start gap-2">
                    <div><strong class="text-white">${esc(ch.nome)}</strong><br>
                    <small class="text-muted-custom">${esc(ch.cargos || '')}</small>
                    <p class="small text-white mb-0 mt-1" style="white-space:pre-wrap">${esc(ch.integrantes || '')}</p></div>
                    <button onclick="excluirChapaTI('${ch.id}')" class="btn btn-outline-danger btn-sm py-0" style="font-size:11px">Excluir</button>
                </div>`).join('') + '</div>';
        }
        async function criarEleicaoTI() {
            if (eleicaoTI && eleicaoTI.status !== 'encerrada') { toast('Já existe uma eleição em andamento. Encerre-a antes.', 'warning'); return; }
            const nome = document.getElementById('ele-nome').value.trim();
            const ini = dataHoraEle(document.getElementById('ele-inicio').value);
            const fim = dataHoraEle(document.getElementById('ele-fim').value);
            if (!nome || !ini || !fim) { toast('Preencha o nome, o início e o fim.', 'warning'); return; }
            if (fim.toMillis() <= ini.toMillis()) { toast('O fim precisa ser depois do início.', 'warning'); return; }
            db.collection('eleicoes').add({ nome, inicio: ini, fim, status: 'rascunho', cedulasGeradas: 0, criadoEm: TS(), criadoPorEmail: emailLogado })
                .then(() => { toast('Eleição criada.'); registrarAcao('Eleição criada', nome); })
                .catch(e => falhaSec(e, 'criarEleicaoTI'));
        }
        async function adicionarChapaTI() {
            if (!eleicaoTI) { toast('Crie a eleição antes das chapas.', 'warning'); return; }
            if (eleicaoTI.status !== 'rascunho') { toast('As chapas só podem ser mudadas antes da abertura.', 'warning'); return; }
            const nome = document.getElementById('ele-chapa-nome').value.trim();
            if (!nome) { toast('Dê um nome à chapa.', 'warning'); return; }
            db.collection('eleicoes').doc(eleicaoTI.id).collection('chapas').add({
                nome,
                cargos: document.getElementById('ele-chapa-cargos').value.trim(),
                integrantes: document.getElementById('ele-chapa-integrantes').value.trim(),
                criadoEm: TS()
            }).then(() => {
                toast('Chapa adicionada.');
                ['ele-chapa-nome', 'ele-chapa-cargos', 'ele-chapa-integrantes'].forEach(i => document.getElementById(i).value = '');
                carregarChapasTI();
            }).catch(e => falhaSec(e, 'adicionarChapaTI'));
        }
        async function excluirChapaTI(id) {
            if (!(await confirmar('Excluir esta chapa?'))) return;
            db.collection('eleicoes').doc(eleicaoTI.id).collection('chapas').doc(id).delete()
                .then(() => carregarChapasTI()).catch(e => falhaSec(e, 'excluirChapaTI'));
        }
        async function gerarCedulasTI() {
            if (!eleicaoTI) { toast('Crie a eleição primeiro.', 'warning'); return; }
            if (eleicaoTI.status !== 'rascunho') { toast('As cédulas só podem ser geradas antes da abertura.', 'warning'); return; }
            if (!chapasTI.length) { toast('Cadastre as chapas antes de gerar as cédulas.', 'warning'); return; }
            const alunosS = await db.collection('alunos').where('ativo', '==', true).get();
            if (alunosS.empty) { toast('Não há alunos ativos para receber cédula.', 'warning'); return; }
            if ((eleicaoTI.cedulasGeradas || 0) > 0 && !(await confirmar('Já existem cédulas geradas. Gerar de novo invalida os códigos anteriores. Continuar?'))) return;
            try {
                // invalida as cédulas anteriores desta eleição
                const antigas = await db.collection('cedulas').where('eleicao', '==', eleicaoTI.id).get();
                for (let k = 0; k < antigas.docs.length; k += 400) {
                    const lote = db.batch();
                    antigas.docs.slice(k, k + 400).forEach(d => lote.delete(d.ref));
                    await lote.commit();
                }
                // cria as novas: a chave é o hash do código, sem nome do aluno
                const pares = [];
                for (const d of alunosS.docs) {
                    const codigo = codigoCedula();
                    pares.push({ nome: d.data().nome || d.id, codigo, hash: await sha256Hex(codigo) });
                }
                for (let k = 0; k < pares.length; k += 400) {
                    const lote = db.batch();
                    pares.slice(k, k + 400).forEach(p => lote.set(db.collection('cedulas').doc(p.hash), { eleicao: eleicaoTI.id, usada: false }));
                    await lote.commit();
                }
                await db.collection('eleicoes').doc(eleicaoTI.id).update({ cedulasGeradas: pares.length, cedulasEm: TS() });
                gerarPdfCedulas(pares);
                registrarAcao('Cédulas da eleição geradas', String(pares.length));
                toast(`${pares.length} cédulas geradas. Guarde o PDF.`);
            } catch (e) { falhaSec(e, 'gerarCedulasTI'); }
        }
        function gerarPdfCedulas(pares) {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            let y = 20;
            const linha = (t, tam = 10, b = false) => {
                pdf.setFont('Helvetica', b ? 'bold' : 'normal'); pdf.setFontSize(tam);
                pdf.splitTextToSize(String(t), 170).forEach(p => {
                    if (y > 275) { pdf.addPage(); y = 20; }
                    pdf.text(p, 20, y); y += tam * 0.45 + 2;
                });
            };
            linha('Grêmio Estudantil IFCE Crateús', 15, true);
            linha(`Cédulas da eleição: ${eleicaoTI.nome}`, 11, true);
            linha('Guarde este documento com segurança. Cada código vale uma única vez. Os códigos não aparecem em nenhum outro lugar do sistema.', 9);
            y += 3;
            pares.forEach(p => linha(`${p.nome}  —  ${p.codigo}`, 10));
            const n = pdf.getNumberOfPages();
            for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.setFontSize(8); pdf.text(`Página ${i} de ${n}`, 105, 290, { align: 'center' }); }
            pdf.save(`cedulas_${eleicaoTI.id}.pdf`);
        }
        async function abrirEleicaoTI() {
            if (!eleicaoTI) return;
            if (eleicaoTI.status !== 'rascunho') { toast('A eleição já foi aberta ou encerrada.', 'warning'); return; }
            if (!chapasTI.length || !(eleicaoTI.cedulasGeradas > 0)) { toast('Cadastre as chapas e gere as cédulas antes de abrir.', 'warning'); return; }
            if (!(await confirmar('Abrir a votação agora? Depois de aberta, as chapas e as cédulas não podem mais ser alteradas.'))) return;
            db.collection('eleicoes').doc(eleicaoTI.id).update({ status: 'aberta' })
                .then(() => registrarAcao('Votação aberta', eleicaoTI.nome))
                .catch(e => falhaSec(e, 'abrirEleicaoTI'));
        }
        async function encerrarEleicaoTI() {
            if (!eleicaoTI || eleicaoTI.status !== 'aberta') { toast('Só é possível encerrar uma votação aberta.', 'warning'); return; }
            if (!(await confirmar('Encerrar a votação agora?'))) return;
            db.collection('eleicoes').doc(eleicaoTI.id).update({ status: 'encerrada', encerradaEm: TS() })
                .then(() => registrarAcao('Votação encerrada', eleicaoTI.nome))
                .catch(e => falhaSec(e, 'encerrarEleicaoTI'));
        }
        async function apurarEleicaoTI() {
            const c = document.getElementById('ele-apuracao');
            if (!c || !eleicaoTI) return;
            try {
                const [votosS, cedS] = await Promise.all([
                    db.collection('votos').where('eleicao', '==', eleicaoTI.id).get(),
                    db.collection('cedulas').where('eleicao', '==', eleicaoTI.id).get()
                ]);
                const total = votosS.size;
                const contagem = {};
                votosS.docs.forEach(d => { const ch = d.data().chapa; contagem[ch] = (contagem[ch] || 0) + 1; });
                const usadas = cedS.docs.filter(d => d.data().usada).length;
                const linhas = chapasTI.map(ch => {
                    const n = contagem[ch.id] || 0;
                    const pct = total ? Math.round(n / total * 100) : 0;
                    return `<tr><td>${esc(ch.nome)}</td><td>${n}</td><td>${pct}%</td></tr>`;
                }).join('');
                c.innerHTML = `<p class="small text-white mb-2">Cédulas usadas: ${usadas} de ${cedS.size} • Votos registrados: ${total}</p>
                    <div class="table-responsive"><table class="table table-dark table-sm mb-0"><thead><tr><th>Chapa</th><th>Votos</th><th>%</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
            } catch (e) { console.error('apurarEleicaoTI', e); c.innerHTML = '<p class="small text-danger mb-0">Não foi possível carregar a apuração.</p>'; }
        }

        
/* ================= AVALIAÇÃO DOS EVENTOS ================= */
        function carregarAvaliacoesAdmin() {
            Promise.all([db.collection('eventos').get(), db.collection('avaliacoes').get()]).then(([evS, avS]) => {
                const c = document.getElementById('lista-avaliacoes');
                if (!c) return;
                const nomes = {};
                evS.docs.forEach(d => nomes[d.id] = d.data().titulo || 'Evento');
                const grupos = {};
                avS.docs.map(d => d.data()).forEach(x => { (grupos[x.evento] = grupos[x.evento] || []).push(x); });
                const ids = Object.keys(grupos);
                if (!ids.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma avaliação recebida ainda.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + ids.map(id => {
                    const lista = grupos[id];
                    const media = (lista.reduce((s, x) => s + (Number(x.nota) || 0), 0) / lista.length).toFixed(1).replace('.', ',');
                    const coment = lista.filter(x => x.comentario).map(x => `<li class="small text-white">${esc(x.comentario)} <span class="text-muted-custom">(${x.nota})</span></li>`).join('');
                    return `<div class="list-group-item">
                        <strong class="text-white">${esc(nomes[id] || 'Evento removido')}</strong>
                        <span class="badge bg-success ms-2">Média ${media} de 5</span>
                        <small class="text-muted-custom d-block">${lista.length} avaliação(ões)</small>
                        ${coment ? `<ul class="mt-1 mb-0 ps-3">${coment}</ul>` : ''}</div>`;
                }).join('') + '</div>';
            }).catch(e => console.error('avaliacoes', e));
        }

        
/* ================= CONVITES E CAMPO DE VAGAS (Esportes e root) ================= */
        function podeEventosRestritos() { return emailLogado === ROOT_EMAIL || nivelReal === 'membro' || nivelReal === 'admin'; }
        function prepararEventosRestritos() {
            const v = document.getElementById('evento-vagas');
            if (v) v.style.display = podeEventosRestritos() ? '' : 'none';
        }
        let cacheConvites = [];
        function carregarConvitesAdmin() {
            ouvir(db.collection('eventos').orderBy('dataISO'), snap => {
                cacheConvites = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const c = document.getElementById('lista-convites');
                if (!c) return;
                const hoje = new Date();
                const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
                const proximos = cacheConvites.filter(e => e.dataISO && e.dataISO >= hojeISO);
                if (!proximos.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum evento futuro para convidar.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + proximos.map(e => `
                    <div class="list-group-item d-flex justify-content-between align-items-center gap-2">
                        <div><strong class="text-white">${esc(e.titulo)}</strong><br><small class="text-muted-custom">${esc(e.data || e.dataISO)}${e.vagas ? ' • ' + Number(e.vagas) + ' vagas' : ''}</small></div>
                        <button data-id="${esc(e.id)}" onclick="conviteEventoAdmin(this.dataset.id)" class="btn btn-sm btn-outline-success fw-bold">Convidar no WhatsApp</button>
                    </div>`).join('') + '</div>';
            });
        }
        function conviteEventoAdmin(id) {
            const ev = cacheConvites.find(e => e.id === id);
            if (!ev) return;
            const link = 'https://juan262-dev.github.io/gremio-ifce/';
            const texto = `*${ev.titulo}*\n📅 ${ev.data || ev.dataISO}\n${ev.descricao ? ev.descricao + '\n' : ''}${ev.vagas ? 'Vagas limitadas: ' + Number(ev.vagas) + '.\n' : ''}\nInscreva-se pelo portal do Grêmio: ${link}`;
            window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(texto), '_blank');
        }

        
/* ================= EVENTOS ================= */

        function criarEvento() {
            const titulo = document.getElementById('evento-titulo').value.trim();
            const data = document.getElementById('evento-data').value.trim();
            const descricao = document.getElementById('evento-descricao').value.trim();
            if (!titulo || !data) { toast("Preencha título e data do evento!", 'warning'); return; }

            db.collection('eventos').add({
                titulo, data, descricao, dataISO: document.getElementById('evento-dataiso').value || '', inscritos: [], espera: [], vagas: Number(document.getElementById('evento-vagas').value) || 0, criadoEm: TS()
            }).then(() => {
                mostrarAlertaSucesso("Evento publicado com sucesso!");
                registrarAcao('Evento criado', titulo);
                ['evento-titulo', 'evento-data', 'evento-dataiso', 'evento-descricao', 'evento-vagas'].forEach(id => document.getElementById(id).value = '');
            }).catch(e => erroDB(e, 'criarEvento'));
        }

        function carregarEventosAdmin() {
            ouvir(db.collection('eventos').orderBy('criadoEm', 'desc'), snapshot => {
                const container = document.getElementById('lista-eventos-admin');
                cacheEventos = {};
                if (snapshot.empty) { container.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum evento ainda. Crie um evento ou torneio e os alunos poderão se inscrever pelo portal.</p>'; return; }
                let html = '<div class="list-group">';
                snapshot.forEach(doc => {
                    const ev = doc.data();
                    cacheEventos[doc.id] = ev;
                    const insc = ev.inscritos || [];
                    html += `
                        <div class="list-group-item d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="fw-bold mb-1" style="color: var(--ifce-accent-green);">${esc(ev.titulo)} <span class="badge bg-info text-dark">📅 ${esc(ev.data)}</span></h6>
                                <p class="mb-1 small text-white">${esc(ev.descricao)}</p>
                                <small class="text-muted-custom fw-bold">Inscritos (${insc.length}): ${esc(insc.join(', ')) || 'Nenhum inscrito ainda'}</small>
                            </div>
                            <div class="d-flex flex-column gap-1 ms-2">
                                <button data-acao="exportarInscritos" data-id="${esc(doc.id)}" class="btn btn-outline-light btn-sm py-0" style="font-size: 11px;">⬇️ CSV</button>
                                <button data-acao="excluirEvento" data-id="${esc(doc.id)}" data-titulo="${esc(ev.titulo)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                            </div>
                        </div>`;
                });
                container.innerHTML = html + '</div>';
            });
        }

        
/* ================= AÇÕES (delegação de eventos, sem onclick inline com dados) ================= */

        const acoes = {
            excluirAviso: async (id, el) => { if (await confirmar("Excluir este aviso?")) db.collection('mural').doc(id).delete().then(() => registrarAcao('Aviso excluído', el.dataset.titulo)).catch(e => erroDB(e, 'excluirAviso')); },
            excluirEnquete: async (id, el) => { if (await confirmar("Excluir esta enquete?")) db.collection('enquetes').doc(id).delete().then(() => registrarAcao('Enquete excluída', el.dataset.titulo)).catch(e => erroDB(e, 'excluirEnquete')); },
            alternarEnquete: (id, el) => db.collection('enquetes').doc(id).update({ ativa: el.dataset.valor === 'true' }).catch(e => erroDB(e, 'alternarEnquete')),
            alternarAluno: (id, el) => { const bloq = el.dataset.valor === 'false'; db.collection('alunos').doc(id).update({ ativo: !bloq }).then(() => registrarAcao(bloq ? 'Aluno bloqueado' : 'Aluno desbloqueado', id)).catch(e => erroDB(e, 'alternarAluno')); },
            excluirAluno: async id => { if (await confirmar(`Excluir o aluno ${id}?`)) db.collection('alunos').doc(id).delete().then(() => registrarAcao('Aluno excluído', id)).catch(e => erroDB(e, 'excluirAluno')); },
            responderSugestao: id => {
                const inp = document.querySelector(`[data-resp="${CSS.escape(id)}"]`);
                const texto = inp ? inp.value.trim() : '';
                if (!texto) { toast('Digite a resposta antes de enviar.', 'warning'); return; }
                db.collection('sugestoes').doc(id).update({
                    resposta: texto,
                    respondidaPor: document.getElementById('user-name-display').textContent,
                    respondidaEm: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => { toast('Resposta enviada ao aluno!'); registrarAcao('Sugestão respondida', id); }).catch(e => erroDB(e, 'responderSugestao'));
            },
            aprovarMaterial: (id, el) => {
                const inp = document.querySelector(`[data-prazo="${CSS.escape(id)}"]`);
                const prazo = inp ? inp.value : '';
                if (!prazo) { toast('Escolha o prazo de devolução.', 'warning'); return; }
                db.collection('materiais').doc(id).update({ status: 'Emprestado', devolverAte: prazo })
                    .then(() => registrarAcao('Empréstimo aprovado', `${el.dataset.titulo} até ${prazo}`)).catch(e => erroDB(e, 'aprovarMaterial'));
            },
            recusarMaterial: (id, el) => db.collection('materiais').doc(id).update({ status: 'Disponível', emprestadoPara: '', devolverAte: '' })
                .then(() => registrarAcao('Empréstimo recusado', el.dataset.titulo)).catch(e => erroDB(e, 'recusarMaterial')),
            salvarJogo: (id) => {
                const num = sel => Math.max(0, parseInt(document.querySelector(sel).value, 10) || 0);
                const q = CSS.escape(id);
                db.collection('jogos').doc(id).update({
                    placarA: num(`[data-pa="${q}"]`), placarB: num(`[data-pb="${q}"]`),
                    status: document.querySelector(`[data-st="${q}"]`).value
                }).then(() => toast('Placar salvo!')).catch(e => erroDB(e, 'salvarJogo'));
            },
            excluirJogo: async id => { if (await confirmar("Excluir este jogo?")) db.collection('jogos').doc(id).delete().catch(e => erroDB(e, 'excluirJogo')); },
            removerCargo: async id => {
                if (await confirmar(`Remover ${id} da diretoria? A pessoa perde o acesso ao painel.`))
                    db.collection('cargos').doc(id).delete().then(() => registrarAcao('Diretor removido', id)).catch(e => erroDB(e, 'removerCargo'));
            },
            importarCargos: async () => {
                if (!(await confirmar("Importar a diretoria atual (lista do código) para o banco?"))) return;
                const batch = db.batch();
                Object.entries(cargosIniciais).forEach(([email, d]) => batch.set(db.collection('cargos').doc(email), d));
                batch.commit().then(() => { toast('Diretoria importada!'); registrarAcao('Diretoria importada', Object.keys(cargosIniciais).length + ' cargos'); }).catch(e => erroDB(e, 'importarCargos'));
            },
            concluirTarefa: id => db.collection('tarefas').doc(id).update({ status: 'Concluída', concluidaEm: TS() }).then(() => toast('Tarefa concluída! 👏')).catch(e => erroDB(e, 'concluirTarefa')),
            reabrirTarefa: id => db.collection('tarefas').doc(id).update({ status: 'Pendente', concluidaEm: firebase.firestore.FieldValue.delete() }).catch(e => erroDB(e, 'reabrirTarefa')),
            excluirTarefa: async id => { if (await confirmar('Excluir esta tarefa?')) db.collection('tarefas').doc(id).delete().catch(e => erroDB(e, 'excluirTarefa')); },
            pdfAta: id => gerarPDFAta(id),
            excluirAta: async id => { if (await confirmar('Excluir esta ata?')) db.collection('atas').doc(id).delete().then(() => registrarAcao('Ata excluída', id)).catch(e => erroDB(e, 'excluirAta')); },
            excluirDivulgacao: async id => { if (await confirmar('Remover do calendário?')) db.collection('divulgacoes').doc(id).delete().catch(e => erroDB(e, 'excluirDivulgacao')); },
            excluirArte: async id => { if (await confirmar('Remover este link?')) db.collection('artes').doc(id).delete().catch(e => erroDB(e, 'excluirArte')); },
            fixarAviso: (id, el) => db.collection('mural').doc(id).update({ fixado: el.dataset.fixar === 'true' }).then(() => toast(el.dataset.fixar === 'true' ? 'Aviso fixado no topo.' : 'Aviso desafixado.')).catch(e => erroDB(e, 'fixarAviso')),
            excluirVideo: async id => { if (await confirmar('Excluir este vídeo do portal? (O vídeo continua no YouTube/Drive.)')) db.collection('videos').doc(id).delete().then(() => registrarAcao('Vídeo removido', id)).catch(e => erroDB(e, 'excluirVideo')); },
            salvarChamado: id => {
                if (!soRaiz()) return;
                const q = CSS.escape(id);
                const resposta = document.querySelector(`[data-resp-ch="${q}"]`).value.trim();
                const status = document.querySelector(`[data-st-ch="${q}"]`).value;
                const dados = { status };
                if (resposta) { dados.resposta = resposta; dados.respondidoEm = TS(); }
                db.collection('chamados').doc(id).update(dados).then(() => toast('Pedido atualizado.')).catch(e => erroDB(e, 'salvarChamado'));
            },
            fixPunicoes: () => corrigirEm('membros_punidos', d => d.data().expiraEm && d.data().expiraEm.toMillis() <= Date.now(), 'Punições vencidas apagadas', (b, d) => b.delete(d.ref)),
            fixTarefas: async () => {
                const cargos = new Set((await db.collection('cargos').get()).docs.map(d => d.id));
                corrigirEm('tarefas', d => !cargos.has(d.data().atribuidoPara), 'Tarefas órfãs apagadas', (b, d) => b.delete(d.ref));
            },
            fixAtivo: () => corrigirEm('alunos', d => typeof d.data().ativo !== 'boolean', 'Alunos marcados como ativos', (b, d) => b.update(d.ref, { ativo: true })),
            fichaSenha: id => auth.sendPasswordResetEmail(id).then(() => { toast('Link de senha enviado para ' + id); registrarAcao('Redefinição de senha enviada', id); }).catch(e => erroDB(e, 'fichaSenha')),
            fichaAtivo: (id, el) => db.collection('alunos').doc(id).update({ ativo: el.dataset.valor === 'true' })
                .then(() => { registrarAcao(el.dataset.valor === 'true' ? 'Aluno desbloqueado' : 'Aluno bloqueado', id); fichaUsuario(); }).catch(e => erroDB(e, 'fichaAtivo')),
            fichaTurma: id => db.collection('alunos').doc(id).update({ turma: document.getElementById('ficha-turma').value.trim() })
                .then(() => { toast('Turma salva.'); fichaUsuario(); }).catch(e => erroDB(e, 'fichaTurma')),
            excluirNovidade: async (id) => {
                if (!soRaiz()) return;
                try {
                    const ref = db.collection('config').doc('sistema');
                    const atual = ((await ref.get()).data() || {}).novidades || [];
                    atual.splice(Number(id), 1);
                    await ref.set({ novidades: atual }, { merge: true });
                } catch (e) { erroDB(e, 'excluirNovidade'); }
            },
            excluirPendencia: id => { if (!soRaiz()) return; pendTI.splice(Number(id), 1); salvarPendenciasTI(); renderPendenciasTI(); },
            fichaNome: id => {
                const nome = document.getElementById('ficha-nome').value.trim();
                if (!nome) { toast('Digite o nome.', 'warning'); return; }
                db.collection('alunos').doc(id).update({ nome }).then(() => { toast('Nome salvo.'); registrarAcao('Nome de aluno alterado', id); fichaUsuario(); }).catch(e => erroDB(e, 'fichaNome'));
            },
            senhaNunca: async () => {
                if (!soRaiz() || !adocaoNunca.length) return;
                const alvo = adocaoNunca.slice(0, 50);
                if (!(await confirmar(`Enviar link de senha para ${alvo.length} aluno(s) que nunca entraram? Eles recebem um e-mail para criar a própria senha.`))) return;
                let ok = 0;
                for (const a of alvo) {
                    try { await auth.sendPasswordResetEmail((a.email || a.id).toLowerCase()); ok++; } catch (e) { /* conta inexistente ou limite */ }
                    await new Promise(r => setTimeout(r, 400));
                }
                registrarAcao('Links de senha em massa', `${ok} de ${alvo.length} enviados`);
                toast(`${ok} de ${alvo.length} link(s) enviado(s).`);
            },
            editorEscolher: id => { document.getElementById('ed-id').value = id; editorAbrir(); },
            excluirEstudo: async id => { if (await confirmar('Excluir este material dos alunos?')) db.collection('estudos').doc(id).delete().then(() => registrarAcao('Material de estudo excluído', id)).catch(e => erroDB(e, 'excluirEstudo')); },
            excluirProva: async id => { if (await confirmar('Excluir esta prova do calendário?')) db.collection('provas').doc(id).delete().catch(e => erroDB(e, 'excluirProva')); },
            excluirLancamento: async id => { if (await confirmar('Excluir este lançamento do caixa? Fica registrado no log.')) db.collection('caixa').doc(id).delete().then(() => registrarAcao('Caixa: lançamento excluído', id)).catch(e => erroDB(e, 'excluirLancamento')); },
            salvarRegistro: id => {
                const link = document.querySelector(`[data-link="${CSS.escape(id)}"]`).value.trim();
                if (link && !/^https:\/\//i.test(link)) { toast('O link precisa começar com https://', 'warning'); return; }
                db.collection('eventos').doc(id).update({ registroLink: link }).then(() => toast('Link salvo.')).catch(e => erroDB(e, 'salvarRegistro'));
            },
            excluirAtividade: async id => { if (await confirmar('Excluir esta atividade? Os inscritos perdem a inscrição.')) db.collection('eventos').doc(id).delete().then(() => registrarAcao('Atividade excluída', id)).catch(e => erroDB(e, 'excluirAtividade')); },
            relatorioAtividade: id => gerarRelatorioAtividade(id),
            excluirOrcamento: async id => { if (await confirmar('Excluir este orçamento? Os lançamentos continuam, mas perdem o vínculo.')) db.collection('orcamentos').doc(id).delete().catch(e => erroDB(e, 'excluirOrcamento')); },
            pagarConta: id => db.collection('contas').doc(id).update({ pago: true, pagoEm: TS() }).then(() => registrarAcao('Conta marcada como paga', id)).catch(e => erroDB(e, 'pagarConta')),
            excluirConta: async id => { if (await confirmar('Excluir esta conta?')) db.collection('contas').doc(id).delete().catch(e => erroDB(e, 'excluirConta')); },
            alternarEnc: (id, el) => db.collection('encaminhamentos').doc(id).update({ status: el.dataset.status, concluidoEm: el.dataset.status === 'Concluído' ? TS() : firebase.firestore.FieldValue.delete() })
                .then(() => registrarAcao('Encaminhamento: ' + el.dataset.status, id)).catch(e => erroDB(e, 'alternarEnc')),
            excluirEnc: async id => { if (await confirmar('Excluir este encaminhamento?')) db.collection('encaminhamentos').doc(id).delete().catch(e => erroDB(e, 'excluirEnc')); },
            excluirApoio: async id => { if (await confirmar('Excluir este material da aba Estudos?')) db.collection('estudos').doc(id).delete().catch(e => erroDB(e, 'excluirApoio')); },
            abrirPresenca: id => abrirPresenca(id),
            salvarPresenca: id => salvarPresenca(id),
            excluirFlashcard: async id => { if (await confirmar('Excluir este cartão?')) db.collection('flashcards').doc(id).delete().then(() => registrarAcao('Cartão de revisão excluído', id)).catch(e => erroDB(e, 'excluirFlashcard')); },
            excluirQuestao: async id => { if (await confirmar('Excluir esta questão do quiz?')) db.collection('questoes').doc(id).delete().then(() => registrarAcao('Questão excluída', id)).catch(e => erroDB(e, 'excluirQuestao')); },
            excluirSugestao: async id => { if (await confirmar("Apagar esta sugestão?")) db.collection('sugestoes').doc(id).delete().catch(e => erroDB(e, 'excluirSugestao')); },
            excluirPauta: async id => { if (await confirmar("Excluir esta pauta?")) db.collection('reivindicacoes').doc(id).delete().then(() => registrarAcao('Pauta excluída', id)).catch(e => erroDB(e, 'excluirPauta')); },
            removerPunicao: async id => { if (await confirmar(`Remover a punição de ${id} e liberar o acesso?`)) db.collection('membros_punidos').doc(id).delete().then(() => { mostrarAlertaSucesso(`Punição de ${id} removida!`); registrarAcao('Punição removida', id); }).catch(e => erroDB(e, 'removerPunicao')); },
            devolverMaterial: (id, el) => db.collection('materiais').doc(id).update({ status: 'Disponível', emprestadoPara: '', devolverAte: '' }).then(() => registrarAcao('Material devolvido', el.dataset.titulo)).catch(e => erroDB(e, 'devolverMaterial')),
            excluirMaterial: async (id, el) => { if (await confirmar("Excluir este material?")) db.collection('materiais').doc(id).delete().then(() => registrarAcao('Material excluído', el.dataset.titulo)).catch(e => erroDB(e, 'excluirMaterial')); },
            excluirEvento: async (id, el) => { if (await confirmar("Excluir este evento?")) db.collection('eventos').doc(id).delete().then(() => registrarAcao('Evento excluído', el.dataset.titulo)).catch(e => erroDB(e, 'excluirEvento')); },
            exportarPautas: () => {
                if (!cachePautas.length) { toast("Não há pautas para exportar.", 'warning'); return; }
                baixarCSV('pautas.csv', [['Título', 'Descrição', 'Autor', 'Apoios', 'Status']]
                    .concat(cachePautas.map(p => [p.titulo, p.descricao, p.autor || '', (p.apoios || []).length, p.status || STATUS_PAUTA[0]])));
            },
            exportarInscritos: id => {
                const ev = cacheEventos[id];
                if (!ev) return;
                baixarCSV(`inscritos_${(ev.titulo || 'evento').toLowerCase().replace(/\s+/g, '_')}.csv`,
                    [['Evento', 'Data', 'E-mail do inscrito']].concat((ev.inscritos || []).map(e => [ev.titulo, ev.data, e])));
            }
        };

        document.addEventListener('click', e => {
            const el = e.target.closest('[data-acao]');
            if (!el) return;
            const fn = acoes[el.dataset.acao];
            if (fn) fn(el.dataset.id, el);
        });

        document.addEventListener('change', e => {
            const st = e.target.closest('[data-mudar="statusPauta"]');
            if (st) {
                db.collection('reivindicacoes').doc(st.dataset.id).update({ status: st.value, statusEm: firebase.firestore.FieldValue.serverTimestamp() })
                    .then(() => registrarAcao('Status de pauta alterado', `${st.dataset.id} → ${st.value}`)).catch(err => erroDB(err, 'statusPauta'));
                return;
            }
            const tu = e.target.closest('[data-mudar="turmaAluno"]');
            if (tu) {
                db.collection('alunos').doc(tu.dataset.id).update({ turma: tu.value.trim() })
                    .then(() => toast('Turma salva.')).catch(err => erroDB(err, 'turmaAluno'));
                return;
            }
            const nv = e.target.closest('[data-mudar="nivelCargo"]');
            if (nv) {
                db.collection('cargos').doc(nv.dataset.id).update({ nivel: nv.value })
                    .then(() => registrarAcao('Nível de cargo alterado', `${nv.dataset.id} → ${nv.value}`)).catch(err => erroDB(err, 'nivelCargo'));
            }
        });
    
        
