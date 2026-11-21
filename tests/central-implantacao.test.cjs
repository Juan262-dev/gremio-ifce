const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.resolve(__dirname,"../demo/central-implantacao");
const read=name=>fs.readFileSync(path.join(base,name),"utf8");
const M=require("../demo/central-implantacao/model.js");

test("central de implantação valida as cinco etapas com dados fictícios",()=>{
  const s=M.freshState();
  assert.equal(M.validateStep(0,s).ok,true);
  assert.equal(M.validateStep(1,s).ok,true);
  assert.equal(M.validateStep(2,s).ok,false);
  assert.equal(M.validateStep(3,s).ok,false);
  assert.equal(M.validateStep(4,s).ok,false);
  assert.equal(M.progress(s).percent,40);
  s.firebaseAcknowledged=true;
  s.adminAcknowledged=true;
  s.reviewAcknowledged=true;
  assert.equal(M.progress(s).percent,100);
  assert.equal(M.progress(s).complete.every(Boolean),true);
});
test("IDs reais de Firebase são rejeitados na demonstração",()=>{
  const s={...M.freshState(),demoProjectId:"projeto-escola-real",firebaseAcknowledged:true};
  assert.equal(M.validateStep(2,s).ok,false);
  s.demoProjectId="demo-exemplo-a";
  assert.equal(M.validateStep(2,s).ok,true);
  assert.equal(M.releaseStatus().allowed,false);
  assert.ok(M.releaseStatus().blockers.length>0);
});
test("sanitização bloqueia segredos e chaves não declaradas em rascunhos",()=>{
  const s=M.sanitizeDraft({
    schoolName:"  Escola Fictícia  ",theme:"red",firebaseAcknowledged:true,
    apiKey:"SECRET",private_key:"SECRET",password:"SECRET",adminEmail:"SECRET",
    modules:{avisos:false,superuser:true}
  });
  assert.equal(s.schoolName,"Escola Fictícia");
  assert.equal(s.theme,M.DEFAULT_STATE.theme);
  assert.equal(s.firebaseAcknowledged,true);
  for(const key of ["apiKey","private_key","password","adminEmail"])
    assert.equal(Object.hasOwn(s,key),false,key);
  assert.deepEqual(Object.keys(s.modules),M.MODULES);
  assert.equal(s.modules.avisos,false);
});
test("campos obrigatórios e formatação são checados",()=>{
  assert.equal(M.validateStep(0,{...M.freshState(),schoolName:""}).ok,false);
  assert.equal(M.validateStep(0,{...M.freshState(),contact:"contato-invalido"}).ok,false);
  assert.equal(M.validateStep(1,{...M.freshState(),portalTitle:""}).ok,false);
  assert.equal(M.validateStep(4,{...M.freshState(),reviewAcknowledged:false}).ok,false);
});
test("HTML define cinco painéis, prévia de dois apps e CSP sem conexões",()=>{
  const html=read("index.html");
  for(let i=0;i<5;i++){
    assert.match(html,new RegExp('id="step-'+i+'"'));
    assert.match(html,new RegExp('data-goto="'+i+'"'));
  }
  for(const id of ["preview-portal","preview-admin","progress-bar","save","reset","next","back"])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.match(html,/Nenhum dado é enviado pela internet/);
  assert.match(html,/Publicação real permanece bloqueada/);
  assert.doesNotMatch(html,/firebase-app\.js|firebase\.gstatic\.com|https?:\/\/[^" ]+\.js/);
});
test("interface só usa assets locais, exibe entradas como texto e nunca ativa produção",()=>{
  const app=read("app.js");
  const model=read("model.js");
  const doc=read("README.md");
  assert.match(app,/\.textContent=/);
  assert.doesNotMatch(app,/\.innerHTML\s*=|fetch\s*\(|XMLHttpRequest|initializeApp\s*\(/);
  assert.doesNotMatch(model,/fetch\s*\(|XMLHttpRequest|initializeApp\s*\(/);
  assert.match(doc,/não é um instalador/i);
  assert.match(doc,/sessionStorage/);
  assert.match(doc,/não publica aplicativos/i);
  assert.match(model,/allowed:false/);
});
