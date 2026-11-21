# Assistente de Configuração Inicial — especificação para outras escolas

> **Planejamento aprovado para inclusão no modelo reutilizável. Ainda não é uma tela
> implementada nem um instalador funcional.** Nenhum passo abaixo é executado
> pela versão publicada do IFCE. As duas interfaces atuais permanecem intactas.

## Objetivo e público

Oferecer um assistente simples, com progresso visível, para preparar **uma
instalação independente por escola**. O responsável pela implantação prepara
o ambiente técnico, e o gestor escolar informa marca e apresentação.
A interface deve guiar quem não programa, mas **não fingir que pode criar um
Firebase ou atribuir cargo de administrador apenas pelo navegador**.

Cada instalação contém **Portal do Aluno + Painel Administrativo**. Os dois
consomem a MESMA configuração validada do Firebase daquela escola, com
sessões de login separadas. Escolas diferentes nunca compartilham Firebase,
contas, banco, URL de publicação ou cache PWA.

## Fluxo de cinco etapas

| Etapa | O que a pessoa vê e pode fazer | Resultado esperado |
| --- | --- | --- |
| **1. Identificação da escola** | Nome institucional, campus/unidade, cidade/UF, nome do Grêmio, descrição e contato público; campos obrigatórios e ajuda contextual | Rascunho de identidade escolar validado |
| **2. Aparência e recursos** | Logotipo autorizado, cor principal, título do Portal e do Admin, prévia responsiva das duas telas e alternadores de módulos suportados | Prévia visual sem alterar permissões |
| **3. Conexão Firebase** | Orientações para o responsável técnico registrar projeto Web **novo** da escola, conferir ID, domínio e URL; botão de **validar configuração** com retorno de erros | Configuração pública validada, ainda sem conectar a dados reais ou publicar |
| **4. Administrador inicial** | Identificação institucional do gestor, explicação das permissões e indicador de provisionamento pelo responsável técnico, em canal privilegiado; exigir confirmação do estado via verificação segura | Nenhuma conta administrativa criada por entrada de dados não autenticada |
| **5. Revisão e ativação** | Resumo da identidade, prévia do Portal e Admin, status de Auth/Firestore/regras, termos, privacidade, créditos originais somente leitura e checklist de testes | Marcar **pronto para homologação**; publicação depende de aprovação explícita e externa |

A tela apresenta **Voltar**, **Salvar rascunho** e **Continuar** nas etapas 1 a 4.
Na etapa 5, **Ver pendências**, **Pré-visualizar** e **Solicitar liberação**.
Nunca usar o botão "Publicar" para fazer deploy automático antes dos testes.

### Esboço textual, sem mudança no visual do IFCE

```text
┌────────────────────────────────────────────────────┐
│ Configurar Grêmio de outra escola                   │
│ ① Escola  ② Aparência  ③ Firebase  ④ Gestão  ⑤ Revisão │
│                                                    │
│ [Campos da etapa + mensagens acessíveis de erro]   │
│                                                    │
│ [Prévia: Portal do Aluno] [Prévia: Painel Admin]    │
│                                                    │
│ Voltar       Salvar rascunho            Continuar  │
└────────────────────────────────────────────────────┘
```

O processo deve funcionar **sem deploy automático**: a ativação ocorrerá somente após homologação e autorização explícita.

O assistente deve usar a linguagem e o visual do futuro **template genérico**
sem substituir as telas atuais do Grêmio IFCE.

## Contrato de dados e limites de edição

**Origem única:** um pacote de configuração por instalação, validado antes
de carregar qualquer SDK. `config/escola.json` guarda dados personalizáveis;
`config/firebase.public.js` guarda a configuração **pública** do app Web.
Um módulo único de inicialização lê essa configuração e a fornece a
`index.html` e `admin-01-base-login.js`. Não deve haver duas cópias
independentes de `projectId`, nem fallback para o Firebase original.

Separar também:

- **Identidade editável:** escola, campus, Grêmio, títulos, contato público,
  cor, logo, descrição e visibilidade de módulos existentes.
- **Provisionamento técnico:** projectId, authDomain, URL, regras Firestore,
  domínios autorizados e identidade privilegiada inicial — não editável por
  estudantes nem por personalização comum do painel.
- **Créditos originais:** mantidos pelo projeto-base fora do formulário,
  visíveis na revisão e no "Sobre o sistema" dos dois apps; exibir autoria
  pública somente após confirmação. Sem campo de edição para a escola.
- **Credenciais privadas:** nunca aceitar, registrar, enviar ao cliente nem
  salvar no rascunho service-account JSON, private_key, Admin SDK tokens ou
  senha de terceiros.

Exemplo de estado **conceitual**, sem valores reais:

```json
{
  "versaoFluxo": 1,
  "etapaAtual": "firebase",
  "estado": "rascunho",
  "validacoes": {
    "identidade": true,
    "aparencia": true,
    "firebase": false,
    "administrador": false,
    "segurancaEPrivacidade": false,
    "homologacao": false
  }
}
```

Esse estado não concede acesso nem substitui as Security Rules. Se for
persistido no futuro, usar backend autenticado da instalação sob permissões
estritas, com trilha de auditoria e sem dados pessoais de alunos. Não usar
`localStorage` para segredos ou credenciais.

## Segurança, experiências de erro e aprovação

1. **Antes da instalação:** conferir licença/autorizações, política de
   privacidade, responsável pelos dados e correção da exposição de e-mails
   de enquetes/eventos. Sem isso, bloquear homologação real.
2. **Configuração incompleta ou inválida:** mostrar "Instalação ainda não
   configurada"; **não iniciar Firebase** e não tentar conexão de reserva ao IFCE.
3. **Projeto repetido ou da origem:** impedir seleção do `projectId` do IFCE
   e, em processo de provisionamento central, conferir unicidade entre escolas.
   A conferência de unicidade não pode depender só de um campo de texto.
4. **Firebase não acessível:** explicar se o domínio de autenticação, a URL
   pública e as regras do ambiente de teste estão incompatíveis; não alegar
   "conectado" só por formato válido da configuração cliente.
5. **Administrador inicial:** provisionamento único, autorizado, fora do
   fluxo público e com confirmação auditável; sem acesso automático para o
   criador original ou administradores de outras escolas.
6. **Isolamento:** projeto A e projeto B separados; Portal/Admin de A usam
   exclusivamente A; Portal/Admin de B exclusivamente B; manter sessões
   independentes dentro de cada instalação.
7. **Preview e ativação:** prévia nunca escreve conteúdo em produção.
   A publicação requer verificação de regras, testes em emulador,
   homologação de Portal e Admin, aprovação explícita e backup planejado.
8. **Validação de entradas:** tamanho de campos, logo com tipo/tamanho
   controlados, cor HEX, links públicos apenas HTTPS; escapar conteúdo para
   evitar execução de HTML/JavaScript; mensagens de erro específicas.
9. **Acessibilidade:** labels, ordem lógica do teclado, foco visível,
   etapas anunciadas, contraste adequado e layout responsivo.
10. **Falha segura:** se uma etapa é reprovada, as demais permanecem como
    rascunho, sem habilitar acesso administrativo, dados de alunos ou publicação.

## Estados de produto

```text
não configurado
    ↓ preencher escola / aparência
rascunho
    ↓ responsável técnico valida Firebase, regras e gestor inicial
pronto para homologação
    ↓ testes de isolamento + privacidade + aprovação explícita
apto à publicação
    ↓ publicação manual/controlada (futuro PR)
instalação ativa
```

A transição nunca deve ser desencadeada exclusivamente pelo cliente. A
configuração editável poderá ser ajustada depois em "Identidade do Grêmio",
mas a migração de Firebase, autorização privilegiada e créditos não poderão
ser alterados por esse painel.

## Critérios de aceite para implementação futura

- [ ] Fluxo de 5 etapas com navegação, salvamento seguro e recuperação de erro;
      a configuração é uma **simulação** até existir backend autorizado.
- [ ] Nome, cor e logo refletem na prévia de Portal e Admin, inclusive
      dispositivos móveis e PWA, sem mudar o IFCE.
- [ ] Os dois aplicativos da **mesma escola** leem o mesmo projectId,
      authDomain e configuração validada; autenticações seguem separadas.
- [ ] Duas escolas fictícias têm projetos, dados e permissões independentes;
      tentativas de acesso cruzado são negadas no emulador.
- [ ] Ausência/erro de configuração e tentativa de reutilizar Firebase do
      IFCE bloqueiam a inicialização, sem fallback.
- [ ] Nenhum botão público cria conta privilegiada nem publica sites.
- [ ] Os créditos originais aparecem em ambos os apps sem campo de edição.
- [ ] Testes de segurança de enquetes/eventos, acessibilidade, privacidade,
      licença e regressão devem passar antes de qualquer piloto real.
- [ ] Registrar aprovação manual de publicação; PRs não fazem merge nem deploy
      automaticamente.

**Entrega atual:** especificação, roteiro e verificação textual do contrato.
**Não entregue:** interface funcionando, instância Firebase, credenciais,
regras adaptadas, primeiro admin, novas escolas instaladas ou publicação.
