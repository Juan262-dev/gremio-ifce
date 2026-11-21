"use strict";
const admin=require("firebase-admin");
const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {enroll,cancel}=require("./event-service.cjs");
const {assertEventsReleased}=require("./release-gate.cjs");
admin.initializeApp();
const db=admin.firestore();
function errorFrom(err){
  if(err instanceof HttpsError)return err;
  const allowed=new Set(["invalid-argument","unauthenticated","permission-denied",
    "failed-precondition","not-found","already-exists","resource-exhausted"]);
  return new HttpsError(allowed.has(err?.code)?err.code:"failed-precondition",
    allowed.has(err?.code)?err.message:"Operação não autorizada; contate a gestão.");
}
async function authorized(request){
  const uid=request.auth?.uid,email=request.auth?.token?.email;
  if(!uid||!email||request.auth.token.email_verified!==true)
    throw new HttpsError("unauthenticated","Conta e e-mail verificado obrigatórios.");
  const canonical=String(email).toLowerCase();
  const [aluno,system,punishment]=await Promise.all([
    db.collection("alunos").doc(canonical).get(),
    db.doc("config/sistema").get(),
    db.collection("membros_punidos").doc(canonical).get()
  ]);
  assertEventsReleased(system);
  if(!aluno.exists||aluno.data().ativo!==true
    ||["pendente","recusado","excluido"].includes(aluno.data().status))
    throw new HttpsError("permission-denied","Cadastro estudantil não aprovado.");
  if(punishment.exists&&punishment.data().expiraEm?.toMillis?.()>Date.now())
    throw new HttpsError("permission-denied","Participação temporariamente bloqueada.");
  return {uid,email:canonical};
}
exports.inscreverEventoSeguro=onCall({region:"southamerica-east1",maxInstances:10},async request=>{
  try{
    const who=await authorized(request);
    return await enroll(db,admin.firestore.FieldValue,who.uid,who.email,request.data?.eventoId);
  }catch(e){throw errorFrom(e);}
});
exports.cancelarEventoSeguro=onCall({region:"southamerica-east1",maxInstances:10},async request=>{
  try{
    const who=await authorized(request);
    return await cancel(db,who.uid,request.data?.eventoId);
  }catch(e){throw errorFrom(e);}
});
