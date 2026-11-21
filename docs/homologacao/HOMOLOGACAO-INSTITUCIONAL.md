# Homologação institucional de implantação — NÃO APROVADA

**Esta é uma lista de verificação, não uma autorização.** Só a direção,
o titular dos direitos e os responsáveis técnicos/jurídicos podem aceitar
uma instalação com estudantes reais.

| Evidência exigida | Quem confirma | Estado |
| --- | --- | --- |
| Direitos do código, marca e mídias | Titular/jurídico | Pendente |
| LGPD, privacidade, retenção/exclusão de alunos | Responsável institucional | Pendente |
| Dados antigos IFCE migrados, se for o caso | TI do IFCE | Pendente |
| Regras do Firestore avaliadas independentemente | Revisor técnico | Pendente |
| Firebase A/B, Auth, Hosting e dados isolados | TI de ambas as escolas | Pendente |
| Exportação real, IAM, CMEK e restauração separada | Responsável por backups | Pendente |
| Recursos, teclado, leitor de tela e celular | Usuários-piloto/direção | Pendente |
| Aprovação final assinada da instituição | Direção | Pendente |

## Procedimento

1. Homologar com dois projetos Firebase **de teste**, instituições
   fictícias e nenhuma informação pessoal real.
2. Revisar regras e resultados do emulador, incluindo contas com mesmo
   UID em projetos distintos, acesso estudantil e privilégios revogados.
3. Executar ensaio de falhas, backups e restauração **separadamente**,
   registrar evidências e responsáveis em repositório privado.
4. Confirmar marca, direito de distribuição, conteúdo e créditos.
5. Verificar que todas as funções declaradas são realmente utilizáveis.
6. Autorizar escopo e data da implantação em ata/documento assinado.
7. O script \`template-escolas/scripts/release-gate.cjs\` lê um manifesto
   **externo ao repositório**, assinatura Ed25519 e chave pública da
   instituição. Cada requisito exige \`status: approved\` e
   \`evidenceId\` (referência sem informações pessoais). A chave pública
   deve ser conferida **fora do GitHub**, por canal institucional confiável.
8. O verificador é só um controle técnico: não comprova identidade
   jurídica ou autorização só pela assinatura e **não faz deploy**.
   A implantação demanda execução manual, revisão de IAM e autorização.

**Nenhum requisito foi marcado como aprovado nesta entrega.**
