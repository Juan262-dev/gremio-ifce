# IFCE Premium — redesign visual do Portal e do Painel Administrativo

Este documento acompanha o PR de redesign na branch `feature/redesign-ifce-premium`,
criada a partir da `main` após o merge da reorganização de navegação (PR #6).

> **Escopo**: identidade visual, estilos e apresentação. Não altera permissões,
> coleções do Firebase, rotinas de autenticação, nomes/IDs de seções nem
> operações administrativas. Publicação e merge dependem de autorização expressa.

## Direção visual

### Portal do Aluno — claro
- Fundo em branco-esverdeado, tipografia do sistema, verde institucional
  com contraste elevado e efeitos de luz suaves.
- Cabeçalho com identidade **Grêmio IFCE**, ícone de marca e descrição curta.
- Boas-vindas com hierarquia clara e nome do estudante (ID antigo preservado).
- Painel da aba atual com destaque verde-escuro, navegação secundária legível
  e cartões de acesso rápido.
- Barra inferior com os mesmos cinco destinos criados no PR #6.
- Cartões arredondados e arejados, formulários, listas, tabelas, botões,
  mensagens, notificações e feedback visual padronizados.
- Onboarding e login com o mesmo vocabulário visual (fundo escuro, marcas verdes).
- Laboratório Virtual reaproveita seus desenhos e tabelas interativos,
  recebendo apenas melhorias visuais nos contêineres.

### Painel Administrativo — escuro
- Fundo noturno, superfícies com profundidade, verde de destaque e boa
  distinção entre controles, títulos e informações.
- Barra superior institucional e ações de instalar, entrar/sair e abrir menu
  mantidas com seus IDs e eventos originais.
- Cartão de identificação de cargo, resumo, módulos, central de gestão,
  busca, navegação por categorias e seletor redesenhados.
- Tabelas, listas, formulários, alertas, modais, badges e ações com
  linguagem visual consistente; cores de erro/atenção preservadas.
- Menu lateral e navegação inferior mais legíveis em telas compactas.
- Tela de login com cartão e campos de alto contraste.

## Arquivos

- `premium-portal.css`: camada de estilo local do Portal.
- `premium-admin.css`: camada de estilo local do Painel.
- `index.html`, `admin.html`: carregam os estilos após os CSS existentes,
  aplicam classes de tema e atualizam marca e pequenos componentes visuais.
- `manifest.webmanifest`, `manifest-admin.webmanifest`: cores da barra
  do app instalado e tela inicial. Ícones, URLs de entrada e escopo preservados.
- `tests/premium.test.cjs`: verificações adicionais do redesign.
- `package.json`, `.github/workflows/firestore-rules.yml`: CI inclui
  o redesign junto aos testes já existentes.

Os CSS têm escopo específico de cada aplicativo e não carregam
bibliotecas adicionais, fontes externas, scripts ou dados de usuários.

## Integridade e segurança

- 19 seções originais do Portal e 84 divisões de módulos administrativos.
- Mesmas cinco abas no Portal, mesmas categorias e ferramentas no Admin.
- Sem alteração no arquivo `firestore.rules`.
- Sem alterações em credenciais, eventos de formulários, listeners Firebase,
  lógica de permissões/travas ou código de carteirinha.
- As regras que escondem seções restritas ou desabilitadas não são sobrescritas.
- O PR #5 (favoritos químicos) não está incluído.

## Testes

```sh
npm install
npm run test:ui
npm run test:lab
npm run test:rules
```

Os testes extras verificam:
1. Ordem de carregamento do CSS, escopo por aplicativo e ausência de recursos externos.
2. Integridade sintática dos estilos e scripts embutidos.
3. Permanência de seções, IDs e referências às regras de acesso.
4. Contraste de texto de pelo menos 4,5:1 para cores essenciais do tema.
5. Regras de adaptação ao celular, foco pelo teclado, impressão e movimento reduzido.
6. Configuração dos PWAs, incluindo ícones e endereços preservados.

### Checklist visual para revisão humana

- [ ] Validar página inicial e abas do Portal em celular (320, 375, 430 px).
- [ ] Navegar até Quiz, Laboratório, carteirinha, eventos e sugestões.
- [ ] Usar matrícula ativa e confirmar fluxo de edição de perfil.
- [ ] Verificar login, cadastro, termos e logout do Portal.
- [ ] Testar busca e seletor de módulos do Admin em celular e desktop.
- [ ] Abrir todas as categorias com cargos administrativos de teste.
- [ ] Confirmar que funções bloqueadas por cargo não aparecem nem são abertas.
- [ ] Validar status de formulário, erros, modais, badges e tabelas com dados.
- [ ] Testar zoom de 200%, navegação por teclado e leitores de tela.
- [ ] Verificar ambos os PWAs instalados e a aparência de impressão.
- [ ] Testar a conexão lenta/offline depois de visita online.

**Limite da validação automática:** testes de presença de elementos,
contraste de pares de cores e sintaxe não substituem inspeção visual real,
auditoria WCAG completa ou teste com contas de diferentes cargos.

Nenhum merge nem publicação devem ocorrer até a aprovação do responsável
pelo repositório.
