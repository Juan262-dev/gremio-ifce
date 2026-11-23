# Backup e restauração — plano de homologação, NÃO concluído em ambiente separado

## O que foi efetivamente testado
No projeto Supabase exclusivo do Grêmio, o ensaio `sql/verify-backup-restore-rollback.sql` executou:
1. bloqueio caso qualquer tabela escolar ou `auth.users` não estivesse vazia;
2. criação de contas e dados **totalmente fictícios**, numa transação única;
3. snapshot temporário lógico de membros, sugestões, enquetes e votos;
4. simulação da exclusão desses dados e reimportação, na ordem das dependências;
5. comparação de conteúdo e conferência dos vínculos;
6. `ROLLBACK` e confirmação de que nenhuma conta fictícia ficou no banco.

**Limites:** não testa `pg_dump` em arquivo, backups off-site, recuperação real após falha, conteúdo em Storage, tokens e configurações Auth, nem restauração em um projeto Supabase separado.

## Procedimento de backup real (a executar por responsável técnico)
1. Reservar projeto de recuperação **distinto**, com orçamento aprovado e mesma versão de Postgres/serviços adequados.
2. Selecionar e documentar estratégia do banco **e de Auth/Storage** com a equipe de TI. Um dump só das tabelas `school_*` não leva os usuários de `auth.users`, e o restore de chaves estrangeiras falhará sem identidade equivalente.
3. Gerar backup lógico usando `supabase db dump --remote` na versão atual da CLI e de acordo com a documentação; validar destino antes de conectar. Usar credenciais fora do repositório e copiar os arquivos para local criptografado e controlado. **Não enviar senhas, backups ou dados pessoais ao chat nem ao GitHub.**
4. Registrar horário, versão, tamanho, integridade (SHA-256) e local de armazenamento seguro. Definir retenção e política de descarte.
5. Restaurar **somente** em projeto descartável autorizado, nunca sobre a instalação ativa; verificar Auth, integridade de referências, arquivos no Storage, filas/inscrições e políticas RLS, além da aplicação pelo navegador.
6. Provar recuperação com uma conta fictícia, conferir exclusões/anonimização e documentar tempos de recuperação.
7. Exigir aprovação institucional para ativação e rotina periódica; monitorar falhas.

O plano Free não inclui backup automático diário gerenciado pelo Supabase. Por isso, o backup off-site manual e o teste periódico são essenciais. Referências atualizadas:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/local-development/cli/migrating-to-v3

## Critérios de aceite
- [x] Ensaio lógico **transacional** fictício passou, sem persistência
- [ ] Backup lógico real gerado e validado com checksum fora do Git
- [ ] Restauração testada em **outro projeto** vazio e autorizado
- [ ] Supabase Auth, identidades, Storage e políticas restaurados ou recriados de forma consistente
- [ ] Backups cifrados, protegidos e fora do ambiente de origem
- [ ] Responsável institucional aprovou duração, armazenamento e resposta a incidentes

**Status: teste limitado passou; recuperação real de desastre permanece pendente.**
