# Laboratório Virtual — módulos avançados

## Escopo desta branch
Branch: `feature/laboratorio-virtual-modulos-avancados`.
Complementa a primeira etapa (`laboratorio-quimica.js`) que já foi mesclada na `main`.

### Visualizador de moléculas
O aluno seleciona um dos seis modelos:
- Água (H₂O) — angular, ~104,5°
- Dióxido de carbono (CO₂) — linear, 180°
- Metano (CH₄) — tetraédrica, ~109,5°
- Amônia (NH₃) — piramidal trigonal, ~107°
- Trifluoreto de boro (BF₃) — trigonal plana, 120°
- Eteno (C₂H₄) — aproximadamente plano ao redor de cada carbono, ~120°

Modelos 3D ilustrativos em SVG, girados por controles de faixa acessíveis via
teclado e toque. Não usa bibliotecas externas, downloads de estruturas, câmeras
nem modelos de nuvem. Raio atômico e comprimento das ligações não estão em escala.
É uma visualização educacional conceitual, não um cálculo de estrutura quântica.

### Simulador simbólico de balanceamento
Cinco equações introdutórias para ajustar coeficientes inteiros entre 1 e 12.
Mostra contagem de átomos nos reagentes/produtos, mensagens de correção e
solução explicada. Índices das fórmulas são mantidos. Não há informações de
temperatura, pressão, reagentes materiais, preparação ou procedimento prático.

### pH e soluções
Controle deslizante de 0 a 14 com pH, pOH, [H⁺], [OH⁻], indicador textual e
escala visual. Demonstra `pH = -log10[H⁺]` e `pH+pOH=14` em **modelo ideal
a 25 °C**. Não prevê atividade iônica, soluções concentradas, misturas ou o
comportamento real de substâncias.

### Missões educativas
Quatro missões principais com três perguntas cada (12 questões), em níveis
introdutório, intermediário e avançado. Feedback imediato, explicações e
possibilidade de tentar novamente. As respostas e as notas **não** são salvas.

Uma quinta opção, "Desafio extra do Grêmio", aparece quando o banco de questões
`questoes` contém material de Química com enunciado e quatro alternativas
válidas. O banco já é editável pela Presidência/TI no **Painel Administrativo >
Comunicação > Banco de questões (Quiz)**; não duplicamos a administração.

### Progresso e privacidade
O documento em `laboratorio_progresso/{email}` contém apenas:
- `concluidas`: lista de IDs de missões principais concluídas;
- `atualizadoEm`: timestamp do servidor.

Regras do Firestore:
- somente o estudante autenticado e ativo pode obter o seu documento;
- leitura de lista (inclusive para a diretoria) negada;
- escrita/deleção só no próprio documento e com os campos permitidos;
- identificadores de missão restritos a quatro valores conhecidos;
- sem nome, turma, respostas, pontuação, tentativas, classificação pública.

Se as regras de produção ainda não estiverem publicadas ou o Firestore não
estiver acessível, o aluno ainda pode resolver os desafios; o app indica que o
progresso é apenas desta sessão. O progresso completado não sincroniza enquanto
o acesso estiver indisponível.

**Atenção:** o merge de código no GitHub não publica as regras no Firebase.
A primeira etapa do laboratório já usa `laboratorio_conteudos`; esta etapa
adiciona `laboratorio_progresso`. Publicar o arquivo completo
`firestore.rules` em produção quando o teste do Firebase Emulator e a
revisão estiverem aprovados.

## Testes de desenvolvimento
```sh
npm install
npm run test:lab
npm run test:rules
```

O primeiro testa ciência, moléculas e missões sem acesso à rede.
O segundo usa o Firebase Emulator no projeto fictício `demo-gremio-ifce`.
A action `Testar regras do Firestore` executa os dois comandos na PR.

Antes de disponibilizar aos alunos:
- conferir no celular a tabela, controles de rotação, pH e perguntas;
- validar acessibilidade dos rótulos, navegação por teclado e feedback;
- fazer revisão pedagógica com docente de Química;
- garantir que só o titular consulte o progresso pessoal;
- publicar as novas regras Firebase e conferir rascunhos/administração;
- testar no navegador sem conexão e com conexão instável.

## Segurança
Todas as simulações são exclusivamente **simbólicas e virtuais**; nunca
executar experimentos físicos a partir dos exemplos. Alunos devem seguir as
orientações dos professores e as normas de segurança do laboratório do IFCE.

O usuário não fornece dados químicos que executem código. O texto do Firestore
e as questões do Banco de Questões são renderizados com `textContent`; os
desafios não carregam scripts ou HTML de terceiros.


## Melhoria pontual — favoritos da Tabela Periódica

Na área **Tabela Periódica**, cada estudante pode selecionar um elemento e
marcá-lo com a estrela "Adicionar aos favoritos". Os elementos destacados
aparecem numa lista de revisão com atalhos, contador e filtro visual.

- A lista contém apenas números atômicos (1–118); valores inválidos são
  descartados e elementos duplicados são removidos.
- A lista fica no armazenamento **local do navegador**, separada pelo UID do
  usuário autenticado. **Não é sincronizada** entre celulares/computadores e
  não é gravada no Firebase.
- Se o navegador bloquear o armazenamento local, os elementos ainda podem
  ser marcados durante a sessão, mas não persistem após recarregar a página.
- Não há nova coleção, regra ou publicação no Firebase para esta melhoria.
- O recurso não altera nem exclui os dados acadêmicos já salvos.
- Estrelas e botões possuem rótulos acessíveis e funcionam por toque e teclado.

Testes em \`tests/laboratorio.test.cjs\` verificam normalização, isolamento
entre contas, persistência simulada e recuperação de dados corrompidos.
