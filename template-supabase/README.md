# Modelo universal do Grêmio — protótipo Supabase

**Estado: PR de desenvolvimento. NÃO liberado para cadastro de estudantes reais.**
Este diretório é totalmente separado dos aplicativos oficiais do Grêmio IFCE e do
template Firebase em `template-escolas/`. Não usa o Firebase nem as contas do IFCE.

## Objetivo
Cada escola recebe uma **instalação e um projeto Supabase próprios**:
- Portal do Aluno e Painel Administrativo com mesma identidade configurável;
- dados e autenticação separados por escola;
- inscrições individuais, votos privados e sugestões restritas;
- materiais textuais, avisos, enquetes e eventos simples;
- crédito de origem permanente no HTML: Grêmio IFCE Campus Crateús.

Esta é uma base mínima funcional de integração, **não possui** eleições
completas, carteirinhas, laboratório, finanças, sistema de vagas/filas,
exclusão integral LGPD, auditoria institucional, backup automatizado
ou todos os módulos da versão original do IFCE.

## Arquitetura
- `public/`: arquivos estáticos do Portal e Painel; SDK Supabase JS v2.119.2.
- `public/js/instance.js`: valida uma configuração **por escola** antes da conexão.
- `public/config/installation.example.json`: exemplo propositalmente inválido.
- `sql/schema.sql`: esquema e RLS para **um projeto novo, exclusivo da escola**.
- `sql/verify-rls-tests.sql`: cenários SQL com contas fictícias dentro de transação revertida; aborta em projeto com contas reais.
- `tests/template-supabase.test.cjs`: verificações offline de isolamento e segurança.

Não há configuração, conexão, login ou chaves de Supabase compartilhadas com
o IFCE ou com aplicativos pessoais de quem desenvolveu o template.

## Preparar uma instalação de ENSAIO (somente equipe técnica autorizada)
1. Resolver licença, atribuição de autoria, uso da marca, retenção de
   dados, revisão LGPD, autorização da escola e atendimento a titulares.
2. Criar um projeto Supabase **novo e exclusivo** da escola, em organização
   institucional autorizada, após conferir plano e custos. Nunca usar o
   projeto Supabase de outro aplicativo.
3. Antes de qualquer uso com alunos, auditar `sql/schema.sql`, em seguida
   aplicar o script manualmente no SQL Editor desse projeto **vazio**.
   O script é transacional e não deve ser reexecutado em base populada.
4. Configurar **Auth > Providers > Email** e exigir verificação do e-mail.
   Restringir as URLs permitidas de redirecionamento ao domínio HTTPS
   exclusivo da escola, habilitar proteção antiabuso e revisar cadastro.
5. Criar `public/config/installation.json` a partir do exemplo, com
   `instanceId`, `siteOrigin`, identidade escolar e SOMENTE a URL do
   projeto Supabase e sua **publishable key** (`sb_publishable_...`).
   Este arquivo é ignorado pelo Git. Nunca incluir `service_role`,
   `sb_secret_`, senhas ou credenciais privadas.
6. Configurar uma hospedagem estática HTTPS exclusiva, com domínio idêntico
   a `siteOrigin`. Servir o diretório `public/` e conferir CSP e SDK.
7. Para criar o primeiro gestor, a equipe técnica identifica o **UUID**
   da conta com e-mail confirmado no Auth e, após aprovação institucional,
   faz inserção manual da permissão administrativa usando o SQL Editor
   do projeto da escola, jamais pelo navegador.
8. Testar com contas **fictícias** e permissões reais em dois projetos de
   teste independentes; verificar que um aluno só lê suas sugestões/votos,
   que não pode se promover a gestor, que nenhum visitante anônimo lê
   informações e que as inscrições são pessoais.
9. Homologar backup, restauração, políticas de exclusão, acessibilidade,
   custos, segurança da escola e eventual adequação da infraestrutura
   antes de qualquer produção.

### Preparar o primeiro administrador (somente no projeto isolado e aprovado)
Depois de validar a conta e a aprovação, a TI executa pelo SQL Editor:

```sql
-- UUID fictício de exemplo. Nunca executar com este valor.
-- Substituir pelo UID verificado e autorizado da conta institucional.
insert into public.school_roles(user_id, role, active)
values ('00000000-0000-4000-8000-000000000000', 'admin', true);
```

O gestor **não consegue** conceder seu próprio cargo pelo Portal/Painel;
o banco permite a leitura do cargo da própria conta, não sua escrita pelo cliente.

## Segurança e limitações
- **RLS em todas as tabelas**. A chave pública no navegador não é autorização:
  cada ação depende de Auth + políticas.
- Helpers de autorização estão no schema interno `school_private`, não
  exposto pela Data API. Chave secreta nunca aparece no frontend.
- Votos usam chave composta `(poll_id,user_id)`, bloqueando segundo voto;
  não há listagem pública das cédulas.
- O protótipo não garante limites de vagas; inscrições não têm fila.
- A mudança de `installation.json` não configura nem valida isolamento
  real do backend; cada projeto precisa ser auditado.
- **Não enviar informações pessoais reais** até testar a instalação,
  plano de privacidade, exclusões e respostas a incidentes.

## Passar para Firebase depois
O isolamento por instalação e o contrato dos dados foram mantidos simples.
A migração futura requer:
1. criar um projeto Firebase separado por escola;
2. implementar adaptadores equivalentes de Auth e banco para Portal/Painel,
   sem supor compatibilidade direta entre os SDKs;
3. mapear contas de Auth para os novos UIDs com consentimento e suporte
   institucional, sem copiar senhas;
4. migrar somente os dados permitidos, preservando vínculos, datas, votos
   privados, inscrições e critérios de retenção;
5. executar ensaio de restauração, validar Firestore Rules e testes cruzados;
6. fazer a transição de DNS/hosting somente após homologação e backup.

**A migração Supabase → Firebase não é automática e ainda não foi executada.**

## Testes offline
Na raiz do repositório:
```sh
node --check template-supabase/public/js/instance.js
node --check template-supabase/public/js/portal.js
node --check template-supabase/public/js/admin.js
node --test tests/template-supabase.test.cjs
```
Os testes offline não substituem execução real do SQL/RLS, testes manuais,
backup/restauração nem revisão institucional.

## Verificação no projeto exclusivo de ensaio (23/11/2026)
- O esquema SQL revisado foi aplicado por migração rastreada `create_school_template_rls_v1`.
- **9 tabelas** foram criadas com **RLS ativada em todas elas**; cada tabela possui políticas de acesso próprias.
- Supabase Security Advisor: **nenhum alerta detectado** após a aplicação.
- Consultas reais ao Postgres confirmaram que `anon` não possui SELECT nas nove tabelas;
  `authenticated` não possui permissão para inserir cargos nem sobrescrever `created_at`.
- A função de alternativas da enquete rejeitou alternativas repetidas ou vazias.
- Os cenários SQL com usuários fictícios validaram leitura individual de sugestões,
  acesso da gestão aos pedidos, restrição de cadastros pendentes, voto único e
  sigilo das cédulas. **Todos os cenários foram revertidos com ROLLBACK.**
- Após os testes: **zero usuários no Auth e zero registros nas nove tabelas**.
- O Performance Advisor assinalou índices de chaves estrangeiras ausentes e índices
  ainda não utilizados: pendências de otimização, não alertas críticos de segurança.

**Ainda não homologado para uso real:** faltam testes de API autenticada
no navegador, proteção contra abuso, duas escolas em projetos independentes,
backups, recuperação, política de retenção/exclusão, revisão institucional
e consentimentos aplicáveis. Não publicar nem cadastrar estudantes reais.
