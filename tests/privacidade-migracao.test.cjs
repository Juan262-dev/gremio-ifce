const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const {auditRoot,BASELINE,TOKENS}=require("../scripts/privacy/legacy-audit.cjs");
const {convertEvent,convertPoll,containsIdentifier}=require("../scripts/privacy/rehearse-migration.cjs");
const root=path.resolve(__dirname,"..");
const mapping={
 "ana@example.invalid":"uid-aluno-ana",
 "bruno@example.invalid":"uid-aluno-bruno",
 "carla@example.invalid":"uid-aluno-carla"
};
test("auditoria legado protege contra novas dependências e reconhece a dívida atual",()=>{
 const r=auditRoot(root);
 assert.equal(r.ok,true,r.failures.join("\n"));
 assert.ok(Object.keys(BASELINE).length>=8);
 assert.ok(TOKENS.includes("votosAlunos"));
 assert.ok(BASELINE["index.html"][0]>0);
});
test("auditoria detecta novo uso do formato antigo em arquivo de produção",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"audit-ifce-"));
 try{
  for(const file of Object.keys(BASELINE)){
    const original=fs.readFileSync(path.join(root,file),"utf8");
    fs.writeFileSync(path.join(dir,file),original);
  }
  const candidate=path.join(dir,"novo-script.js");
  fs.writeFileSync(candidate,"const registro = d.votosAlunos; // campo legado");
  let r=auditRoot(dir);
  assert.equal(r.ok,false);
  assert.ok(r.failures.some(x=>x.includes("novo-script.js")));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("conversão de evento fictício mantém ordem da fila mas não expõe e-mails",()=>{
 const r=convertEvent("evento-exemplo",{
  titulo:"Oficina de exemplo",dataISO:"2026-12-01",vagas:2,
  inscritos:["ana@example.invalid","bruno@example.invalid"],
  espera:["carla@example.invalid"]
 },mapping);
 assert.equal(r.publicEvent.numeroInscritos,2);
 assert.equal(r.publicEvent.numeroEmEspera,1);
 assert.deepEqual(r.registrations.map(x=>x.data.status),["registered","registered","waitlisted"]);
 assert.deepEqual(r.registrations.map(x=>x.data.order),[null,null,1]);
 assert.equal(containsIdentifier(r),false);
});
test("conversão de enquete fictícia preserva totais e voto privado por UID",()=>{
 const r=convertPoll("enquete-exemplo",{
  titulo:"Qual a atividade?",ativa:true,
  opcoes:[{id:0,texto:"Arte",votos:2},{id:1,texto:"Leitura",votos:1}],
  votosAlunos:[
   {email:"ana@example.invalid",opcaoId:0},
   {email:"bruno@example.invalid",opcaoId:1},
   {email:"carla@example.invalid",opcaoId:0}
  ]
 },mapping);
 assert.equal(r.privateVotes.length,3);
 assert.equal(r.publicPoll.opcoes[0].votos,2);
 assert.equal(containsIdentifier(r),false);
});
test("migração não inventa UIDs nem votos de dados incoerentes",()=>{
 const event={titulo:"Reunião",vagas:1,inscritos:["ana@example.invalid"],espera:[]};
 assert.throws(()=>convertEvent("x",{...event,espera:["desconhecido@example.invalid"]},mapping),/UID ausente/i);
 assert.throws(()=>convertEvent("x",{...event,espera:["ana@example.invalid"]},mapping),/duplicação/i);
 assert.throws(()=>convertEvent("x",{...event,inscritos:["ana@example.invalid","bruno@example.invalid"]},mapping),/acima das vagas/i);
 const poll={titulo:"Opções?",ativa:true,opcoes:[{id:0,texto:"A",votos:1},{id:1,texto:"B",votos:0}],votosAlunos:[{email:"ana@example.invalid",opcaoId:0}]};
 assert.throws(()=>convertPoll("p",{...poll,opcoes:[{id:0,texto:"A",votos:2},{id:1,texto:"B",votos:0}]},mapping),/divergentes/i);
 assert.throws(()=>convertPoll("p",{...poll,votosAlunos:["ana@example.invalid"]},mapping),/sem opção recuperável/i);
});
test("ensaios são puros e sem Firebase Admin, rede ou credenciais",()=>{
 const filenames=["scripts/privacy/legacy-audit.cjs","scripts/privacy/rehearse-migration.cjs"];
 for(const name of filenames){
  const text=fs.readFileSync(path.join(root,name),"utf8");
  assert.doesNotMatch(text,/firebase-admin|initializeApp\s*\(|fetch\s*\(|https\.request|execSync|firestore\.collection/);
 }
});
