        /* ================= FUNÇÕES NOVAS: TESOURARIA, CULTURA, IGUALDADE RACIAL E MONITORAMENTO ================= */

        /* ---- orçamento por evento ---- */
        let cacheOrc = [];
        function criarOrcamento() {
            const nome = document.getElementById('orc-nome').value.trim();
            const teto = parseFloat(document.getElementById('orc-teto').value);
            if (!nome || !(teto > 0)) { toast('Informe o nome e um teto maior que zero.', 'warning'); return; }
            db.collection('orcamentos').add({ nome, teto: Math.round(teto * 100) / 100, criadoPorEmail: emailLogado, criadoEm: TS() })
                .then(() => {
                    toast('Orçamento criado.');
                    registrarAcao('Orçamento criado', `${nome} (${moeda(teto)})`);
                    document.getElementById('orc-nome').value = ''; document.getElementById('orc-teto').value = '';
                }).catch(e => erroDB(e, 'criarOrcamento'));
        }
        function carregarOrcamentos() {
            ouvir(db.collection('orcamentos').orderBy('criadoEm', 'desc'), snap => {
                cacheOrc = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderOrcamentos();
            });
        }
        function renderOrcamentos() {
            const sel = document.getElementById('cx-orc');
            const atual = sel ? sel.value : '';
            if (sel) {
                sel.innerHTML = '<option value="">Sem orçamento</option>' + cacheOrc.map(o => `<option value="${esc(o.nome)}">${esc(o.nome)}</option>`).join('');
                if (cacheOrc.some(o => o.nome === atual)) sel.value = atual;
            }
            const c = document.getElementById('lista-orcamentos');
            if (!c) return;
            if (!cacheOrc.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum orçamento ainda. Crie um teto para o evento e ele aparece aqui com o quanto já foi gasto.</p>'; return; }
            c.innerHTML = '<div class="list-group">' + cacheOrc.map(o => {
                const gasto = cacheCaixa.filter(x => x.tipo === 'Saída' && x.orcamento === o.nome).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                const pct = o.teto > 0 ? Math.min(100, Math.round(gasto / o.teto * 100)) : 0;
                const cor = gasto > o.teto ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success';
                return `<div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong class="text-white">${esc(o.nome)}</strong>
                        <button data-acao="excluirOrcamento" data-id="${esc(o.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                    </div>
                    <small class="text-muted-custom">Gasto ${moeda(gasto)} de ${moeda(o.teto)}${gasto > o.teto ? ' — <span class="text-danger fw-bold">estourado</span>' : ''}</small>
                    <div class="progress mt-1" style="height: 8px;"><div class="progress-bar ${cor}" style="width: ${pct}%;"></div></div>
                </div>`;
            }).join('') + '</div>';
        }

        /* ---- contas a pagar ---- */
        let cacheContas = [];
        function criarContaPagar() {
            const descricao = document.getElementById('conta-desc').value.trim();
            const valor = parseFloat(document.getElementById('conta-valor').value);
            const vencimento = document.getElementById('conta-venc').value;
            if (!descricao || !(valor > 0) || !vencimento) { toast('Preencha a descrição, o valor e o vencimento.', 'warning'); return; }
            db.collection('contas').add({ descricao, valor: Math.round(valor * 100) / 100, vencimento, pago: false, criadoPorEmail: emailLogado, criadoEm: TS() })
                .then(() => {
                    toast('Conta cadastrada.');
                    registrarAcao('Conta a pagar cadastrada', `${descricao} (${moeda(valor)}) vence ${dataBR(vencimento)}`);
                    ['conta-desc', 'conta-valor', 'conta-venc'].forEach(i => document.getElementById(i).value = '');
                }).catch(e => erroDB(e, 'criarConta'));
        }
        function carregarContas() {
            ouvir(db.collection('contas').orderBy('vencimento'), snap => {
                cacheContas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderContas();
            });
        }
        function renderContas() {
            const c = document.getElementById('lista-contas');
            if (!c) return;
            if (!cacheContas.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma conta cadastrada. Cadastre as contas com vencimento para receber o aviso antes de vencer.</p>'; return; }
            const hoje = hojeISO();
            const em7 = new Date(Date.now() + 7 * 864e5 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
            c.innerHTML = '<div class="list-group">' + cacheContas.map(k => {
                const st = k.pago ? '<span class="badge bg-success">Paga</span>'
                    : k.vencimento < hoje ? '<span class="badge bg-danger">Atrasada</span>'
                    : k.vencimento <= em7 ? '<span class="badge bg-warning text-dark">Vence em até 7 dias</span>'
                    : '<span class="badge bg-secondary">Em dia</span>';
                return `<div class="list-group-item d-flex justify-content-between align-items-center gap-2" style="${k.pago ? 'opacity: .6;' : ''}">
                    <div><strong class="text-white">${esc(k.descricao)}</strong> ${st}<br><small class="text-muted-custom">${moeda(k.valor)} • vence ${esc(dataBR(k.vencimento))}</small></div>
                    <div class="d-flex gap-1">
                        ${k.pago ? '' : `<button data-acao="pagarConta" data-id="${esc(k.id)}" class="btn btn-outline-success btn-sm py-0" style="font-size: 11px;">Marcar paga</button>`}
                        <button data-acao="excluirConta" data-id="${esc(k.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                    </div>
                </div>`;
            }).join('') + '</div>';
        }

        /* ---- encaminhamentos à direção (igualdade racial) ---- */
        let cacheEnc = [];
        function criarEncaminhamento() {
            const g = id => document.getElementById(id).value.trim();
            const titulo = g('enc-titulo'), destinatario = g('enc-dest'), data = document.getElementById('enc-data').value, descricao = g('enc-desc');
            if (!titulo || !destinatario) { toast('Informe o assunto e a quem foi encaminhado.', 'warning'); return; }
            db.collection('encaminhamentos').add({
                titulo, destinatario, data, descricao, status: 'Aberto', autorEmail: emailLogado,
                autorNome: document.getElementById('user-name-display').textContent, criadoEm: TS()
            }).then(() => {
                toast('Encaminhamento registrado.');
                registrarAcao('Encaminhamento registrado', `${titulo} → ${destinatario}`);
                ['enc-titulo', 'enc-dest', 'enc-data', 'enc-desc'].forEach(i => document.getElementById(i).value = '');
            }).catch(e => erroDB(e, 'criarEncaminhamento'));
        }
        function carregarEncaminhamentos() {
            ouvir(db.collection('encaminhamentos').orderBy('criadoEm', 'desc').limit(100), snap => {
                cacheEnc = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const c = document.getElementById('lista-encaminhamentos');
                if (!cacheEnc.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum encaminhamento ainda. Registre aqui o que foi levado à direção.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + cacheEnc.map(x => `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div>
                                <strong class="text-white">${esc(x.titulo)}</strong>
                                <span class="badge ${x.status === 'Concluído' ? 'bg-success' : 'bg-warning text-dark'} ms-1">${esc(x.status)}</span><br>
                                <small class="text-muted-custom">Para: ${esc(x.destinatario)}${x.data ? ' • ' + esc(dataBR(x.data)) : ''} • por ${esc(x.autorNome || '')}</small>
                                ${x.descricao ? `<p class="small text-white mb-0 mt-1" style="white-space: pre-wrap;">${esc(x.descricao)}</p>` : ''}
                            </div>
                            <div class="d-flex gap-1 flex-wrap justify-content-end">
                                <button data-acao="alternarEnc" data-id="${esc(x.id)}" data-status="${x.status === 'Concluído' ? 'Aberto' : 'Concluído'}" class="btn btn-outline-success btn-sm py-0" style="font-size: 11px;">${x.status === 'Concluído' ? 'Reabrir' : 'Marcar concluído'}</button>
                                <button data-acao="excluirEnc" data-id="${esc(x.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                            </div>
                        </div>
                    </div>`).join('') + '</div>';
            });
        }

        /* ---- material de apoio (publicado na aba Estudos do portal) ---- */
        function criarApoio() {
            const g = id => document.getElementById(id).value.trim();
            const titulo = g('apoio-titulo'), link = g('apoio-link');
            if (!titulo) { toast('Dê um título ao material.', 'warning'); return; }
            if (!/^https:\/\//i.test(link)) { toast('Cole um link que comece com https://', 'warning'); return; }
            db.collection('estudos').add({
                titulo, disciplina: 'Igualdade Racial', tipo: document.getElementById('apoio-tipo').value, link, descricao: g('apoio-desc'),
                autor: document.getElementById('user-name-display').textContent, criadoPorEmail: emailLogado, criadoEm: TS()
            }).then(() => {
                toast('Material publicado na aba Estudos do portal. 📚');
                registrarAcao('Material de apoio publicado', titulo);
                ['apoio-titulo', 'apoio-link', 'apoio-desc'].forEach(i => document.getElementById(i).value = '');
            }).catch(e => erroDB(e, 'criarApoio'));
        }
        function carregarApoio() {
            ouvir(db.collection('estudos').where('criadoPorEmail', '==', emailLogado), snap => {
                const c = document.getElementById('lista-apoio');
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.criadoEm ? b.criadoEm.toMillis() : 0) - (a.criadoEm ? a.criadoEm.toMillis() : 0));
                if (!docs.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum material publicado ainda. O que você publicar aparece na aba Estudos do portal.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + docs.map(x => `
                    <div class="list-group-item d-flex justify-content-between align-items-center gap-2">
                        <div><strong class="text-white">${esc(x.titulo)}</strong> <span class="badge bg-secondary">${esc(x.tipo || '')}</span><br>
                        <small class="text-muted-custom">${esc(fmtData(x.criadoEm))}</small></div>
                        <button data-acao="excluirApoio" data-id="${esc(x.id)}" class="btn btn-outline-danger btn-sm py-0" style="font-size: 11px;">Excluir</button>
                    </div>`).join('') + '</div>';
            });
        }

        /* ---- monitoramento dos cargos novos (só o e-mail raiz) ---- */
        async function monitorarCargosNovos() {
            if (!soRaiz()) return;
            const out = document.getElementById('ti-monitor');
            out.textContent = 'Lendo dados...';
            try {
                const [ca, ap, lg, cx, ct, ev, enc, rv, es, or] = await Promise.all([
                    db.collection('cargos').get(), db.collection('acessos_painel').get(),
                    db.collection('acoes_admin').orderBy('em', 'desc').limit(500).get(),
                    db.collection('caixa').orderBy('data', 'desc').limit(1000).get(),
                    db.collection('contas').get(), db.collection('eventos').get(),
                    db.collection('encaminhamentos').get(), db.collection('reivindicacoes').get(),
                    db.collection('estudos').get(), db.collection('orcamentos').get()
                ]);
                const hoje = hojeISO(), mes = hoje.slice(0, 7), agora = Date.now();
                const acesso = {}; ap.docs.forEach(d => acesso[d.id] = d.data());
                const acoes = {}; lg.docs.forEach(d => { const a = d.data().autor; acoes[a] = (acoes[a] || 0) + 1; });
                const caixa = cx.docs.map(d => d.data()), contas = ct.docs.map(d => d.data());
                const evs = ev.docs.map(d => ({ id: d.id, ...d.data() })), encs = enc.docs.map(d => d.data());
                const est = es.docs.map(d => d.data()), orcs = or.docs.map(d => d.data());
                const temaQtd = rv.docs.map(d => d.data()).filter(p => PALAVRAS_RACIAIS.test(`${p.titulo || ''} ${p.descricao || ''}`)).length;
                const cargos = ca.docs.map(d => ({ email: d.id, ...d.data() }));

                const dias = e => { const a = acesso[e]; return a && a.ultimoAcesso ? Math.floor((agora - a.ultimoAcesso.toMillis()) / 864e5) : null; };
                const fmtDias = n => n === null ? '<span class="text-warning">nunca</span>' : n === 0 ? 'hoje' : n > 14 ? `<span class="text-warning">${n} d</span>` : `${n} d`;
                const bloco = (titulo, nivel, colunas, metricas, rodape) => {
                    const pessoas = cargos.filter(c => c.nivel === nivel);
                    let html = `<h6 class="fw-bold text-white mt-3">${titulo}</h6>`;
                    if (!pessoas.length) return html + '<p class="text-muted-custom small mb-0">Nenhuma pessoa neste cargo ainda.</p>';
                    html += '<table class="table table-sm table-dark mb-1"><thead><tr><th>Pessoa</th><th>Último acesso</th><th>Ações (log)</th>' + colunas.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
                    html += pessoas.map(c => `<tr><td>${esc(c.nome)}<br><small class="text-muted-custom">${esc(c.cargo)}</small></td><td>${fmtDias(dias(c.email))}</td><td>${acoes[c.email] || 0}</td>${metricas(c).map(v => `<td>${v}</td>`).join('')}</tr>`).join('');
                    html += '</tbody></table>';
                    return html + (rodape ? `<div class="text-muted-custom" style="font-size: 11px;">${rodape()}</div>` : '');
                };
                const tes = c => {
                    const doMes = caixa.filter(x => x.lancadoPor === c.email && (x.data || '').startsWith(mes));
                    const semComp = caixa.filter(x => x.tipo === 'Saída' && !x.comprovante && (x.data || '').startsWith(mes) && x.lancadoPor === c.email).length;
                    const vencidas = contas.filter(k => !k.pago && k.vencimento < hoje && k.criadoPorEmail === c.email).length;
                    return [doMes.length, semComp ? `<span class="text-warning">${semComp}</span>` : 0, vencidas ? `<span class="text-danger">${vencidas}</span>` : 0];
                };
                const cult = c => {
                    const atv = evs.filter(e => e.criadoPorEmail === c.email);
                    const inscritos = atv.reduce((t, e) => t + (e.inscritos || []).length, 0);
                    const comPresenca = atv.filter(e => (e.presentes || []).length).length;
                    const semReg = atv.filter(e => e.dataISO && e.dataISO < hoje && !e.registroLink).length;
                    return [atv.length, inscritos, comPresenca, semReg ? `<span class="text-warning">${semReg}</span>` : 0];
                };
                const rac = c => {
                    const atv = evs.filter(e => e.criadoPorEmail === c.email).length;
                    const abertos = encs.filter(e => e.autorEmail === c.email && e.status === 'Aberto').length;
                    const apoio = est.filter(e => e.criadoPorEmail === c.email).length;
                    return [atv, abertos ? `<span class="text-warning">${abertos}</span>` : 0, apoio];
                };
                const estourados = orcs.filter(o => caixa.filter(x => x.tipo === 'Saída' && x.orcamento === o.nome).reduce((s, x) => s + (Number(x.valor) || 0), 0) > o.teto).length;
                const saldoMes = caixa.filter(x => (x.data || '').startsWith(mes)).reduce((s, x) => s + (x.tipo === 'Entrada' ? 1 : -1) * (Number(x.valor) || 0), 0);

                out.innerHTML =
                    bloco('💰 Tesouraria', 'tesouraria', ['Lançamentos no mês', 'Saídas sem comprovante', 'Contas atrasadas'], tes,
                        () => `Saldo do mês (todo o caixa): ${moeda(saldoMes)} • Orçamentos estourados: ${estourados} • Contas atrasadas: ${contas.filter(k => !k.pago && k.vencimento < hoje).length}`) +
                    bloco('🎭 Cultura', 'cultura', ['Atividades', 'Inscritos', 'Com presença', 'Passadas sem registro'], cult, null) +
                    bloco('✊🏾 Igualdade Racial', 'racial', ['Ações', 'Encaminhamentos abertos', 'Materiais de apoio'], rac,
                        () => `Pautas sobre o tema no sistema: ${temaQtd}`) +
                    '<div class="text-muted-custom mt-3" style="font-size: 11px;">"Ações (log)" conta as últimas 500 ações. Último acesso em amarelo = mais de 14 dias sem entrar.</div>';
            } catch (e) { out.textContent = ''; erroDB(e, 'monitorarCargos'); }
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

        /* ================= SECRETARIA: DOCUMENTOS, REUNIÕES E LISTA DE PRESENÇA ================= */
        function falhaSec(e, onde) { console.error(onde, e); toast('Não foi possível salvar. Tente de novo.', 'danger'); }
        function dataSec(iso) { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }

        function criarDocumento() {
            const assunto = document.getElementById('doc-assunto').value.trim();
            const data = document.getElementById('doc-data').value;
            if (!assunto || !data) { toast('Preencha o assunto e a data do documento.', 'warning'); return; }
            const doc = {
                tipo: document.getElementById('doc-tipo').value,
                sentido: document.getElementById('doc-sentido').value,
                data, assunto,
                origem: document.getElementById('doc-origem').value.trim(),
                status: document.getElementById('doc-status').value,
                criadoEm: TS(), criadoPorEmail: emailLogado
            };
            db.collection('documentos').add(doc).then(() => {
                toast('Documento registrado.');
                registrarAcao('Documento registrado', assunto);
                ['doc-assunto', 'doc-origem'].forEach(i => document.getElementById(i).value = '');
            }).catch(e => falhaSec(e, 'criarDocumento'));
        }
        function alterarStatusDoc(id, status) {
            db.collection('documentos').doc(id).update({ status })
                .then(() => registrarAcao('Status de documento alterado', status))
                .catch(e => falhaSec(e, 'alterarStatusDoc'));
        }
        async function excluirDocumento(id) {
            if (!(await confirmar('Excluir este documento do registro?'))) return;
            db.collection('documentos').doc(id).delete()
                .then(() => registrarAcao('Documento excluído', id))
                .catch(e => falhaSec(e, 'excluirDocumento'));
        }
        function carregarDocumentos() {
            ouvir(db.collection('documentos').orderBy('criadoEm', 'desc').limit(200), snap => {
                const c = document.getElementById('lista-documentos');
                if (!c) return;
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum documento registrado.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const x = d.data();
                    return `<div class="list-group-item d-flex justify-content-between align-items-start gap-2">
                        <div><strong class="text-white">${esc(x.tipo)} • ${esc(x.sentido)}</strong><br>
                        <small class="text-white">${esc(x.assunto)}</small><br>
                        <small class="text-muted-custom">${esc(x.origem || 'Sem origem informada')} • ${esc(dataSec(x.data))}</small></div>
                        <div class="d-flex flex-column gap-1">
                            <select onchange="alterarStatusDoc('${d.id}', this.value)" class="form-select form-select-sm" style="font-size:11px">${['Pendente', 'Respondido', 'Arquivado'].map(s => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
                            <button onclick="excluirDocumento('${d.id}')" class="btn btn-outline-danger btn-sm py-0" style="font-size:11px">Excluir</button>
                        </div></div>`;
                }).join('') + '</div>';
            });
        }

        function criarReuniao() {
            const titulo = document.getElementById('reu-titulo').value.trim();
            const data = document.getElementById('reu-data').value;
            if (!titulo || !data) { toast('Preencha o título e a data da reunião.', 'warning'); return; }
            db.collection('reunioes').add({
                titulo, data,
                hora: document.getElementById('reu-hora').value || '',
                local: document.getElementById('reu-local').value.trim(),
                pauta: document.getElementById('reu-pauta').value.trim(),
                criadoEm: TS(), criadoPorEmail: emailLogado
            }).then(() => {
                toast('Reunião agendada.');
                registrarAcao('Reunião agendada', titulo);
                ['reu-titulo', 'reu-local', 'reu-pauta', 'reu-hora'].forEach(i => document.getElementById(i).value = '');
            }).catch(e => falhaSec(e, 'criarReuniao'));
        }
        async function excluirReuniao(id) {
            if (!(await confirmar('Excluir esta reunião?'))) return;
            db.collection('reunioes').doc(id).delete()
                .then(() => registrarAcao('Reunião excluída', id))
                .catch(e => falhaSec(e, 'excluirReuniao'));
        }
        function carregarReunioes() {
            ouvir(db.collection('reunioes').orderBy('data', 'desc').limit(100), snap => {
                const c = document.getElementById('lista-reunioes');
                if (!c) return;
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma reunião agendada.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const x = d.data();
                    return `<div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div><strong class="text-white">${esc(x.titulo)}</strong><br>
                            <small class="text-muted-custom">${esc(dataSec(x.data))}${x.hora ? ' às ' + esc(x.hora) : ''}${x.local ? ' • ' + esc(x.local) : ''}</small></div>
                            <button onclick="excluirReuniao('${d.id}')" class="btn btn-outline-danger btn-sm py-0" style="font-size:11px">Excluir</button>
                        </div>
                        ${x.pauta ? `<p class="small text-white mt-2 mb-0" style="white-space:pre-wrap">${esc(x.pauta)}</p>` : ''}
                    </div>`;
                }).join('') + '</div>';
            });
        }

        function criarPresenca() {
            const evento = document.getElementById('pres-evento').value.trim();
            const data = document.getElementById('pres-data').value;
            const nomes = document.getElementById('pres-nomes').value.split('\n').map(n => n.trim()).filter(Boolean);
            if (!evento || !data || !nomes.length) { toast('Preencha a atividade, a data e pelo menos um nome.', 'warning'); return; }
            db.collection('listas_presenca').add({ evento, data, nomes, total: nomes.length, criadoEm: TS(), criadoPorEmail: emailLogado })
                .then(() => {
                    toast('Lista de presença salva.');
                    registrarAcao('Lista de presença salva', evento);
                    ['pres-evento', 'pres-nomes'].forEach(i => document.getElementById(i).value = '');
                }).catch(e => falhaSec(e, 'criarPresenca'));
        }
        async function excluirPresenca(id) {
            if (!(await confirmar('Excluir esta lista de presença?'))) return;
            db.collection('listas_presenca').doc(id).delete()
                .then(() => registrarAcao('Lista de presença excluída', id))
                .catch(e => falhaSec(e, 'excluirPresenca'));
        }
        function carregarPresenca() {
            ouvir(db.collection('listas_presenca').orderBy('criadoEm', 'desc').limit(100), snap => {
                const c = document.getElementById('lista-presencas');
                if (!c) return;
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma lista salva.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => {
                    const x = d.data();
                    return `<div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div><strong class="text-white">${esc(x.evento)}</strong><br>
                            <small class="text-muted-custom">${esc(dataSec(x.data))} • ${x.total || (x.nomes || []).length} presente(s)</small></div>
                            <button onclick="excluirPresenca('${d.id}')" class="btn btn-outline-danger btn-sm py-0" style="font-size:11px">Excluir</button>
                        </div>
                        <details class="mt-2"><summary class="small text-muted-custom">Ver nomes</summary>
                        <p class="small text-white mb-0 mt-1" style="white-space:pre-wrap">${esc((x.nomes || []).join('\n'))}</p></details>
                    </div>`;
                }).join('') + '</div>';
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

        /* ================= DIRETORIA DE MULHERES E DIRETORIA DE GÊNEROS ================= */
        const NOME_AREA = { mulheres: 'Diretoria de Mulheres', generos: 'Diretoria de Gêneros' };
        let cacheAtiDiv = {}, cacheMatDiv = {};
        function prepararAreaDiv(id) {
            const el = document.getElementById(id);
            if (!el) return;
            if (nivelReal === 'mulheres' || nivelReal === 'generos') { el.value = nivelReal; el.disabled = true; }
            else if (!el.value) el.value = 'mulheres';
        }
        function prepararRelDiv() { prepararAreaDiv('div-rel-area'); }
        function noMesDiv(dt, mes) {
            if (!dt) return false;
            const d = dt.toDate ? dt.toDate() : new Date(dt);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mes;
        }

        /* atividades e presença */
        function criarAtividadeDiv() {
            const area = document.getElementById('div-ati-area').value;
            const titulo = document.getElementById('div-ati-titulo').value.trim();
            const data = document.getElementById('div-ati-data').value;
            const presentes = document.getElementById('div-ati-presentes').value.split('\n').map(n => n.trim()).filter(Boolean);
            if (!titulo || !data) { toast('Preencha o título e a data da atividade.', 'warning'); return; }
            db.collection('atividades_diversidade').add({
                area, titulo, data,
                hora: document.getElementById('div-ati-hora').value || '',
                local: document.getElementById('div-ati-local').value.trim(),
                descricao: document.getElementById('div-ati-desc').value.trim(),
                presentes, total: presentes.length,
                criadoEm: TS(), criadoPorEmail: emailLogado
            }).then(() => {
                toast('Atividade registrada.');
                registrarAcao('Atividade registrada (' + NOME_AREA[area] + ')', titulo);
                ['div-ati-titulo', 'div-ati-local', 'div-ati-desc', 'div-ati-presentes', 'div-ati-hora'].forEach(i => document.getElementById(i).value = '');
            }).catch(e => falhaSec(e, 'criarAtividadeDiv'));
        }
        async function excluirAtividadeDiv(id) {
            if (!(await confirmar('Excluir esta atividade e a lista de participantes?'))) return;
            db.collection('atividades_diversidade').doc(id).delete()
                .then(() => registrarAcao('Atividade excluída', id))
                .catch(e => falhaSec(e, 'excluirAtividadeDiv'));
        }
        const assinadosDiv = {};
        function areaSelecionada(id) { const el = document.getElementById(id); return el ? el.value : 'mulheres'; }
        function assinarAtividadesDiv(area) {
            if (assinadosDiv['ati-' + area]) return;
            assinadosDiv['ati-' + area] = true;
            ouvir(db.collection('atividades_diversidade').where('area', '==', area).limit(300), snap => {
                cacheAtiDiv[area] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderAtividadesDiv();
            });
        }
        function carregarAtividadesDiv() {
            prepararAreaDiv('div-ati-area');
            assinarAtividadesDiv(areaSelecionada('div-ati-area'));
            renderAtividadesDiv();
        }
        function renderAtividadesDiv() {
            const c = document.getElementById('lista-div-atividades');
            if (!c) return;
            const area = document.getElementById('div-ati-area').value;
            const lista = (cacheAtiDiv[area] || []).slice().sort((p, q) => String(q.data).localeCompare(String(p.data)));
            if (!lista.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhuma atividade registrada nesta área.</p>'; return; }
            c.innerHTML = '<div class="list-group">' + lista.map(x => `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start gap-2">
                        <div><strong class="text-white">${esc(x.titulo)}</strong><br>
                        <small class="text-muted-custom">${esc(x.data.split('-').reverse().join('/'))}${x.hora ? ' às ' + esc(x.hora) : ''}${x.local ? ' • ' + esc(x.local) : ''} • ${x.total || (x.presentes || []).length} participante(s)</small></div>
                        <button onclick="excluirAtividadeDiv('${x.id}')" class="btn btn-outline-danger btn-sm py-0" style="font-size:11px">Excluir</button>
                    </div>
                    ${x.descricao ? `<p class="small text-white mt-2 mb-1" style="white-space:pre-wrap">${esc(x.descricao)}</p>` : ''}
                    <details class="mt-1"><summary class="small text-muted-custom">Ver participantes</summary>
                    <p class="small text-white mb-0 mt-1" style="white-space:pre-wrap">${esc((x.presentes || []).join('\n') || 'Nenhum nome registrado.')}</p></details>
                </div>`).join('') + '</div>';
        }

        /* materiais de apoio */
        function criarMaterialDiv() {
            const area = document.getElementById('div-mat-area').value;
            const titulo = document.getElementById('div-mat-titulo').value.trim();
            const link = document.getElementById('div-mat-link').value.trim();
            if (!titulo || !link) { toast('Preencha o título e o link do material.', 'warning'); return; }
            if (!/^https:\/\//i.test(link)) { toast('O link precisa começar com https://', 'warning'); return; }
            db.collection('materiais_diversidade').add({
                area, titulo, link,
                descricao: document.getElementById('div-mat-desc').value.trim(),
                criadoEm: TS(), criadoPorEmail: emailLogado
            }).then(() => {
                toast('Material publicado.');
                registrarAcao('Material publicado (' + NOME_AREA[area] + ')', titulo);
                ['div-mat-titulo', 'div-mat-link', 'div-mat-desc'].forEach(i => document.getElementById(i).value = '');
            }).catch(e => falhaSec(e, 'criarMaterialDiv'));
        }
        async function excluirMaterialDiv(id) {
            if (!(await confirmar('Excluir este material?'))) return;
            db.collection('materiais_diversidade').doc(id).delete()
                .then(() => registrarAcao('Material excluído', id))
                .catch(e => falhaSec(e, 'excluirMaterialDiv'));
        }
        function assinarMateriaisDiv(area) {
            if (assinadosDiv['mat-' + area]) return;
            assinadosDiv['mat-' + area] = true;
            ouvir(db.collection('materiais_diversidade').where('area', '==', area).limit(300), snap => {
                cacheMatDiv[area] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderMateriaisDiv();
            });
        }
        function carregarMateriaisDiv() {
            prepararAreaDiv('div-mat-area');
            assinarMateriaisDiv(areaSelecionada('div-mat-area'));
            renderMateriaisDiv();
        }
        function renderMateriaisDiv() {
            const c = document.getElementById('lista-div-materiais');
            if (!c) return;
            const area = document.getElementById('div-mat-area').value;
            const lista = (cacheMatDiv[area] || []);
            if (!lista.length) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nenhum material publicado nesta área.</p>'; return; }
            c.innerHTML = '<div class="list-group">' + lista.map(x => `
                <div class="list-group-item d-flex justify-content-between align-items-start gap-2">
                    <div><strong class="text-white">${esc(x.titulo)}</strong><br>
                    <a href="${esc(x.link)}" target="_blank" rel="noopener noreferrer" class="small">Abrir link ↗</a>
                    ${x.descricao ? `<p class="small text-muted-custom mb-0 mt-1">${esc(x.descricao)}</p>` : ''}</div>
                    <button onclick="excluirMaterialDiv('${x.id}')" class="btn btn-outline-danger btn-sm py-0" style="font-size:11px">Excluir</button>
                </div>`).join('') + '</div>';
        }

        /* relatório mensal da área */
        async function gerarRelatorioDiv() {
            const area = document.getElementById('div-rel-area').value;
            const mes = document.getElementById('div-rel-mes').value;
            if (!mes) { toast('Escolha o mês do relatório.', 'warning'); return; }
            const [ano, m] = mes.split('-');
            try {
                const [atS, matS] = await Promise.all([
                    db.collection('atividades_diversidade').where('area', '==', area).get(),
                    db.collection('materiais_diversidade').where('area', '==', area).get()
                ]);
                const atv = atS.docs.map(d => d.data()).filter(x => x.data && x.data.startsWith(mes)).sort((p, q) => p.data.localeCompare(q.data));
                const mats = matS.docs.map(d => d.data()).filter(x => noMesDiv(x.criadoEm, mes));
                const participantes = atv.reduce((s, x) => s + (x.total || (x.presentes || []).length), 0);
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
                linha(NOME_AREA[area] + ' · Relatório mensal', 12);
                linha(`Mês de referência: ${m}/${ano}`);
                linha(`Gerado por ${emailLogado} em ${new Date().toLocaleDateString('pt-BR')}`, 9);
                secao(`Atividades (${atv.length})`);
                if (!atv.length) linha('Nenhuma atividade registrada neste mês.');
                atv.forEach(x => {
                    linha(`• ${br(x.data)}${x.hora ? ' às ' + x.hora : ''} – ${x.titulo}${x.local ? ' (' + x.local + ')' : ''}: ${x.total || (x.presentes || []).length} participante(s)`);
                    (x.presentes || []).forEach(n => linha('      ' + n, 9));
                });
                secao(`Materiais publicados (${mats.length})`);
                if (!mats.length) linha('Nenhum material publicado neste mês.');
                mats.forEach(x => linha(`• ${x.titulo}: ${x.link}`));
                secao('Resumo');
                linha(`Participações registradas no mês: ${participantes}`);
                const paginas = pdf.getNumberOfPages();
                for (let i = 1; i <= paginas; i++) {
                    pdf.setPage(i); pdf.setFont('Helvetica', 'normal'); pdf.setFontSize(8);
                    pdf.text(`Grêmio Estudantil IFCE Crateús · Página ${i} de ${paginas}`, 105, 290, { align: 'center' });
                }
                pdf.save(`relatorio_${area}_${mes}.pdf`);
                registrarAcao('Relatório da diretoria gerado', `${area} ${mes}`);
            } catch (e) {
                console.error('gerarRelatorioDiv', e);
                toast('Não foi possível gerar o relatório. Tente de novo.', 'danger');
            }
        }

        /* ================= FUNÇÕES PRÓPRIAS: DIRETORIA DE MULHERES E DIRETORIA DE GÊNEROS ================= */
        const CRUD_CFG = {
  "mu-campanhas": {
    "col": "campanhas_mulheres",
    "lista": "lista-mu-campanhas",
    "acao": "Campanha cadastrada",
    "campos": [
      [
        "mu-camp-titulo",
        "titulo",
        "text"
      ],
      [
        "mu-camp-inicio",
        "inicio",
        "date"
      ],
      [
        "mu-camp-fim",
        "fim",
        "date"
      ],
      [
        "mu-camp-status",
        "status",
        "select"
      ],
      [
        "mu-camp-resp",
        "responsavel",
        "text"
      ],
      [
        "mu-camp-notas",
        "notas",
        "textarea"
      ]
    ],
    "obrig": [
      "titulo"
    ],
    "numericos": []
  },
  "mu-calendario": {
    "col": "calendario_mulheres",
    "lista": "lista-mu-calendario",
    "acao": "Data do calendário cadastrada",
    "campos": [
      [
        "mu-cal-data",
        "data",
        "date"
      ],
      [
        "mu-cal-evento",
        "evento",
        "text"
      ],
      [
        "mu-cal-obs",
        "obs",
        "textarea"
      ]
    ],
    "obrig": [
      "evento"
    ],
    "numericos": []
  },
  "ge-glossario": {
    "col": "glossario_generos",
    "lista": "lista-ge-glossario",
    "acao": "Termo cadastrado no glossário",
    "campos": [
      [
        "ge-gl-termo",
        "termo",
        "text"
      ],
      [
        "ge-gl-fonte",
        "fonte",
        "text"
      ],
      [
        "ge-gl-def",
        "definicao",
        "textarea"
      ]
    ],
    "obrig": [
      "termo",
      "definicao"
    ],
    "numericos": []
  },
  "ge-debates": {
    "col": "debates_generos",
    "lista": "lista-ge-debates",
    "acao": "Debate cadastrado",
    "campos": [
      [
        "ge-deb-tema",
        "tema",
        "text"
      ],
      [
        "ge-deb-data",
        "data",
        "date"
      ],
      [
        "ge-deb-conv",
        "convidado",
        "text"
      ],
      [
        "ge-deb-status",
        "status",
        "select"
      ],
      [
        "ge-deb-notas",
        "notas",
        "textarea"
      ]
    ],
    "obrig": [
      "tema"
    ],
    "numericos": []
  },
  "ge-metas": {
    "col": "metas_generos",
    "lista": "lista-ge-metas",
    "acao": "Meta cadastrada",
    "campos": [
      [
        "ge-met-meta",
        "meta",
        "text"
      ],
      [
        "ge-met-prazo",
        "prazo",
        "date"
      ],
      [
        "ge-met-prog",
        "progresso",
        "number"
      ],
      [
        "ge-met-resp",
        "responsavel",
        "text"
      ]
    ],
    "obrig": [
      "meta"
    ],
    "numericos": [
      "progresso"
    ]
  }
};
        const LINHA_CRUD = {
            'mu-campanhas': x => `<strong class="text-white">${esc(x.titulo)}</strong> <span class="badge bg-secondary">${esc(x.status || 'Planejada')}</span><br><small class="text-muted-custom">${esc(dataSec(x.inicio))} a ${esc(dataSec(x.fim))} • ${esc(x.responsavel || 'sem responsável')}</small>${x.notas ? `<p class="small text-white mb-0 mt-1" style="white-space:pre-wrap">${esc(x.notas)}</p>` : ''}`,
            'mu-calendario': x => `<strong class="text-white">${esc(x.evento)}</strong><br><small class="text-muted-custom">${esc(dataSec(x.data))}</small>${x.obs ? `<p class="small text-white mb-0 mt-1">${esc(x.obs)}</p>` : ''}`,
            'ge-glossario': x => `<strong class="text-white">${esc(x.termo)}</strong>${x.fonte ? ` <small class="text-muted-custom">(${esc(x.fonte)})</small>` : ''}<p class="small text-white mb-0 mt-1" style="white-space:pre-wrap">${esc(x.definicao)}</p>`,
            'ge-debates': x => `<strong class="text-white">${esc(x.tema)}</strong> <span class="badge bg-secondary">${esc(x.status || 'Planejado')}</span><br><small class="text-muted-custom">${esc(dataSec(x.data))}${x.convidado ? ' • ' + esc(x.convidado) : ''}</small>${x.notas ? `<p class="small text-white mb-0 mt-1" style="white-space:pre-wrap">${esc(x.notas)}</p>` : ''}`,
            'ge-metas': x => `<strong class="text-white">${esc(x.meta)}</strong><br><small class="text-muted-custom">Prazo: ${esc(dataSec(x.prazo))}${x.responsavel ? ' • ' + esc(x.responsavel) : ''}</small><div class="progress mt-2" style="height:8px"><div class="progress-bar bg-success" style="width:${Math.min(100, Math.max(0, Number(x.progresso) || 0))}%"></div></div><small class="text-muted-custom">${Math.min(100, Math.max(0, Number(x.progresso) || 0))}% concluído</small>`
        };
        function salvarCrud(id) {
            const cfg = CRUD_CFG[id];
            const obj = {};
            cfg.campos.forEach(([inp, key, tipo]) => {
                let v = document.getElementById(inp).value;
                v = typeof v === 'string' ? v.trim() : v;
                if (cfg.numericos.includes(key)) v = Math.min(100, Math.max(0, Number(v) || 0));
                obj[key] = v;
            });
            if (cfg.obrig.some(k => !obj[k])) { toast('Preencha os campos obrigatórios.', 'warning'); return; }
            obj.criadoEm = TS();
            obj.criadoPorEmail = emailLogado;
            db.collection(cfg.col).add(obj).then(() => {
                toast('Salvo com sucesso.');
                registrarAcao(cfg.acao, String(obj[cfg.obrig[0]]));
                cfg.campos.forEach(([inp, key, tipo]) => {
                    const el = document.getElementById(inp);
                    if (tipo === 'select') el.selectedIndex = 0;
                    else if (tipo === 'number') el.value = 0;
                    else el.value = '';
                });
            }).catch(e => falhaSec(e, 'salvarCrud'));
        }
        async function excluirCrud(id, docId) {
            const cfg = CRUD_CFG[id];
            if (!(await confirmar('Excluir este registro?'))) return;
            db.collection(cfg.col).doc(docId).delete()
                .then(() => registrarAcao('Registro excluído (' + cfg.col + ')', docId))
                .catch(e => falhaSec(e, 'excluirCrud'));
        }
        function carregarCrud(id) {
            const cfg = CRUD_CFG[id];
            ouvir(db.collection(cfg.col).orderBy('criadoEm', 'desc').limit(200), snap => {
                const c = document.getElementById(cfg.lista);
                if (!c) return;
                if (snap.empty) { c.innerHTML = '<p class="text-muted-custom small mb-0">Nada cadastrado ainda.</p>'; return; }
                c.innerHTML = '<div class="list-group">' + snap.docs.map(d => `
                    <div class="list-group-item d-flex justify-content-between align-items-start gap-2">
                        <div class="flex-grow-1">${LINHA_CRUD[id]({ id: d.id, ...d.data() })}</div>
                        <button onclick="excluirCrud('${id}','${d.id}')" class="btn btn-outline-danger btn-sm py-0" style="font-size:11px">Excluir</button>
                    </div>`).join('') + '</div>';
            });
        }
        async function gerarIndicadores(area, elId, selId) {
            const ano = document.getElementById(selId).value;
            const out = document.getElementById(elId);
            out.innerHTML = '<p class="text-muted-custom small mb-0">Carregando...</p>';
            try {
                const snap = await db.collection('atividades_diversidade').where('area', '==', area).get();
                const meses = Array.from({ length: 12 }, () => ({ ativ: 0, part: 0 }));
                snap.docs.map(d => d.data()).filter(x => x.area === area && String(x.data).startsWith(ano)).forEach(x => {
                    const i = Number(x.data.slice(5, 7)) - 1;
                    meses[i].ativ++;
                    meses[i].part += (x.total || (x.presentes || []).length);
                });
                const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const tot = meses.reduce((s, m) => ({ ativ: s.ativ + m.ativ, part: s.part + m.part }), { ativ: 0, part: 0 });
                out.innerHTML = `<div class="table-responsive"><table class="table table-dark table-sm align-middle mb-2">
                    <thead><tr><th>Mês</th><th>Atividades</th><th>Participações</th></tr></thead>
                    <tbody>${meses.map((m, i) => `<tr><td>${nomes[i]}</td><td>${m.ativ}</td><td>${m.part}</td></tr>`).join('')}</tbody></table></div>
                    <p class="small text-muted-custom mb-0">Total em ${esc(ano)}: ${tot.ativ} atividade(s) e ${tot.part} participação(ões).</p>`;
            } catch (e) {
                console.error('gerarIndicadores', e);
                out.innerHTML = '<p class="small text-danger mb-0">Não foi possível carregar. Tente de novo.</p>';
            }
        }
