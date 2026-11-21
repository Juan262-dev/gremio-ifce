# Roadmap incremental — como transformar o plano em template

**Somente planejamento.** Uma futura implementação deve ser entregue em PRs
pequenos, testados e sem publicação/merge sem autorização.

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
- [x] Especificação do Assistente de Configuração Inicial, estados,
  cinco etapas, bloqueios e testes futuros.
- [x] Critérios de segurança, privacidade, licenciamento e aceite.
- [x] Roteiro proposto para escola piloto e testes automatizados dos
  exemplos e documentação.
- [ ] **Não entrega** assistente funcional, instalador, criação automática de Firebase,
  nova interface do Admin, adaptação da lógica, licença definida,
  créditos de autor confirmados, deploy ou migração.

A versão de produção do IFCE **continua na `main`**.
