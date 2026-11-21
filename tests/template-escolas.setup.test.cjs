const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const {assemble,writeOnce,details}=require("../template-escolas/scripts/setup-school.cjs");
const data={
  instanceId:"escola-horizonte",
  siteOrigin:"https://gremio.escola-horizonte.example.org",
  schoolName:"Escola Horizonte",
  gremioName:"Grêmio Movimento",
  schoolContact:"contato@escola-horizonte.example.org",
  color:"#26694d",
  projectId:"escola-horizonte",
  authDomain:"escola-horizonte.firebaseapp.com",
  apiKey:"AIza"+"x".repeat(32),
  appId:"1:123456789:web:abcdef1234",
  messagingSenderId:"123456789"
};
test("assistente prepara configuração Web exclusiva e resumo sem chaves",()=>{
  const instance=assemble(data);
  assert.equal(instance.firebase.projectId,"escola-horizonte");
  assert.equal(instance.school.gremio,"Grêmio Movimento");
  const summary=details(instance);
  assert.equal(summary.origin,data.siteOrigin);
  assert.equal(summary.projectId,data.projectId);
  assert.equal(Object.hasOwn(summary,"apiKey"),false);
});
test("assistente recusa configurações de exemplo, IFCE, HTTP e Firebase misturado",()=>{
  assert.throws(()=>assemble({...data,projectId:"gremioifce-92540",authDomain:"gremioifce-92540.firebaseapp.com"}),/inválido/i);
  assert.throws(()=>assemble({...data,siteOrigin:"http://gremio.escola-horizonte.example.org"}),/HTTPS/i);
  assert.throws(()=>assemble({...data,projectId:"demo-invalido",authDomain:"demo-invalido.firebaseapp.com"}),/inválido/i);
  assert.throws(()=>assemble({...data,messagingSenderId:"999999"}),/aplicativos Web diferentes/i);
  const safe=assemble({...data,private_key:"segredo"});
  assert.equal(Object.hasOwn(safe,"private_key"),false);
});
test("gravação local é exclusiva e jamais sobrescreve uma escola existente",()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),"gremio-wizard-test-"));
  const file=path.join(folder,"installation.json");
  try{
    const config=assemble(data);
    assert.equal(writeOnce(file,config),file);
    assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),config);
    assert.throws(()=>writeOnce(file,config),/EEXIST/);
    assert.throws(()=>writeOnce(path.join(folder,"outro.json"),config),/Nome de arquivo/);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test("assistente não executa Firebase, deploy ou bootstrap e exige terminal",()=>{
  const src=fs.readFileSync(path.resolve(__dirname,"../template-escolas/scripts/setup-school.cjs"),"utf8");
  assert.match(src,/--dry-run/);
  assert.match(src,/process\.stdin\.isTTY/);
  assert.match(src,/GRAVAR-EXEMPLO/);
  assert.doesNotMatch(src,/initializeApp\(|firebase deploy|execSync|child_process|require\(["']firebase-admin/);
});
