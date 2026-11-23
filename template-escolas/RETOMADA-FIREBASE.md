# Retomada do Firebase — plataforma universal do Grêmio

**Prioridade de desenvolvimento:** `template-escolas/` (Firebase).  
**Status:** candidato técnico em homologação. **Não liberar estudantes reais**.

## O que aproveitamos
- Portal do Aluno + Painel Administrativo com identidade configurável por escola.
- Firebase Authentication e Cloud Firestore exclusivos por instituição.
- Verificação de e-mail, cadastro pendente, autorização administrativa, avisos, eventos, sugestões, enquetes, materiais de estudo.
- Regras Firestore independentes com dados de inscrições e votos em subcoleções por UID.
- Assistente de preparação local e provisionamento administrativo fora da interface.
- Testes do Firestore Emulator, incluindo dois projetos fictícios sem compartilhamento de papéis/dados.
- Rodapés dos dois aplicativos exibem a referência ao Grêmio IFCE Campus Crateús; o painel da escola não oferece campo para mudá-la. A preservação jurídica da atribuição depende da licença aprovada.

A versão Supabase anterior está **pausada**, não apagada, e **não participa** do fluxo Firebase. Não copiar dados, logins, tabelas ou segredos entre provedores.

## Três etapas objetivas para piloto autorizado

### 1. Preparar código e testar sem serviços externos
Na raiz deste repositório:

```sh
npm install --no-audit --no-fund
npm run test:template:config
npm run test:template:rules
```

O emulador usa projetos de demonstração fictícios; não acessa o IFCE nem Firebase real. No `template-escolas/firebase.json`, `singleProjectMode: false` permite os IDs de ensaio A/B. A verificação por duas configurações **não equivale** a isolamento em produção.

### 2. Configurar somente o Firebase da escola
Um responsável técnico autorizado cria projeto Firebase novo para cada escola no [Console Firebase](https://console.firebase.google.com/), com Auth por e-mail, Firestore e domínio HTTPS próprio; escolhe a região, verifica custos, quotas e regras antes de ativar qualquer conta. **Nunca** apontar a outra escola para `gremioifce-92540` nem usar credenciais de serviço no navegador ou repositório.

Use `scripts/setup-school.cjs --dry-run` para ensaio local, depois o instalador local seguindo as instruções em [README.md](README.md). Para conferir o JSON gerado, sem rede:

```sh
node template-escolas/scripts/preflight-school.cjs template-escolas/public/config/installation.json
```

Para duas escolas fictícias com arquivos independentes:

```sh
node template-escolas/scripts/preflight-school.cjs A/installation.json B/installation.json
```

Este comando rejeita IDs/URLs reutilizados, instalações do IFCE, configuração incompleta, HTTPS inválido, regras ou hosting do template ausentes. **Não cria Firebase, não implanta regras e não faz deploy**.

### 3. Homologar antes da publicação
- Confirmar regras **realmente implantadas** no Firebase exclusivo da escola; testar Auth e RLS/Rules via SDK com contas fictícias confirmadas, incluindo bloqueios de acesso cruzado, enquetes, inscrições e cargos.
- Testar duas instalações em projetos reais independentes, verificando login, alunos, hospedagem, backups e recuperação.
- Revisar política de privacidade, exclusão e retenção de dados de menores, autoria/licença, atribuição e marcas.
- Obter aprovação institucional, definir gestores responsáveis e executar backup/restauração verificáveis.
- Só depois autorizar publicação manual; **merge de código não é homologação nem publicação**.

## O que falta no produto
Este template ainda não reproduz todos os módulos dos aplicativos IFCE (eleições, carteirinhas, finanças, laboratório, PWA completo etc.). Essas funcionalidades serão portadas em PRs separados e com regras/testes adequados; não pressupor que arquivos legados sejam reutilizáveis sem adaptações.

## Estado das integrações
O GitHub está disponível para testes, branches e PRs. Nesta etapa não há autorização técnica de uma conexão Firebase acessível para criar projetos ou publicar regras por este ambiente. Isso **não impede** continuar a evolução e os testes com emulador.

Documentação oficial:
- [Firebase: projetos e ambientes separados](https://firebase.google.com/docs/projects/dev-workflows/overview-environments)
- [Firebase: instalação e configuração do emulador](https://firebase.google.com/docs/emulator-suite/install_and_configure)
- [Firebase: testes de Security Rules](https://firebase.google.com/docs/rules/unit-tests)
