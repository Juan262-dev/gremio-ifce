# Guia de implantação piloto — **proposta**, não instalador funcional

Este roteiro descreve **o que deverá ser implementado e validado antes da
primeira implantação em outra escola**. Não execute uma cópia do código atual
apenas trocando o `projectId`: os acessos, as regras e os textos ainda têm
dependências da instalação original.

## Etapa zero — autorização e preparação

- Confirmar direitos de uso do código, das imagens/ícones/materiais e
  a licença para redistribuição. A presença no GitHub não é uma licença.
- Confirmar com o autor o nome público correto para o crédito de criação;
  não extrair esse dado de listas de contas administrativas.
- Escolher uma escola piloto, obter autorização institucional para operar o
  serviço e definir quem responde por dados de estudantes e atendimento.
- Definir política de privacidade, retenção, exclusão e acesso, considerando
  que poderão existir dados de menores de idade.
- Testar tudo primeiro com **contas e dados fictícios**.

## 1. Criar a instância escolar

Para cada escola, criar repositório/deploy independentes com versão do
template, `slug` estável, domínio próprio e publicação controlada.

Arquivos previstos no **futuro template** (ainda não existem em produção):

```text
config/
  escola.json                 # marca, escola, Grêmio e módulos
  firebase.public.js          # config web da escola, NÃO credencial privada
  creditos-originais.js       # mantido pelo projeto-base, fora do editor escolar
scripts/
  validar-instalacao.cjs      # bloqueia config incompleta ou projeto IFCE
  preparar-manifestos.cjs     # nome, tema, ícones, escopo/URL
  preparar-regras.cjs         # parâmetros de segurança e primeiro administrador
```

Os exemplos em `exemplos/` não podem ser usados em produção: os domínios
são fictícios e os IDs Firebase de demonstração são distintos por escola.

## 2. Firebase de **cada** escola

Cada instalação precisa de um projeto Firebase **diferente**:
- Criar um projeto Firebase e registrar o aplicativo Web da escola.
- Ativar Authentication, Firestore e somente serviços realmente utilizados.
- Definir domínios de login autorizados e recuperação de senha.
- Escolher se a escola possui e-mail institucional. Caso não possua, desenhar
  um fluxo de verificação de e-mail e aprovação administrativa em vez de
  deixar o domínio IFCE como requisito.
- Separar credenciais de serviço: **Admin SDK e tokens privados nunca
  devem ser incluídos no site, repositório público ou arquivos JSON cliente**.
- Ativar políticas de acesso e monitoramento de custos/limites para
  evitar abuso de gravações ou tráfego.
- Preparar backup e restauração do Firestore e das configurações.

Não apontar qualquer instalação de outra escola ao projeto Firebase original.
Caso `firebase.public.js` falhe na validação, o futuro app deverá mostrar
"instalação não configurada" e **não conectar ao Firebase do IFCE**.

## 3. Autenticação e administrador inicial

O fluxo atual usa endereço de administrador raiz e lista de cargos iniciais
fixos, além de regras Firestore vinculadas ao mesmo identificador.

A futura implementação deve:

1. Remover do template essas contas iniciais e o identificador privilegiado
   da instalação de origem.
2. Definir um **provisionamento único** do primeiro administrador próprio
   da escola, executado de modo privilegiado pelo responsável técnico.
3. Criar cargos e permissões no Firestore da **nova escola**, com auditoria,
   sem criar usuários privilegiados a partir de botões públicos.
4. Configurar e verificar as regras Firestore **antes** de liberar cadastro.
5. Preservar o isolamento das sessões Portal/Admin no mesmo navegador.
6. Testar: aluno pendente, aluno ativo, aluno suspenso, membro, presidente,
   TI, conta sem cargo e administrador inicial.
7. Exigir autenticação multifator para contas privilegiadas quando
   disponível e compatível com o fluxo adotado.

A identidade de criador original do software é **crédito histórico** e
NÃO implica privilégio de acesso a instalações de outras escolas.
O mantenedor original não deve receber acesso automático aos dados de
estudantes de instituições participantes.

## 4. Personalização sem mexer na segurança

O futuro Painel Administrativo terá uma seção "Identidade do Grêmio" com
apenas as opções autorizadas:
- Escola/campus, nome do Grêmio, slogan e contato institucional público;
- Logo da escola, cor principal e banners aprovados;
- Textos da apresentação, links públicos e informações de eventos;
- Habilitação visual dos módulos que aquela instalação suporta.

Cada opção terá validação de tamanho, formato e URL segura. Os dados
editáveis devem ser tratados como texto; não interpretar HTML/JS enviado.
Os IDs de coleções, rules, permissões, credenciais Firebase, contas raiz,
domínios autorizados e **créditos de origem** ficam fora do editor.

Desabilitar a interface de um módulo não dá permissão de acesso. As regras
de segurança permanecem a autoridade para dados e ações.

## 5. Manifestos, serviço offline e hospedagem

- Gerar `manifest.webmanifest` e `manifest-admin.webmanifest` com
  nome, cor, escopo e ícones específicos da escola.
- Definir versão/cache do service worker por instalação, com testes para
  atualização e limpeza. Cuidado com o fallback offline para outros
  tipos de arquivo, evitando responder HTML a CSS/JS.
- Separar URL de publicação da escola e do IFCE, e configurar domínio
  autorizado no Firebase Auth.
- Não usar o GitHub Pages do IFCE como hospedagem das escolas parceiras.
- Não publicar novos deployments automaticamente pelo fluxo de PR.

## 6. Testes de aceite para duas escolas fictícias

**Instalação A:** projeto Firebase A, domínio A, gestor A e dados A.

**Instalação B:** projeto Firebase B, domínio B, gestor B e dados B.

Validar:
- Login, cadastro e aprovação **independentes** em A e B;
- A leitura de alunos, votações, carteirinhas e chamados de B não deve
  ser possível a partir da instalação A (e vice-versa);
- Administrador A não obtém privilégios em B;
- IDs de projeto, domínios e URLs nunca apontam para o IFCE;
- Publicar um aviso em A não altera conteúdo de B;
- Cada PWA instala a marca correta e recebe seus próprios arquivos;
- As duas interfaces mantêm funcionalidades e permissões;
- A atribuição original aparece nas duas instalações e não existe um
  campo no Admin que a altere;
- Backup/restauração com dados fictícios e exclusão de um aluno
  funcionam conforme a política definida;
- Segurança de enquetes/eventos revisada para não expor e-mails de
  estudantes em documentos de leitura coletiva.

**Só depois** de passar esses testes e obter autorizações/licença será
possível considerar o modelo pronto para escolas reais.

## 7. Atualizações e suporte

Cada escola mantém seu projeto Firebase, mas recebe correções do template
por versões identificadas, revisadas e testadas; não sincronizar dados
entre bancos. Antes de atualizar, criar backup e testar em staging.
O IFCE mantém sua versão de produção independente das instalações piloto.

> Este documento **não cria Firebase**, não muda regras, não executa
> instalação ou publicação e não torna o código atual genericamente seguro.
