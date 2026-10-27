        const firebaseConfig = {
            apiKey: "AIzaSyBBa_WlE4hLxLqHt6yRdw0JTeRS_3pDgPo",
            authDomain: "gremioifce-92540.firebaseapp.com",
            projectId: "gremioifce-92540",
            storageBucket: "gremioifce-92540.appspot.com",
            messagingSenderId: "30782912737",
            appId: "1:30782912737:web:364c0d7ff022"
        };

        // App separado ('admin'): o login do painel fica isolado do login dos alunos (index.html).
        // Sem isso, entrar no portal do aluno no mesmo navegador derrubava a sessão do painel.
        const adminApp = firebase.initializeApp(firebaseConfig, 'admin');
        const auth = adminApp.auth();
        const db = adminApp.firestore();
        const TS = firebase.firestore.FieldValue.serverTimestamp;

        let intervaloContador = null;
        let unsubs = [];
        let painelAberto = false;
        let emailLogado = '';
        let cacheAlunos = [], cacheSugestoes = [], cachePunidos = [], cachePautas = [], cacheEventos = {};

        // IMPORTANTE: isto é só para exibir a interface. A proteção de verdade
        // precisa estar nas Firestore Security Rules (veja firestore.rules).
        const ROOT_EMAIL = 'kevin.silva10@aluno.ifce.edu.br';
        let nivelDoPainel = 'admin', painelCongelado = false;
        const ROTULO_NIVEL = { desenvolvedor: 'Desenvolvedor (fonte)', emergencia: 'Conta de emergência', secretaria: 'Secretaria', mulheres: 'Diretora de Mulheres', generos: 'Diretor(a) de Gêneros', admin: 'Presidência', membro: 'Esportes/Eventos', marketing: 'Marketing', tesouraria: 'Tesouraria', cultura: 'Cultura', racial: 'Igualdade Racial' };
        const cargosIniciais = {
            "kevin.silva10@aluno.ifce.edu.br": { nome: "Juan Kevin", cargo: "TI (Suporte Técnico)", nivel: "admin" },
            "evelly@ifce.edu.br": { nome: "Evelly", cargo: "Presidente", nivel: "admin" },
            "maria@ifce.edu.br": { nome: "Maria Eduarda", cargo: "Vice-Presidente", nivel: "admin" },
            "cecilia@aluno.ifce.edu.br": { nome: "Cecília", cargo: "Diretora de Esportes", nivel: "membro" },
            "marketing1@ifce.edu.br": { nome: "Diretor(a) de Marketing 1", cargo: "Diretor(a) de Marketing", nivel: "marketing" },
            "marketing2@ifce.edu.br": { nome: "Diretor(a) de Marketing 2", cargo: "Diretor(a) de Marketing", nivel: "marketing" }
        };

        const modulosSistema = [
            { id: 'secao-resumo', label: 'Resumo', icon: 'bi-speedometer2', niveisPermitidos: ['admin'] },
            { id: 'secao-tarefas', label: 'Minhas Tarefas', icon: 'bi-check2-square', niveisPermitidos: ['admin', 'membro', 'marketing', 'tesouraria', 'cultura', 'racial', 'secretaria', 'mulheres', 'generos'] },
            { id: 'secao-tarefas-admin', label: 'Atribuir Tarefas', icon: 'bi-list-task', niveisPermitidos: ['admin'] },
            { id: 'secao-documentos', label: 'Documentos e ofícios', icon: 'bi-folder2-open', niveisPermitidos: ['admin', 'secretaria'] },
            { id: 'secao-reunioes', label: 'Reuniões', icon: 'bi-calendar2-week', niveisPermitidos: ['admin', 'secretaria'] },
            { id: 'secao-presenca', label: 'Lista de presença', icon: 'bi-person-check', niveisPermitidos: ['admin', 'secretaria'] },
            { id: 'secao-mu-campanhas', label: 'Campanhas e ações (mulheres)', icon: 'bi-clipboard-check', niveisPermitidos: ['admin', 'mulheres'] },
            { id: 'secao-mu-calendario', label: 'Calendário de datas (mulheres)', icon: 'bi-clipboard-check', niveisPermitidos: ['admin', 'mulheres'] },
            { id: 'secao-ge-glossario', label: 'Glossário de gênero', icon: 'bi-clipboard-check', niveisPermitidos: ['admin', 'generos'] },
            { id: 'secao-ge-debates', label: 'Pauta de debates (gênero)', icon: 'bi-clipboard-check', niveisPermitidos: ['admin', 'generos'] },
            { id: 'secao-ge-metas', label: 'Metas da área (gênero)', icon: 'bi-clipboard-check', niveisPermitidos: ['admin', 'generos'] },
            { id: 'secao-mu-canais', label: 'Canais de apoio', icon: 'bi-clipboard-check', niveisPermitidos: ['admin', 'mulheres'] },
            { id: 'secao-mu-indicadores', label: 'Participação por mês (mulheres)', icon: 'bi-clipboard-check', niveisPermitidos: ['admin', 'mulheres'] },
            { id: 'secao-ge-indicadores', label: 'Participação por mês (gênero)', icon: 'bi-clipboard-check', niveisPermitidos: ['admin', 'generos'] },
            { id: 'secao-div-atividades', label: 'Atividades e presença (diversidade)', icon: 'bi-people-fill', niveisPermitidos: ['admin', 'mulheres', 'generos'] },
            { id: 'secao-div-materiais', label: 'Materiais de apoio (diversidade)', icon: 'bi-journal-bookmark', niveisPermitidos: ['admin', 'mulheres', 'generos'] },
            { id: 'secao-div-rel', label: 'Relatório da diretoria (diversidade)', icon: 'bi-file-earmark-pdf', niveisPermitidos: ['admin', 'mulheres', 'generos'] },
            { id: 'secao-agenda', label: 'Agenda compartilhada', icon: 'bi-calendar3', niveisPermitidos: ['admin', 'membro', 'marketing', 'tesouraria', 'cultura', 'racial', 'secretaria', 'mulheres', 'generos'] },
            { id: 'secao-sec-alunos', label: 'Alunos (somente leitura)', icon: 'bi-people', niveisPermitidos: ['admin', 'secretaria'] },
            { id: 'secao-rel-sec', label: 'Relatório da secretaria', icon: 'bi-file-earmark-pdf', niveisPermitidos: ['admin', 'secretaria'] },
            { id: 'secao-avisos-wpp', label: 'TI: Avisos por WhatsApp', icon: 'bi-whatsapp', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-atas', label: 'Atas de Reunião', icon: 'bi-journal-richtext', niveisPermitidos: ['admin', 'secretaria'] },
            { id: 'secao-relatorio-mensal', label: 'Relatório do Mês', icon: 'bi-file-earmark-bar-graph', niveisPermitidos: ['admin'] },
            { id: 'secao-relatorio', label: 'Relatório de Atividades', icon: 'bi-file-text', niveisPermitidos: ['admin', 'marketing', 'membro', 'tesouraria', 'cultura', 'racial', 'secretaria', 'mulheres', 'generos'] },
            { id: 'secao-divulgacao', label: 'Calendário de Divulgação', icon: 'bi-calendar2-week', niveisPermitidos: ['marketing'] },
            { id: 'secao-flashcards', label: 'Cartões de revisão', icon: 'bi-card-text', niveisPermitidos: ['admin'] },
            { id: 'secao-questoes', label: 'Banco de questões', icon: 'bi-patch-question', niveisPermitidos: ['admin'] },
            { id: 'secao-estudos', label: 'Estudos e Provas', icon: 'bi-journal-bookmark', niveisPermitidos: ['admin'] },
            { id: 'secao-videos', label: 'Vídeos de Aula Prática', icon: 'bi-camera-video', niveisPermitidos: ['marketing'] },
            { id: 'secao-caixa', label: 'Caixa do Grêmio', icon: 'bi-cash-coin', niveisPermitidos: ['tesouraria'] },
            { id: 'secao-cultura', label: 'Atividades Culturais', icon: 'bi-palette', niveisPermitidos: ['cultura'] },
            { id: 'secao-racial', label: 'Igualdade Racial', icon: 'bi-balance-scale', niveisPermitidos: ['racial'] },
            { id: 'secao-tes-orc', label: 'Orçamento por evento', icon: 'bi-wallet2', niveisPermitidos: ['tesouraria'] },
            { id: 'secao-tes-contas', label: 'Contas a pagar', icon: 'bi-receipt', niveisPermitidos: ['tesouraria'] },
            { id: 'secao-racial-enc', label: 'Encaminhamentos', icon: 'bi-send', niveisPermitidos: ['racial'] },
            { id: 'secao-racial-apoio', label: 'Material de apoio', icon: 'bi-journal-text', niveisPermitidos: ['racial'] },
            { id: 'secao-ti-monitor', label: 'TI: Monitoramento', icon: 'bi-activity', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-rel-tes', label: 'Relatório da Tesouraria', icon: 'bi-file-earmark-bar-graph', niveisPermitidos: ['tesouraria'] },
            { id: 'secao-rel-cult', label: 'Relatório da Cultura', icon: 'bi-file-earmark-bar-graph', niveisPermitidos: ['cultura'] },
            { id: 'secao-rel-racial', label: 'Relatório Racial', icon: 'bi-file-earmark-bar-graph', niveisPermitidos: ['racial'] },
            { id: 'secao-artes', label: 'Banco de Artes', icon: 'bi-images', niveisPermitidos: ['marketing'] },
            { id: 'secao-mural', label: 'Mural de Avisos & Vídeos', icon: 'bi-megaphone', niveisPermitidos: ['admin', 'marketing'] },
            { id: 'secao-enquetes-criar', label: 'Criar Enquete', icon: 'bi-bar-chart-plus', niveisPermitidos: ['admin', 'marketing', 'membro', 'tesouraria', 'cultura', 'racial', 'secretaria', 'mulheres', 'generos'] },
            { id: 'secao-enquetes-lista', label: 'Ver Enquetes', icon: 'bi-graph-up', niveisPermitidos: ['admin', 'marketing', 'membro', 'tesouraria', 'cultura', 'racial', 'secretaria', 'mulheres', 'generos'] },
            { id: 'secao-jogos', label: 'Placar e Classificação', icon: 'bi-trophy', niveisPermitidos: ['membro'] },
            { id: 'secao-eventos', label: 'Eventos e Torneios', icon: 'bi-calendar-event', niveisPermitidos: ['admin', 'membro'] },
            { id: 'secao-materiais', label: 'Gestão de Materiais', icon: 'bi-box-seam', niveisPermitidos: ['membro'] },
            { id: 'secao-alunos-cadastrar', label: 'Cadastrar Aluno', icon: 'bi-person-plus', niveisPermitidos: ['admin'] },
            { id: 'secao-alunos-lista', label: 'Alunos Cadastrados', icon: 'bi-people', niveisPermitidos: ['admin'] },
            { id: 'secao-sugestoes', label: 'Sugestões dos Alunos', icon: 'bi-lightbulb', niveisPermitidos: ['admin'] },
            { id: 'secao-pautas', label: 'Pautas e Reivindicações', icon: 'bi-signpost-split', niveisPermitidos: ['admin'] },
            { id: 'secao-punicoes', label: 'Aplicar Punições', icon: 'bi-shield-exclamation', niveisPermitidos: ['admin'] },
            { id: 'secao-diretoria', label: 'Diretoria e Cargos', icon: 'bi-person-badge', niveisPermitidos: ['admin'] },
            { id: 'secao-auditoria', label: 'Log de Auditoria', icon: 'bi-journal-text', niveisPermitidos: [] },
            { id: 'secao-ajuda', label: 'Preciso de ajuda', icon: 'bi-life-preserver', niveisPermitidos: ['admin', 'membro', 'marketing', 'tesouraria', 'cultura', 'racial', 'secretaria', 'mulheres', 'generos'] },
            { id: 'secao-guia', label: 'Guia rápido', icon: 'bi-book', niveisPermitidos: ['admin', 'membro', 'marketing', 'tesouraria', 'cultura', 'racial', 'secretaria', 'mulheres', 'generos'] },
            { id: 'secao-novidades', label: 'Novidades do sistema', icon: 'bi-stars', niveisPermitidos: ['admin', 'membro', 'marketing', 'tesouraria', 'cultura', 'racial', 'secretaria', 'mulheres', 'generos'] },
            { id: 'secao-ti-alertas', label: 'TI: Central de alertas', icon: 'bi-bell', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-utilitarios', label: 'TI: Utilitários', icon: 'bi-puzzle', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-dados', label: 'TI: Dados e conformidade', icon: 'bi-database', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-testes', label: 'TI: Roteiro de testes', icon: 'bi-clipboard-check', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-manual', label: 'TI: Manual do TI', icon: 'bi-book-half', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-controle', label: 'TI: Controle do painel', icon: 'bi-toggles', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-analise', label: 'TI: Análise e relatórios', icon: 'bi-graph-up-arrow', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-comunic', label: 'TI: Comunicação e termo', icon: 'bi-megaphone', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-avancado', label: 'TI: Manutenção avançada', icon: 'bi-wrench-adjustable', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-chamados', label: 'TI: Pedidos de ajuda', icon: 'bi-envelope-paper', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-ajuda', label: 'TI: Ajudar os cargos', icon: 'bi-people', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti', label: 'Ferramentas de TI', icon: 'bi-tools', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-suporte', label: 'TI: Suporte e Monitoramento', icon: 'bi-life-preserver', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-ti-portal', label: 'TI: Alunos e Portal', icon: 'bi-sliders', niveisPermitidos: ['admin'], soRaiz: true },
            { id: 'secao-nova-gestao', label: 'Nova Gestão', icon: 'bi-arrow-repeat', niveisPermitidos: ['admin'], soRaiz: true }
        ];

        /* ================= UTILITÁRIOS ================= */

        // Escapa texto vindo do banco (evita XSS). Seguro também dentro de atributos.
        function esc(s) {
            return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        }

        function fmtData(ts) {
            if (!ts || !ts.toDate) return '';
            const d = ts.toDate();
            return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        function toast(msg, tipo = 'success') {
            const c = document.getElementById('toast-container');
            const el = document.createElement('div');
            el.className = `toast align-items-center text-bg-${tipo} border-0`;
            el.setAttribute('role', 'alert');
            el.innerHTML = `<div class="d-flex"><div class="toast-body fw-bold">${esc(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
            c.appendChild(el);
            el.addEventListener('hidden.bs.toast', () => el.remove());
            new bootstrap.Toast(el, { delay: 3500 }).show();
        }
        const mostrarAlertaSucesso = msg => toast(msg, 'success');
        const erroDB = (e, onde) => {
            console.error(onde, e);
            const cod = e && e.code ? e.code : '';
            const extra = (emailLogado === ROOT_EMAIL && cod) ? ` (${cod}${onde ? ' em ' + onde : ''})` : '';
            toast('Não foi possível concluir agora. Tente de novo.' + extra, 'danger');
        };

        function confirmar(msg) {
            return new Promise(resolve => {
                const el = document.getElementById('modalConfirmar');
                const btn = document.getElementById('modalConfirmarOk');
                document.getElementById('modalConfirmarTexto').textContent = msg;
                const modal = bootstrap.Modal.getOrCreateInstance(el);
                let ok = false;
                const onOk = () => { ok = true; modal.hide(); };
                const onHide = () => {
                    btn.removeEventListener('click', onOk);
                    el.removeEventListener('hidden.bs.modal', onHide);
                    resolve(ok);
                };
                btn.addEventListener('click', onOk);
                el.addEventListener('hidden.bs.modal', onHide);
                modal.show();
            });
        }

        function registrarAcao(acao, detalhes) {
            const u = auth.currentUser;
            db.collection('acoes_admin').add({
                acao: acao,
                detalhes: detalhes || '',
                autor: u ? u.email : 'desconhecido',
                em: TS()
            }).catch(() => {});
        }

        function ouvir(query, callback) {
            unsubs.push(query.onSnapshot(callback, err => {
                console.error(err);
                if (painelCongelado) return;
                let onde = '';
                try { onde = query._delegate._query.path.canonicalString(); } catch (_) {}
                toast('Não foi possível carregar estes dados agora.' + (emailLogado === ROOT_EMAIL && err && err.code ? ' (' + err.code + ')' : ''), 'danger');
            }));
        }
        function limparListeners() {
            unsubs.forEach(u => { try { u(); } catch (e) {} });
            unsubs = [];
        }

        function baixarCSV(nomeArquivo, linhas) {
            const celula = v => {
                let t = String(v ?? '');
                if (/^[=+\-@]/.test(t)) t = "'" + t; // evita injeção de fórmula no Excel
                return '"' + t.replace(/"/g, '""') + '"';
            };
            const csv = '\uFEFF' + linhas.map(l => l.map(celula).join(';')).join('\n');
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            const a = document.createElement('a');
            a.href = url; a.download = nomeArquivo;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        }

        /* ================= LOGIN / SESSÃO ================= */

        function mostrarErroLogin(msg) {
            const erroDiv = document.getElementById('login-erro');
            erroDiv.textContent = msg;
            erroDiv.classList.remove('d-none');
        }

        function fazerLoginAdmin() {
            const email = document.getElementById('admin-email').value.trim().toLowerCase();
            const senha = document.getElementById('admin-senha').value;
            document.getElementById('login-erro').classList.add('d-none');

            if (!email || !senha) { mostrarErroLogin("Digite o e-mail e a senha!"); return; }

            // O painel abre pelo onAuthStateChanged abaixo
            auth.signInWithEmailAndPassword(email, senha).catch(error => {
                console.error("Erro de login:", error.code);
                mostrarErroLogin("Acesso negado: e-mail não cadastrado ou senha incorreta!");
            });
        }

        document.getElementById('admin-senha').addEventListener('keydown', e => { if (e.key === 'Enter') fazerLoginAdmin(); });

        auth.onAuthStateChanged(user => {
            if (!user) { if (painelAberto) location.reload(); return; }
            if (painelAberto) return;
            const email = (user.email || '').toLowerCase();
            const semCargo = () => { mostrarErroLogin("Este e-mail não tem cargo no painel. Peça à presidência para cadastrar."); auth.signOut(); };
            db.collection('cargos').doc(email).get().then(doc => {
                let dados = doc.exists ? doc.data() : null;
                if (!dados && email === ROOT_EMAIL) dados = cargosIniciais[ROOT_EMAIL];
                if (dados && dados.nivel === 'desenvolvedor') {
                    // Nível da fonte: funciona como Presidência no painel; o rótulo muda conforme quem é
                    const fonteSub = dados.fonteAte && dados.fonteAte.toMillis && dados.fonteAte.toMillis() > Date.now();
                    if (email === ROOT_EMAIL) dados = { ...dados, nivel: 'admin', cargoExibicao: 'Desenvolvedor (fonte)' };
                    else if (fonteSub) dados = { ...dados, nivel: 'admin', cargoExibicao: 'Fonte substituta' };
                    else dados = null;
                }
                if (dados && dados.nivel !== 'desenvolvedor') {
                    const extras = Array.isArray(dados.niveisExtras) ? dados.niveisExtras : [];
                    const todos = [dados.nivel, ...extras];
                    const escolhido = localStorage.getItem('cargo_em_uso_' + email);
                    dados = { ...dados, cargosDisponiveis: todos, nivel: (escolhido && todos.includes(escolhido)) ? escolhido : dados.nivel };
                }
                if (!dados) { semCargo(); return; }
                verificarAcessoEAbirPainel(email, dados);
            }).catch(() => {
                if (email === ROOT_EMAIL) verificarAcessoEAbirPainel(email, cargosIniciais[ROOT_EMAIL]); else semCargo();
            });
        });

        function verificarAcessoEAbirPainel(emailUsuario, dadosCargo) {
            if (painelAberto) return;
            if (dadosCargo && dadosCargo.cargosDisponiveis && dadosCargo.cargosDisponiveis.length > 1 && !document.getElementById('seletor-cargo')) {
                const cab = document.getElementById('user-role-display').parentElement;
                const sel = document.createElement('select');
                sel.id = 'seletor-cargo'; sel.className = 'form-select form-select-sm mt-1'; sel.style.maxWidth = '260px';
                sel.innerHTML = dadosCargo.cargosDisponiveis.map(n => `<option value="${n}" ${n === dadosCargo.nivel ? 'selected' : ''}>${esc(ROTULO_NIVEL[n] || n)}</option>`).join('');
                sel.onchange = () => { localStorage.setItem('cargo_em_uso_' + emailUsuario, sel.value); location.reload(); };
                cab.appendChild(sel);
            }
            if (emailUsuario === ROOT_EMAIL) {
                const sel = document.getElementById('dir-nivel');
                if (sel && !sel.querySelector('option[value="desenvolvedor"]')) sel.insertAdjacentHTML('afterbegin', '<option value="desenvolvedor">Desenvolvedor (fonte)</option>');
            }
            painelAberto = true;
            db.collection('membros_punidos').doc(emailUsuario).get().then(docPunido => {
                let dadosPunicao = null;
                if (docPunido.exists) {
                    const p = docPunido.data();
                    const expiraEm = p.expiraEm ? p.expiraEm.toMillis() : 0;
                    if (expiraEm > Date.now()) dadosPunicao = p;
                }
                abrirPainelAdmin(emailUsuario, dadosCargo, dadosPunicao);
            }).catch(() => abrirPainelAdmin(emailUsuario, dadosCargo, null));
        }

        function abrirPainelAdmin(emailUsuario, dadosCargo, dadosPunicao) {
            document.getElementById('tela-login-admin').style.display = 'none';
            document.getElementById('painel-admin').style.display = 'block';
            document.getElementById('btn-logout-admin').classList.remove('d-none');

            const dadosUsuario = dadosCargo;
            emailLogado = emailUsuario;
            document.getElementById('user-name-display').textContent = dadosUsuario.nome;
            document.getElementById('user-role-display').textContent = dadosUsuario.cargoExibicao || dadosUsuario.cargo;

            if (dadosPunicao) {
                document.getElementById('conteudo-painel-geral').classList.add('d-none');
                document.getElementById('painel-bloqueio-punicao').classList.remove('d-none');
                document.getElementById('punicao-info-tipo').textContent = dadosPunicao.punicao;
                document.getElementById('punicao-info-motivo').textContent = dadosPunicao.motivo;
                iniciarContadorRegressivo(dadosPunicao.expiraEm.toMillis());
                return;
            }

            document.getElementById('btn-menu-lateral').classList.remove('d-none');
            renderizarMenuLateral(dadosUsuario);
            renderizarBarraInferior(dadosUsuario.nivel);
            registrarAcessoPainel(dadosUsuario);
            resetarOpcoes();

            const nivel = dadosUsuario.nivel;
            if (emailUsuario === ROOT_EMAIL) { document.getElementById('secao-nova-gestao').style.display = 'block'; document.getElementById('secao-ti').style.display = 'block'; document.querySelectorAll('.card-root').forEach(c => c.style.display = 'block'); carregarManutencao(); carregarPortalConfig(); carregarNotasTI(); carregarChamadosTI(); carregarChecklistTI(); verificarLembreteBackup(); carregarTermoTI(); carregarRoteiroTI(); preencherEditor(); carregarEleicaoTI(); carregarPendentesTI(); carregarPlantaoTI(); carregarVersoesTI(); carregarExclusoesTI(); carregarFontesTI(); carregarAlertasTI(); carregarPendenciasTI(); carregarTravasUI(); }
            // Cada cargo vê só o que precisa; o e-mail raiz (TI) vê tudo.
            nivelDoPainel = nivel;
            const raiz = emailUsuario === ROOT_EMAIL;
            nivelReal = nivel;
            if (nivel === 'emergencia') { carregarPendentesTI(); }
            document.querySelectorAll('[data-niveis]').forEach(c => {
                c.style.display = (raiz || c.dataset.niveis.split(',').includes(nivel)) ? 'block' : 'none';
            });
            carregarAvisoTI();
            atualizarAbas();
            const ver = id => { const c = document.getElementById(id); return !!c && c.style.display === 'block'; };
            [
                ['secao-resumo', carregarResumo], ['secao-tarefas', carregarMinhasTarefas], ['secao-tarefas-admin', carregarTarefasAdmin],
                ['secao-atas', carregarAtas], ['secao-documentos', carregarDocumentos], ['secao-sec-alunos', carregarSecAlunos], ['secao-agenda', carregarAgenda], ['secao-avaliacoes', carregarAvaliacoesAdmin], ['secao-convites', carregarConvitesAdmin], ['secao-eventos', prepararEventosRestritos], ['secao-avisos-wpp', carregarAvisosWpp], ['secao-div-atividades', carregarAtividadesDiv], ['secao-div-materiais', carregarMateriaisDiv], ['secao-div-rel', prepararRelDiv], ['secao-mu-campanhas', () => carregarCrud('mu-campanhas')], ['secao-mu-calendario', () => carregarCrud('mu-calendario')], ['secao-ge-glossario', () => carregarCrud('ge-glossario')], ['secao-ge-debates', () => carregarCrud('ge-debates')], ['secao-ge-metas', () => carregarCrud('ge-metas')], ['secao-reunioes', carregarReunioes], ['secao-presenca', carregarPresenca], ['secao-divulgacao', carregarDivulgacoes], ['secao-artes', carregarArtes], ['secao-caixa', carregarCaixa], ['secao-cultura', () => carregarAtividades('cultura')], ['secao-racial', () => { carregarAtividades('racial'); carregarPautasRacial(); }], ['secao-tes-orc', carregarOrcamentos], ['secao-tes-contas', carregarContas], ['secao-racial-enc', carregarEncaminhamentos], ['secao-racial-apoio', carregarApoio], ['secao-novidades', carregarNovidades], ['secao-ajuda', carregarMeusChamados], ['secao-videos', carregarVideos], ['secao-estudos', carregarEstudosAdmin], ['secao-questoes', carregarQuestoesAdmin], ['secao-flashcards', carregarFlashcardsAdmin],
                ['secao-mural', carregarAvisosAdmin], ['secao-enquetes-lista', carregarEnquetesAdmin],
                ['secao-alunos-lista', carregarAlunos], ['secao-sugestoes', carregarSugestoesAdmin], ['secao-pautas', carregarPautasAdmin],
                ['secao-punicoes', carregarMembrosPunidosAdmin], ['secao-punicoes', carregarEmailsPunicao], ['secao-auditoria', carregarAuditoria], ['secao-diretoria', carregarDiretoria],
                ['secao-materiais', carregarMateriaisAdmin], ['secao-jogos', carregarJogosAdmin], ['secao-jogos', carregarClassificacao],
                ['secao-eventos', carregarEventosAdmin]
            ].forEach(([id, fn]) => { if (ver(id)) fn(); });
        }

        const atalhosPorNivel = {
            tesouraria: ['secao-caixa', 'secao-tarefas', 'secao-ajuda'],
            cultura: ['secao-cultura', 'secao-tarefas', 'secao-enquetes-lista', 'secao-ajuda'],
            racial: ['secao-racial', 'secao-tarefas', 'secao-enquetes-lista', 'secao-ajuda'],
            admin: ['secao-resumo', 'secao-tarefas', 'secao-pautas', 'secao-sugestoes'],
            membro: ['secao-tarefas', 'secao-jogos', 'secao-eventos', 'secao-materiais'],
            marketing: ['secao-tarefas', 'secao-mural', 'secao-divulgacao', 'secao-enquetes-lista']
        };
        const nomesCurtos = {
            'secao-caixa': 'Caixa', 'secao-cultura': 'Cultura', 'secao-racial': 'Igualdade', 'secao-ajuda': 'Ajuda',
            'secao-resumo': 'Resumo', 'secao-tarefas': 'Tarefas', 'secao-pautas': 'Pautas', 'secao-sugestoes': 'Sugestões',
            'secao-jogos': 'Jogos', 'secao-eventos': 'Eventos', 'secao-materiais': 'Materiais', 'secao-mural': 'Mural',
            'secao-divulgacao': 'Divulgação', 'secao-enquetes-lista': 'Enquetes'
        };
        let observadorBarra = null;
        function renderizarBarraInferior(nivel) {
            const bar = document.getElementById('bottom-nav');
            bar.innerHTML = '';
            if (observadorBarra) observadorBarra.disconnect();
            observadorBarra = new IntersectionObserver(entradas => {
                entradas.forEach(en => {
                    if (en.isIntersecting) bar.querySelectorAll('button[data-alvo]').forEach(b => b.classList.toggle('ativo', b.dataset.alvo === en.target.id));
                });
            }, { rootMargin: '-35% 0px -55% 0px' });
            (atalhosPorNivel[nivel] || []).forEach(id => {
                const m = modulosSistema.find(x => x.id === id);
                const el = document.getElementById(id);
                if (!m || !el || el.style.display === 'none') return;
                const b = document.createElement('button');
                b.type = 'button'; b.dataset.alvo = id;
                b.innerHTML = `<i class="bi ${m.icon}"></i><span>${esc(nomesCurtos[id] || m.label)}</span>`;
                b.onclick = () => irPara(id);
                bar.appendChild(b);
                observadorBarra.observe(el);
            });
            const mais = document.createElement('button');
            mais.type = 'button';
            mais.setAttribute('data-bs-toggle', 'offcanvas'); mais.setAttribute('data-bs-target', '#sidebarMenu');
            mais.innerHTML = '<i class="bi bi-list"></i><span>Mais</span>';
            bar.appendChild(mais);
            bar.style.display = 'flex';
        }

        function renderizarMenuLateral(dadosUsuario) {
            const containerMenu = document.getElementById('itensMenuNav');
            containerMenu.innerHTML = '';
            modulosSistema.filter(m => ((emailLogado === ROOT_EMAIL && !nivelPreview) || m.niveisPermitidos.includes(dadosUsuario.nivel)) && (!m.soRaiz || (emailLogado === ROOT_EMAIL && !nivelPreview)) && !(travas[m.id] === true && !(emailLogado === ROOT_EMAIL && !nivelPreview))).forEach(modulo => {
                const a = document.createElement('a');
                a.href = `#${modulo.id}`;
                a.className = 'list-group-item list-group-item-action bg-dark text-white border-secondary d-flex align-items-center gap-2 py-3';
                a.innerHTML = `<i class="bi ${modulo.icon} fs-5 text-success"></i> <span>${esc(modulo.label)}</span>`;
                a.onclick = e => {
                    e.preventDefault();
                    const el = document.getElementById(modulo.id);
                    if (el) irPara(m.id);
                    const inst = bootstrap.Offcanvas.getInstance(document.getElementById('sidebarMenu'));
                    if (inst) inst.hide();
                };
                containerMenu.appendChild(a);
            });
        }

        function iniciarContadorRegressivo(expiracaoMs) {
            if (intervaloContador) clearInterval(intervaloContador);
            intervaloContador = setInterval(() => {
                const distancia = expiracaoMs - Date.now();
                if (distancia <= 0) {
                    clearInterval(intervaloContador);
                    location.reload();
                    return;
                }
                const dias = Math.floor(distancia / 86400000);
                const horas = Math.floor((distancia % 86400000) / 3600000);
                const minutos = Math.floor((distancia % 3600000) / 60000);
                const segundos = Math.floor((distancia % 60000) / 1000);
                let t = dias > 0 ? `${dias}d ` : '';
                t += `${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m ${String(segundos).padStart(2, '0')}s`;
                document.getElementById('contador-regressivo-punicao').textContent = t;
            }, 1000);
        }

        // Retorna minutos, ou null se o formato for inválido
        function converterTextoParaMinutos(texto) {
            const m = texto.toLowerCase().trim().match(/^(\d+)\s*(min|h|d|sem|mes|ano)$/);
            if (!m) return null;
            const valor = parseInt(m[1], 10);
            if (valor <= 0) return null;
            const mult = { min: 1, h: 60, d: 1440, sem: 10080, mes: 43200, ano: 525600 }[m[2]];
            return valor * mult;
        }

        function fazerLogoutAdmin() {
            limparListeners();
            if (intervaloContador) clearInterval(intervaloContador);
            auth.signOut().then(() => location.reload());
        }

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
