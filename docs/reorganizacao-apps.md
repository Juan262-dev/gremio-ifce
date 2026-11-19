# Reorganização das interfaces — Grêmio IFCE

## Objetivo
Reduzir a sensação de "tudo junto" no Portal do Aluno e no Painel Admin sem
remover funções, alterar IDs de seções, mudar permissões ou modificar o Firestore.

Código em `feature/reorganizacao-navegacao-apps`. Não publicar/mesclar sem
autorização explícita após revisão.

## Portal do Aluno

Antes: 12 botões no menu inferior e 19 seções principais dispostas em uma
página longa. Depois: **5 abas principais**, atalhos e uma ferramenta aberta
por vez. A seção original e seu código JavaScript continuam presentes.

| Aba | Conteúdos preservados |
|---|---|
| 🏠 Início | Avisos, aniversariantes e atalhos úteis |
| 📚 Estudos | Estudos e provas, Laboratório Virtual, Quiz, cartões e vídeos |
| 📅 Atividades | Eventos, jogos e empréstimo de materiais |
| 🤝 Grêmio | Enquetes, reivindicações, realizações, eleição e sugestões |
| 👤 Perfil | Carteirinha, perfil acadêmico, privacidade e ajuda |

- Um painel de navegação explica a área e oferece seleção de recursos.
- Atalhos rápidos: carteira, eventos, Laboratório Virtual e sugestões.
- Menus usam botões com texto, indicação de aba atual e foco de teclado.
- As notificações agora abrem o recurso correto dentro da aba respectiva.
- Cadastro de primeiro acesso e edição de perfil continuam acessíveis.
- Cartões desativados pela configuração remota continuam ocultos.
- Tela de login, manutenção, aceites de termos, Firestore e carteirinha
  preservados.

Arquivos: `portal-navegacao.js` e `index.html`.

## Painel Administrativo

Antes: oito abas com muitos cartões e menu lateral longo, sem agrupamento.
Depois: **Central de Gestão**, busca global e escolha da função ativa.

- O topo mostra busca por nome de ferramenta **entre as funções permitidas**.
- As categorias podem ser acessadas horizontalmente no celular.
- Um campo de seleção mostra todas as opções disponíveis na categoria.
- Apenas **uma ferramenta por vez** ocupa a área principal.
- O menu lateral agrupa os módulos e oferece busca com suporte a acentos.
- O menu inferior mostra até três atalhos por cargo, além do botão "Mais".
- A navegação chama `irPara` existente, ajustada para trocar a categoria
  antes de rolar para a ferramenta, preservando os links internos.
- Permissões, travas e cargos continuam sendo decididos pela lógica atual
  e pelas regras do Firebase, não pelo layout.
- Módulos sem categoria explícita continuam na aba "Outros", e recursos
  próprios de TI têm sua categoria específica.

Arquivos: `admin-01-base-login.js`, `admin-08-resumo-abas.js` e `admin.html`.

## Testes e validação

```sh
npm install
npm run test:ui
npm run test:lab
npm run test:rules
```

Os testes de UI conferem:
- lista das **19 seções** do Portal, sem perda nem duplicação;
- presença das cinco abas, atalhos e scripts;
- simulação de seleção de abas, recurso desativado e edição de perfil;
- permanência dos IDs no painel, incluindo os de TI e carteirinhas;
- rejeição de cartões bloqueados na seleção administrativa;
- integridade sintática dos scripts e tratamento básico de foco.

Os testes de Laboratório e das regras Firestore existentes continuam na CI.

### Verificações manuais necessárias antes da liberação
1. Testar **login/logout** dos dois apps em celular e desktop.
2. Percorrer todas as abas do Portal e conferir recursos desativados.
3. Abrir uma notificação e confirmar que a subseção correta aparece.
4. Editar o perfil, salvar e acessar a carteirinha digital.
5. Navegar em todos os módulos do Painel Admin com cargos de teste
   (Presidência, Marketing, Esportes, Secretaria, TI), sem revelar funções
   restritas para quem não tem permissão.
6. Testar travas de TI e modo "ver como".
7. Usar teclado e leitor de tela; testar larguras pequenas e PWA instalado.
8. Conferir menus mesmo em conexão lenta/offline.

## Segurança e implantação
Este PR **não modifica `firestore.rules`**, bancos, contas, documentos ou
dados de alunos. O código da interface não concede direitos adicionais.
As mudanças são de organização visual e navegação.

O PR #5, **favoritos de elementos químicos**, permanece fora deste escopo:
não foi mesclado e a reorganização foi criada a partir da `main`.

Nenhum merge ou deploy faz parte da implementação deste plano.
