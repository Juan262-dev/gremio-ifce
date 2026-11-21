# Modo Demonstração — Portal do Aluno e Painel Administrativo

**Protótipo interativo com informações fictícias**, separado dos aplicativos
reais do Grêmio IFCE. Não é um clone funcional completo nem uma instalação
pronta para outra escola. Esta simulação não acessa Firebase real.

## Como abrir

1. Abra \`demo/modo-demonstracao/index.html\` no navegador.
2. Escolha Escola Horizonte **(fictícia)** ou Colégio Aurora **(fictício)**.
3. Alterne entre **Portal do Aluno** e **Painel Administrativo**. Não há login.
4. Experimente os fluxos: avisos, eventos, voto ilustrativo, sugestões,
   carteirinha fictícia, estudos de amostra, criação de comunicados/eventos,
   nova enquete, moderação de sugestões, aprovação simulada de cadastro e
   visualização da diretoria.
5. Volte ao Portal para ver os dados simulados criados no Painel.
6. Use **Reiniciar esta escola** ou **Reiniciar tudo**. Atualizar a página
   também restaura todos os exemplos, pois nada fica salvo no servidor.

O arquivo também pode ser aberto a partir da
[Central de Implantação](../central-implantacao/index.html).

## Limites de segurança

- **Apenas memória da aba:** todo estado é reconstruído por fixtures locais
  declaradas em \`model.js\`, sem localStorage, sessionStorage ou cookies.
- **Sem rede:** CSP \`connect-src 'none'\`, \`form-action 'none'\`, scripts e
  estilos locais. Nenhum SDK ou dado do Firebase IFCE foi importado.
- **Nenhuma autenticação real:** alternar Portal/Painel é apenas uma
  representação visual. Aprovar um estudante aqui **não cria conta nem
  autoriza acesso ao Firestore**.
- **Dados criados são fictícios:** não digite nomes, e-mails, matrículas ou
  dados verdadeiros dos alunos. Todas as ações alteram somente a
  simulação da escola atual.
- **Isolamento de exemplos:** Escola A e Escola B possuem dados diferentes.
  Nenhuma ação na Escola A muda os exemplos da Escola B.
- **Conteúdo seguro:** a UI insere entradas por \`textContent\`, não
  interpreta código HTML digitado pelo visitante.
- **Sem publicação:** não há botão de deploy, vinculação à hospedagem ou
  comunicação com os sites existentes.

As funções exibidas são **uma demonstração dos fluxos principais**, não
incluem o Laboratório Virtual, eleições reais, financeiro, todos os
recursos de carteirinha ou qualquer operação administrativa protegida
da versão original.

## Testes

\`\`\`sh
npm run test:ui
node --test tests/modo-demonstracao.test.cjs
\`\`\`

Os testes verificam isolamento A/B, votos, eventos, sugestões,
administração simulada, reset, validação de entradas, presença de
avisos e bloqueio de conexão externa. A suíte principal de regras roda
no Firebase Emulator com dados fictícios; **o demo não acessa o emulador**.

## Próximos passos

Ver [as sete melhorias propostas](../../docs/modelo-reutilizavel/SETE-MELHORIAS.md)
e [o tutorial para escolas](../../docs/modelo-reutilizavel/GUIA-PARA-ESCOLAS.md).
Antes de uma versão reutilizável real: remover dependências do IFCE,
corrigir exposição de dados em enquetes/eventos, implementar regras,
administrador seguro, licenciamento/créditos confirmados e homologação de
duas instalações independentes. A instalação só poderá ser publicada
depois de aprovação explícita.
