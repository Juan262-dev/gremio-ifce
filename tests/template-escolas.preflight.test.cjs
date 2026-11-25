const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const {validatePreflight}=require("../template-escolas/scripts/preflight-school.cjs");
const base=path.resolve(__dirname,"../template-escolas");
const settings={
  firebaseJson:JSON.parse(fs.readFileSync(path.join(base,"firebase.json"),"utf8")),
  rules:fs.readFileSync(path.join(base,"firestore.rules"),"utf8"),
  portalHtml:fs.readFileSync(path.join(base,"public/index.html"),"utf8"),
  adminHtml:fs.readFileSync(path.join(base,"public/admin.html"),"utf8")
};
const installation=(school,project,sender)=>({
  schemaVersion:1,
  instanceId:school,
  siteOrigin:"https://"+school+".example.org",
  school:{name:"Escola Fictícia",gremio:"Grêmio Fictício",contact:"contato@example.org",color:"#246a49"},
  firebase:{
    projectId:project,authDomain:project+".firebaseapp.com",
    apiKey:"AIza"+"x".repeat(32),
    appId:"1:"+sender+":web:abcdef1234567890",
    messagingSenderId:sender
  }
});
const a=()=>installation("escola-exemplo-a","escola-teste-a","123456789");
const b=()=>installation("escola-exemplo-b","escola-teste-b","987654321");
test("Firebase exclusivo permite checagem de duas escolas com projetos e origens separados",()=>{
  const result=validatePreflight(a(),b(),settings);
  assert.equal(result.hasSecondSchool,true);
  assert.equal(result.status,"PREPARACAO_LOCAL_SOMENTE");
  assert.equal(result.projectId,"escola-teste-a");
  assert.equal(Object.hasOwn(result,"apiKey"),false);
  assert.equal(Object.hasOwn(result,"messagingSenderId"),false);
});
test("recusa reutilizar Firebase, domínio ou ID da instalação",()=>{
  assert.throws(()=>validatePreflight(a(),{...b(),firebase:a().firebase},settings));
  assert.throws(()=>validatePreflight(a(),{...b(),siteOrigin:a().siteOrigin},settings));
  assert.throws(()=>validatePreflight(a(),{...b(),instanceId:a().instanceId},settings));
});
test("recusa projeto IFCE, http, credenciais privadas ou configuração de exemplo",()=>{
  assert.throws(()=>validatePreflight({
    ...a(),firebase:{...a().firebase,projectId:"gremioifce-92540",authDomain:"gremioifce-92540.firebaseapp.com"}
  },undefined,settings));
  assert.throws(()=>validatePreflight({...a(),siteOrigin:"http://inseguro.example.org"},undefined,settings));
  assert.throws(()=>validatePreflight({...a(),firebase:{...a().firebase,serviceAccount:"segredo"}},undefined,settings));
  const example=JSON.parse(fs.readFileSync(path.join(base,"public/config/installation.example.json"),"utf8"));
  assert.throws(()=>validatePreflight(example,undefined,settings));
});
test("recusa template com Firestore Rules ou Hosting que não correspondam à instalação",()=>{
  assert.throws(()=>validatePreflight(a(),undefined,{...settings,rules:"allow read,write: if true;"}));
  assert.throws(()=>validatePreflight(a(),undefined,{
    ...settings,firebaseJson:{...settings.firebaseJson,firestore:{rules:"../firestore.rules"}}
  }));
  assert.throws(()=>validatePreflight(a(),undefined,{
    ...settings,firebaseJson:{...settings.firebaseJson,hosting:{public:"../public"}}
  }));
});
test("CLI nunca conecta ou publica Firebase e falha sem arquivo escolar",()=>{
  const source=fs.readFileSync(path.join(base,"scripts/preflight-school.cjs"),"utf8");
  assert.doesNotMatch(source,/firebase-admin|initializeApp\(|execSync\(|firebase deploy/);
  const run=spawnSync(process.execPath,[path.join(base,"scripts/preflight-school.cjs")],{
    encoding:"utf8",env:{PATH:process.env.PATH}
  });
  assert.equal(run.status,1);
  assert.match(run.stderr,/REPROVADA/);
});

test("preflight recusa retirar créditos originais das duas páginas escolares",()=>{
 const {verificarCreditos,proximosPassos}=require("../template-escolas/scripts/preflight-school.cjs");
 assert.equal(verificarCreditos(settings.portalHtml,settings.adminHtml),true);
 assert.equal(validatePreflight(a(),undefined,settings).creditosConferidosLocalmente,true);
 assert.throws(()=>validatePreflight(a(),undefined,{...settings,adminHtml:"<footer>Créditos removidos</footer>"}),/Créditos/);
 assert.throws(()=>validatePreflight(a(),undefined,{...settings,portalHtml:"<footer>Créditos removidos</footer>"}),/Créditos/);
 assert.ok(proximosPassos(validatePreflight(a(),undefined,settings)).length>=4);
});
