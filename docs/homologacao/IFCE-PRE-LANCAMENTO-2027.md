# IFCE — Pré-homologação técnica do lançamento 2027

**Resultado atual: NÃO HOMOLOGADO / NÃO PUBLICAR.**

Este documento identifica o que o código permite testar antes do primeiro
uso regular do aplicativo. Foi informado pelo responsável pelo projeto que
o Grêmio pretende iniciar uso no próximo ano. A declaração de autoria
autoriza desenvolvimento e revisão de código, mas **não confirma que o
Firebase esteja vazio**, nem constitui ata de homologação institucional.

## Critérios e evidências

| Verificação | Estado | Evidência ou próximo procedimento |
| --- | --- | --- |
| Portal e Painel preservam identidade visual original | Em teste | CI de navegação e inspeção visual em computador/celular |
| Quarentena de listas antigas de e-mails em eventos/enquetes | Código e emulador | Firestore Rules v2 exigem privacidadeVersao=2, sem expor dados legados a estudantes |
| Um voto privado por UID, total consistente e transacional | Código e emulador | tests/firestore.test.cjs; bloqueia segundo voto e leitura cruzada |
| Vagas e fila de espera concorrentes no servidor | Código e emulador | functions/event-service.cjs e tests/ifce-eventos-v2.test.cjs |
| Conferência por carteirinha e presença privada | Código e emulador | admin-carteirinhas.js e regras presencas_eventos |
| Migração real dos dados antigos de alunos | **PENDENTE** | Análise do Firebase original, backup real/restauração, validação UID e operação autorizada |
| Direitos de licença, marca e mídias de terceiros | **PENDENTE** | Documento de titularidade do código e revisão de uso da marca IFCE e material ENEM |
| Firebase Functions e índice implantados | **PENDENTE** | Testar em projeto temporário, IAM, custos, monitoramento e versão compatível |
| Exclusão de dados, atividades e relatórios integrados | **PENDENTE** | Alguns fluxos antigos foram bloqueados até integrar subcoleções privadas |
| Backup real criptografado e restauração demonstrada | **PENDENTE** | Operação pela TI, conta institucional, logs sem PII, prova de recuperação |
| Homologação funcional com duas contas de alunos + gestão | **PENDENTE** | Testar voto, evento cheio, cancelamento, primeira pessoa da fila, presença, relatórios |
| Aprovação institucional documentada | **PENDENTE** | Responsável da escola/direção deve confirmar finalidade, dados, direitos e liberação |

## Chave de liberação dos eventos (fail closed)

As Cloud Functions do IFCE agora **recusam inscrições e cancelamentos**
se o documento `config/sistema` estiver ausente ou não contiver
**todas** as condições explícitas:

- `eventosV2Habilitados: true`
- `manutencao: false`
- `painelCongelado: false`
- `privacidadeMigracaoBloqueada: false`

O valor `eventosV2Habilitados` **não deve ser ativado** antes de
comprovar que a migração, as regras, os índices e as Functions estão
implantados conjuntamente, que os dados estão isolados e que o backup
foi restaurado com sucesso em homologação. A direção/TI precisa
autorizar a liberação, com contas fictícias e evidências arquivadas.

Sem calendário ISO válido no evento, a função também recusa inscrições,
impedindo acesso a eventos com datas incorretas. Esta é uma proteção
de servidor: não depende de a interface esconder botões.

## Auditoria de regressão mais rigorosa

Os testes de privacidade foram ajustados ao estado atual deste PR:
o limite permitido de referências aos antigos campos `votosAlunos`,
`inscritos` e `espera` foi reduzido nos arquivos que já usam o
modelo privado. Assim, uma mudança futura não pode reintroduzir
silenciosamente campos pessoais nesses locais.

Ainda há leitores legados em partes do Painel e das regras para
compatibilidade e quarentena, que exigem substituição antes de uma
homologação completa.

## Relatórios de atividades sem contagens fictícias

O Painel não apresenta mais **zero presenças** como resultado inventado.
O relatório consulta os registros da subcoleção privada de presenças
apenas com permissão administrativa; caso a consulta seja negada, mostra
"não disponíveis para esta conta" em vez de divulgar dados ou afirmar
uma contagem incorreta. As interfaces não recebem listas de e-mails
de estudantes para produzir esse total.

## Proteção contra documentos órfãos

O Firestore **não apaga subcoleções automaticamente** quando o documento
pai é excluído. As regras desta fase bloqueiam exclusão direta de enquetes e
eventos, e o Painel explica a restrição. Isso preserva vínculos de votos e
inscrições privadas e evita deixar registros pessoais sem o evento de origem.

Para reativar a exclusão definitivamente, a TI deverá implementar fluxo
controlado de retenção/expurgo, com autorização, exclusão transacional ou
processamento paginado das subcoleções, auditoria e testes de restauração.
Nenhuma exclusão foi feita em dados reais.

## Sequência de lançamento — sem atalhos

1. Confirmar que o projeto Firebase de produção ainda não está em uso,
   por auditoria com autorização da TI, e identificar eventuais registros
   existentes. Nunca pressupor banco vazio apenas pela data de lançamento.
2. Preparar backup Firestore real protegido, exportação Auth e demais
   dados necessários; comprovar restauração **num projeto de ensaio**.
3. Ativar manutenção, congelamento do painel e
   \`privacidadeMigracaoBloqueada: true\` em \`config/sistema\`.
   Preservar acesso técnico de recuperação.
4. Aplicar, em ambiente de ensaio, as regras, índices, Cloud Functions
   e clientes **compatíveis entre si**. Não implantar partes isoladas.
5. Rodar \`migrate-ifce-v2.cjs\` primeiro em modo somente leitura,
   conferir contagens e UIDs sem salvar dados identificáveis em logs.
6. Executar migração controlada apenas após autorização, backup
   concluído e restauração ensaiada. Conferir que \`votosAlunos\`,
   \`inscritos\` e \`espera\` foram removidos dos documentos legíveis
   por estudantes. Se houver presenças antigas, parar e revisar.
7. Testar contas fictícias de aluno A, aluno B e gestor, privilégios,
   carteira, votação dupla, inscrição, fila/cancelamento, exportação e
   bloqueios. Registrar resultado sem e-mails nem senhas.
8. Concluir adaptações que ainda estão pendentes no Painel, sobretudo
   exclusão de dados e relatórios históricos, antes de ativar módulos.
9. Revisar direitos de uso de marca, logotipos, imagens, conteúdo
   educativo e definir licenciamento compatível.
10. Somente depois da revisão técnica e aprovação documentada da
    instituição, liberar manutenção e publicar via processo controlado.

## Evidência automatizada

- \`npm run test:ui\`
- \`npm run test:rules\` (Firestore Emulator)
- \`npm run test:privacy:migrate\`
- \`npm run test:privacy:backend\`
- \`npm run test:privacy:audit\`
- \`npm run test:operations\`
- \`npm run test:template:rules\`

Passar nos testes acima **não é homologação institucional** e
**não confirma o conteúdo do Firestore de produção**.

A publicação, a migração real e a habilitação de novos módulos devem
ficar bloqueadas até a finalização da lista, verificação de backups e
aceite documentado por quem responde pela escola.
