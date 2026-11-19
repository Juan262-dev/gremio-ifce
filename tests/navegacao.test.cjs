// Testes locais da reorganização. Não acessam Firebase nem dados reais.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const raiz = path.resolve(__dirname,'..');
const ler = nome => fs.readFileSync(path.join(raiz,nome),'utf8');
const nav = require('../portal-navegacao.js');

const IDs_PORTAL = [
  'sec-primeiro','sec-avisos','sec-enquetes','sec-pautas','sec-materiais',
  'sec-eventos','sec-carteira','sec-realizacoes','sec-jogos','sec-estudos',
  'sec-laboratorio','sec-eleicao','sec-aniversario','sec-quiz','sec-cartoes',
  'sec-videos','sec-privacidade','sec-ajuda','sec-sugestoes'
];

test('portal tem exatamente cinco áreas principais com navegação compacta',()=>{
  assert.deepEqual(Object.keys(nav.GRUPOS),['inicio','estudos','atividades','gremio','perfil']);
  const html=ler('index.html');
  const botoes=[...html.matchAll(/<button[^>]*data-portal-grupo="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(botoes,Object.keys(nav.GRUPOS));
  assert.equal(html.includes('data-alvo="sec-avisos"'),false);
});

test('todas as 19 seções originais continuam acessíveis uma única vez',()=>{
  const html=ler('index.html');
  const ids=[...html.matchAll(/<div id="(sec-[^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(new Set(ids),new Set(IDs_PORTAL));
  const grupos=Object.values(nav.GRUPOS).flatMap(g=>g.secoes);
  assert.equal(grupos.length,new Set(grupos).size);
  assert.deepEqual(new Set(grupos),new Set(ids));
  for(const id of ids)assert.ok(nav.obterGrupo(id));
});

test('atalhos da tela inicial apontam para seções existentes',()=>{
  const grupos=Object.values(nav.GRUPOS).flatMap(g=>g.secoes);
  for(const d of nav.DESTAQUES)assert.ok(grupos.includes(d.alvo),d.alvo);
  assert.ok(nav.GRUPOS.perfil.secoes.includes('sec-carteira'));
  assert.ok(nav.GRUPOS.estudos.secoes.includes('sec-laboratorio'));
  assert.ok(nav.GRUPOS.gremio.secoes.includes('sec-pautas'));
});

test('portal preserva login, notificações, perfil e controles administrativos de recursos',()=>{
  const html=ler('index.html');
  for(const token of [
    'auth.onAuthStateChanged','iniciarSessaoAluno()','PortalNavegacao.iniciar()',
    'PortalNavegacao.atualizarRecursos(rec)','PortalNavegacao.irPara(b.dataset.alvo)',
    "PortalNavegacao.irPara('sec-primeiro')",
    "carregarCarteirinhaDigital()", 'LaboratorioAvancado.iniciarPortal()'
  ]) assert.ok(html.includes(token),token);
  for(const id of ['lab-tabela','lab-avancado','quiz-box','carteirinha-visual'])
    assert.ok(html.includes('id="'+id+'"'),id);
});

test('scripts embutidos dos dois apps continuam válidos como JavaScript',()=>{
  for(const arquivo of ['index.html','admin.html']){
    const code=ler(arquivo),scripts=[...code.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(scripts.length>8);
    for(let i=0;i<scripts.length;i++)assert.doesNotThrow(()=>new Function(scripts[i][1]),arquivo+':'+i);
  }
  for(const nome of ['portal-navegacao.js','admin-01-base-login.js','admin-08-resumo-abas.js'])
    assert.doesNotThrow(()=>new Function(ler(nome)),nome);
});

test('painel preserva identificação dos módulos, permissões e navegação para TI',()=>{
  const admin=ler('admin.html'),base=ler('admin-01-base-login.js');
  const elids=[...admin.matchAll(/<div id="(secao-[^"]+)"/g)].map(m=>m[1]);
  assert.ok(elids.length>=75);
  assert.equal(elids.length,new Set(elids).size);
  for(const sec of [
    'secao-resumo','secao-tarefas','secao-mural','secao-estudos',
    'secao-questoes','secao-laboratorio','secao-carteirinhas',
    'secao-eventos','secao-caixa','secao-ti-monitor','secao-punicoes'
  ]) assert.ok(elids.includes(sec),sec);
  assert.ok(base.includes('niveisPermitidos'));
  assert.ok(base.includes('soRaiz'));
  assert.ok(base.includes('travas[m.id]'));
  assert.ok(base.includes('aplicarVisibilidade()'));
});

test('painel cria busca, seleção e navegação que não alteram as permissões originais',()=>{
  const code=ler('admin-08-resumo-abas.js');
  for(const termo of [
    "id = 'admin-app-busca'","id = 'admin-app-escolha'",
    'function selecionarFerramentaAdmin(id, rolar)',
    'function atualizarAbas()','function irPara(id)',
    "el.style.display !== 'none'", 'ferramentasDaAbaAdmin'
  ])assert.ok(code.includes(termo),termo);
  const contexto=vm.createContext({
    document:{getElementById:()=>null},
    getComputedStyle:e=>({display:e.computedDisplay||'block'}),
    modulosSistema:[],VERSAO_SISTEMA:'teste',DATA_ULTIMA_ATUALIZACAO:'teste'
  });
  vm.runInContext(code,contexto);
  const chaves=vm.runInContext('ABAS.map(a=>a[0])',contexto);
  assert.deepEqual([...chaves],['inicio','comunicacao','alunos','atividades','financeiro','diretoria','ti','outros']);
  const aceita=vm.runInContext('ferramentaVisivelAdmin',contexto);
  const f=(display,computed,hidden=false,classe=false)=>({
    style:{display},computedDisplay:computed,hidden,
    classList:{contains:(v)=>classe&&v==='admin-app-ferramenta-oculta'}
  });
  assert.equal(aceita(f('none','block')),false);
  assert.equal(aceita(f('block','block')),true);
  assert.equal(aceita(f('','none')),false);
  assert.equal(aceita(f('','none',false,true)),true);
  assert.equal(aceita(f('block','block',true)),false);
});

test('não adiciona coleções de usuário nem mudanças em regras do Firestore',()=>{
  const arquivos=['portal-navegacao.js','admin-08-resumo-abas.js'];
  for(const arquivo of arquivos){
    const src=ler(arquivo);
    assert.ok(!src.includes('.collection('),arquivo);
    assert.ok(!src.includes('eval('),arquivo);
  }
  assert.ok(ler('admin.html').includes('id="sidebarMenu"'));
});

test('telas apresentam busca e foco de teclado e respeitam HTML escapado',()=>{
  const portal=ler('index.html'),admin=ler('admin.html'),code=ler('admin-01-base-login.js');
  assert.ok(portal.includes('.portal-app-subitem:focus-visible'));
  assert.ok(admin.includes('.admin-app-aba:focus-visible'));
  assert.ok(code.includes('admin-menu-busca'));
  assert.ok(code.includes("texto.textContent = modulo.label"));
  assert.ok(!ler('portal-navegacao.js').includes('innerHTML'));
});
