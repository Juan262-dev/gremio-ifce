# Sete melhorias para o modelo reutilizável do Grêmio — proposta de produto

> **Status: planejamento, não implementação.** Esta proposta complementa o
> [tutorial para escolas](GUIA-PARA-ESCOLAS.md), o
> [assistente de configuração](ASSISTENTE-CONFIGURACAO.md) e o
> [roadmap](ROADMAP.md). Nenhuma destas sete funcionalidades está sendo
> ativada, instalada ou publicada por este documento.
>
> **Premissas inalteradas:** Portal do Aluno e Painel Administrativo de cada
> escola compartilham apenas o Firebase **daquela escola**; outras escolas
> têm projetos, hospedagem, contas e dados independentes. A instalação
> original do IFCE conserva visual, funções e banco. Créditos de origem
> permanecem visíveis e fora da edição do painel, com autoria/licença a
> confirmar. O criador do código não recebe privilégio sobre os dados de
> outras instituições.

## Pré-requisitos bloqueantes (antes de qualquer piloto com dados reais)

- [ ] Confirmar titularidade, licença redistribuível, nome público do autor
  e autorização das mídias e materiais utilizados.
- [ ] Resolver no template as referências fixas ao Firebase e à conta
  privilegiada do IFCE, sem reaproveitar dados, contas nem `projectId`.
- [ ] Corrigir a exposição de dados pessoais em documentos coletivos
  de enquetes/eventos e testar regras de acesso com Firebase Emulator.
- [ ] Prover e testar bootstrap privilegiado de um administrador **por
  escola**, política de cadastro, privacidade, retenção e exclusão.
- [ ] Testar duas escolas fictícias com isolamento total e acesso cruzado
  negado, inclusive em tarefas de manutenção e restauração.

## Priorização sugerida

| Ordem | Melhoria | Fase de entrega | Dependências |
| --- | --- | --- | --- |
| **1** | Central de Implantação | **P1 — Preparação e piloto** | Configuração por escola, assistente, estados |
| **2** | Modo Demonstração | **P1 — Preparação e piloto** | Dados fictícios e isolamento de ambiente |
| **3** | Verificador de Segurança | **P1 — Preparação e piloto** | Regras revisadas, emulador e critérios de aceite |
| **4** | Troca de Gestão do Grêmio | **P2 — Operação escolar** | Contas, cargos e auditoria por escola |
| **5** | Atualizações sem perder personalizações | **P2 — Operação escolar** | Template versionado, migrações, backups |
| **6** | Central de Ajuda dentro dos aplicativos | **P2 — Operação escolar** | Fluxos e permissões estabilizados |
| **7** | Backup e Recuperação | **Fundação técnica na P1; interface P2** | Autorização técnica, retenção, privacidade |

**Nota:** o serviço de backup não pode esperar uma tela bonita. É
pré-requisito técnico para publicar e atualizar com segurança. A interface
escolar de acompanhamento/restauração pertence à fase operacional.

## 1. Central de Implantação

**Para quem:** gestor escolar e responsável técnico autorizado.

**Experiência esperada:** painel com 5 etapas — Identificação, Visual,
Firebase, Gestor inicial e Revisão — com progresso, orientações, anexos
públicos autorizados, pendências e botão para retomar rascunho. Mostrar as
prévias do Portal e do Admin com a identidade **da própria escola**.

**Estados:** `não configurado`, `rascunho`, `pendente de revisão`,
`pronto para homologação`, `apto à publicação` e `instalação ativa`.
A porcentagem só reflete tarefas verificadas; nunca equivale a aprovação
de segurança. Não exibir `concluído` apenas porque alguém marcou uma caixa.

**Proteção:** apenas um serviço autorizado valida e registra o status
de instalação. O navegador não cria conta raiz, não configura regras
privilegiadas, não inicializa Firebase inválido e não executa deploy.
Todos os segredos ficam fora do formulário.

**Aceite:** rascunho retomável sem segredo; bloqueios explicados;
indicação correta de cada etapa; prévias responsivas e acessíveis; escola
A não vê a configuração de B; ativação somente após testes e aprovação
explícita registrados.

## 2. Modo Demonstração

**Para quem:** escolas que querem conhecer o projeto antes de instalá-lo.

**Experiência esperada:** acesso de demonstração ao Portal e ao Painel
Administrativo, com avisos, eventos e usuários **claramente fictícios**,
sem cadastro real. Uma faixa permanente informa "DEMONSTRAÇÃO — dados
fictícios". Habilitar reset simples para reiniciar a simulação.

**Proteção:** ambiente de demonstração isolado (fixtures locais ou backend
exclusivamente de testes); jamais apontar para Firebase do IFCE, de outra
escola ou da futura instalação real. Ações simuladas não enviam e-mails
reais, não criam contas nem escrevem dados pessoais persistentes.

**Aceite:** pode abrir ambos os aplicativos, testar funções ilustrativas
sem autenticação real, resetar o estado e navegar em celular/teclado;
nenhuma requisição autenticada a projetos reais no ambiente demo.

## 3. Troca de Gestão do Grêmio

**Para quem:** direção e diretoria ao encerrar/iniciar mandatos.

**Experiência esperada:** procedimento de transição com gestores
substituídos, lista de permissões, data aprovada, confirmação da direção,
histórico de passagem e orientações para os novos integrantes.

**Proteção:** concessões e revogações exigem autenticação individual,
aprovação institucional independente, verificações de cargo no backend/
Firestore Rules, logs auditáveis e recuperação de acesso se um gestor
se afastar. Nunca promover a administrador com formulário público.
O administrador anterior perde acesso privilegiado após a transição,
sem apagar registros institucionais necessários.

**Aceite:** cada escola troca a diretoria sem alterar dados de outras
escolas; gestor revogado não pode acessar recursos administrativos;
logs identificam ação e autorização; histórico continua disponível
apenas para papéis autorizados; teste de transição falha com aprovação
ausente ou conta indevida.

## 4. Verificador de Segurança

**Para quem:** responsável técnico e aprovador de publicação.

**Experiência esperada:** checklist "pré-voo" com resultado verificável
**Aprovado**, **Pendente** ou **Bloqueado** e recomendações objetivas.
Separar verificações automáticas (configuração, consistência, regras
no emulador) de verificações que dependem de pessoa (licença, termos,
política de privacidade e avaliação institucional).

**Verificações mínimas:** URL e Firebase distintos do IFCE; configuração
válida sem fallback; autenticação e domínios autorizados; cargos
individualizados; acesso cruzado negado; enquetes/eventos sem exposição
indevida; créditos preservados; registros de testes recentes e backup
testado em ambiente de ensaio.

**Proteção:** nunca prometer "seguro" com base apenas na presença de uma
chave pública de Firebase; não afrouxar Firestore Rules para aprovação.
Falhas de teste ou evidências ausentes **bloqueiam a publicação**. Não
exibir segredos em logs ou relatórios.

**Aceite:** testes de segurança com dados fictícios detectam permissões
indevidas e falhas de isolamento; pendências bloqueiam ativação; um
aprovador tem acesso ao relatório resumido com data, versão e evidências.

## 5. Atualizações sem perder personalizações

**Para quem:** equipe técnica de manutenção por escola.

**Experiência esperada:** avisos de versão disponível, mudanças,
compatibilidade de módulos, impacto previsto e roteiro de atualização.
Separar **código do template**, **configuração escolar** e **dados**.

**Proteção:** versão identificada e changelog; atualização primeiro em
ambiente de ensaio com dados fictícios; teste de compatibilidade de
Firestore Rules, índices e esquema, preservação de logo, nome, créditos
e preferências; backup e plano de reversão antes de migrar. Nenhum push
de template deve publicar automaticamente nas instâncias de terceiros.

**Aceite:** atualizar a escola A sem modificar a escola B ou IFCE;
personalizações persistem após atualização e rollback; falha de migração
não deixa dados sem plano de recuperação; revisão e aprovação expressa
para produção.

## 6. Central de Ajuda dentro dos aplicativos

**Para quem:** estudantes, gestores e responsáveis técnicos, com conteúdo
adequado a seus papéis.

**Experiência esperada:** tutoriais rápidos e pesquisáveis para acessar
conta, publicar avisos, gerir eventos, lidar com solicitações, trocar
diretoria, localizar termos/privacidade e pedir suporte institucional.
Conteúdo textual acessível no celular e links para as instruções
técnicas sem obrigar alunos a entender Firebase.

**Proteção:** páginas de ajuda não concedem nem revelam permissões;
materiais de administração ficam visíveis apenas a usuários autorizados;
nunca incluir senhas, chaves ou dados pessoais de alunos em exemplos.
O contato de suporte é da própria escola, não de outras instâncias.

**Aceite:** busca ou navegação por tópico, ajuda contextual nas etapas,
orientação em erros comuns, teclado/leitor de tela e tratamento de links
inválidos; conteúdo revisado junto de cada versão.

## 7. Backup e Recuperação

**Para quem:** responsável técnico designado pela escola e equipe
institucional autorizada.

**Experiência esperada:** política clara de frequência e retenção, status
das cópias autorizadas, data de último teste de restauração e roteiro
de recuperação de incidentes.

**Proteção:** cada escola protege seus próprios backups, com acesso
mínimo necessário, criptografia e controle institucional; não juntar
backups entre escolas, nem replicar dados de estudantes no repositório
público. A restauração acontece por processo privilegiado e auditável,
não por botão disponível a todos os gestores. Respeitar pedidos de
exclusão, políticas de retenção e limitações legais.

**Aceite:** backup e restauração testados com dados fictícios da escola A,
sem acesso à escola B; relatórios não expõem informações pessoais;
restauração preserva permissões válidas e autoria; cenário de
indisponibilidade possui procedimento de retorno e responsáveis.

## Critérios transversais de conclusão

- [ ] **Isolamento:** duas escolas fictícias possuem Firebase/URL/
  administrador próprios; nenhum acesso cruzado a dados, backups ou
  auditorias, nem conexão ao IFCE.
- [ ] **Privacidade de estudantes:** minimização de dados, confirmação
  institucional das políticas e não exposição em coleções coletivas.
- [ ] **Créditos:** instituição e autoria originais visíveis nos dois
  aplicativos; nenhuma edição pelo painel; licença/autorizações confirmadas
  antes da redistribuição.
- [ ] **Acessibilidade:** navegação por teclado, leitura de tela, layout
  responsivo e mensagens claras.
- [ ] **Testes:** unitários, navegação, Firebase Emulator com permissões,
  regressão Portal/Admin, recuperação/atualização e piloto manual.
- [ ] **Publicação:** aprovação humana expressa; **sem merge ou publicação
  automática** e nenhum deploy disparado por esta documentação.

## Protótipo isolado da Central de Implantação (primeira entrega de P1)

A primeira **prévia funcional**, ainda apenas para demonstração, está em
[demo/central-implantacao](../../demo/central-implantacao/README.md).
Ela permite navegar nas cinco etapas, conferir progresso fictício,
alterar identidade visual, testar um logo local e ver as prévias ilustrativas.
O rascunho não guarda segredos, não acessa Firebase e **não publica nada**.

Isso **não conclui** a tarefa P1 de Central de Implantação para escolas reais:
continuam pendentes o template independente, regras, licenciamento,
autenticação privilegiada, auditoria, homologação e publicação controlada.
Os critérios de aceite abaixo permanecem obrigatórios.

## Sequência de trabalho recomendada

1. **Resolver bloqueios P0:** privacidade, regras, contas privilegiadas,
   licença e separação de Firebase. Isso vem antes de todas as telas.
2. **Construir P1 em PRs pequenos:** template isolado, central de
   implantação, demonstração e verificador, além do backup técnico.
3. **Testar piloto fictício:** duas escolas, Portal + Admin de cada uma,
   sem dados reais, com homologação e autorização da direção.
4. **Construir P2:** troca de gestão, atualizações por versão, Central de
   Ajuda e painel de acompanhamento dos backups.
5. **Distribuição futura:** liberar o template somente após todas as
   verificações e direitos resolvidos.

**Não incluído nesta etapa:** código funcional das sete melhorias, criação
de Firebase, mudança de Firestore Rules, ativação de escola, merge na
`main` ou publicação de aplicativos.
