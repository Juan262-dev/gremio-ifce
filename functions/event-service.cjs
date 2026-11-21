"use strict";
/**
 * Operações de eventos privadas executadas exclusivamente por Cloud Functions.
 * Recebe UID do token validado pelo servidor, nunca do corpo enviado pelo aluno.
 * Usa transação sobre o evento e a inscrição para preservar vagas e FIFO.
 */
const MAX_REGISTERED=100000,MAX_WAITING=100000;
function invalid(message,code="failed-precondition"){
  const e=new Error(message);e.code=code;throw e;
}
const counts=e=>{
  const vagas=e.vagas===undefined?0:Number(e.vagas);
  const inscritos=Number(e.inscritosCount||0);
  const espera=Number(e.esperaCount||0);
  const seq=Number(e.proximaOrdem||0);
  if(![vagas,inscritos,espera,seq].every(n=>Number.isSafeInteger(n)&&n>=0)
    ||vagas>MAX_REGISTERED||inscritos>MAX_REGISTERED||espera>MAX_WAITING
    ||(vagas>0&&inscritos>vagas))invalid("Contagens ou vagas do evento inválidas");
  return {vagas,inscritos,espera,seq};
};
function validateEvent(data){
  if(!data||data.privacidadeVersao!==2||Object.hasOwn(data,"inscritos")
    ||Object.hasOwn(data,"espera"))
    invalid("Evento ainda não migrado para o modelo privado");
  if(typeof data.dataISO==="string"&&/^\d{4}-\d\d-\d\d$/.test(data.dataISO)){
    const localDay=new Intl.DateTimeFormat("en-CA",{
      timeZone:"America/Fortaleza",year:"numeric",month:"2-digit",day:"2-digit"
    }).format(new Date());
    if(data.dataISO<localDay)invalid("Evento já encerrado");
  }
  return counts(data);
}
function validateUser(uid,email){
  if(typeof uid!=="string"||!/^[A-Za-z0-9_-]{6,128}$/.test(uid)
    ||typeof email!=="string"||email.length>180
    ||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    invalid("Identidade não autorizada","unauthenticated");
}
async function enroll(db,dbField,uid,email,eventId){
  validateUser(uid,email);
  if(typeof eventId!=="string"||!/^[A-Za-z0-9_-]{1,120}$/.test(eventId))
    invalid("Evento inválido","invalid-argument");
  const eventRef=db.collection("eventos").doc(eventId);
  const regRef=eventRef.collection("inscricoes").doc(uid);
  return db.runTransaction(async tx=>{
    const [ev,registration]=await Promise.all([tx.get(eventRef),tx.get(regRef)]);
    if(!ev.exists)invalid("Evento não encontrado","not-found");
    const {vagas,inscritos,espera,seq}=validateEvent(ev.data());
    if(registration.exists)return {status:registration.data().status,existing:true};
    const wait=vagas>0&&inscritos>=vagas;
    const status=wait?"waitlisted":"registered";
    const nextOrder=seq+1;
    tx.create(regRef,{
      uid,email,status,order:wait?nextOrder:null,criadoEm:dbField.serverTimestamp()
    });
    tx.update(eventRef,wait
      ?{esperaCount:espera+1,proximaOrdem:nextOrder}
      :{inscritosCount:inscritos+1,proximaOrdem:nextOrder});
    return {status,existing:false};
  });
}
async function cancel(db,uid,eventId){
  if(typeof uid!=="string"||!/^[A-Za-z0-9_-]{6,128}$/.test(uid)
    ||typeof eventId!=="string"||!/^[A-Za-z0-9_-]{1,120}$/.test(eventId))
    invalid("Identidade ou evento inválido","invalid-argument");
  const eventRef=db.collection("eventos").doc(eventId);
  const regRef=eventRef.collection("inscricoes").doc(uid);
  return db.runTransaction(async tx=>{
    const [ev,registration]=await Promise.all([tx.get(eventRef),tx.get(regRef)]);
    if(!ev.exists)invalid("Evento não encontrado","not-found");
    const {inscritos,espera}=validateEvent(ev.data());
    if(!registration.exists)return {status:"missing"};
    const status=registration.data().status;
    if(status==="waitlisted"){
      if(espera<=0)invalid("Contagem de espera inconsistente");
      tx.delete(regRef);tx.update(eventRef,{esperaCount:espera-1});
      return {status:"cancelled-waiting"};
    }
    if(status!=="registered"||inscritos<=0)invalid("Inscrição inconsistente");
    if(espera===0){
      tx.delete(regRef);tx.update(eventRef,{inscritosCount:inscritos-1});
      return {status:"cancelled"};
    }
    // Query executada ANTES das escritas, ordenada por número reservado
    // em transação; se concorrer com outra reserva, Firestore reexecuta.
    const waiters=await tx.get(eventRef.collection("inscricoes")
      .where("status","==","waitlisted").orderBy("order","asc").limit(1));
    if(waiters.empty)invalid("Fila ausente; interrompa para revisão");
    const first=waiters.docs[0];
    if(!Number.isSafeInteger(first.data().order)||first.data().order<1)
      invalid("Ordem de espera inválida");
    tx.delete(regRef);
    tx.update(first.ref,{status:"registered",order:null});
    tx.update(eventRef,{esperaCount:espera-1});
    return {status:"cancelled-promoted"};
  });
}
module.exports={enroll,cancel,validateUser,validateEvent,counts};
