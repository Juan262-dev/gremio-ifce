const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {makeSnapshot,dryRunRestore}=require("../template-escolas/scripts/backup-drill.cjs");
const stamp="2026-01-01T00:00:00Z";
const instanceA={instanceId:"demo-escola-horizonte",projectId:"demo-escola-horizonte-fb"};
const instanceB={instanceId:"demo-colegio-aurora",projectId:"demo-colegio-aurora-fb"};
const sample=[
 {path:"members/uid-demo-aluno-01",data:{displayName:"Estudante Fictício 01",status:"approved",createdAt:stamp}},
 {path:"notices/aviso-1",data:{title:"Aviso inventado",body:"Um comunicado sem dados reais.",createdAt:stamp}},
 {path:"events/evento-1",data:{title:"Oficina inventada",details:"Atividade simulada",when:"Dia fictício",location:"Pátio da escola",createdAt:stamp}},
 {path:"events/evento-1/registrations/uid-demo-aluno-01",data:{uid:"uid-demo-aluno-01",createdAt:stamp}},
 {path:"polls/enquete-1",data:{question:"Qual atividade?",options:["Arte","Leitura"],active:true,createdAt:stamp}},
 {path:"polls/enquete-1/votes/uid-demo-aluno-01",data:{uid:"uid-demo-aluno-01",optionId:1,createdAt:stamp}},
 {path:"suggestions/sugestao-1",data:{ownerUid:"uid-demo-aluno-01",body:"Criar um mural fictício",status:"pending",createdAt:stamp}}
];
test("ensaio recupera somente dados fictícios na mesma escola e não altera nada",()=>{
 const old=JSON.stringify(sample);
 const snapshot=makeSnapshot({...instanceA,documents:sample});
 assert.equal(snapshot.documents.length,7);
 assert.match(snapshot.checksum,/^[0-9a-f]{64}$/);
 const report=dryRunRestore(snapshot,instanceA);
 assert.equal(report.dryRun,true);
 assert.equal(report.writesPerformed,0);
 assert.equal(report.rolesRestored,false);
 assert.equal(report.documentCount,7);
 assert.equal(JSON.stringify(sample),old);
});
test("backup fictício da escola A jamais é aceito para escola B",()=>{
 const snap=makeSnapshot({...instanceA,documents:sample});
 assert.throws(()=>dryRunRestore(snap,instanceB),/entre escolas/i);
 assert.throws(()=>dryRunRestore(snap,{...instanceA,projectId:instanceB.projectId}),/entre escolas/i);
});
test("detecta corrupção, exclusão ou alteração de um registro",()=>{
 const snap=makeSnapshot({...instanceA,documents:sample});
 const tampered=JSON.parse(JSON.stringify(snap));
 tampered.documents[0].data.status="blocked";
 assert.throws(()=>dryRunRestore(tampered,instanceA),/adulterado/i);
 const removed=JSON.parse(JSON.stringify(snap));
 removed.documents.pop();
 assert.throws(()=>dryRunRestore(removed,instanceA),/adulterado/i);
});
test("não aceita cargos, credenciais, e-mails, contas ou dados reais",()=>{
 for(const entry of [
  {path:"roles/uid-demo-aluno-01",data:{role:"admin"}},
  {path:"system/bootstrap",data:{uid:"uid-demo-aluno-01"}},
  {path:"notices/a",data:{title:"E-mail",body:"aluno@exemplo.edu.br",createdAt:stamp}},
  {path:"notices/b",data:{title:"Aviso",body:"senha:12345",createdAt:stamp}},
  {path:"members/uid-demo-aluno-01",data:{displayName:"Pessoa Real",status:"approved",createdAt:stamp}}
 ])assert.throws(()=>makeSnapshot({...instanceA,documents:[entry]}),/Ensaio recusado/);
 assert.throws(()=>makeSnapshot({instanceId:"escola-real",projectId:"escola-real",documents:sample}),/não é um identificador/i);
 assert.throws(()=>makeSnapshot({instanceId:"demo-gremio-ifce",projectId:instanceA.projectId,documents:sample}),/não é um identificador/i);
});
test("não aceita documentos duplicados, UID de outra pessoa ou opções inválidas",()=>{
 assert.throws(()=>makeSnapshot({...instanceA,documents:[sample[0],sample[0]]}),/duplicados/i);
 assert.throws(()=>makeSnapshot({...instanceA,documents:[{path:"polls/p1/votes/uid-demo-aluno-01",data:{uid:"uid-demo-aluno-02",optionId:0,createdAt:stamp}}]}),/UID.*diferente/i);
 assert.throws(()=>makeSnapshot({...instanceA,documents:[{path:"polls/x",data:{question:"?",options:["Uma"],active:true,createdAt:stamp}}]}),/enquete inválida/i);
});
test("código de recuperação não acessa rede, Firebase ou disco para cópias",()=>{
 const script=fs.readFileSync(path.resolve(__dirname,"../template-escolas/scripts/backup-drill.cjs"),"utf8");
 assert.doesNotMatch(script,/firebase-admin|initializeApp\s*\(|fetch\s*\(|execSync|writeFileSync|firestore\.collection/);
 assert.match(script,/writesPerformed:0/);
 assert.match(script,/rolesRestored:false/);
});
