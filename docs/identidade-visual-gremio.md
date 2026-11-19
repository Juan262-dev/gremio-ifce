# Identidade visual do Grêmio IFCE — proposta institucional

Esta proposta substitui o estilo de "template de aplicativo" por um visual
mais próximo de um sistema feito para os estudantes e para a diretoria do Grêmio.

## Decisões

- **Sem degradês, brilhos, vidro fosco ou grandes sombras**. As duas interfaces
  usam cor sólida, bordas simples e uma hierarquia tipográfica coerente.
- **Verde como assinatura**, não como decoração. Verde aparece no cabeçalho,
  nas ações e nos estados selecionados.
- **Portal do Aluno claro**, com fundo neutro, áreas de conteúdo brancas,
  espaços moderados e barra de navegação com cinco ícones lineares.
- **Painel Administrativo escuro**, com aparência de ferramenta de gestão:
  categorias por abas, formulários diretos e tabelas legíveis.
- **Menos emojis decorativos**: marca "G" no cabeçalho, títulos de seção sem
  emojis e acesso rápido numerado. Ícones informativos dentro de recursos
  continuam quando contribuem para o significado.
- **Textos próprios do Grêmio**: tela de entrada fala de participação
  estudantil, avisos e ações no campus, sem slogans genéricos de tecnologia.

## Escopo do Pull Request

Arquivos de apresentação:
- `premium-portal.css`, `premium-admin.css`: substituição dos estilos.
- `index.html`: marcas, tela inicial e ícones lineares do menu.
- `admin.html`: marca e tela de acesso.
- `portal-navegacao.js`: rótulos de navegação sem emojis.
- `admin-08-resumo-abas.js`: título mais sóbrio na Central de gestão.
- `tests/premium.test.cjs`: verificações da nova paleta e apresentação.

Não mudam: nomes e IDs de seções, autenticação, coleções Firestore,
regras de permissões, travas de TI, handlers dos botões, dados escolares ou
a estrutura de navegação por grupos.

## Como validar

Os testes automatizados devem confirmar sintaxe, identidade, mapeamento das
seções e permissões. Ainda é necessária inspeção em navegador real:

1. Portal: entrada/cadastro, menu de cinco abas e recursos de estudos.
2. Portal: carteirinha, notificações, sugestões, acesso com teclado e impressão.
3. Admin: login, categorias, formulário, tabelas, alertas e modais.
4. Admin: verificar cargos e a opção "ver como" sem expor funções restritas.
5. Ambos: telas de 320 px a 1440 px e zoom de 200%.

**Não publicar nem mesclar automaticamente**. A nova identidade visual deve
ser revisada antes de qualquer publicação.
