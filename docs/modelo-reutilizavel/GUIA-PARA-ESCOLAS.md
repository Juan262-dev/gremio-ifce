# Tutorial para escolas — como levar o sistema do Grêmio à sua instituição

> ⚠️ **STATUS: GUIA DE PREPARAÇÃO / IMPLEMENTAÇÃO FUTURA.**
> O modelo para outras escolas **ainda NÃO está pronto para ser instalado**.
> Hoje, este repositório contém a versão específica do Grêmio IFCE e uma
> proposta de template. Não faça uma cópia do app atual apenas trocando as
> configurações do Firebase: a autenticação, as regras e alguns textos ainda
> estão ligados à instalação original. **Não publique com dados reais de alunos.**
>
> Este tutorial informa o que uma escola **pode preparar agora** e como será
> a implantação **quando o template genérico for concluído, testado e liberado**.

## Em 1 minuto: o que vamos oferecer?

Cada escola poderá ter **dois aplicativos próprios**:

- **Portal do Aluno:** avisos, eventos, carteirinha e demais recursos liberados.
- **Painel Administrativo:** gestão do Grêmio e dos seus conteúdos, respeitando cargos.

Os dois aplicativos de **uma mesma escola** compartilharão o **Firebase
dessa escola**. **Escolas diferentes terão Firebase, administradores,
estudantes, hospedagem e dados separados**, sem conexão com o banco do IFCE.

A escola poderá alterar nome, identidade visual, logo, contatos e módulos
suportados. A autoria e a instituição de origem serão creditadas em ambos,
fora do editor do painel. O mantenedor original **não** ganha acesso automático
aos dados das outras escolas.

## Quem faz o quê?

| Participante | Responsabilidade |
| --- | --- |
| **Grêmio** | Escolher nome, logo, identidade visual, textos e recursos desejados; testar o uso com dados fictícios |
| **Direção ou responsável autorizado** | Aprovar uso institucional, responsáveis pelos dados, políticas de privacidade, liberação e divulgação |
| **Responsável técnico de confiança da escola** | Criar o Firebase próprio, preparar contas e permissões, testar segurança, homologar e publicar |
| **Mantenedores do projeto-base** | Entregar e atualizar template genérico e documentação, manter créditos e correções de segurança |

O Grêmio não precisa saber programar para preencher as informações escolares
**quando o assistente estiver implementado**. A instalação técnica e a
proteção dos dados continuam exigindo uma pessoa qualificada.

## Antes de começar: situação do projeto

| Atividade | Situação atual |
| --- | --- |
| Escolher nome, logo, responsáveis e objetivos da escola | ✅ Pode preparar agora |
| Ler este tutorial e preencher a ficha escolar | ✅ Pode preparar agora |
| Estudar os passos oficiais do Firebase | ✅ Pode fazer agora |
| Configurar Firebase separado e instalador pelo assistente | 🕒 **Funcionalidade futura**, ainda não operacional |
| Conectar o Portal e Admin genéricos à nova escola | 🕒 **Ainda não implementado** |
| Publicar um app de outra escola com dados reais | ⛔ **Não autorizado nesta fase** |

### Preparação — a escola pode fazer agora

1. Identifique a escola, o campus e o nome do Grêmio.
2. Defina **um contato institucional público**, responsáveis e uma pessoa
   de apoio técnico autorizada.
3. Separe logotipo, cores, descrição e links públicos, com autorização de uso.
4. Decida quais recursos fazem sentido: avisos, eventos, carteirinha,
   enquetes, estudos, laboratório, eleições — somente os que o template
   final suportar e cujas regras estejam seguras.
5. Defina como novos estudantes serão verificados e aprovados, inclusive
   se não existe e-mail institucional.
6. Faça uma avaliação de privacidade: que dados serão necessários,
   quem poderá acessar, por quanto tempo, como corrigir/excluir e como
   atender estudantes/responsáveis. Combine isso com a direção.
7. Preencha a [Ficha da Escola](FICHA-DA-ESCOLA.md). **Não inclua senhas,
   dados de alunos, documentos pessoais ou chaves de serviço**.

**O que a escola recebe no futuro:** um pacote de instalação específico,
o assistente em cinco etapas, instruções de atualização e checklists
de validação. **Esse pacote ainda não existe para uso real.**

## Tutorial de implantação — etapas futuras, após liberação do template

### 1. Confirmar autorização e escolher uma versão liberada

- Verifique se o projeto-base já disponibilizou um **template genérico**
  marcado como pronto para instalação. O código atual do IFCE **não é**
  esse template.
- Confirme licença e direitos de uso do código, logos e materiais de
  terceiros, e a forma correta de exibir os créditos originais.
- Escolha um responsável pelos dados estudantis, uma política de
  privacidade/termos e um canal de suporte.
- Faça um piloto com dados fictícios e sem contas reais de alunos.

**Bloqueio atual:** o projeto ainda precisa revisar e testar a exposição
de e-mails em enquetes/eventos, retirar acoplamentos de autenticação do
IFCE, definir licença e autoria pública confirmada. Antes disso, **não
redistribuir para uso real**.

### 2. Criar o Firebase exclusivo da escola (responsável técnico)

Quando o template estiver pronto:

1. Abra o [Console do Firebase](https://console.firebase.google.com/) em
   uma conta institucional controlada pela escola, nunca na conta do IFCE.
2. Crie um **novo projeto Firebase** para aquela instituição e registre
   um **aplicativo Web**. Anote o `projectId` e os campos de configuração
   pública Web somente no local técnico previsto pelo futuro instalador.
3. Ative os produtos necessários ao template, como **Authentication**
   (método de login aprovado pela escola) e **Cloud Firestore**.
4. Configure domínios de autenticação permitidos, política de cadastro,
   recuperação de acesso e verificação de e-mail. Não reutilize o domínio
   institucional do IFCE em outra escola.
5. Instale as **regras de segurança próprias do template genérico**, após
   revisão e testes no emulador. **Nunca copie `firestore.rules` da versão
   IFCE como se fossem regras prontas para outras instituições.**
6. Ajuste alertas de custo, permissões das contas técnicas, backup e
   recuperação, conforme os serviços utilizados.

**Importante:** os dados públicos de configuração do aplicativo Web
identificam um projeto, mas **não garantem segurança** por si só.
A segurança real depende de autenticação, regras e operações privilegiadas
bem implementadas. Nunca cole chaves privadas, `private_key`, arquivos
de conta de serviço, tokens do Admin SDK ou senhas em páginas, repositórios,
fichas ou capturas públicas.

Referências oficiais: [registrar aplicativo Web](https://firebase.google.com/docs/web/setup?hl=pt-br),
[Authentication Web](https://firebase.google.com/docs/auth/web/start?hl=pt-br),
[Security Rules e emulador](https://firebase.google.com/docs/firestore/security/test-rules-emulator?hl=pt-BR).

### 3. Usar o Assistente de Configuração Inicial (quando disponível)

O instalador futuro terá **cinco etapas**:

1. **Escola e Grêmio:** nome, unidade, descrição e contato institucional.
2. **Visual:** logo, cor, títulos e prévia de Portal e Admin.
3. **Firebase:** validação técnica do projeto **exclusivo da escola**.
4. **Primeiro gestor:** confirmação de criação segura da conta
   administrativa, em procedimento privilegiado feito pelo responsável
   técnico — nunca um botão público que dá acesso de administrador.
5. **Revisão:** checagem de privacidade, regras, créditos de origem,
   funcionalidades e pedido de homologação.

A tela deverá indicar *rascunho*, *pendente*, *pronto para homologação* e
*apto à publicação*. **Salvar rascunho ou clicar em Continuar não publica
os aplicativos** e não dá novas permissões.

Até essa interface existir, as telas acima são **um plano**, não botões que
a escola já pode acessar. Consulte a
[especificação do assistente](ASSISTENTE-CONFIGURACAO.md).

### 4. Personalizar os dois aplicativos

Depois da implantação segura, a pessoa autorizada poderá preencher:

| O que personalizar | Onde deve aparecer |
| --- | --- |
| Nome da escola e do Grêmio | Portal e Admin |
| Logo, cor e título | Acesso e identidade visual dos dois apps |
| Avisos, eventos, notícias e descrição | Conteúdo da escola, não do IFCE |
| Módulos disponíveis | Menus autorizados, sem modificar permissões do banco |
| Contato institucional | Área de informações e ajuda |
| Créditos da origem | **Sempre visíveis, sem campo de edição pelo painel** |

O visual atual da escola original **não será substituído**. O template
genérico usará marca própria de cada instalação.

### 5. Criar e validar o administrador inicial

O responsável técnico autorizado provisionará o **primeiro administrador
daquela escola** por processo seguro, auditável e fora do acesso público.
O Grêmio define os integrantes e cargos; o sistema confirma permissões no
servidor/regras de dados, e não só escondendo botões.

A conta do criador original ou de outra escola **não terá acesso automático**.
A escola precisa definir recuperação de acesso e troca de diretoria ao fim
do mandato. Recomendam-se autenticação adicional para gestores, quando
compatível, e contas individuais em vez de senhas compartilhadas.

### 6. Fazer um piloto antes de publicar

Com contas **fictícias**, verifique:

- [ ] Portal e Admin exibem nome, cor, logo e endereço corretos.
- [ ] Aluno comum não consegue administrar o sistema.
- [ ] Novo cadastro depende das verificações e aprovações configuradas.
- [ ] Administrador e aluno têm sessões distintas no mesmo navegador.
- [ ] Conta da Escola A não consulta nem altera alunos da Escola B ou do IFCE.
- [ ] Avisos, eventos, carteirinha, enquetes e eleições respeitam permissões.
- [ ] E-mails/dados privados não ficam expostos em documentos coletivos.
- [ ] As regras Firestore passaram no emulador e nos testes automatizados.
- [ ] Acesso, navegação, contraste, teclado, celular e PWA foram conferidos.
- [ ] Os créditos originais aparecem em ambos os aplicativos.
- [ ] Backup, restauração e exclusão de registros foram testados em ambiente de ensaio.
- [ ] A direção/responsável técnico aprovou a publicação **explicitamente**.

**Se qualquer item falhar, não publicar.** Relate o erro ao responsável
técnico; não desative regras de segurança para fazer um teste "passar".

### 7. Publicar só após homologação

A escola terá **seu próprio endereço/site e hospedagem**, separados do
IFCE. O responsável técnico preparará o Hosting/domínio e a versão do
template aprovada, confirmará os domínios de autenticação e verificará a
prévia do Portal/Admin. Somente depois da aprovação expressa publicará
de forma controlada. **Este tutorial não dispara deploy.**

Veja a documentação oficial sobre
[Hosting](https://firebase.google.com/docs/hosting/quickstart?hl=pt-BR)
e [ambientes de teste e prévia](https://firebase.google.com/docs/hosting/test-preview-deploy?hl=pt-BR).
Serviços de hospedagem e Firebase podem ter limites ou custos; a escola
deve avaliar as condições do plano escolhido e criar alertas de orçamento.

### 8. Manter, atualizar e trocar a diretoria

- Tenha mais de uma pessoa responsável institucional pelo acesso técnico;
  não dependa da conta pessoal de um único aluno.
- Agende revisão periódica de permissões e atualizações de segurança.
- Guarde backups em local institucional protegido e teste restauração.
- Revogue acessos ao fim do mandato e documente transferência de gestão.
- Publique contato de suporte e solicitação de correção/exclusão de dados.
- Receba atualizações do template por versões testadas, sem misturar os
  dados entre escolas e sem sobrescrever personalizações.
- Se encerrar o uso, defina comunicação, exportação permitida,
  retenção/exclusão conforme a política institucional.

## Problemas comuns e como proceder

| Situação | O que conferir |
| --- | --- |
| "Instalação ainda não configurada" | A configuração técnica está incompleta; não tentar usar o Firebase do IFCE como alternativa |
| Login não funciona | Domínio autorizado, provedor de autenticação, verificação de e-mail e URL da escola |
| "Permissão negada" | Cargo, estado do cadastro e regras Firestore; **não afrouxar regras** para contornar |
| Logo ou tema não aparecem | Arquivo autorizado, caminho, formato, tamanho e cache da instância |
| Outra escola vê informações indevidas | **Suspender a implantação piloto** e revisar isolamento e regras imediatamente |
| PWA mostra nome antigo | Manifestos e cache específicos daquela instalação, sem afetar outras escolas |
| Custo acima do previsto | Uso de serviços, limites e alertas do projeto da própria escola |

## Melhorias planejadas para simplificar a adoção

O projeto também propõe sete recursos: **Central de Implantação**,
**Modo Demonstração**, **Troca de Gestão do Grêmio**,
**Verificador de Segurança**, **Atualizações sem perder personalizações**,
**Central de Ajuda** e **Backup e Recuperação**. Essas funções ainda
não são utilizáveis. O objetivo é fazer uma instalação guiada e segura,
com manutenção possível mesmo quando mudar a diretoria.

Veja [a especificação e a ordem de prioridades](SETE-MELHORIAS.md).
A escola pode preparar sua identidade com a
[Ficha da Escola](FICHA-DA-ESCOLA.md), mas não deve publicar os aplicativos
enquanto os bloqueios de segurança, licenciamento e testes não forem
resolvidos.

## Conhecer os aplicativos com dados fictícios

Já existe um [Modo Demonstração do Portal do Aluno e do Painel Administrativo](../../demo/modo-demonstracao/index.html).
A escola pode explorar avisos, eventos, inscrições, enquetes, sugestões e
comunicados ilustrativos, alternando entre duas escolas fictícias e
reiniciando as informações quando quiser. A demonstração **não conecta
Firebase**, não dá acesso à gestão real e **não substitui um sistema
instalável**. Os recursos mostrados são apenas fluxos representativos,
e não todas as funções disponíveis no IFCE.

## Verificador de Segurança — simulação educativa

O [Verificador de Segurança de demonstração](../../demo/verificador-seguranca/index.html)
mostra exemplos de erros a evitar: Firebase igual entre escolas, Portal e
Painel usando projetos diferentes, configuração apontando para o IFCE ou
URL insegura. Ele **não consulta Firebase real**, não verifica as regras,
não aprova contas e não autoriza publicação. As verificações técnicas
com emulador, licenças, privacidade e autorização institucional só podem
ser concluídas posteriormente por responsáveis qualificados.

## Ferramenta técnica para preparar a escola (ainda experimental)

O responsável técnico pode usar o
[assistente local](../../template-escolas/README.md) para preencher
nome, cor, contato, domínio e a configuração Web do Firebase da escola,
sem editar o arquivo JSON manualmente. Ele oferece **modo ensaio**
sem gravar arquivos e impede sobrescrever uma instalação já preparada.

**Atenção:** o assistente não publica os aplicativos e **não
substitui** os testes das regras, a revisão de privacidade, os direitos
de uso e a autorização institucional.

## Backup e recuperação

Já existe um **ensaio técnico com dados fictícios** para testar a
separação entre escolas e detectar cópias incompatíveis. Ele não
gera backup real, não acessa Firebase e não recupera documentos.

Antes de uma implantação real, a direção e o responsável técnico
devem aprovar uma política de retenção, acesso aos backups,
armazenamento protegido, ensaios de restauração e recuperação de
contas administrativas. Consulte
[o manual técnico](../../template-escolas/README.md).

## Perguntas frequentes

**Precisamos saber programar?** Para personalizar textos, logo e cores,
o objetivo é **não** precisar de código quando o assistente estiver
funcionando. A configuração técnica e a segurança exigirão suporte técnico.

**Podemos instalar hoje?** **Não**. O projeto ainda é específico do IFCE,
e não há template genérico liberado para escolas reais.

**Podemos usar o mesmo Firebase do IFCE?** **Não**. Cada escola terá seu
próprio projeto, usuários, dados, permissões e custos.

**Nossa escola não tem e-mail institucional.** O template futuro precisará
de uma política de verificação/aprovação de cadastro adequada ao caso;
isso será configurado e testado antes do piloto.

**Os mantenedores podem ver nossos dados?** O modelo foi planejado para
não conceder acesso automático aos mantenedores do projeto-base.

**Podemos retirar os créditos de criação?** A personalização da escola
não terá essa opção. A licença/atribuição definitiva será confirmada antes
de qualquer distribuição; administradores de código-fonte conseguem
alterar arquivos, por isso também é necessária uma regra de licença.

## Materiais complementares

- [Ficha da Escola para planejamento](FICHA-DA-ESCOLA.md).
- [Assistente de Configuração Inicial — especificação](ASSISTENTE-CONFIGURACAO.md).
- [Guia técnico de instalação piloto](INSTALACAO-PILOTO.md).
- [Etapas e pendências de implementação](ROADMAP.md).
- [Exemplos **fictícios e não publicáveis** das Escolas A e B](exemplos/escola-a.exemplo.json).

**Próximo marco do projeto:** entregar um template realmente independente,
corrigir os bloqueios de segurança/licença, implementar o assistente,
testar duas escolas fictícias isoladas e só então liberar distribuição
com aprovação humana.
