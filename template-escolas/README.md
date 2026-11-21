# Template escolar independente — primeira base técnica

> **CANDIDATO TÉCNICO EM DESENVOLVIMENTO, NÃO LIBERADO PARA USO COM
> ESTUDANTES REAIS.** Esta pasta contém uma primeira implementação
> **separada** com Portal do Aluno, Painel Administrativo, autenticação
> por escola e um modelo de dados mais privado. **Não substitui nem
> reproduz todas as funções do Grêmio IFCE.**

## O que já funciona nesta base

- Portal e Painel de **uma escola** carregam o mesmo
  \`public/config/installation.json\` validado; não existe fallback
  para o Firebase IFCE.
- Cada escola tem um **projeto Firebase e hospedagem próprios**.
  A validação rejeita o ID do IFCE, exemplos \`demo-*,\` origem HTTPS
  divergente e configuração incompleta.
- O Portal usa a aplicação Firebase nomeada \`escola-portal\`; o Painel
  usa \`escola-admin\`, isolando suas sessões no navegador.
- E-mail verificado e **aprovação administrativa** são obrigatórios
  para o aluno ler avisos, eventos e enquetes.
- **Sugestões privadas:** estudantes aprovados enviam e consultam apenas
  suas próprias ideias; a gestão pode aprovar ou arquivar sugestões.
- Enquetes exigem alternativas textuais distintas com tamanho limitado,
  impedindo registros estruturados indevidos nos campos públicos.
- Criação de aviso, evento, enquete e aprovação de cadastro no Painel
  exige \`roles/{uid}\` ativo, registrado por administrador técnico
  **fora** da interface. O estudante não se promove.
- Os documentos gerais **não contêm listas de e-mails de estudantes**.
  Inscrições ficam em \`events/{eventId}/registrations/{uid}\`;
  votos em \`polls/{pollId}/votes/{uid}\`. Estudantes leem somente
  seus próprios registros; a gestão pode consultar registros privados.
- Os dois apps usam o mesmo arquivo de configuração **da escola**;
  a identidade original aparece em rodapés sem campo de edição.

## O que ainda NÃO está pronto

A base oferece **somente uma parte** dos recursos dos dois apps originais.
Não há migração de alunos do IFCE, eleições, carteira real, laboratório,
finanças, suporte, gestão de diretoria, controle completo de eventos,
ferramentas PWA nem instalador visual definitivo.

O template não foi liberado para escolas reais: continuam pendentes
**licença/atribuição e direitos de mídias**, revisão institucional de
privacidade e retenção (especialmente para menores), testes manuais
com duas instalações isoladas, recuperação, backup e auditoria de
segurança. Não faça deploy nem cadastre estudantes reais nesta fase.

**As regras atuais do IFCE em \`../firestore.rules\` NÃO foram modificadas
por esta implementação.** A exposição de listas de e-mails no modelo
antigo ainda exige migração segura e alterações coordenadas de código.

## Estrutura

\`\`\`text
template-escolas/
  public/
    index.html               # Portal mínimo da escola
    admin.html               # Painel mínimo da escola
    styles.css
    js/instance.js           # valida configuração antes de iniciar SDK
    js/portal.js
    js/admin.js
    config/
      installation.example.json  # propositalmente inválido
      installation.json          # criado pela escola; ignorado pelo Git
  firestore.rules            # regras exclusivas do template
  firebase.json              # hosting/rules e emulador próprio
  scripts/
    verify-instance.cjs      # valida formato e diferenças entre escolas
    bootstrap-admin.cjs      # cria primeiro gestor (somente operação manual)
\`\`\`

## Preparação (somente responsável técnico autorizado)

1. **Antes de qualquer piloto real:** resolver licença, autoria, direitos
   de imagens, privacidade, fluxos de exclusão e autorização da direção.
2. Criar uma cópia **separada** do template para cada escola. Não reutilizar
   hosting, usuários, banco de dados, contas de serviço ou Firebase IFCE.
3. No [Console Firebase](https://console.firebase.google.com/), criar
   projeto novo, ativar Authentication (e-mail/senha) e Cloud Firestore
   para aquela escola; registrar aplicativo Web e domínios autorizados.
   Preparar um endereço HTTPS exclusivo.
4. Copiar \`public/config/installation.example.json\` para
   \`public/config/installation.json\` **na cópia da própria escola** e
   substituir todos os exemplos por dados públicos da instalação:
   \`instanceId\`, \`siteOrigin\`, nome do Grêmio, contato público,
   cor e configuração **Web** do Firebase. Não adicionar nenhum outro
   campo, chave privada, credencial de serviço, token nem senha.
5. Validar a cópia da configuração com
   \`node template-escolas/scripts/verify-instance.cjs CAMINHO/installation.json\`.
   Para comparar duas escolas, passar **os dois caminhos**.
   **Isso só valida formato e campos**, não comprova que projetos reais
   são exclusivos, que as regras estão publicadas ou que dados estão seguros.
6. Revisar \`firestore.rules\` **desta pasta**, Auth, domínios, permissões
   e privacidade com o responsável técnico. Testar no emulador.
7. Preparar o primeiro gestor conforme seção abaixo, **somente depois
   das aprovações**. Não colocar o arquivo da conta de serviço
   no repositório nem no site.
8. Homologar com contas de teste, duas escolas fictícias separadas,
   dados sem identificação real, backup/restauração e aprovação formal.
   A publicação deve ser **manual e explicitamente autorizada**, fora
   desta branch/PR.

### Primeiro administrador (bootstrap fora do navegador)

**NÃO executar com dados reais antes da liberação institucional.**
Este roteiro explica o procedimento previsto para um ambiente aprovado.

- Um responsável técnico cria ou identifica no **Firebase Authentication
  exclusivo da escola** a conta do futuro gestor, com e-mail verificado.
  Deve obter o UID dessa conta pelo console, sem copiar senhas.
- O técnico instala as dependências Node do repositório (\`npm install\`)
  em uma estação confiável. Deve ter credenciais de serviço autorizadas
  **armazenadas fora da pasta do projeto**.
- Antes de usar o script, confirmar internamente projeto, UID e
  autorização institucional. Em um ambiente aprovado, definir as
  variáveis \`FIREBASE_PROJECT_ID\` (igual ao arquivo da escola),
  \`INITIAL_ADMIN_UID\`, \`GOOGLE_APPLICATION_CREDENTIALS\` (caminho
  externo) e
  \`INITIAL_ADMIN_APPROVED=CONFIRMO_AUTORIZACAO_ESCOLA\`.
  Executar manualmente \`node template-escolas/scripts/bootstrap-admin.cjs\`.
- A conta de serviço externa deve ser do **mesmo projectId** da escola;
  o script rejeita credenciais de outro projeto antes de iniciar o SDK.
- O script valida o projeto e a conta verificada e, em transação,
  cria \`system/bootstrap\` e \`roles/{uid}\` **uma única vez**.
  A interface Web não tem permissão para criar cargos.

**Importante:** o script é um ponto de partida técnico e deve ser
revisado pela instituição antes de uso em produção. Erros devem interromper
o provisionamento, nunca conceder cargos automaticamente por e-mail.
O autor do projeto-base não recebe acesso à instalação escolar.

## Testes e verificação

Os testes **não apontam para produção**:

\`\`\`sh
npm run test:template:config
npm run test:template:rules
\`\`\`

A segunda linha usa somente um Firebase Emulator local em
\`127.0.0.1:8081\`, com projeto \`demo-gremio-escola-teste\`.
Testa contas fictícias e nega, entre outros casos:

- autoaprovação de aluno e criação de cargo pelo navegador;
- leitura por aluno pendente/não verificado;
- e-mails embutidos em eventos/avisos/enquetes;
- leitura de inscrições e votos de terceiros;
- segundo voto, alternativas malformadas e alterações de cédulas;
- sugestões particulares do aluno, moderação administrativa e bloqueio de
  leitura de sugestões de terceiros;
- duas instâncias fictícias no emulador: mesma conta/UID não herda
  aprovações, conteúdos ou cargo entre Firebase A e Firebase B;
- criação de coleções não previstas pelo template.

**Atenção:** a validação de dois ambientes reais e de regras publicadas
em cada Firebase **ainda precisa ser realizada** antes de qualquer
liberação institucional.

## Privacidade e transição a partir do código do IFCE

Veja [MIGRACAO-PRIVACIDADE.md](MIGRACAO-PRIVACIDADE.md).
Não transfira alunos, e-mails, votos ou inscrições entre bancos. A futura
correção do aplicativo IFCE exige migração coordenada e consentida,
backup, testes de regras e revisão das interfaces; **não** é feita pelo
template novo.

## Licenciamento e créditos

Este PR não define uma licença nem autoriza redistribuição.
O repositório ser público **não** significa que imagens e conteúdo
possam ser usados por outras escolas sem autorização. A instituição de
origem é creditada nas duas telas, e os dados da escola não permitem
editar o crédito. A proteção jurídica e o nome público correto do autor
ainda precisam ser confirmados.

**Status: base técnica experimental. Sem merge ou publicação automática.**
