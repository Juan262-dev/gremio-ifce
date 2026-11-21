# Plano técnico: modelo reutilizável para Grêmios Estudantis

> **Status: planejamento e exemplos de configuração, NÃO uma instalação pronta.**
> Este PR não altera `index.html`, `admin.html`, scripts de execução, permissões,
> bancos de dados, nem configurações da versão atualmente publicada do IFCE.

## Comece aqui — guia para escolas

Se a instituição quer conhecer ou futuramente adotar o sistema, use primeiro
o [Tutorial para escolas](GUIA-PARA-ESCOLAS.md) e a
[Ficha da Escola](FICHA-DA-ESCOLA.md). Esses documentos separam o que já
pode ser preparado do que depende da futura implementação do template.
Nenhum deles é um instalador executável.

## 1. Objetivo e escolha da arquitetura

Oferecer o Portal do Aluno e o Painel Administrativo como **uma instalação
independente para cada escola**, aproveitando o código comum sem conectar
instituições diferentes ao mesmo banco de dados.

Cada escola participante terá:

- Seu próprio repositório ou distribuição do código, hospedagem e endereço.
- Seu próprio projeto Firebase (Authentication, Firestore e serviços usados).
- Estudantes, diretoria, permissões, coleções e dados separados.
- Nome, identidade visual, horários/contatos e módulos configuráveis.
- Créditos públicos à origem do projeto e ao autor original, fora do painel de
  personalização da escola.

**Não adotar multi-tenant no Firestore atual** nesta fase. Separação por projeto
Firebase simplifica o isolamento e permite que cada escola administre seus
próprios custos, domínios autorizados, privacidade e encerramento de uso.

```text
                 Código-base com versões verificadas
                                |
                  +-------------+-------------+
                  |                           |
          Instalação Escola A         Instalação Escola B
          Portal / Admin              Portal / Admin
          Domínio / PWA A             Domínio / PWA B
          Firebase Projeto A          Firebase Projeto B
          Auth / Firestore A          Auth / Firestore B
          Gestores / Alunos A         Gestores / Alunos B
                  |                           |
                  +----- Nenhum dado comum ---+
```

Dentro de **uma mesma escola**, Portal e Admin continuam conectados ao **mesmo
projeto Firebase daquela escola**. A sessão nomeada do Admin deve continuar
separada da sessão do aluno no mesmo navegador, como no código atual.

## 2. Situação atual verificada no repositório

| Local existente | Acoplamento identificado | Ação na futura implementação |
| --- | --- | --- |
| `index.html` | Configuração Firebase do IFCE embutida no HTML, textos e e-mail institucional específicos | Centralizar configuração; separar texto institucional |
| `admin-01-base-login.js` | Outra cópia da configuração Firebase, e-mail raiz e `cargosIniciais` fixos | Carregar configuração da instalação; inicializar o primeiro gestor por processo seguro |
| `firestore.rules` | `rootEmail()` aponta para conta fixa do IFCE | Criar bootstrap/identidade privilegiada por escola; testar regras antes de qualquer deploy |
| `admin.html` e demais `admin-*.js` | Nomes, textos, relatórios e operações relacionados ao IFCE | Classificar cada referência como texto personalizável, regra de negócio ou recurso opcional |
| `manifest.webmanifest` e `manifest-admin.webmanifest` | Nome, descrição, ícones e URLs são da instalação IFCE | Gerar manifestos específicos para cada escola |
| `sw.js` | Cache e fallback próprios do site atual | Usar versão e escopo por instalação; testar arquivos e dados offline |
| `tests/firestore.test.cjs` | Contas e domínios fictícios relacionados ao IFCE | Parametrizar testes por configuração fictícia sem tocar produção |
| `imagens/`, `icon-*.png` | Arquivos da instalação atual | Auditar autoria e autorização de redistribuição antes de empacotar |

**Bloqueio de privacidade existente:** o próprio `firestore.rules` informa
que enquetes e eventos ainda mantêm listas de e-mails dentro de documentos
legíveis por estudantes. **Não distribuir a plataforma para uso real em
outras escolas antes de corrigir e testar o modelo desses dados.**

Nenhuma chave, e-mail real, conta administrativa ou informação de estudantes
do IFCE deve entrar no modelo distribuído. Configurações Firebase usadas pelo
cliente não são segredos por si só, mas não podem apontar para o projeto IFCE.

## 3. Contrato de configuração proposto

Nesta fase o contrato é **documentado**, ainda não lido pelos aplicativos.
Os arquivos em `exemplos/` são fictícios e inválidos para produção.

| Camada | Exemplos de campos | Quem altera |
| --- | --- | --- |
| Identidade escolar | escola, campus, cidade, Grêmio, descrição, contato público | Gestor da escola |
| Aparência | cor primária, logo próprio, nomes visíveis | Gestor da escola |
| Módulos | mostrar estudos, laboratório, eleições, atividades | Gestor, dentro dos módulos liberados pela instalação |
| Instalação | URL, ID da instância, projeto Firebase exclusivo, domínios de acesso | Responsável técnico pela instalação |
| Permissões | cargos, gestão das contas, primeiro administrador, regras Firestore | Sistema de provisionamento + administradores autorizados |
| Créditos originais | instituição de origem, nome público confirmado do autor, projeto original, atribuição | Mantenedores do projeto-base; **não aparece como opção de edição** |

**Importante:** esconder um módulo na interface **não dá nem remove
permissão no Firestore**. A proteção de operações deve continuar nas
Security Rules e, se houver serviços privilegiados, no servidor.

A configuração da escola precisa ser validada na instalação, antes que
Portal ou Admin carreguem o Firebase. Não fazer fallback silencioso para
o projeto original. Em caso de configuração ausente ou inválida, **não
inicializar Firebase** e mostrar uma página de configuração pendente.

### Assistente de configuração inicial (novo escopo do plano)

O futuro template terá um **assistente em cinco etapas** (identificação,
aparência, conexão Firebase, administrador inicial, revisão) para orientar a
escola sem exigir edição de código para a personalização visual. O navegador
não criará projetos Firebase nem administradores privilegiados. Antes da
ativação, o responsável técnico valida isolamento, regras e privacidade;
publicar exige aprovação explícita, sem deploy automático por PR.

Ver [especificação do Assistente de Configuração Inicial](ASSISTENTE-CONFIGURACAO.md)
para telas, estados, regras e critérios de aceite. **Essa interface ainda
não foi implementada** e não altera o Portal/Admin do IFCE.

## 4. Instalação, gestão e dados

1. Criar um projeto Firebase **novo e exclusivo** para cada escola;
   autenticação e Firestore inicialmente vazios.
2. Gerar a configuração cliente dessa escola, URLs de hospedagem e domínios
   autorizados. Não reutilizar nenhum recurso Firebase do IFCE.
3. Definir política de cadastro: domínio institucional, ou alternativa de
   e-mail com verificação e aprovação manual quando a escola não tiver domínio.
4. Gerar/validar as Security Rules aplicáveis e testar com emulador local.
5. Provisionar o administrador inicial fora do navegador, com processo
   controlado e conta própria da instituição. Nada de contas de exemplo
   pré-carregadas com acesso privilegiado.
6. Publicar Portal e Admin somente **depois** de testes de permissões,
   acesso, formulários, PWA e privacidade e de uma aprovação explícita.
7. Operar backups, recuperação, transferência de mandato, remoção de
   estudantes, suporte e atualizações de segurança para cada escola.

**Não copiar dados existentes do IFCE** ao criar uma escola. O modelo deve
começar com banco limpo e dados de demonstração exclusivamente fictícios
enquanto estiver em testes.

## 5. Créditos e atribuição

Objetivo: manter um registro público de **onde o software começou** e
**quem o criou**, mesmo que a escola mude nome, tema ou logo.

Localização proposta:
- Tela "Sobre o sistema" e rodapé dos dois aplicativos;
- Documento `NOTICE`/créditos na distribuição;
- Documentação do projeto original e referência ao repositório.

A atribuição de origem deve ser código/metadados de distribuição **separados
da configuração editável do Grêmio**. A escola poderá aparecer como
"Personalizado por...", sem substituir o crédito original. O nome público
exato do criador original precisa ser confirmado com ele antes de publicar,
pois não se deve presumir autoria pessoal a partir de contas ou commits.

**Limite real:** em uma instalação administrada por terceiros, ou num fork
com código-fonte acessível, ninguém consegue impedir *tecnicamente* que
alterem o HTML e removam o crédito. Podemos impedir edição pelo **painel
do aplicativo**, manter histórico e definir obrigações de atribuição por
licença/termos adequados, sujeitos à avaliação jurídica.

**Situação de licenciamento:** o repositório está público, mas não foi
encontrado arquivo de licença no diretório principal. Repositório público
não significa automaticamente autorização para cópia e redistribuição.
Antes de permitir novas instalações, confirmar titulares de direitos,
licença adequada e autorização de uso dos recursos de terceiros.

## 6. Compatibilidade com o Grêmio IFCE

O IFCE continua em sua própria instalação, com seu banco e credenciais.
A futura extração de um modelo reutilizável deve acontecer em branch,
sem substituir ou reprovisionar a instalação original.

Critérios para aprovar a futura implementação:

- O Portal e o Admin do IFCE continuam funcionando sem mudança visual e
  sem migração automática.
- Uma escola A não pode ler nem alterar dados de B nem do IFCE.
- O projeto original não é usado como fallback de conexão.
- Nenhuma conta privilegiada, chave de serviço ou dado real é publicado
  na distribuição para outras escolas.
- Os créditos de origem são visíveis, não editáveis no Admin, com autoria
  pública confirmada e licença definida.
- Há documentação de instalação, restauração, desativação e atualização.
- Há testes automatizados **e** validação manual de duas instalações
  isoladas antes de publicar o template como utilizável.

## 7. Próximas leituras

- [Tutorial para escolas (passo a passo, ainda não instalável)](GUIA-PARA-ESCOLAS.md)
- [Ficha de preparação da escola](FICHA-DA-ESCOLA.md)
- [Assistente de Configuração Inicial (especificação)](ASSISTENTE-CONFIGURACAO.md)
- [Sete melhorias planejadas para a plataforma](SETE-MELHORIAS.md)
- [Instalação piloto](INSTALACAO-PILOTO.md)
- [Etapas e critérios de aceite](ROADMAP.md)
- [Exemplos de configuração fictícia](exemplos/escola-a.exemplo.json)
- [Créditos originais (modelo não editável pela escola)](exemplos/creditos-originais.exemplo.json)

> Este PR aprova **o plano**, não publica um instalador nem libera uso de
> dados de estudantes de outras escolas.
