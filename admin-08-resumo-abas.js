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
