# Homologação de duas escolas — ensaio planejado, NÃO concluído

## Ambiente A
Projeto Supabase de testes já existente da Plataforma Escolar. RLS ativada nas nove tabelas, sem estudantes reais; SQL transacional com identidades fictícias aprovado. **Não compartilhar** sua URL de Auth/DB, configuração ou chaves com a escola B.

## Ambiente B
Projeto Supabase independente de homologação, em nova instância, com usuários e dados exclusivamente fictícios. **Não criado**: Supabase retornou limite de **dois projetos gratuitos ativos** para o titular da conta, embora o custo cotado para criar outro projeto da organização fosse US$ 0/mês. Nenhum projeto preexistente foi pausado ou alterado para contornar o limite.

## Cenários obrigatórios, executar quando B existir
1. A e B têm project refs, origens HTTPS, `instanceId`, chave pública, Auth e hospedagem distintos.
2. Criar apenas contas fictícias de testes confirmadas por e-mail em cada Auth, com pessoas gestoras de teste separadas.
3. Confirmar que token emitido por A não autoriza ler, inserir ou alterar dados em B, e vice-versa. Não presumir isolamento apenas pela diferença de arquivos JSON.
4. Verificar que alunos de A não aparecem no cadastro, inscrições, sugestões ou votos de B.
5. Conferir funções do Portal e Painel em navegador com HTTPS, login, recuperação, logout, tentativas de acesso indevido e aprovações.
6. Confirmar que o backup/restore de A não expõe dados de B e que cada escola tem contatos, retenção, plano de incidentes e equipes autorizadas.
7. Registrar evidências dos testes, erros, revisões e aprovações, nunca expondo senhas ou dados de estudantes.

## Bloqueio atual
O teste real cruzado **não é possível com apenas um projeto Supabase disponível**. Como alternativas futuras, a equipe pode liberar uma vaga no limite gratuito por meios autorizados, obter orçamento para outro projeto ou usar infraestrutura local separada e documentar a limitação. Não foi autorizada cobrança nem pausa de qualquer instalação.

**Status: PENDENTE; nenhuma escola real está homologada.**
