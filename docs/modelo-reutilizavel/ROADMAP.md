# Roadmap incremental — como transformar o plano em template

**Somente planejamento.** Uma futura implementação deve ser entregue em PRs
pequenos, testados e sem publicação/merge sem autorização.

## Implementação técnica em andamento — não distribuível

- [x] Script de exportação **real sob controle exclusivo da TI**, com
  bloqueios de projeto, bucket, CMEK, retenção e autorização; não executado.
- [x] Inventário inicial de direitos, roteiro de aceite institucional
  e verificador offline de manifesto assinado.
- [ ] Produzir backup real e restaurá-lo com autorização; validar
  titularidade, LGPD e homologar formalmente escolas A/B.


- [x] Ensaio offline de backup/restauração de **dados totalmente fictícios**:
  detecta corrupção, rejeita importação entre escolas e não restaura cargos.
- [ ] Implementar política, retenção, criptografia e restauração **reais**,
  com aprovação de cada escola e teste em ambiente de homologação.

- [x] Auditoria regressiva do formato legado IFCE e ensaios **offline**
  de migração de listas de e-mails para documentos privados, com testes
  de consistência e sem conexão a dados reais.
- [ ] Migrar dados reais e interfaces IFCE em etapa institucional própria:
  ainda não foi feita nenhuma alteração nas regras ou listas atuais.

- [x] Assistente de terminal com cinco etapas e modo ensaio para gerar a
  configuração pública exclusiva da escola, sem conectar ou publicar.
- [ ] Evoluir o assistente para experiência visual completa e revisada
  com verificação de autenticação, domínio, regras e publicação manual.

- [x] **Primeira base mínima** separada em `template-escolas/`, com Portal,
  Painel, configuração Firebase independente e falha segura para instância
  ausente ou inválida.
- [x] Sugestões privadas de estudantes e moderação, validação reforçada de
  enquetes e teste de dois projetos isolados no mesmo Firestore Emulator.
- [x] Regras novas de registros privados para votos e inscrições por UID,
  e testes no emulador para negar acesso cruzado de estudantes.
- [x] Bootstrap técnico manual e único para o primeiro administrador,
  sem permissão de criação de cargos pelo navegador.
- [x] Cabeçalhos anti-enquadramento do template, checagem de
  `appId`/Sender ID e roteiro transacional de troca de diretoria.
- [ ] Homologar em ambiente institucional a troca de diretoria,
  recuperar acessos de emergência e validar auditoria com dados fictícios.
- [ ] Completar os recursos dos dois aplicativos, migração controlada,
  política de privacidade, licença, direitos de conteúdo, backup,
  testes manuais e homologação antes de liberar para escolas reais.
- [ ] Corrigir o modelo legível de votos/inscrições **do IFCE** em outro PR,
  incluindo mudanças coordenadas nos dois clientes, regras e dados.

Este marco é **experimental e não realiza deploy nem migração**.

## Fase 0 — direitos, privacidade e decisão editorial (bloqueante)

- [ ] Confirmar titularidade e nome de exibição do criador original.
- [ ] Escolher e registrar licença apropriada à distribuição, atribuição
  e alterações por terceiros. Verificar direitos de imagens, questões,
  materiais didáticos, ícones e nomes institucionais.
- [ ] Revisar dados pessoais de menores, política de privacidade,
  retenção, exclusão, backups e responsável por cada instância.
- [ ] Corrigir estrutura de enquetes/eventos apontada no comentário de
  `firestore.rules`: remover listas de e-mails de documentos legíveis
  por todos os alunos. Planejar migração sem perder inscrições e votos.
- **Aceite:** licença e autorizações definidas; testes de privacidade
  reprovam qualquer leitura indevida.

## Fase 1 — configuração sem afetar o IFCE

- [ ] Criar `config/escola.json` e esquema validador para nome, tema,
  contato, módulos e e-mails institucionais.
- [ ] Extrair configuração Firebase duplicada de `index.html` e
  `admin-01-base-login.js` para um carregador por instância.
- [ ] Reprovar configuração vazia, inválida ou apontando para a origem
  quando o destino é outra escola — **sem fallback automático**.
- [ ] Garantir que o IFCE continue com sua configuração atual e sem
  mudanças de aparência/comportamento.
- **Aceite:** testes unitários e snapshot de inicialização; Portal e
  Admin usam o mesmo Firebase **da escola** e não alteram o original.

## Fase 2 — segurança e bootstrap por instalação

- [ ] Substituir a conta raiz e `cargosIniciais` fixos por provisionamento
  de administrador da escola, autorizado fora do navegador.
- [ ] Parametrizar `firestore.rules` e criar suíte de emulador com
  contas fictícias de duas escolas.
- [ ] Política de e-mail validado + aprovação, adaptável a escolas
  sem domínio institucional, sem acesso privilegiado automático.
- [ ] Adicionar proteção contra uso acidental do Firebase da origem.
- **Aceite:** negar acesso sem cargo, com cargo revogado e acesso cruzado;
  nenhuma credencial privada no cliente/repositório.

## Fase 3 — configuração de identidade e apresentação

- [ ] Implementar o **Assistente de Configuração Inicial** em cinco etapas
  segundo [a especificação](ASSISTENTE-CONFIGURACAO.md): identificação,
  aparência, Firebase, administrador inicial e revisão; sem dar privilégios
  pelo navegador ou fazer deploy automaticamente.
- [ ] Criar prévias do Portal e do Admin, validação acessível de campos,
  salvamento de rascunho sem segredos e bloqueio de etapas incompletas.
- [ ] Garantir que o mesmo carregador forneça a configuração Firebase da
  escola às duas interfaces, preservando sessões separadas.

- [ ] Aplicar nome da escola e do Grêmio a Portal e Admin sem mudar
  layout/funcionalidade do IFCE.
- [ ] Personalizar manifestos e ícones com recursos devidamente
  autorizados, tema, PWA e URL independente.
- [ ] Criar seção "Identidade do Grêmio" no Admin para edição de nome,
  logo, contatos e módulos, com validação e registro de auditoria.
- [ ] Criar "Sobre o sistema" e rodapé com créditos originais definidos
  pelo mantenedor do template, **sem campo editável para a escola**.
- **Aceite:** teste de atualização de identidade sem afetar permissões,
  ferramentas, cadastro ou atribuição original.

## Experiência de implantação guiada — melhorias para futuras fases

Além do assistente básico, o template deverá oferecer:

- [ ] **Verificação prévia ("pré-voo")**: diagnóstico de configuração vazia,
  Firebase duplicado ou do IFCE, domínios incompatíveis, regras não testadas,
  direitos de uso e privacidade pendentes; resultado claro "bloqueado/pronto".
- [ ] **Tutorial dentro do assistente**, com linguagem acessível,
  exemplos fictícios, links para ajuda e indicador de progresso por etapa.
- [ ] **Modo de demonstração** com dados fictícios, sem leitura ou escrita
  em projetos Firebase reais, e prévias de Portal e Admin.
- [ ] **Resumo de homologação para a escola**, sem segredos: o que foi
  configurado, testes realizados, pendências e responsável pela aprovação.
- [ ] **Erros e recuperação**: explicar o motivo de bloqueio sem sugerir
  reduzir permissões do Firestore ou compartilhar credenciais.
- [ ] **Ciclo de manutenção**: instruções de backup, troca de diretoria,
  atualização de versão, revogação de acessos e encerramento seguro.
- [ ] **Materiais de divulgação**: guia e ficha revisados em cada release,
  com exemplos simples, leitura em celular e recursos acessíveis.

Referências para a experiência escolar:
[Tutorial para escolas](GUIA-PARA-ESCOLAS.md) e
[Ficha da Escola](FICHA-DA-ESCOLA.md).
Essas melhorias são **propostas**, não funcionalidades existentes.

## Priorização das sete melhorias da plataforma

A [especificação detalhada das sete melhorias](SETE-MELHORIAS.md) define
escopo, regras de segurança, critérios de aceite e ordem de entrega.
**São propostas ainda não implementadas.**

**P0 (pré-requisitos obrigatórios):** resolver privacidade, autorização
para redistribuir, Firestore Rules, bootstrap de administrador por escola
e isolamento de Firebase — não há lançamento real antes disso.

**P1 (primeiro piloto fictício):**
- [ ] Central de Implantação com progresso verificável e publicação bloqueada
  até homologação
- [ ] Modo Demonstração sem Firebase real, contas ou estudantes verdadeiros
- [ ] Verificador de Segurança com evidências do emulador e checklist humano
- [ ] Backup técnico seguro, retenção e restauração ensaiada com dados fictícios

**P2 (uso contínuo após o piloto):**
- [ ] Troca de Gestão do Grêmio com autorização independente e auditoria
- [ ] Atualizações versionadas sem perder personalizações nem misturar dados
- [ ] Central de Ajuda contextual nos dois aplicativos
- [ ] Interface institucional de acompanhamento de backups e recuperação

**Aceite geral:** isolamento confirmado para duas escolas fictícias,
créditos de origem fora do painel, recursos acessíveis, autorização de uso
e aprovação manual antes de disponibilizar a escolas reais.

## Fase 4 — distribuição e piloto seguro

- [ ] Gerar pacote/instalador reproduzível sem dados do IFCE.
- [ ] Documentar instalação, backup, atualização, recuperação e remoção
  de uma escola.
- [ ] Subir duas instâncias **de demonstração** com projetos Firebase
  separados, dados de teste e credenciais próprias.
- [ ] Testar o fluxo completo do assistente: prévia, retomada, validação
  de projeto Firebase, falha segura e aprovação manual de publicação.
- [ ] Executar regressão de Portal e Admin, emulador, testes mobile,
  atualização PWA, acessibilidade, desempenho e autenticação.
- [ ] Verificar isolamento, privacidade e créditos em ambientes distintos.
- [ ] Revisar custos, monitoramento, limites e manutenção por escola.
- **Aceite:** resultados aprovados, checklist assinado pela equipe
  responsável e autorização explícita para lançamento.

## Fase 5 — manutenção colaborativa

- [ ] Definir repositório do template e changelog das versões.
- [ ] Oferecer instruções de contribuição, correção de bugs,
  comunicação de vulnerabilidades e atualização de instâncias.
- [ ] Estabelecer um modo de atualizar código sem transferir
  dados escolares entre Firebase e sem substituir configuração local.
- [ ] Se houver demanda, avaliar no futuro plataforma central;
  **fora de escopo** deste modelo de instalações independentes.

## O que esta branch entrega agora

- [x] Levantamento dos acoplamentos da versão IFCE.
- [x] Plano de instalações totalmente separadas.
- [x] Contrato ilustrativo de personalização e créditos.
- [x] Tutorial voltado às escolas e ficha não sensível de preparação,
  com etapas futuras, pré-requisitos, testes e FAQ.
- [x] Especificação do Assistente de Configuração Inicial, estados,
  cinco etapas, bloqueios e testes futuros.
- [x] Critérios de segurança, privacidade, licenciamento e aceite.
- [x] Roteiro proposto para escola piloto e testes automatizados dos
  exemplos e documentação.
- [ ] **Não entrega** assistente funcional, instalador, criação automática de Firebase,
  nova interface do Admin, adaptação da lógica, licença definida,
  créditos de autor confirmados, deploy ou migração.

A versão de produção do IFCE **continua na `main`**.
