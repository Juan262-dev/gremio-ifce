# Carteirinha digital do Grêmio IFCE — versão inicial

## Objetivo

Complementar o cartão de participação já existente no Portal do Aluno com uma
carteirinha visual e um QR Code individual. A emissão é **opcional**, destinada
apenas à identificação interna em atividades organizadas pelo Grêmio.

A carteirinha **não é um documento oficial do IFCE**, não substitui a
carteira estudantil e não serve, sozinha, como prova de identidade.

## Fluxo do aluno

1. Entrar no Portal do Aluno com cadastro ativo.
2. Abrir **Minha carteirinha digital**.
3. Selecionar **Gerar minha carteirinha**.
4. Exibir o cartão com nome e turma, além do QR Code.
5. Opcionalmente, salvar a imagem do QR Code.
6. Se o QR foi compartilhado ou perdido, escolher **Renovar QR Code**.
   A renovação substitui o código antigo no Firebase e impede novas validações
   daquele QR. O aluno pode solicitar à Presidência/TI a exclusão da carteirinha.

A turma vem do cadastro oficial `alunos`; quando ausente, o portal pode mostrar
a turma autodeclarada no perfil, que não deve ser tratada como verificada.

## Fluxo da Presidência/TI

1. Entrar no Painel Administrativo com cargo autorizado.
2. Em **Alunos → Conferir Carteirinha Digital**, colar o link/identificador.
   Outra opção é ler o QR usando a câmera do celular, que abrirá o Painel
   Administrativo e exigirá autenticação.
3. O painel confirma a existência do código consultando **o Firestore no
   servidor** e confere se o cadastro está ativo e não está suspenso.
4. Conferir presencialmente se a pessoa corresponde à identificação exibida.
5. Opcionalmente, selecionar um evento e conferir se a pessoa está inscrita.
6. Somente depois dessa conferência, confirmar a presença. O registro será
   salvo uma única vez em `presencas_eventos/{eventoId}/alunos/{email}`.

**Importante:** estar na lista de espera não autoriza presença; não é possível
confirmar alguém não inscrito pelo botão. A identificação visual cabe à equipe.

## Privacidade e segurança

- O QR inclui um link para `admin.html` e um código aleatório de 256 bits.
  O link usa fragmento (`#`), que não é enviado ao servidor web.
- Não se inclui nome, turma, e-mail, senha ou UID no conteúdo do QR.
- O Firestore armazena um único documento em `carteirinhas/{email}` com
  `codigo` e `criadoEm`. A leitura do próprio documento exige login ativo;
  consultas à coleção por código são restritas à Presidência/TI.
- Renovar o código revoga o identificador anterior na consulta.
- Registros de presença guardam somente e-mail, conferente e data/hora.
- Regras do Firestore impõem inscrição no evento, cadastro ativo, autorização
  administrativa e data da confirmação gerada pelo servidor.
- Imagens/screenhots do QR podem ser copiadas; a conferência é sempre presencial.
- O download é apenas da imagem do QR, não de dados sensíveis adicionais.

## Implantação

Esta funcionalidade está na branch `feature/carteirinha-digital` e deve
permanecer fora da `main` até a revisão.

A instalação requer que as novas regras de `carteirinhas` e
`presencas_eventos` sejam validadas e publicadas **antes** do novo Portal e
Painel; caso contrário, a emissão e os registros de presença serão negados.

Testes com dados fictícios (Firebase Emulator):

```sh
npm install
npm run test:rules
```

Recomenda-se testar manualmente em um celular Android e um iPhone, verificar
o acesso por cargos, o QR salvo, o comportamento offline, a renovação e a
presença em eventos antes de liberar aos alunos.
