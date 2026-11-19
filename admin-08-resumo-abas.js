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
            ['comunicacao', 'Comunicação e Estudos', ['secao-mural', 'secao-divulgacao', 'secao-artes', 'secao-enquetes-criar', 'secao-enquetes-lista', 'secao-videos', 'secao-estudos', 'secao-laboratorio', 'secao-questoes', 'secao-flashcards', 'secao-pautas', 'secao-sugestoes']],
            ['alunos', 'Alunos', ['secao-alunos-cadastrar', 'secao-alunos-lista', 'secao-carteirinhas', 'secao-punicoes']],
            ['atividades', 'Atividades', ['secao-eventos', 'secao-jogos', 'secao-materiais', 'secao-cultura', 'secao-racial', 'secao-racial-enc', 'secao-racial-apoio', 'secao-rel-cult', 'secao-rel-racial']],
            ['financeiro', 'Financeiro', ['secao-caixa', 'secao-tes-orc', 'secao-tes-contas', 'secao-rel-tes']],
            ['diretoria', 'Diretoria', ['secao-diretoria', 'secao-avaliacoes', 'secao-convites', 'secao-agenda', 'secao-avisos-wpp', 'secao-mu-campanhas', 'secao-mu-calendario', 'secao-mu-canais', 'secao-mu-indicadores', 'secao-ge-glossario', 'secao-ge-debates', 'secao-ge-metas', 'secao-ge-indicadores', 'secao-div-atividades', 'secao-div-materiais', 'secao-div-rel', 'secao-sec-alunos', 'secao-rel-sec', 'secao-documentos', 'secao-reunioes', 'secao-presenca', 'secao-atas', 'secao-relatorio-mensal', 'secao-relatorio', 'secao-auditoria']],
            ['ti', 'TI', ['secao-saude', 'secao-eleicao', 'secao-pendentes', 'secao-sessoes', 'secao-fontes', 'secao-plantao', 'secao-versoes', 'secao-exclusoes']],
            ['outros', 'Outros', []]
        ];
        let abaAtualApp = null;
        const ultimaFerramentaApp = Object.create(null);
        function obterPaneAdmin(chave) {
            return document.querySelector('[data-aba-pane="' + chave + '"]');
        }
        function ferramentaVisivelAdmin(el) {
            // O backend de cargos/travas é mantido; nunca forçamos display:block.
            // Elementos ocultados pela navegação usam classe separada, não inline style.
            return !!el && el.style.display !== 'none' && !el.hidden &&
                (el.style.display === 'block' || getComputedStyle(el).display !== 'none' ||
                 el.classList.contains('admin-app-ferramenta-oculta'));
        }
        function rotuloFerramentaAdmin(id) {
            const modulo = modulosSistema.find(m => m.id === id);
            if (modulo) return modulo.label;
            const el = document.getElementById(id);
            const h = el && el.querySelector('h4,h5,h6');
            return h ? h.textContent.trim().slice(0,90) : id.replace('secao-', '').replace(/-/g, ' ');
        }
        function ferramentasDaAbaAdmin(chave) {
            const pane = obterPaneAdmin(chave);
            return pane ? [...pane.children].filter(el => el.id && el.id.startsWith('secao-') && ferramentaVisivelAdmin(el)) : [];
        }
        function montarAbas() {
            const cont = document.getElementById('conteudo-painel-geral');
            if (!cont || document.getElementById('abas-painel')) return;
            const busca = document.createElement('div');
            busca.id = 'admin-app-cabecalho';
            busca.className = 'admin-app-cabecalho';
            const titulo = document.createElement('h2');
            titulo.className = 'admin-app-titulo';
            titulo.textContent = '🧭 Central de Gestão';
            const texto = document.createElement('p');
            texto.className = 'admin-app-texto';
            texto.textContent = 'Localize uma ferramenta e trabalhe em uma atividade de cada vez.';
            const label = document.createElement('label');
            label.htmlFor = 'admin-app-busca';
            label.className = 'form-label';
            label.textContent = 'Buscar ferramenta do painel';
            const input = document.createElement('input');
            input.id = 'admin-app-busca';
            input.type = 'search';
            input.maxLength = 80;
            input.className = 'form-control';
            input.autocomplete = 'off';
            input.placeholder = 'Ex.: laboratório, alunos, criar enquete...';
            const resultado = document.createElement('div');
            resultado.id = 'admin-app-resultados';
            resultado.className = 'admin-app-resultados';
            resultado.setAttribute('aria-label', 'Resultados de busca');
            resultado.setAttribute('aria-live', 'polite');
            resultado.hidden = true;
            input.addEventListener('input', atualizarBuscaAdmin);
            busca.append(titulo, texto, label, input, resultado);
            cont.insertBefore(busca, cont.firstChild);
            const nav = document.createElement('nav');
            nav.id = 'abas-painel';
            nav.className = 'admin-app-abas';
            nav.setAttribute('aria-label', 'Categorias do Painel Administrativo');
            busca.insertAdjacentElement('afterend', nav);
            ABAS.forEach(([key, rotulo, ids]) => {
                const pane = document.createElement('div');
                pane.dataset.abaPane = key;
                pane.style.display = 'none';
                ids.forEach(id => { const el = document.getElementById(id); if (el) pane.appendChild(el); });
                cont.appendChild(pane);
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'admin-app-aba';
                btn.dataset.abaBtn = key;
                btn.textContent = rotulo;
                btn.style.display = 'none';
                btn.onclick = () => mostrarAba(key, true);
                nav.appendChild(btn);
            });
            [...cont.children].filter(el => el.id && el.id.startsWith('secao-')).forEach(el => {
                const destino = el.classList.contains('card-root') ? 'ti' : 'outros';
                obterPaneAdmin(destino).appendChild(el);
            });
            const seletor = document.createElement('div');
            seletor.id = 'admin-app-seletor';
            seletor.className = 'admin-app-seletor';
            const info = document.createElement('div');
            const h3 = document.createElement('h3');
            h3.className = 'admin-app-subtitulo';
            h3.id = 'admin-app-grupo-titulo';
            const p = document.createElement('p');
            p.className = 'admin-app-texto';
            p.id = 'admin-app-ferramenta-atual';
            info.append(h3,p);
            const selecaoLabel = document.createElement('label');
            selecaoLabel.htmlFor = 'admin-app-escolha';
            selecaoLabel.className = 'form-label';
            selecaoLabel.textContent = 'Selecione a ferramenta';
            const select = document.createElement('select');
            select.id = 'admin-app-escolha';
            select.className = 'form-select';
            select.addEventListener('change', () => selecionarFerramentaAdmin(select.value, true));
            seletor.append(info,selecaoLabel,select);
            nav.insertAdjacentElement('afterend',seletor);
            const rodape = document.createElement('div');
            rodape.id = 'rodape-painel';
            rodape.className = 'text-center text-muted-custom small mt-4 mb-2';
            rodape.textContent = 'Grêmio Estudantil IFCE Crateús · versão ' + VERSAO_SISTEMA +
                ' · última atualização ' + DATA_ULTIMA_ATUALIZACAO;
            cont.appendChild(rodape);
        }
        function atualizarBuscaAdmin() {
            const caixa = document.getElementById('admin-app-resultados');
            const input = document.getElementById('admin-app-busca');
            if (!caixa || !input) return;
            const termo = input.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
            caixa.replaceChildren();
            caixa.hidden = termo.length < 2;
            if (termo.length < 2) return;
            const encontrados = [];
            ABAS.forEach(([key,rotulo]) => {
                ferramentasDaAbaAdmin(key).forEach(el => {
                    const rotuloItem = rotuloFerramentaAdmin(el.id);
                    if (rotuloItem.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').includes(termo))
                        encontrados.push({id: el.id, grupo:rotulo, label:rotuloItem});
                });
            });
            if (!encontrados.length) {
                const vazio = document.createElement('p');
                vazio.className = 'admin-app-texto m-0';
                vazio.textContent = 'Nenhuma ferramenta permitida com esse nome.';
                caixa.appendChild(vazio);
                return;
            }
            encontrados.slice(0,20).forEach(item => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'admin-app-busca-item';
                btn.textContent = item.label + ' · ' + item.grupo;
                btn.addEventListener('click', () => {
                    input.value = '';
                    caixa.hidden = true; caixa.replaceChildren();
                    irPara(item.id);
                });
                caixa.appendChild(btn);
            });
        }
        function selecionarFerramentaAdmin(id, rolar) {
            const alvo = document.getElementById(id);
            const pane = alvo && alvo.closest('[data-aba-pane]');
            if (!pane || !ferramentaVisivelAdmin(alvo)) return false;
            const chave = pane.dataset.abaPane;
            if (chave !== abaAtualApp) mostrarAba(chave, false);
            const permitidos = ferramentasDaAbaAdmin(chave);
            if (!permitidos.includes(alvo)) return false;
            ultimaFerramentaApp[chave] = id;
            pane.querySelectorAll(':scope > [id^="secao-"]').forEach(el => {
                el.classList.toggle('admin-app-ferramenta-oculta', el.id !== id);
            });
            const sel = document.getElementById('admin-app-escolha');
            if (sel) sel.value = id;
            const desc = document.getElementById('admin-app-ferramenta-atual');
            if (desc) desc.textContent = 'Aberto: ' + rotuloFerramentaAdmin(id);
            if (rolar) {
                const selecao = document.getElementById('admin-app-seletor');
                if (selecao) selecao.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return true;
        }
        function mostrarAba(key, rolar) {
            const pane = obterPaneAdmin(key);
            if (!pane) return;
            const visiveis = ferramentasDaAbaAdmin(key);
            if (!visiveis.length) return;
            abaAtualApp = key;
            document.querySelectorAll('[data-aba-pane]').forEach(p => {
                p.style.display = p.dataset.abaPane === key ? 'block' : 'none';
            });
            document.querySelectorAll('[data-aba-btn]').forEach(b => {
                const ativo = b.dataset.abaBtn === key;
                b.classList.toggle('ativo', ativo);
                b.setAttribute('aria-current', ativo ? 'page' : 'false');
            });
            const titulo = document.getElementById('admin-app-grupo-titulo');
            const grupo = ABAS.find(a=>a[0]===key);
            if (titulo) titulo.textContent = grupo ? grupo[1] : 'Ferramentas';
            const seletor = document.getElementById('admin-app-escolha');
            if (seletor) {
                seletor.replaceChildren();
                visiveis.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = rotuloFerramentaAdmin(c.id);
                    seletor.appendChild(opt);
                });
            }
            const anterior = ultimaFerramentaApp[key];
            const inicial = visiveis.some(c => c.id === anterior) ? anterior : visiveis[0].id;
            selecionarFerramentaAdmin(inicial, false);
            if (rolar) document.getElementById('abas-painel').scrollIntoView({ behavior:'smooth', block:'start' });
        }
        function atualizarAbas() {
            if (!document.getElementById('abas-painel')) return;
            let primeira = null;
            document.querySelectorAll('[data-aba-btn]').forEach(b => {
                const visiveis = ferramentasDaAbaAdmin(b.dataset.abaBtn);
                b.style.display = visiveis.length ? '' : 'none';
                if (visiveis.length && !primeira) primeira = b.dataset.abaBtn;
            });
            if (!primeira) return;
            const atual = abaAtualApp && ferramentasDaAbaAdmin(abaAtualApp).length ? abaAtualApp : primeira;
            mostrarAba(atual, false);
            atualizarBuscaAdmin();
        }
        function irPara(id) {
            const el = document.getElementById(id);
            if (!el || !selecionarFerramentaAdmin(id, false)) return;
            setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block:'start' }), 60);
        }
        montarAbas();
