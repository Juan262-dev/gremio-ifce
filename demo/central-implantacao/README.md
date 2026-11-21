# Central de Implantação — protótipo isolado

**Primeira versão funcional de demonstração**, destinada a validar a experiência
proposta no planejamento das sete melhorias. **Não é um instalador**, não cria
Firebase, não configura Firestore Rules, não cadastra estudantes ou gestores,
não se conecta ao Portal/Admin IFCE e não publica aplicativos.

## Como experimentar localmente

Abra o arquivo index.html desta pasta em um navegador moderno. Os recursos
funcionam sem dependências, sem servidor e sem conexão com a internet.

- Navegue pelas 5 etapas ou use Continuar / Voltar.
- Edite escola e identidade visual fictícias; veja a prévia separada de Portal
  e Painel Administrativo.
- Escolha um logotipo PNG/JPG/WEBP de até 1 MB, exibido somente nesta aba.
- Na etapa de Firebase, apenas IDs começando com demo- são aceitos.
- Veja as instruções para o primeiro administrador **sem criar usuários**.
- Na revisão, conclua apenas a simulação; a publicação permanece bloqueada.
- Salvar rascunho usa sessionStorage, somente na aba atual, com uma lista
  estrita de campos de demonstração. Não salva arquivo de logotipo.
- Reiniciar dados de exemplo remove esse rascunho local.

Não use dados pessoais reais, endereços privados, senhas, chaves, informações
de alunos nem conta de serviço. A configuração de exemplo não é adequada para
produção.

## Segurança e isolamento

- Há Content-Security-Policy com connect-src 'none': nenhuma conexão HTTP
  ou Firebase é permitida por esta página.
- Nenhum SDK, URL remoto, API key ou projectId real é incluído.
- Valores de usuário são exibidos por textContent / DOM seguro; não há HTML
  de usuário interpretado.
- Cores são limitadas a #RRGGBB; arquivos de logo ficam só na memória da aba.
- Não há caminho para publicar ou elevar privilégios: releaseStatus().allowed
  retorna false independentemente do formulário.
- A simulação não toca index.html, admin.html, firestore.rules, manifests,
  service worker nem aplicações existentes.

## Evolução futura (outro PR, somente após segurança)

Implementar o template independente de cada escola, regras e privacidade,
bootstrap administrativo privilegiado, homologação de instâncias fictícias
A/B, licenciamento, backups e aprovação humana para publicação. Esses
bloqueios são explicados no guia de implantação e no planejamento.

Documentação: ../../docs/modelo-reutilizavel/GUIA-PARA-ESCOLAS.md
e ../../docs/modelo-reutilizavel/SETE-MELHORIAS.md.

## Explorar o Portal e o Painel

A Central inclui um link para o
[Modo Demonstração dos dois aplicativos](../modo-demonstracao/index.html):
fluxos ilustrativos de estudante e gestão, com dados de duas escolas
inventadas, sem acesso ao Firebase real. O modo não concede permissões,
não cria cadastros e não faz deploy.
