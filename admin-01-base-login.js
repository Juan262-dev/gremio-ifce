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

        
        
/* ================= PDF: RODAPÉ PADRÃO ================= */
        function pdfFinalizar(doc, arquivo) {
            const total = doc.getNumberOfPages();
            const hoje = new Date().toLocaleDateString('pt-BR');
            for (let i = 1; i <= total; i++) {
                doc.setPage(i);
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(110);
                doc.text(`Grêmio Estudantil IFCE Crateús · gerado em ${hoje}`, 20, 290);
                doc.text(`Página ${i} de ${total}`, 190, 290, { align: 'right' });
                doc.setTextColor(0);
            }
            doc.save(arquivo);
        }

        
        
        
        
