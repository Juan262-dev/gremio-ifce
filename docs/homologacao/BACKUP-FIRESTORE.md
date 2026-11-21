# Exportação real e protegida do Cloud Firestore — guia para TI

A ferramenta \`template-escolas/scripts/export-firestore.cjs\` usa
a **exportação gerenciada oficial** do Firestore por \`gcloud\`, somente
se a TI da escola autorizar formalmente. Não há execução automática,
migração, importação ou acesso ao banco neste PR.

## Antes da operação

- Conferir projectId e conta gcloud da escola; conceder apenas os
  papéis indispensáveis. Não enviar chaves para o GitHub ou para chats.
- Criar bucket no **mesmo projeto**, com acesso uniforme,
  prevenção de acesso público *enforced*, versão, retenção mínima
  de 30 dias e criptografia padrão por chave Cloud KMS (CMEK).
- Confirmar permissões do agente de serviço Firestore na chave KMS
  e bucket, cotas, faturamento, localização e políticas de retenção.
- Conferir o IAM de cada bucket e impedir compartilhamento entre escolas.
- Criar documento de autorização da direção e procedimento de restauração
  verificado em ambiente de homologação.

## Comando de ensaio, sem rede

\`\`\`sh
node template-escolas/scripts/export-firestore.cjs \
  --project escola-horizonte \
  --bucket backup-escola-horizonte \
  --prefix firestore-backups/2026-11-21T080000Z/escola-horizonte
\`\`\`

O ensaio apenas valida argumentos e apresenta o caminho planejado.
Ele **não grava backup**. Em ambiente aprovado, a TI define,
fora do Git e sem expor informações pessoais:

\`\`\`text
BACKUP_APPROVED_PROJECT_ID=<id da escola autorizado>
BACKUP_APPROVAL_REFERENCE=<referência de ata institucional>
BACKUP_EXECUTE=AUTORIZO_EXPORTACAO_INSTITUCIONAL
\`\`\`

O parâmetro \`--execute\`, reservado a um operador autorizado, consulta
os metadados do projeto/bucket e **somente se os critérios forem
aprovados** solicita \`gcloud firestore export\`. Verifique a
conclusão da operação e a possibilidade de restauração separadamente.

## Limitações importantes

- A exportação Firestore **não inclui** usuários e credenciais Firebase
  Authentication, Cloud Storage, Hosting, regras, índices e segredos.
- Nenhum processo de restauração de produção foi autorizado ou criado.
- Um bucket com CMEK ainda exige auditoria de IAM, chave KMS,
  proteção de logs, política de incidentes, recuperação e LGPD.
- Para o IFCE, a migração dos documentos antigos de votos/inscrições
  ainda exigirá congelamento de escritas, atualização conjunta de
  Portal/Painel/regras, reconciliação e aprovação institucional.
- Consulte a documentação oficial:
  https://firebase.google.com/docs/firestore/manage-data/export-import
  e https://cloud.google.com/sdk/gcloud/reference/firestore/export

**Não executar em projetos reais sem a direção e a TI da escola.**
