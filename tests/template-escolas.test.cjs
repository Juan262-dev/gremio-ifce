const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const I=require("../template-escolas/public/js/instance.js");
const base=path.join(__dirname,"../template-escolas");
const read=p=>fs.readFileSync(path.join(base,p),"utf8");
const school=id=>({
  schemaVersion:1,
  instanceId:id,
  siteOrigin:"https://"+id+".escola-exemplo.org",
  school:{name:"Escola "+id,gremio:"Grêmio Escolar",contact:"gremio@"+id+".escola-exemplo.org",color:"#246a49"},
  firebase:{apiKey:"AIza"+"x".repeat(32),authDomain:id+".firebaseapp.com",projectId:id,
    appId:"1:123456789:web:abcdef1234",messagingSenderId:"123456789"}
});

test("duas instalações escolares validam projeto Firebase, origem e identidade independentes",()=>{
  const a=school("escola-horizonte"),b=school("colegio-aurora");
  assert.equal(I.validate(a).instanceId,"escola-horizonte");
  assert.equal(I.validate(a,a.siteOrigin).firebase.projectId,a.firebase.projectId);
  assert.equal(I.different(a,b),true);
  b.firebase.projectId=a.firebase.projectId;
  b.firebase.authDomain=a.firebase.authDomain;
  assert.equal(I.different(a,b),false);
});
test("não aceita Firebase original, de exemplo ou fallback implícito",()=>{
  const a=school("escola-horizonte");
  a.firebase.projectId="gremioifce-92540";
  a.firebase.authDomain="gremioifce-92540.firebaseapp.com";
  assert.throws(()=>I.validate(a),/inválido|original/i);
  const ex=JSON.parse(read("public/config/installation.example.json"));
  assert.throws(()=>I.validate(ex),/domínio|fictício|real/i);
  assert.equal(fs.existsSync(path.join(base,"public/config/installation.json")),false);
});
test("falha em HTTP, origem errada, configuração incompleta e segredos",()=>{
  const a=school("escola-horizonte");
  assert.throws(()=>I.validate(a,"https://outro-host.org"),/Domínio/i);
  a.siteOrigin="http://escola-horizonte.escola-exemplo.org";
  assert.throws(()=>I.validate(a),/HTTPS/i);
  a.siteOrigin="https://escola-horizonte.escola-exemplo.org";
  a.firebase.private_key="NÃO PUBLICAR";
  assert.throws(()=>I.validate(a),/não permitido/i);
  delete a.firebase.private_key;
  delete a.firebase.apiKey;
  assert.throws(()=>I.validate(a),/incompleto/i);
});
test("arquivos novos não alteram Firebase e regras originais",()=>{
  const root=path.resolve(__dirname,"..");
  assert.ok(fs.existsSync(path.join(root,"index.html")));
  assert.ok(fs.existsSync(path.join(root,"admin.html")));
  assert.ok(fs.existsSync(path.join(root,"firestore.rules")));
  const files=["public/index.html","public/admin.html"];
  for(const f of files){
    const html=read(f);
    assert.match(html,/\.\/js\/instance\.js/);
    assert.match(html,/Origem do sistema: Grêmio IFCE/);
    assert.doesNotMatch(html,/AIzaSy|gremioifce-92540|kevin\.silva10/i);
  }
  for(const f of ["public/js/portal.js","public/js/admin.js"]){
    const js=read(f);
    assert.match(js,/InstalacaoEscolar\.load\(\)/);
    assert.doesNotMatch(js,/\.innerHTML\s*=|ROOT_EMAIL|cargosIniciais/i);
  }
});
test("roles não podem ser provisionados pelo navegador",()=>{
  const rules=read("firestore.rules");
  const script=read("scripts/bootstrap-admin.cjs");
  assert.match(rules,/match \/roles\/\{uid\}/);
  assert.match(rules,/allow write: if false/);
  assert.match(script,/INITIAL_ADMIN_APPROVED/);
  assert.match(script,/GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(script,/runTransaction/);
  assert.match(script,/emailVerified/);
});
test("privacidade: participações não estão no documento coletivo e são privadas",()=>{
  const rules=read("firestore.rules");
  assert.match(rules,/match \/registrations\/\{uid\}/);
  assert.match(rules,/match \/votes\/\{uid\}/);
  assert.match(rules,/allow list: if admin\(\)/);
  assert.doesNotMatch(rules,/votosAlunos|inscritos:\s*\[|espera:\s*\[/);
});
