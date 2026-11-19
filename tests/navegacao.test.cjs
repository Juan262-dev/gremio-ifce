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
  const portalNovo=ler('portal-navegacao.js');
  const painelNovo=ler('admin-08-resumo-abas.js').split('/* ================= ABAS DO PAINEL ================= */')[1];
  for(const [nome,src] of [['portal-navegacao.js',portalNovo],['nova navegação do painel',painelNovo]]){
    assert.ok(src && !src.includes('.collection('),nome);
    assert.ok(!src.includes('eval('),nome);
  }
  // A função carregarResumo() preexistente consulta o Firestore: não faz parte
  // das alterações de navegação e deve continuar funcionando.
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


test('navegação real ativa apenas a área escolhida, preservando recursos desativados',()=>{
  class No {
    constructor(tag='div'){
      this.tagName=tag.toUpperCase();this.id='';this.children=[];this.parent=null;
      this.style={display:''};this.dataset={};this.hidden=false;
      this.attributes={};this.handlers={};this.className='';this.textContent='';
      const classes=new Set();
      this.classList={
        add:x=>classes.add(x),remove:x=>classes.delete(x),
        contains:x=>classes.has(x),
        toggle:(x,val)=>{if(val===undefined)val=!classes.has(x);if(val)classes.add(x);else classes.delete(x);return val;}
      };
    }
    append(...xs){for(const x of xs)this.appendChild(x)}
    appendChild(x){x.parent=this;this.children.push(x);return x}
    insertBefore(x,ref){const i=this.children.indexOf(ref);x.parent=this;if(i>=0)this.children.splice(i,0,x);else this.children.push(x)}
    replaceChildren(...xs){this.children=[];this.append(...xs)}
    setAttribute(k,v){this.attributes[k]=v}
    addEventListener(k,f){this.handlers[k]=f}
    scrollIntoView(){this.scrolled=true}
    contains(x){return x===this||this.children.some(c=>c.contains(x))}
    querySelectorAll(sel){
      const found=[];
      const matches=(x)=>{
        if(sel==='button[data-portal-grupo]')return x.tagName==='BUTTON'&&!!x.dataset.portalGrupo;
        if(sel==='[data-portal-alvo]')return !!x.dataset.portalAlvo;
        return false;
      };
      const walk=x=>x.children.forEach(c=>{if(matches(c))found.push(c);walk(c)});
      walk(this);return found;
    }
  }
  const portal=new No('main');portal.id='portal-aluno';
  const barra=new No('nav');barra.id='bottom-nav';
  const sec={};
  for(const id of IDs_PORTAL){const x=new No('section');x.id=id;if(id==='sec-primeiro'||id==='sec-eleicao')x.style.display='none';portal.appendChild(x);sec[id]=x}
  for(const key of Object.keys(nav.GRUPOS)){const b=new No('button');b.dataset.portalGrupo=key;barra.appendChild(b)}
  const roots=[portal,barra];
  const todos=(no,id)=>no.id===id?no:no.children.map(c=>todos(c,id)).find(Boolean)||null;
  const doc={
    createElement:t=>new No(t),
    createElementNS:(_ns,t)=>new No(t),
    getElementById:id=>roots.map(r=>todos(r,id)).find(Boolean)||null,
    querySelectorAll:sel=>sel==='#portal-app-dashboard [data-portal-alvo]'?
      (doc.getElementById('portal-app-dashboard')?.querySelectorAll('[data-portal-alvo]')||[]):[]
  };
  const mod={exports:{}};
  const ctx=vm.createContext({document:doc,module:mod,console});
  vm.runInContext(ler('portal-navegacao.js'),ctx);
  const api=mod.exports;
  const visiveis=()=>IDs_PORTAL.filter(id=>sec[id].classList.contains('portal-secao-ativa'));
  api.preparar();api.iniciar();
  const grade=doc.getElementById('portal-app-dashboard');
  const atalhos=grade.children[1].children;
  assert.equal(atalhos.length,4);
  const nomes=['carteirinha','calendario','laboratorio','comunicacao'];
  assert.deepEqual(nav.DESTAQUES.map(d=>d.icone),nomes);
  for (const b of atalhos) {
    const span=b.children[0];
    const svg=span.children[0];
    assert.equal(svg.tagName,'SVG');
    assert.equal(svg.attributes['aria-hidden'],'true');
    assert.equal(span.attributes['aria-hidden'],'true');
    assert.equal(svg.attributes.viewBox,'0 0 24 24');
    assert.ok(svg.children.length>=2);
  }
  assert.deepEqual(visiveis(),['sec-avisos']);
  assert.equal(doc.getElementById('portal-app-subnav').children.length,2);
  assert.equal(doc.getElementById('portal-app-dashboard').hidden,false);
  api.abrir('estudos',null,false);
  assert.deepEqual(visiveis(),['sec-estudos']);
  assert.equal(doc.getElementById('portal-app-dashboard').hidden,true);
  assert.equal(api.irPara('sec-laboratorio'),true);
  assert.deepEqual(visiveis(),['sec-laboratorio']);
  api.atualizarRecursos({laboratorio:false});
  assert.deepEqual(visiveis(),['sec-estudos']);
  assert.equal(api.irPara('sec-laboratorio'),false);
  assert.equal(api.irPara('sec-carteira'),true);
  assert.deepEqual(visiveis(),['sec-carteira']);
  assert.equal(api.irPara('sec-primeiro'),false); // edição de perfil ainda não solicitada
  sec['sec-primeiro'].style.display='block';
  assert.equal(api.irPara('sec-primeiro'),true);
  assert.deepEqual(visiveis(),['sec-primeiro']);
  sec['sec-primeiro'].style.display='none';api.atualizar();
  assert.deepEqual(visiveis(),['sec-carteira']);
  assert.equal(api.abrir('grupo-que-nao-existe'),false);
  assert.deepEqual(visiveis(),['sec-carteira']);
});
