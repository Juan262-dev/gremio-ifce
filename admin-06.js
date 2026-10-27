        /* ================= RESUMO ================= */

        async function carregarResumo() {
            const grid = document.getElementById('resumo-grid');
            try {
                const q = c => db.collection(c).get().then(s => s.docs.map(d => d.data()));
                const [al, pa, su, ev, ma, en, jo] = await Promise.all(['alunos', 'reivindicacoes', 'sugestoes', 'eventos', 'materiais', 'enquetes', 'jogos'].map(q));
                const hoje = hojeISO();
                const itens = [
                    ['🎓', 'Alunos ativos', al.filter(a => a.ativo).length],
                    ['✊', 'Pautas em aberto', pa.filter(p => (p.status || 'Em análise') !== 'Resolvida').length],
                    ['💡', 'Sugestões sem resposta', su.filter(x => !x.resposta).length],
                    ['📅', 'Próximos eventos', ev.filter(e => !e.dataISO || e.dataISO >= hoje).length],
                    ['🎲', 'Pedidos de material', ma.filter(m => m.status === 'Solicitado').length],
                    ['⏰', 'Devoluções atrasadas', ma.filter(m => m.devolverAte && m.devolverAte < hoje && m.status === 'Emprestado').length],
                    ['📊', 'Enquetes ativas', en.filter(e => e.ativa).length],
                    ['🏆', 'Jogos agendados', jo.filter(j => j.status !== 'Encerrado').length]
                ];
                grid.innerHTML = itens.map(([ic, t, n]) => `
                    <div class="col-6 col-md-3"><div class="p-3 rounded text-center" style="background: #121a14; border: 1px solid var(--ifce-card-border);">
                        <div style="font-size: 1.4rem;">${ic}</div><div class="fw-bold fs-4" style="color: var(--ifce-accent-green);">${n}</div><div class="small text-muted-custom">${t}</div>
                    </div></div>`).join('');
            } catch (e) { grid.innerHTML = '<p class="text-muted-custom small mb-0">Não foi possível carregar o resumo.</p>'; console.error(e); }
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
    
        /* ================= ABAS DO PAINEL ================= */
        const ABAS = [
            ['inicio', 'Início', ['secao-resumo', 'secao-tarefas', 'secao-tarefas-admin', 'secao-novidades', 'secao-ajuda', 'secao-guia']],
            ['comunicacao', 'Comunicação', ['secao-mural', 'secao-divulgacao', 'secao-artes', 'secao-enquetes-criar', 'secao-enquetes-lista', 'secao-videos', 'secao-estudos', 'secao-questoes', 'secao-flashcards', 'secao-pautas', 'secao-sugestoes']],
            ['alunos', 'Alunos', ['secao-alunos-cadastrar', 'secao-alunos-massa', 'secao-alunos-lista', 'secao-punicoes']],
            ['atividades', 'Atividades', ['secao-eventos', 'secao-jogos', 'secao-materiais', 'secao-cultura', 'secao-racial', 'secao-racial-enc', 'secao-racial-apoio', 'secao-rel-cult', 'secao-rel-racial']],
            ['financeiro', 'Financeiro', ['secao-caixa', 'secao-tes-orc', 'secao-tes-contas', 'secao-rel-tes']],
            ['diretoria', 'Diretoria', ['secao-diretoria', 'secao-avaliacoes', 'secao-convites', 'secao-agenda', 'secao-avisos-wpp', 'secao-secao-mu-campanhas', 'secao-secao-mu-calendario', 'secao-secao-mu-canais', 'secao-secao-mu-indicadores', 'secao-secao-ge-glossario', 'secao-secao-ge-debates', 'secao-secao-ge-metas', 'secao-secao-ge-indicadores', 'secao-div-atividades', 'secao-div-materiais', 'secao-div-rel', 'secao-sec-alunos', 'secao-rel-sec', 'secao-documentos', 'secao-reunioes', 'secao-presenca', 'secao-atas', 'secao-relatorio-mensal', 'secao-relatorio', 'secao-auditoria']],
            ['ti', 'TI', ['secao-eleicao', 'secao-pendentes', 'secao-sessoes', 'secao-fontes', 'secao-plantao', 'secao-versoes', 'secao-exclusoes']],
            ['outros', 'Outros', []]
        ];

        function montarAbas() {
            const cont = document.getElementById('conteudo-painel-geral');
            if (!cont || document.getElementById('abas-painel')) return;
            const nav = document.createElement('div');
            nav.id = 'abas-painel';
            nav.className = 'd-flex gap-2 flex-wrap mb-4';
            cont.insertBefore(nav, cont.firstChild);
            ABAS.forEach(([key, rotulo, ids]) => {
                const pane = document.createElement('div');
                pane.dataset.abaPane = key;
                pane.style.display = 'none';
                ids.forEach(id => { const el = document.getElementById(id); if (el) pane.appendChild(el); });
                cont.appendChild(pane);
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-sm btn-outline-light';
                btn.dataset.abaBtn = key;
                btn.textContent = rotulo;
                btn.style.display = 'none';
                btn.onclick = () => mostrarAba(key, true);
                nav.appendChild(btn);
            });
            // cartões que ainda não têm aba: os de TI vão para a aba TI; os demais para "Outros"
            [...cont.children].filter(el => el.id && el.id.startsWith('secao-')).forEach(el => {
                const destino = el.classList.contains('card-root') ? 'ti' : 'outros';
                cont.querySelector(`[data-aba-pane="${destino}"]`).appendChild(el);
            });
            const rodape = document.createElement('div');
            rodape.id = 'rodape-painel';
            rodape.className = 'text-center text-muted-custom small mt-4 mb-2';
            rodape.textContent = `Grêmio Estudantil IFCE Crateús · versão ${VERSAO_SISTEMA} · última atualização ${DATA_ULTIMA_ATUALIZACAO}`;
            cont.appendChild(rodape);
        }
        function mostrarAba(key, rolar) {
            document.querySelectorAll('[data-aba-pane]').forEach(p => p.style.display = p.dataset.abaPane === key ? 'block' : 'none');
            document.querySelectorAll('[data-aba-btn]').forEach(b => {
                const ativo = b.dataset.abaBtn === key;
                b.classList.toggle('btn-success', ativo);
                b.classList.toggle('btn-outline-light', !ativo);
            });
            if (rolar) document.getElementById('abas-painel').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        function atualizarAbas() {
            if (!document.getElementById('abas-painel')) return;
            let primeira = null;
            document.querySelectorAll('[data-aba-btn]').forEach(b => {
                const pane = document.querySelector(`[data-aba-pane="${b.dataset.abaBtn}"]`);
                const visiveis = pane ? [...pane.children].filter(c => getComputedStyle(c).display !== 'none').length : 0;
                b.style.display = visiveis ? '' : 'none';
                if (visiveis && !primeira) primeira = b.dataset.abaBtn;
            });
            const atual = document.querySelector('[data-aba-btn].btn-success');
            if (atual && atual.style.display !== 'none') mostrarAba(atual.dataset.abaBtn, false);
            else if (primeira) mostrarAba(primeira, false);
        }
        function irPara(id) {
            const el = document.getElementById(id);
            if (!el) return;
            const pane = el.closest('[data-aba-pane]');
            if (pane && pane.style.display === 'none') mostrarAba(pane.dataset.abaPane, false);
            setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
        }
        montarAbas();
