# Primeira experiência — Portal do Aluno para todos os cursos

Esta melhoria ajusta a apresentação inicial do Grêmio IFCE sem alterar
a aparência geral, as funcionalidades ou as permissões já existentes.

## O que muda

A tela inicial mantém as **três etapas** e o layout atual:

1. **O Grêmio é seu** — apresenta o Grêmio aos estudantes de **todos os
   cursos** do IFCE Crateús, sem concentrar a comunicação em Química.
2. **Tudo em um lugar** — mostra o que o aluno encontra no portal:
   avisos, eventos, carteirinha, materiais de estudo e sugestões.
3. **Entre no Portal** — esclarece que o acesso usa o e-mail
   institucional e que novos cadastros passam por análise da gestão
   antes da liberação.

Também foi atualizado o exemplo de turma no primeiro acesso:
`1º ano A`, sem presumir um curso.

## Pequena melhoria de acessibilidade

As bolinhas da apresentação continuam com a **mesma aparência**,
mas agora possuem nomes para tecnologias assistivas, estado atual
(`aria-pressed`) e funcionam com **Enter** ou **Espaço**.
Os rótulos de e-mail e senha foram associados aos campos.

## O que não muda

- Não foram alterados os estilos ou o layout da página.
- Continuam iguais os IDs, botões, formulários, slides, funções de login,
  logout, recuperação de senha e envio de cadastro.
- Não altera campos de perfil, configuração de matérias ou recursos internos
  após o login.
- Não muda o Painel Administrativo, coleções, dados ou regras do Firebase.
- Não muda o mecanismo de aprovação de novos estudantes.
- Não remove recursos de Química; eles continuam disponíveis em Estudos.

## Validação

```bash
npm run test:ui
npm run test:lab
npm run test:rules
```

A nova suíte `tests/primeira-experiencia.test.cjs` confere os textos
para todos os cursos, as três etapas, o login e cadastro existentes,
rótulos acessíveis, uso do teclado e a sintaxe JavaScript.

Antes de qualquer publicação, recomenda-se verificar manualmente a
apresentação no celular, o login de um aluno cadastrado e a solicitação
de cadastro de um novo aluno em uma conta de teste.

**Branch de desenvolvimento:** `feature/primeiros-passos-todos-cursos`.
**Sem merge ou publicação automática.**
