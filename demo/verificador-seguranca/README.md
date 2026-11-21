# Verificador de Segurança — simulação de pré-voo

> **DEMONSTRAÇÃO LOCAL, NÃO AUDITORIA REAL.** Este verificador foi
> desenvolvido para ensinar escolas e responsáveis técnicos a reconhecer
> erros de configuração antes de uma implantação. NÃO é uma ferramenta
> para validar projetos Firebase reais, não acessa dados e não gera
> autorização de publicação.

## Como usar

Abra o arquivo \`demo/verificador-seguranca/index.html\` em navegador moderno
ou entre pela Central de Implantação.

Escolha um dos cinco cenários ilustrativos:

1. **Exemplo coerente:** Escola A e Escola B têm projetos \`demo-*\`
   exclusivos, Portal e Painel de cada escola apontam ao mesmo ID de
   exemplo, e as URLs são fictícias.
2. **Compartilhamento indevido:** as duas escolas usam o mesmo ID fictício;
   o verificador bloqueia.
3. **Portal e Admin divergentes:** os apps da escola A usam projetos
   diferentes; o verificador bloqueia.
4. **Referência ao IFCE:** um projeto de origem, não fictício, é informado
   para ilustrar o bloqueio de reutilização do Firebase original.
5. **URL insegura:** endereço com HTTP não é aceito pelo exemplo.

Também é possível editar IDs e URLs de **exemplo** e clicar em
**Analisar cenário**. O resultado nunca é "**Aprovado para produção**".
Se houver inconsistência nos exemplos, aparece **BLOQUEADO**; caso
contrário, **PENDENTE**, pois as verificações reais exigem especialistas,
testes e aprovação institucional.

## O que a simulação avalia automaticamente

- Formato de identificadores exclusivamente demonstrativos \`demo-*\`;
- Portal e Painel da mesma escola com mesmo ID fictício;
- Escolas A/B usando IDs fictícios distintos;
- URLs de demonstração HTTPS em \`.example.invalid\`;
- Hospedagem fictícia separada entre escolas.

Isso **não comprova** Auth, permissões, regras Firestore, autorização,
privacidade ou segregação entre projetos de produção.

## Pendências obrigatórias para disponibilizar a escolas de verdade

- Licença, autoria e direitos de conteúdo.
- Privacidade de estudantes e correção de leitura de dados de
  enquetes/eventos.
- Security Rules aprovadas por testes no Firebase Emulator.
- Bootstrap privilegiado e auditável do primeiro administrador.
- Dois Firebase reais **separados em homologação**, com contas e
  dados **fictícios**, incluindo testes de acesso cruzado negado.
- Backup e restauração segura em ambiente de ensaio.
- Autorização explícita da direção e do responsável técnico.

**Não copiar o Firebase, contas, dados ou regras atuais do IFCE.**
Não criar contas privilegiadas por páginas públicas; não afrouxar regras
para "passar" na verificação.

## Garantias técnicas da simulação

- Apenas arquivos locais \`index.html\`, \`styles.css\`, \`model.js\` e
  \`app.js\`; CSP \`connect-src 'none'\`, \`form-action 'none'\`.
- Nenhum SDK Firebase, rede, banco, login, ferramenta de deploy,
  \`localStorage\` ou \`sessionStorage\`.
- Só recebe IDs e URLs inventados; entradas não são gravadas ou enviadas.
- Os textos de entrada são tratados como texto, nunca executados como HTML.
- O retorno \`publication.allowed\` é **sempre false**, mesmo no cenário
  ideal. O estado "COERENTE (EXEMPLO)" significa somente formato de demo.
- O Portal/Admin original, configuração Firebase e \`firestore.rules\`
  permanecem inalterados.

## Critério de prontidão para valer

O ponto de sair da demonstração só chega depois que:
(1) o template multi-instalação seguro existir;
(2) licença/créditos e privacidade estiverem definidos;
(3) houver provisionamento privilegiado por escola, regras verificadas
e testes de isolamento/negação entre duas instalações fictícias;
(4) backups, correção de falhas, revisão manual e aprovação expressa
de publicação forem concluídos.

**A entrega deste PR não completa esses critérios e não publica nada.**
Veja também o [tutorial para escolas](../../docs/modelo-reutilizavel/GUIA-PARA-ESCOLAS.md).
