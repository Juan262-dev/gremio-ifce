# Aviso de privacidade e registro institucional — MODELO PARA REVISÃO

> Não publicar este arquivo como política aprovada. É necessário preencher campos, determinar bases legais e obter validação da escola ou entidade controladora, especialmente por envolver estudantes menores de idade.

## Identificação
- Escola/entidade controladora: **[NOME E CNPJ/IDENTIFICAÇÃO]**
- Responsável pelo Grêmio e canal institucional: **[CONTATO PÚBLICO]**
- Encarregado/canal para solicitações dos titulares: **[CONTATO]**
- Operadores, prestadores e contratos: **[PREENCHER]**
- Data, versão e autoridade que aprovou: **[PENDENTE]**

## Finalidades e dados estritamente necessários
| Finalidade | Dados envolvidos | Onde ficam | Base legal e prazo definidos pela escola |
| --- | --- | --- | --- |
| Autenticação e recuperação de acesso | E-mail, identificador da conta e dados de autenticação gerenciados no Supabase Auth | Auth do projeto escolar | **[REVISAR]** |
| Solicitação de cadastro e aprovação | Nome informado, UID, status e data de solicitação | `school_members` | **[REVISAR]** |
| Publicação e moderação | UID do responsável pela publicação, título, conteúdo e data | Avisos, eventos, enquetes e materiais | **[REVISAR]** |
| Participação em eventos | UID, evento inscrito e data | `school_registrations` | **[REVISAR]** |
| Enquetes | UID, alternativa escolhida e data | `school_votes`, acesso individual | **[REVISAR]** |
| Sugestões | UID, texto enviado, status e data | `school_suggestions`, acesso individual e pela gestão | **[REVISAR]** |

**Evitar coletar** CPF, identidade, endereço residencial, dados médicos, raça, religião, opiniões políticas, telefone ou documentos sem finalidade legítima e avaliação jurídica específicas. Sugestões e conteúdos livres precisam de orientação clara para não conter dados sensíveis.

## Transparência aos estudantes e responsáveis
Descrever de modo simples: quem trata os dados; para quê; duração; quem tem acesso; como solicitar correção, acesso ou exclusão; como denunciar erro; e como a escola decide sobre os pedidos. Os procedimentos precisam respeitar o melhor interesse de crianças e adolescentes. Não presumir que consentimento é a única base legal, nem que é dispensável em todas as situações. A escola deve identificar a hipótese adequada e avaliar o art. 14 no caso concreto.

Referências oficiais:
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD, Enunciado nº 1/2023: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes
- Direitos dos titulares: https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados

## Transferência internacional e localização
O primeiro projeto de testes está na região **us-east-1 (Estados Unidos)**. A escola deve verificar os locais de tratamento efetivo e eventuais transferências internacionais, os instrumentos contratuais e garantias aplicáveis, conforme LGPD e Resolução CD/ANPD nº 19/2024. Não presumir que a escolha da região resolve todas as questões de transferência.

Referência: https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados

## Prazos, backups, exclusão e incidentes
- Prazo de retenção de cada categoria e justificativa: **[PENDENTE]**
- Procedimento de fim de mandato e transferência autorizada de diretoria: **[PENDENTE]**
- Procedimento de exclusão do cadastro e dos dados relacionados: **[PENDENTE]**
- Tratamento de solicitações envolvendo votos, transparência de enquetes e retenção: **[PENDENTE]**
- Política de backups criptografados, acesso mínimo e expiração das cópias: **[PENDENTE]**
- Plano de incidentes, registro, resposta e notificação aplicável: **[PENDENTE]**
- Acessibilidade do aviso para adolescentes e responsáveis: **[PENDENTE]**

No esquema atual, a exclusão de `auth.users` pode esbarrar em chaves estrangeiras `created_by` de publicações feitas por gestores; uma rotina de desligamento deve testar estes casos e ter procedimento formal, sem exclusões diretas improvisadas.

## Decisão institucional necessária
- [ ] Direção/responsável institucional avaliou controladores e operadores
- [ ] Base legal, interesse de menores e eventual transferência internacional documentados
- [ ] Prazo de retenção, exclusão e resposta a titulares aprovados
- [ ] Backups e resposta a incidentes aprovados
- [ ] Aviso de privacidade específico da instalação publicado com contato real
- [ ] Liberação formal assinada ou registrada por representante autorizado

**Status: PENDENTE.** A elaboração deste modelo não equivale a aprovação ou conformidade jurídica atestada.
