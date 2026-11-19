/* Verificações locais do redesign IFCE Premium. Sem dados de produção. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const ler = nome => fs.readFileSync(path.join(root,nome),'utf8');
const portal = ler('index.html');
const admin = ler('admin.html');
const claro = ler('premium-portal.css');
const escuro = ler('premium-admin.css');

function blocosBalanceados(texto) {
  // Retira comentários/strings para não confundir chaves CSS com conteúdo.
  const limpo = texto.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(["'])(?:\\.|(?!\1)[^\\])*\1/g,'""');
  let abertos=0;
  for(const c of limpo) {
    if(c==='{')abertos++;
    if(c==='}') {abertos--;if(abertos<0)return false;}
  }
  return abertos===0 && !/\/\*/.test(limpo) && texto.length>5000;
}
function luminancia(hex) {
  const rgb=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255);
  const lin=x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);
  return .2126*lin(rgb[0])+.7152*lin(rgb[1])+.0722*lin(rgb[2]);
}
function contraste(a,b) {
  const xs=[luminancia(a),luminancia(b)].sort((x,y)=>y-x);
  return (xs[0]+.05)/(xs[1]+.05);
}

test('Portal importa CSS Premium depois do Bootstrap e do estilo original',()=>{
  assert.match(portal,/<body class="ifce-premium-portal">/);
  assert.match(portal,/<link rel="stylesheet" href="premium-portal.css\?v=20261119b">/);
  assert.ok(portal.indexOf('bootstrap@')<portal.indexOf('premium-portal.css?'));
  assert.ok(portal.indexOf('</style>')<portal.indexOf('premium-portal.css?'));
  assert.equal((portal.match(/premium-portal\.css\?/g)||[]).length,1);
});
test('Painel importa CSS Premium e mantém tema escuro',()=>{
  assert.match(admin,/<body class="ifce-premium-admin">/);
  assert.match(admin,/<link rel="stylesheet" href="premium-admin.css\?v=20261119b">/);
  assert.ok(admin.indexOf('</style>')<admin.indexOf('premium-admin.css?'));
  assert.equal((admin.match(/premium-admin\.css\?/g)||[]).length,1);
});

test('CSS dos dois apps tem regras bem delimitadas e nenhum recurso remoto',()=>{
  for(const [nome,css] of [['Portal',claro],['Admin',escuro]]) {
    assert.ok(blocosBalanceados(css),'chaves CSS: '+nome);
    assert.doesNotMatch(css,/@import\b/i,'imports externos: '+nome);
    assert.doesNotMatch(css,/url\s*\(\s*["']?https?:/i,'endereços externos: '+nome);
    assert.doesNotMatch(css,/font-family\s*:\s*["']?https?:/i,'fonte remota: '+nome);
  }
  assert.ok(claro.includes('body.ifce-premium-portal'));
  assert.ok(escuro.includes('body.ifce-premium-admin'));
});

test('preserva as 19 seções e a navegação de 5 abas no Portal',()=>{
  const ids=[...portal.matchAll(/<div id="(sec-[^"]+)"/g)].map(m=>m[1]);
  const botoes=[...portal.matchAll(/<button[^>]+data-portal-grupo="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,19);
  assert.equal(new Set(ids).size,19);
  assert.deepEqual(botoes,['inicio','estudos','atividades','gremio','perfil']);
  for(const id of ['sec-laboratorio','sec-carteira','sec-eleicao','sec-estudos','sec-ajuda','sec-privacidade'])
    assert.ok(ids.includes(id),id);
  assert.ok(portal.includes('LaboratorioAvancado.iniciarPortal()'));
  assert.ok(portal.includes('PortalNavegacao.iniciar()'));
});

test('preserva seções e marcações de acesso no Painel Administrativo',()=>{
  const ids=[...admin.matchAll(/<div id="(secao-[^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,84);
  assert.equal(new Set(ids).size,84);
  // Linha de base antes do redesign: 68 marcações data-niveis e 84 módulos.
  assert.equal((admin.match(/data-niveis="/g)||[]).length,68);
  for(const id of ['secao-resumo','secao-laboratorio','secao-carteirinhas','secao-ti-monitor','secao-punicoes'])
    assert.ok(ids.includes(id),id);
  assert.ok(admin.includes('id="sidebarMenu"'));
  assert.ok(admin.includes('id="itensMenuNav"'));
  assert.ok(admin.includes('id="painel-admin"'));
  assert.ok(admin.includes('id="btn-menu-lateral"'));
});
test('não adiciona regras para mostrar cartões restritos no CSS novo',()=>{
  for(const css of [claro,escuro]){
    assert.doesNotMatch(css,/\[data-niveis\]\s*\{/, 'niveis');
    assert.doesNotMatch(css,/\.card-root\s*\{/, 'card raiz');
    assert.doesNotMatch(css,/\.card-admin-geral\s*\{/, 'cartões restritos');
    assert.doesNotMatch(css,/#painel-admin\s*\{[^}]*display\s*:/, 'exibição painel');
  }
});
test('Portal possui apresentação Premium em login, boas-vindas, estudos e notificações',()=>{
  for(const termo of [
    '.premium-brand','.premium-brand-symbol','.premium-boas-vindas',
    '.portal-app-painel','.portal-app-atalho','.portal-app-subitem',
    '#bottom-nav','.login-card-chem','#painel-notif',
    '.form-control','.table','.lab-mol-tela'
  ])assert.ok(claro.includes(termo),termo);
  assert.ok(portal.includes('premium-boas-vindas'));
  assert.ok(portal.includes('premium-brand-text'));
  assert.ok(portal.includes('id="btn-login-aluno"'));
  assert.ok(portal.includes('id="btn-logout-aluno"'));
});
test('Admin possui apresentação Premium em login, navegação, busca e tabelas',()=>{
  for(const termo of [
    '.premium-admin-brand','.premium-admin-actions','.premium-admin-identidade',
    '#tela-login-admin','.admin-app-cabecalho','.admin-app-abas',
    '.admin-app-seletor','#sidebarMenu','#bottom-nav','.table',
    '.form-control','.btn-ifce','.modal-content',
    '.table-warning','.table-danger','.table-success'
  ])assert.ok(escuro.includes(termo),termo);
  assert.ok(admin.includes('premium-admin-identidade'));
  assert.ok(admin.includes('id="admin-email"'));
  assert.ok(admin.includes('id="btn-logout-admin"'));
});
test('textos e detalhes principais mantêm contraste de no mínimo 4,5:1',()=>{
  for(const [fg,bg,nome] of [
    ['#25312b','#f8f9f7','corpo do Portal'],
    ['#53655b','#f8f9f7','texto secundário Portal'],
    ['#1e6543','#ffffff','ações e títulos Portal'],
    ['#54685a','#ffffff','metadados Portal'],
    ['#e9efe9','#111a15','corpo Admin'],
    ['#bccbc0','#111a15','texto secundário Admin'],
    ['#c7edcf','#1c2920','destaque de módulos Admin'],
    ['#c7d5ca','#1c2e22','texto de apoio na busca Admin']
  ]) assert.ok(contraste(fg,bg)>=4.5,nome+': '+contraste(fg,bg).toFixed(2));
});
test('redesign institucional elimina efeitos genéricos sem alterar navegação',()=>{
  for (const css of [claro,escuro]){
    assert.doesNotMatch(css,/linear-gradient\s*\(|radial-gradient\s*\(/i);
    assert.doesNotMatch(css,/backdrop-filter\s*:\s*blur\s*\(/i);
    assert.match(css,/border-radius:\s*(?:5|6|7|8|9)px/);
  }
  const nav=portal.match(/<nav id="bottom-nav"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav);
  assert.equal((nav.match(/<svg viewBox=/g)||[]).length,5);
  assert.doesNotMatch(nav,/\p{Extended_Pictographic}/u);
  assert.ok(portal.includes('premium-brand-symbol" aria-hidden="true">G</span>'));
  assert.ok(admin.includes('premium-admin-brand-mark" aria-hidden="true">G</span>'));
  assert.ok(ler('portal-navegacao.js').includes('titulo.textContent = grupo.nome;'));
  assert.ok(ler('admin-08-resumo-abas.js').includes("titulo.textContent = 'Central de gestão';"));
});
test('estilo contempla mobile, impressão, foco visível e movimento reduzido',()=>{
  for(const css of [claro,escuro]){
    assert.match(css,/@media\s*\(max-width:\s*(?:680|700)px\)/);
    assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    assert.match(css,/@media\s+print/);
    assert.ok(css.includes(':focus-visible'));
    assert.ok(css.includes('env(safe-area-inset-bottom)'));
  }
});
test('cor do PWA é coerente com tema claro/escuro sem perder os ícones',()=>{
  const pm=JSON.parse(ler('manifest.webmanifest'));
  const am=JSON.parse(ler('manifest-admin.webmanifest'));
  assert.equal(pm.theme_color,'#103f2a');
  assert.equal(pm.background_color,'#f5f9f6');
  assert.equal(am.theme_color,'#0d2f1d');
  assert.equal(am.background_color,'#0e1c14');
  assert.ok(pm.icons.some(x=>x.src==='icon-192.png'));
  assert.ok(am.icons.some(x=>x.src==='icon-admin-192.png'));
  assert.equal(pm.start_url,'./index.html');
  assert.equal(am.start_url,'./admin.html');
  assert.ok(portal.includes('content="#103f2a"'));
  assert.ok(admin.includes('content="#0d2f1d"'));
});
test('scripts embutidos continuam válidos e os IDs dos formulários mantidos',()=>{
  for(const [nome,html] of [['Portal',portal],['Admin',admin]]){
    const js=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(js.length>=17);
    js.forEach((m,i)=>assert.doesNotThrow(()=>new Function(m[1]),nome+':'+i));
  }
  for(const id of [
    'aluno-email-input','aluno-senha-input','btn-login-aluno',
    'cad-email','perf-turma','lab-operacao','lab-missao-escolha'
  ])assert.ok(portal.includes('id="'+id+'"'),id);
  for(const id of ['admin-email','admin-senha','itensMenuNav','toast-container','modalConfirmar'])
    assert.ok(admin.includes('id="'+id+'"'),id);
});
