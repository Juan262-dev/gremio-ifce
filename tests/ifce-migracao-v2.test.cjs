const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const S=require("../scripts/privacy/migrate-ifce-v2.cjs");
const stamp="2026-11-21";
const mapping={
  "ana@example.invalid":"uid-aluno-ana",
  "bia@example.invalid":"uid-aluno-bia",
  "caio@example.invalid":"uid-aluno-caio"
};
test("não executa sem autorização e sem evidência de restauração",()=>{
  assert.throws(()=>S.preflight({}),/autorização/);
  assert.equal(S.safetyFreeze({manutencao:true,painelCongelado:true,privacidadeMigracaoBloqueada:true}),true);
  assert.equal(S.safetyFreeze({manutencao:true,painelCongelado:false,privacidadeMigracaoBloqueada:true}),false);
});
test("converte inscrições e fila de exemplos em registros privados por UID",()=>{
  const plan=S.build("eventos","evento-exemplo",{
    titulo:"Oficina fictícia",vagas:1,dataISO:stamp,
    inscritos:["ana@example.invalid"],espera:["bia@example.invalid"]
  },mapping);
  assert.equal(plan.skip,false);
  assert.equal(plan.counts.inscritosCount,1);
  assert.equal(plan.counts.esperaCount,1);
  assert.deepEqual(plan.remove,["inscritos","espera"]);
  assert.equal(plan.documents.length,2);
  assert.deepEqual(plan.documents.map(d=>d.data.status),["registered","waitlisted"]);
  assert.deepEqual(plan.documents.map(d=>d.data.order),[null,1]);
  assert.equal(plan.documents[1].data.email,"bia@example.invalid");
  assert.ok(plan.documents.every(d=>d.path.includes("/inscricoes/uid-")));
});
test("converte votos de exemplos em cédulas privadas sem e-mail",()=>{
  const plan=S.build("enquetes","enquete-exemplo",{
    titulo:"Qual opção fictícia?",ativa:true,
    opcoes:[{id:0,texto:"Arte",votos:1},{id:1,texto:"Leitura",votos:1}],
    votosAlunos:[{email:"ana@example.invalid",opcaoId:0},{email:"bia@example.invalid",opcaoId:1}]
  },mapping);
  assert.equal(plan.documents.length,2);
  assert.deepEqual(plan.remove,["votosAlunos"]);
  assert.ok(plan.documents.every(d=>!JSON.stringify(d.data).includes("@")));
  assert.deepEqual(S.summary([plan]),{events:0,polls:1,privateRecords:2,alreadyMigrated:0,writesPerformed:0,containsEmail:false});
});
test("bloqueia dados incoerentes, identidades inexistentes e limites de transação",()=>{
  assert.throws(()=>S.build("eventos","e",{
    titulo:"Evento",vagas:1,inscritos:["ana@example.invalid","bia@example.invalid"],espera:[]
  },mapping),/acima das vagas/);
  assert.throws(()=>S.build("eventos","e",{
    titulo:"Evento",vagas:2,inscritos:["desconhecido@example.invalid"],espera:[]
  },mapping),/correspondência UID ausente/);
  assert.throws(()=>S.build("enquetes","e",{
    titulo:"Enquete",opcoes:[{id:0,texto:"A",votos:2},{id:1,texto:"B",votos:0}],
    votosAlunos:[{email:"ana@example.invalid",opcaoId:0}]
  },mapping),/divergentes/);
  assert.throws(()=>S.safeRecordCount(351),/limite|excesso/i);
  assert.throws(()=>S.build("eventos","e",{privacidadeVersao:2,titulo:"Evento",inscritos:[]},mapping),/ainda contém/);
});
test("presença legada malformada ou não vazia impede migração automática",()=>{
  const input={
    titulo:"Evento",vagas:2,inscritos:["ana@example.invalid"],espera:[],
  };
  assert.throws(()=>S.build("eventos","e",{...input,presentes:["ana@example.invalid"]},mapping),/presenças antigas/);
  assert.throws(()=>S.build("eventos","e",{...input,presentes:"dado inesperado"},mapping),/presenças antigas/);
  const safelyEmpty=S.build("eventos","e",{...input,presentes:[]},mapping);
  assert.ok(safelyEmpty.remove.includes("presentes"));
});
test("esquema migrado sem campos antigos é idempotente",()=>{
  const plan=S.build("eventos","e",{titulo:"Exemplo",privacidadeVersao:2,inscritosCount:0,esperaCount:0},mapping);
  assert.equal(plan.skip,true);
  assert.deepEqual(S.summary([plan]),{events:0,polls:0,privateRecords:0,alreadyMigrated:1,writesPerformed:0,containsEmail:false});
});
test("nenhuma operação de migração roda na CI, nem escreve arquivos pessoais",()=>{
  const script=fs.readFileSync(path.join(__dirname,"../scripts/privacy/migrate-ifce-v2.cjs"),"utf8");
  assert.match(script,/require\.main===module/);
  assert.match(script,/IFCE_MIGRATION_BACKUP_RESTORED/);
  assert.match(script,/maxAttempts:1/);
  assert.match(script,/t\.create\(/);
  assert.match(script,/d\.delete\(\)/);
  assert.doesNotMatch(script,/writeFileSync|console\.log\(.*email/);
});
