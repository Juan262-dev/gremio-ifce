# Plano de correção de privacidade — votos e inscrições

> **SEM MIGRAÇÃO EXECUTADA.** Este roteiro mapeia uma alteração futura no
> aplicativo original do IFCE. Nenhum dado real, regra atual do Firebase
> ou código da instalação original foi modificado neste PR.

## Problema identificado

Na versão IFCE, os documentos de \`enquetes/{id}\` possuem
\`votosAlunos\` com referências de e-mails, enquanto
\`eventos/{id}\` mantêm \`inscritos\` e \`espera\` como listas de e-mails.
Esses documentos são lidos por estudantes aprovados. Assim, mesmo
que a interface esconda as listas, dados de terceiros continuam
acessíveis a quem pode ler o documento completo no Firestore.

**Regras de leitura de documentos no Firestore não mascaram campos.**
Alterar somente a interface ou acrescentar uma regra parcial de escrita
não corrige essa exposição.

## Esquema novo para uma escola independente

\`\`\`text
members/{uid}                           # nome/status: próprio aluno ou gestão
roles/{uid}                             # cargos: escritos só via Admin SDK
notices/{noticeId}                      # sem destinatários privados
events/{eventId}                        # dados gerais, SEM inscritos/espera
events/{eventId}/registrations/{uid}    # inscrição privada por UID
polls/{pollId}                          # pergunta/opções, SEM votosAlunos
polls/{pollId}/votes/{uid}              # voto individual privado por UID
\`\`\`

Cada \`uid\` vem da conta Auth **da própria escola**. O estudante
escreve apenas seu registro, sem e-mail. Um aluno não lista ou lê
registros de outras pessoas. O gestor autorizado pode administrar
esses registros, mas não ganhar privilégios por uma tela pública.
Os testes de negação estão em \`tests/template-escolas.rules.test.cjs\`.

O esquema inicial não inclui limite de vagas, fila de espera,
contagem pública agregada, eleição formal ou migração automática:
essas funcionalidades devem ser projetadas e testadas separadamente.
Não substituir a votação eleitoral real por uma enquete simples.

## Ensaio offline sem dados reais (não é uma migração!)

O diretório \`scripts/privacy/\` inclui:

- \`legacy-audit.cjs\`: auditoria que lista o **teto de referências**
  existentes ao formato antigo no Portal/Admin e em \`firestore.rules\`.
  O CI falha se surgirem novos usos do legado. **Teto não é segurança**:
  a exposição histórica continua até a migração real.
- \`rehearse-migration.cjs\`: funções puras que recebem somente
  **documentos fictícios** e um mapa explícito email→UID de exemplo.
  Retornam desenho de evento/enquete pública separado de inscrições e
  votos privados por UID. Preservam ordem da fila, opções e contagens
  quando coerentes, sem copiar e-mails para a saída.
- \`tests/privacidade-migracao.test.cjs\`: testa isolamento de dados de
  exemplo, duplicações, inconsistências, listas sem UID e cenários
  que exigem **intervenção humana**.

A saída de ensaio **NÃO deve ser gravada no Firestore**. Não é um
migrador completo, não trata todos os campos, consentimento, exclusões,
concorrência ou rollback. Não use mapa de e-mails real no GitHub,
issue, log de CI ou fixtures. Operação real permanece proibida sem
aprovação da instituição, backup/restauração e testes dos dois apps.

## Inventário conhecido de dependências

Há referências ao formato legado no \`index.html\`, \`admin.html\`,
\`admin-02-comunicacao-estudos.js\`, \`admin-03-alunos-punicoes.js\`,
\`admin-04-gestao-diretoria.js\`, \`admin-05-financeiro-diretorias.js\`,
\`admin-06-eleicao-eventos.js\`, \`admin-07-ti.js\`,
\`admin-carteirinhas.js\` e \`firestore.rules\`. Elas afetam:

- voto e contagem de enquetes;
- inscrição, cancelamento, capacidade e ordem da fila;
- avaliações, convites e presenças;
- exportação de CSV, relatórios, perfil e exclusão de dados;
- verificações de segurança e permissões do Firestore.

Por isso, atualizar somente uma das partes **não protege a privacidade**.

## Migração FUTURA do IFCE (em PR e aprovação separados)

1. **Preparar:** mapear coleções e consumidores de
   \`votosAlunos\`, \`inscritos\` e \`espera\` no Portal e Painel, incluindo
   relatórios, presenças, limites e funcionalidades de carteirinha.
2. **Autorizar:** designar responsáveis, base legal, política de retenção,
   janela de manutenção, comunicação institucional e plano de recuperação.
3. **Backup:** realizar cópia protegida com acesso mínimo necessário e
   verificar restauração **em ambiente de ensaio**, sem expor dados em Git.
4. **Projetar migração:** vincular e-mails antigos a UIDs de Auth por
   processo técnico confiável, validar duplicações, registros órfãos,
   ordem de filas, votos e capacidade. Sem UID confirmado, **não
   migrar silenciosamente** uma identidade.
5. **Alterar código + regras em conjunto:** trocar leitores e escritores
   de listas por documentos privados. Atualizar contagens, fila e
   processos de inscrição de forma transacional, com validação
   de limites e testes de concorrência.
6. **Homologar:** rodar Firestore Emulator com duas identidades e
   administração fictícias; provar que o aluno não lê votos ou
   inscrições de terceiros. Testar também relatórios e interfaces
   Portal/Admin sem regressões.
7. **Virada controlada:** impedir escritas legadas durante a transição,
   reconciliar quantidades, remover campos privados dos documentos
   coletivos, aplicar regras revisadas e publicar **somente após
   aprovação explícita**.
8. **Verificar:** confirmar remoção completa dos campos, tratar backups
   antigos conforme retenção definida, registrar resultado e plano de
   reversão seguro.

**Não fazer**: atualizar diretamente \`firestore.rules\` sem mudar a
estrutura de dados; copiar o banco do IFCE para outra escola; liberar
leitura coletiva para facilitar relatórios; rodar migração automática
sem backup e testes.

## Critérios para declarar o problema corrigido no IFCE

- [ ] Não existem listas de e-mails/votos/inscrições em documentos
  legíveis por estudantes.
- [ ] Clientes Portal/Admin e regras usam o modelo novo em todas as telas.
- [ ] Voto único e fila/vagas preservam a lógica esperada.
- [ ] Consultas a dados de outros alunos são negadas no emulador.
- [ ] Backup, restauração, registro e avaliação de privacidade aprovados.
- [ ] Deploy e migração separados, expressamente autorizados.

**O presente PR entrega apenas o novo esquema isolado do template,
não a correção publicada no Firebase do IFCE.**
