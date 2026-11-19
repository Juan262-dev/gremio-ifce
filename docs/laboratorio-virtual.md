# Laboratório Virtual de Química — IFCE Crateús

## Situação
Primeira etapa implementada na branch de desenvolvimento
`feature/laboratorio-virtual-quimica`, sem merge na `main`.

O laboratório é um **recurso educacional virtual**, não um laboratório físico.
Não substitui docentes, práticas supervisionadas ou orientações institucionais.

## Portal do Aluno
- Nova aba "🧪 Lab." no menu inferior.
- Tabela Periódica interativa dos 118 elementos, com números atômicos, nomes,
  símbolos, massas aproximadas, períodos e famílias, pesquisa e filtro.
- Botões de elementos operáveis por toque, mouse e teclado.
- Calculadoras matemáticas de massa molar, quantidade de matéria,
  concentração molar e relação de diluição.
- Analisador de fórmulas sem `eval`: aceita índices, parênteses, colchetes e
  hidratos (por exemplo `CuSO4·5H2O`), rejeita fórmulas incorretas.
- Conteúdos complementares publicados no Firestore aparecem em cartões.
  O texto e os links passam por validação na apresentação.
- Tabela e calculadoras executam **localmente**, mesmo sem conexão após os
  arquivos do site já estarem disponíveis. Conteúdos do Firebase dependem
  de regras/consulta e podem não estar disponíveis offline.

Os valores de massas atômicas foram baseados na tabela do RDKit, arredondados
para fins didáticos. Para elementos instáveis, o valor costuma representar
um isótopo de referência; não é necessariamente uma massa atômica padrão.

## Painel Administrativo
- Seção "Gerenciar Laboratório Virtual" na aba Comunicação, visível para
  Presidência e TI conforme o controle de permissões existente.
- Cadastro de título, assunto, resumo explicativo e link HTTPS opcional.
- Salvar como rascunho ou publicar aos estudantes.
- Editar e excluir conteúdos com confirmação e registro administrativo.
- Nenhum aluno pode criar/editar conteúdos pela regra do Firebase.

## Firebase
Nova coleção `laboratorio_conteudos` com campos:
`titulo`, `assunto`, `descricao`, `link`, `publicado`,
`criadoEm`, e opcionalmente `atualizadoEm`. O e-mail de quem publica não é armazenado em documentos de acesso dos alunos.

Regras em `firestore.rules`:
- alunos ativos podem consultar **somente** `publicado == true`;
- rascunhos e publicação/edição/exclusão requerem Presidência ou TI;
- a data de criação não pode ser alterada; a ação da equipe fica registrada no log administrativo privado;
- campos e tamanhos são validados, além do protocolo HTTPS dos links;
- o app utiliza uma consulta com filtro `publicado == true`, em vez
  de listar todos os documentos para estudantes.

**Publicação futura:** as regras novas precisam ser ativadas no Firebase
de produção antes do merge na `main`. O merge no GitHub não publica regras
de Firestore automaticamente.

## Testar antes da publicação
```sh
npm install
npm run test:lab
npm run test:rules
```

O segundo comando executa o Firebase Emulator com projeto fictício.
Os testes devem passar antes de revisar o Pull Request. Depois verificar:
- navegação e responsividade em Android, iOS e desktop;
- seleção e busca na Tabela Periódica;
- massa molar de H2O, CO2, Ca(OH)2 e CuSO4·5H2O;
- mensagens de erro para fórmulas inválidas;
- restrições por cargo no Painel e visibilidade de rascunhos;
- funcionamento com conexão instável.

## Próximas etapas da versão completa
1. **Moléculas:** visualizador 2D/3D educacional, sem necessidade de instalar
   extensões, com modelos de substâncias introdutórias.
2. **Simulações:** balanceamento de equações e modelos matemáticos de
   soluções/pH, exclusivamente virtuais.
3. **Missões:** desafios por dificuldade que reaproveitem o quiz já existente;
   caso haja progresso individual no futuro, mantê-lo privado.
4. **Revisão pedagógica:** validação por responsáveis pelo conteúdo antes da
   disponibilização geral.

As etapas acima **não estão implementadas** nesta primeira versão.
