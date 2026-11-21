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
  assert.match(arq,/não inicializar Firebase/i);
});

test('guia inclui segurança, provisionamento e revisão antes de publicação',()=>{
  assert.match(inst,/provisionamento único/i);
  assert.match(inst,/não devem ser incluídos no site/i);
  assert.match(inst,/contas e dados fictícios/i);
  assert.match(inst,/privacidade/i);
  assert.match(inst,/duas escolas fictícias/i);
  assert.match(inst,/não conecta/i.test(inst)?/não conecta/i:/não conectar/i);
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
