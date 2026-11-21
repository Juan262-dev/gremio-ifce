const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {validatePlan}=require("../template-escolas/scripts/transfer-admin.cjs");
const instance={
 schemaVersion:1,instanceId:"escola-horizonte",
 siteOrigin:"https://escola-horizonte.example.org",
 school:{name:"Escola Horizonte",gremio:"Grêmio Modelo",contact:"contato@escola-horizonte.example.org",color:"#246a49"},
 firebase:{apiKey:"AIza"+"x".repeat(32),authDomain:"escola-horizonte.firebaseapp.com",projectId:"escola-horizonte",
 appId:"1:123456789:web:abcdef1234",messagingSenderId:"123456789"}
};
const inputs={
 TRANSFER_APPROVED:"CONFIRMO_DIRECAO",
 FIREBASE_PROJECT_ID:"escola-horizonte",
 FORMER_ADMIN_UID:"admin-antigo-123",
 NEW_ADMIN_UID:"admin-novo-456"
};
test("troca da diretoria requer projeto escolar correto, aprovação e UIDs distintos",()=>{
 const p=validatePlan(inputs,instance);
 assert.deepEqual(p,{projectId:"escola-horizonte",formerUid:"admin-antigo-123",newUid:"admin-novo-456"});
 assert.throws(()=>validatePlan({...inputs,TRANSFER_APPROVED:""},instance),/aprovação/i);
 assert.throws(()=>validatePlan({...inputs,FIREBASE_PROJECT_ID:"outra-escola"},instance),/Projeto diferente/i);
 assert.throws(()=>validatePlan({...inputs,NEW_ADMIN_UID:inputs.FORMER_ADMIN_UID},instance),/UIDs distintos/i);
});
test("troca de cargo exige transação, log e credencial da escola",()=>{
 const file=fs.readFileSync(path.resolve(__dirname,"../template-escolas/scripts/transfer-admin.cjs"),"utf8");
 for(const token of [
  "runTransaction","tx.create(next","tx.update(former","tx.create(history",
  'project_id!==expected',"successor.emailVerified","applicationDefault()"
 ])assert.ok(file.includes(token),token);
 assert.doesNotMatch(file,/initializeApp\([^)]*serviceAccountKey|fetch\(/);
});
test("configuração de hospedagem usa cabeçalhos de proteção reais",()=>{
 const hosting=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../template-escolas/firebase.json"),"utf8")).hosting;
 assert.equal(hosting.public,"public");
 const h=Object.fromEntries(hosting.headers[0].headers.map(x=>[x.key,x.value]));
 assert.equal(h["X-Frame-Options"],"DENY");
 assert.match(h["Content-Security-Policy"],/frame-ancestors 'none'/);
 assert.equal(h["X-Content-Type-Options"],"nosniff");
 assert.match(h["Permissions-Policy"],/camera=\(\)/);
});
