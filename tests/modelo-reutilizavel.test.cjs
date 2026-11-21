/* Verificações do PLANO de reutilização. Não acessa Firebase nem rede. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const base=path.resolve(__dirname,'../docs/modelo-reutilizavel');
const ler=nome=>fs.readFileSync(path.join(base,nome),'utf8');
const configA=JSON.parse(ler('exemplos/escola-a.exemplo.json'));
const configB=JSON.parse(ler('exemplos/escola-b.exemplo.json'));
const creditos=JSON.parse(ler('exemplos/creditos-originais.exemplo.json'));
const arq=ler('README.md'),inst=ler('INSTALACAO-PILOTO.md'),plano=ler('ROADMAP.md');

test('duas escolas fictícias possuem Firebase e URLs exclusivos',()=>{
  assert.notEqual(configA.instalacao.id,configB.instalacao.id);
  assert.notEqual(configA.instalacao.firebase.projectId,configB.instalacao.firebase.projectId);
  assert.notEqual(configA.instalacao.firebase.authDomain,configB.instalacao.firebase.authDomain);
  assert.notEqual(configA.instalacao.urlPublica,configB.instalacao.urlPublica);
  assert.notEqual(configA.escola.nome,configB.escola.nome);
});

test('exemplos são intencionalmente não publicáveis nem conectáveis',()=>{
  for(const [i,c] of [configA,configB].entries()){
    const tag=i?'B':'A';
    assert.equal(c.versaoContrato,1,tag);
    assert.equal(c.instalacao.modo,'exemplo-nao-publicavel',tag);
    assert.match(c.instalacao.firebase.projectId,/^demo-gremio-escola-[ab]$/,tag);
    assert.equal(c.instalacao.firebase.apiKey,'EXEMPLO_NAO_CONECTAR',tag);
    assert.equal(c.instalacao.firebase.appId,'EXEMPLO_NAO_CONECTAR',tag);
    const url=new URL(c.instalacao.urlPublica);
    assert.equal(url.protocol,'https:',tag);
    assert.match(url.hostname,/\.example\.invalid$/,tag);
    assert.ok(c.instalacao.firebase.authDomain.endsWith('.firebaseapp.com'));
    assert.ok(c.instalacao.autenticacao.dominiosInstitucionais.every(d=>d.endsWith('.example.invalid')));
    assert.notEqual(c.instalacao.firebase.projectId,'gremioifce-92540');
  }
});

test('configurações escolares possuem personalização e política de cadastro',()=>{
  for(const c of [configA,configB]){
    assert.ok(c.escola.nome.length>4);
    assert.ok(c.gremio.nome.length>4);
    assert.ok(c.identidadeVisual.logo.includes('/'));
    assert.match(c.identidadeVisual.corPrincipal,/^#[0-9a-f]{6}$/i);
    assert.ok(c.identidadeVisual.tituloPortal && c.identidadeVisual.tituloAdmin);
    assert.equal(c.instalacao.autenticacao.cadastroAprovadoPelaGestao,true);
    assert.equal(c.instalacao.autenticacao.exigirEmailVerificado,true);
    for(const campo of ['avisos','eventos','carteirinha','estudos','laboratorioVirtual','enquetes','eleicoes'])
      assert.equal(typeof c.modulosVisiveis[campo],'boolean',campo);
    for(const k of ['urlPolitica','urlTermos'])assert.ok(c.privacidade[k].startsWith('https://'));
  }
});

test('créditos de origem estão fora das configurações escolares',()=>{
  for(const c of [configA,configB]){
    assert.equal(Object.hasOwn(c,'creditos'),false);
    assert.equal(Object.hasOwn(c,'origem'),false);
    assert.equal(Object.hasOwn(c,'autorOriginalNomePublico'),false);
  }
  assert.match(creditos.origem.instituicao,/IFCE Campus Crateus/i);
  assert.ok(creditos.origem.repositorioOriginal.endsWith('/gremio-ifce'));
  assert.equal(creditos.origem.autorOriginalNomePublico,'CONFIRMAR_COM_O_AUTOR_ORIGINAL');
  assert.equal(creditos.atribuicao.editavelNoPainelDaEscola,false);
  assert.equal(creditos.licenciamento.identificador,'AINDA_NAO_DEFINIDO');
});

test('plano registra os acoplamentos e a necessidade de corrigir privacidade',()=>{
  for(const arquivo of ['index.html','admin-01-base-login.js','firestore.rules','manifest.webmanifest','sw.js'])
    assert.ok(arq.includes(arquivo),'arquivo não mapeado: '+arquivo);
  assert.match(arq,/enquetes e eventos ainda mantêm listas de e-mails/i);
  assert.match(arq,/não distribuir a plataforma para uso real/i);
  assert.match(arq,/Não copiar dados existentes do IFCE/i);
  assert.match(arq,/não\s+inicializar Firebase/i);
});

test('guia inclui segurança, provisionamento e revisão antes de publicação',()=>{
  assert.match(inst,/provisionamento único/i);
  assert.match(inst,/nunca\s+devem ser incluídos no site/i);
  assert.match(inst,/contas e dados fictícios/i);
  assert.match(inst,/privacidade/i);
  assert.match(inst,/duas escolas fictícias/i);
  assert.match(inst,/não conectar ao Firebase do IFCE/i);
});

test('roadmap separa entrega de planejamento da implementação real',()=>{
  for(const fase of ['Fase 0','Fase 1','Fase 2','Fase 3','Fase 4','Fase 5'])
    assert.ok(plano.includes(fase),fase);
  assert.match(plano,/NÃO entrega|Não entrega/);
  assert.match(plano,/licença/);
  assert.match(plano,/emulador/i);
});

test('nenhum exemplo embute credenciais privilegiadas do projeto de origem',()=>{
  const exemplos=[
    ler('exemplos/escola-a.exemplo.json'),
    ler('exemplos/escola-b.exemplo.json'),
    ler('exemplos/creditos-originais.exemplo.json')
  ].join('\n');
  assert.doesNotMatch(exemplos,/gremioifce-92540|AIzaSy|private_key|BEGIN PRIVATE KEY/i);
  assert.doesNotMatch(exemplos,/@aluno\.ifce\.edu\.br|@ifce\.edu\.br/i);
});

test('arquivos de produção originais continuam presentes e não há script de instalação executável',()=>{
  const baseRepo=path.resolve(__dirname,'..');
  for(const nome of ['index.html','admin.html','admin-01-base-login.js','firestore.rules'])
    assert.ok(fs.existsSync(path.join(baseRepo,nome)),nome);
  assert.match(arq,/NÃO uma instalação pronta/);
  assert.match(inst,/proposta.*, não instalador funcional/i);
});

const assistente=ler('ASSISTENTE-CONFIGURACAO.md');

test('assistente proposto tem cinco etapas, estados e duas prévias',()=>{
  for(const nome of ['Identificação da escola','Aparência e recursos',
    'Conexão Firebase','Administrador inicial','Revisão e ativação'])
    assert.ok(assistente.includes(nome),nome);
  for(const estado of ['rascunho','pronto para homologação',
    'apto à publicação','instalação ativa'])
    assert.ok(assistente.includes(estado),estado);
  assert.match(assistente,/prévia.*Portal.*Admin/i);
});

test('assistente não concede privilégio nem publica diretamente',()=>{
  assert.match(assistente,/sem acesso automático/i);
  assert.match(assistente,/não criar.*administrador|nenhuma conta administrativa criada/i);
  assert.match(assistente,/aprovação explícita/i);
  assert.match(assistente,/sem deploy automático|não.*deploy automático/i);
  assert.match(assistente,/não iniciar Firebase/i);
});

test('assistente preserva isolamentos, créditos e segurança por escola',()=>{
  assert.match(assistente,/MESMA configuração validada do Firebase/i);
  assert.match(assistente,/sessões de login separadas/i);
  assert.match(assistente,/escolas diferentes nunca compartilham Firebase/i);
  assert.match(assistente,/créditos originais/i);
  assert.match(assistente,/sem campo de edição/i);
  assert.match(assistente,/enquetes\/eventos/i);
  assert.match(assistente,/não.*fallback|não tentar conexão de reserva/i);
});

test('roadmap e guias incluem assistente como planejamento, não código ativo',()=>{
  assert.match(arq,/ASSISTENTE-CONFIGURACAO\.md/);
  assert.match(inst,/Assistente de Configuração Inicial/);
  assert.match(plano,/Assistente de Configuração Inicial/);
  assert.match(assistente,/Ainda não é uma tela/i);
  assert.match(assistente,/Não entregue.*interface funcionando/i);
});

const guiaEscolas=ler('GUIA-PARA-ESCOLAS.md');
const fichaEscola=ler('FICHA-DA-ESCOLA.md');
const readmeRaiz=fs.readFileSync(path.resolve(__dirname,'../README.md'),'utf8');

test('tutorial para escolas distingue preparação de instalação ainda não disponível',()=>{
  assert.match(guiaEscolas,/ainda NÃO está pronto para ser instalado/i);
  assert.match(guiaEscolas,/não publique com dados reais de alunos/i);
  assert.match(guiaEscolas,/Tutorial de implantação — etapas futuras/i);
  assert.match(guiaEscolas,/O código atual do IFCE/i);
  assert.match(guiaEscolas,/Não.*copie.*firestore\.rules|Nunca copie.*firestore\.rules/i);
  assert.match(guiaEscolas,/Não.*copi.*app atual|não faça uma cópia do app atual/i);
});

test('tutorial cobre aplicativos, Firebase por escola, direitos e segurança',()=>{
  for (const palavra of ['Portal do Aluno','Painel Administrativo','Authentication',
    'Cloud Firestore','Security Rules','direitos de uso','privacidade',
    'primeiro administrador','créditos originais','sem contas reais',
    'backup','troca de diretoria','Problemas comuns'])
    assert.ok(guiaEscolas.toLowerCase().includes(palavra.toLowerCase()),palavra);
  assert.match(guiaEscolas,/Escolas diferentes terão Firebase/i);
  assert.match(guiaEscolas,/sem conexão com o banco do IFCE/i);
  assert.match(guiaEscolas,/não.*compartilhar.*chaves|Nunca cole chaves privadas/i);
  assert.match(guiaEscolas,/não publicar/i);
});

test('tutorial e ficha oferecem roteiro sem dados sensíveis',()=>{
  for(const etapa of ['1. Confirmar','2. Criar o Firebase','3. Usar o Assistente',
    '4. Personalizar','5. Criar e validar','6. Fazer um piloto',
    '7. Publicar','8. Manter'])
    assert.ok(guiaEscolas.includes(etapa),etapa);
  assert.match(fichaEscola,/Não informe senhas, credenciais, tokens/i);
  assert.match(fichaEscola,/projeto Firebase exclusivo da escola/i);
  assert.match(fichaEscola,/aprovação \*\*explícita\*\* para publicar/i);
  assert.match(fichaEscola,/GUIA-PARA-ESCOLAS\.md/);
  assert.match(readmeRaiz,/GUIA-PARA-ESCOLAS\.md/);
  assert.match(arq,/GUIA-PARA-ESCOLAS\.md/);
  assert.match(plano,/Experiência de implantação guiada/i);
});

test('guia inclui documentação Firebase verificável e não executa deploy',()=>{
  for(const url of [
    'https://firebase.google.com/docs/web/setup',
    'https://firebase.google.com/docs/auth/web/start',
    'https://firebase.google.com/docs/firestore/security/test-rules-emulator',
    'https://firebase.google.com/docs/hosting/quickstart'])
    assert.ok(guiaEscolas.includes(url),url);
  assert.doesNotMatch(guiaEscolas,/firebase deploy(?: --only)?/i);
  assert.match(guiaEscolas,/Este tutorial não dispara deploy/i);
});
