// Firebase Emulator local exclusivo, NUNCA ambientes ou usuários reais.
const {before,after,test}=require("node:test");
const assert=require("node:assert/strict");
const {initializeApp,deleteApp}=require("firebase-admin/app");
const {getFirestore,FieldValue}=require("firebase-admin/firestore");
const {enroll,cancel,validateEvent,counts}=require("../functions/event-service.cjs");
let app,db;
const uidA="uid-demo-aluno-01",uidB="uid-demo-aluno-02",uidC="uid-demo-aluno-03";
const emailA="a@example.invalid",emailB="b@example.invalid",emailC="c@example.invalid";
const base={
 titulo:"Oficina fictícia",dataISO:"2099-01-01",privacidadeVersao:2,
 vagas:1,inscritosCount:0,esperaCount:0,proximaOrdem:0
};
before(async()=>{
 if(!process.env.FIRESTORE_EMULATOR_HOST)
   throw Error("Teste de evento NÃO pode rodar fora do Firestore Emulator.");
 app=initializeApp({projectId:"demo-ifce-event-service-tests"},"event-service-tests");
 db=getFirestore(app);
});
after(async()=>{if(app)await deleteApp(app);});
async function seed(id,fields={}){await db.collection("eventos").doc(id).set({...base,...fields});}
test("vagas concorrentes: só uma inscrição, segunda pessoa na espera",async()=>{
 await seed("evento-concorrencia");
 const results=await Promise.all([
   enroll(db,FieldValue,uidA,emailA,"evento-concorrencia"),
   enroll(db,FieldValue,uidB,emailB,"evento-concorrencia")
 ]);
 assert.deepEqual(results.map(r=>r.status).sort(),["registered","waitlisted"]);
 const ev=(await db.doc("eventos/evento-concorrencia").get()).data();
 assert.equal(ev.inscritosCount,1);assert.equal(ev.esperaCount,1);
 assert.equal(ev.proximaOrdem,2);
 assert.equal(Object.hasOwn(ev,"inscritos"),false);
 assert.equal(Object.hasOwn(ev,"espera"),false);
 assert.equal(JSON.stringify(ev).includes("@"),false);
});
test("cancelamento promove primeiro da fila; mantém ordem FIFO",async()=>{
 await seed("evento-fila");
 await enroll(db,FieldValue,uidA,emailA,"evento-fila");
 await enroll(db,FieldValue,uidB,emailB,"evento-fila");
 await enroll(db,FieldValue,uidC,emailC,"evento-fila");
 assert.equal((await db.doc("eventos/evento-fila/inscricoes/"+uidB).get()).data().status,"waitlisted");
 const cancelled=await cancel(db,uidA,"evento-fila");
 assert.equal(cancelled.status,"cancelled-promoted");
 const promoted=(await db.doc("eventos/evento-fila/inscricoes/"+uidB).get()).data();
 assert.equal(promoted.status,"registered");
 assert.equal((await db.doc("eventos/evento-fila/inscricoes/"+uidC).get()).data().status,"waitlisted");
 const ev=(await db.doc("eventos/evento-fila").get()).data();
 assert.equal(ev.inscritosCount,1);assert.equal(ev.esperaCount,1);
 const old=(await db.doc("eventos/evento-fila/inscricoes/"+uidA).get());
 assert.equal(old.exists,false);
});
test("repetir inscrição não duplica reservas nem votos; sair da fila preserva vagas",async()=>{
 await seed("evento-duplicacao");
 await enroll(db,FieldValue,uidA,emailA,"evento-duplicacao");
 const repeat=await enroll(db,FieldValue,uidA,emailA,"evento-duplicacao");
 assert.equal(repeat.existing,true);
 await enroll(db,FieldValue,uidB,emailB,"evento-duplicacao");
 assert.equal((await cancel(db,uidB,"evento-duplicacao")).status,"cancelled-waiting");
 const ev=(await db.doc("eventos/evento-duplicacao").get()).data();
 assert.equal(ev.inscritosCount,1);assert.equal(ev.esperaCount,0);
 assert.equal((await cancel(db,uidB,"evento-duplicacao")).status,"missing");
});
test("impede eventos legados, inscrições falsas e contagens impossíveis",async()=>{
 await seed("evento-legado",{privacidadeVersao:0,inscritos:[emailA]});
 await assert.rejects(()=>enroll(db,FieldValue,uidA,emailA,"evento-legado"),/não migrado/);
 assert.throws(()=>validateEvent({...base,inscritos:[emailA]}),/não migrado/);
 assert.throws(()=>counts({vagas:1,inscritosCount:2}),/vagas/);
 await assert.rejects(()=>enroll(db,FieldValue,"x",emailA,"evento-legado"),/Identidade/);
 await assert.rejects(()=>enroll(db,FieldValue,uidA,emailA,"id inválido"),/Evento inválido/);
});

test("bloqueia data ausente, datas antigas e eventos com campos legados",async()=>{
 await seed("evento-sem-data",{dataISO:""});
 await assert.rejects(()=>enroll(db,FieldValue,uidA,emailA,"evento-sem-data"),/data ISO válida/);
 await seed("evento-antigo",{dataISO:"2020-04-01"});
 await assert.rejects(()=>enroll(db,FieldValue,uidA,emailA,"evento-antigo"),/encerrado/);
 await seed("evento-exposicao",{presentes:[emailA]});
 await assert.rejects(()=>enroll(db,FieldValue,uidA,emailA,"evento-exposicao"),/não migrado/);
});
test("rejeita fila inconsistente, duplicação adulterada e não realiza gravações",async()=>{
 await seed("evento-fila-incoerente",{inscritosCount:0,esperaCount:1,proximaOrdem:1,vagas:1});
 await assert.rejects(()=>enroll(db,FieldValue,uidA,emailA,"evento-fila-incoerente"),/Contagens/);
 await seed("evento-fila-ilimitada",{esperaCount:1,proximaOrdem:1,vagas:0});
 await assert.rejects(()=>enroll(db,FieldValue,uidA,emailA,"evento-fila-ilimitada"),/Contagens/);
 await seed("evento-inscricao-adulterada");
 await db.doc("eventos/evento-inscricao-adulterada/inscricoes/"+uidA)
   .set({uid:uidB,email:emailB,status:"registered"});
 await assert.rejects(()=>enroll(db,FieldValue,uidA,emailA,"evento-inscricao-adulterada"),/inconsistente/);
 const record=await db.doc("eventos/evento-inscricao-adulterada").get();
 assert.equal(record.data().inscritosCount,0);
});

test("não cria inscrição quando evento v2 tem contador ausente ou texto no lugar de número",async()=>{
 const ref=db.doc("eventos/evento-incompleto");
 await ref.set({titulo:"Evento fictício",dataISO:"2099-01-01",
   privacidadeVersao:2,vagas:1,inscritosCount:0,esperaCount:0});
 await assert.rejects(()=>enroll(db,FieldValue,uidA,emailA,"evento-incompleto"),
   /Contagens ou vagas/);
 await ref.update({proximaOrdem:0,esperaCount:"0"});
 await assert.rejects(()=>enroll(db,FieldValue,uidA,emailA,"evento-incompleto"),
   /Contagens ou vagas/);
 assert.equal((await ref.collection("inscricoes").doc(uidA).get()).exists,false);
 const snap=await ref.get();
 assert.equal(snap.data().inscritosCount,0);
});

