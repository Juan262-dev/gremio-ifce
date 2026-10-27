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
