# Grêmio IFCE

Portal do Aluno e Painel Administrativo do Grêmio IFCE.

## Plataforma para outras escolas — Firebase prioritário

**Decisão técnica atual:** a evolução da versão universal acontece em
[`template-escolas/`](template-escolas/README.md), com **um Firebase e
uma hospedagem por escola**. O modelo Supabase de
[`template-supabase/`](template-supabase/README.md) foi mantido apenas
como experimento anterior e **não é requisito** para instalar a versão
Firebase. Nenhum banco Supabase é migrado ou apagado automaticamente.

Comece pelo [roteiro de retomada Firebase](template-escolas/RETOMADA-FIREBASE.md)
e pelo [verificador local de instalação](template-escolas/scripts/preflight-school.cjs).
**Não há conexão Firebase para validação de produção nesta etapa.**
A versão universal continua em homologação e não está liberada para
estudantes reais.

## Para outras escolas

Quer usar a ideia na sua escola? Comece pelo
**[Tutorial para escolas — como preparar a implantação](docs/modelo-reutilizavel/GUIA-PARA-ESCOLAS.md)**
e pela **[Ficha da Escola](docs/modelo-reutilizavel/FICHA-DA-ESCOLA.md)**.

> ⚠️ **A versão reutilizável ainda não está pronta para instalação.**
> O aplicativo atual é específico do IFCE. Não basta copiá-lo e mudar o
> projeto Firebase: as regras, contas e configurações precisam ser adaptadas
> e testadas antes de qualquer escola utilizar dados reais.

Documentos técnicos:
[arquitetura do modelo reutilizável](docs/modelo-reutilizavel/README.md) ·
[assistente inicial planejado](docs/modelo-reutilizavel/ASSISTENTE-CONFIGURACAO.md) ·
[roadmap e bloqueios de segurança](docs/modelo-reutilizavel/ROADMAP.md).

O Portal e o Painel atuais **não** são alterados por esta documentação.

## Base técnica independente (experimental)

O diretório [`template-escolas/`](template-escolas/README.md) contém uma
**primeira base mínima** de Portal e Painel conectáveis a um Firebase exclusivo
por escola, com regras separadas e votos/inscrições privados por UID.
**Ainda não está liberado para uso por outras escolas**: faltam licença,
segurança operacional, recursos completos e homologação. A instalação IFCE,
seu banco e o visual original continuam preservados.

