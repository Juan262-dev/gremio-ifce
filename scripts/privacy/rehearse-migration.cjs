"use strict";
// Ensaio PURO e SEM REDE com dados fictícios. Não altera Firestore, regras ou site.
// O resultado é um desenho de migração, NÃO o esquema pronto do template.
function fail(reason){throw Error("Ensaio bloqueado: "+reason+". Verifique os dados fictícios; nenhuma alteração ocorreu.");}
const validText=(s,max)=>typeof s==="string"&&s.trim().length>0&&s.length<=max;
const validUid=uid=>typeof uid==="string"&&/^[A-Za-z0-9_-]{6,128}$/.test(uid);
function getUid(email,mapping){
  if(typeof email!=="string"||!email.trim()||!email.includes("@"))fail("identificador de origem inválido");
  const key=email.trim().toLowerCase();
  if(!Object.prototype.hasOwnProperty.call(mapping,key))fail("correspondência UID ausente");
  const uid=mapping[key];
  if(!validUid(uid))fail("UID de destino inválido");
  return uid;
}
function identities(emails,mapping){
  if(!mapping||typeof mapping!=="object"||Array.isArray(mapping))fail("mapa institucional de UID ausente");
  const used=new Set();
  const ids=[];
  for(const email of emails){
    const uid=getUid(email,mapping);
    if(used.has(uid))fail("duplicação de identidade entre listas ou votos");
    used.add(uid);ids.push(uid);
  }
  return ids;
}
function convertEvent(id,data,mapping){
  if(!validText(id,120)||!data||typeof data!=="object"||Array.isArray(data))fail("evento inválido");
  const inscritos=data.inscritos,espera=data.espera;
  if(!Array.isArray(inscritos)||!Array.isArray(espera))fail("listas legadas de evento ausentes");
  const vagas=data.vagas===undefined?0:data.vagas;
  if(!Number.isInteger(vagas)||vagas<0||vagas>100000)fail("vagas do evento inválidas");
  if(vagas>0&&inscritos.length>vagas)fail("quantidade de inscritos acima das vagas");
  if(vagas===0&&espera.length)fail("fila de espera para evento sem limite de vagas");
  if(vagas>0&&espera.length&&inscritos.length<vagas)fail("fila de espera com vagas livres");
  if(!validText(data.titulo,200))fail("título de evento inválido");
  const ids=identities([...inscritos,...espera],mapping);
  const publicEvent={
    titulo:data.titulo.trim(),dataISO:typeof data.dataISO==="string"?data.dataISO.slice(0,35):"",
    vagas,numeroInscritos:inscritos.length,numeroEmEspera:espera.length
  };
  const registrations=ids.map((uid,index)=>({
    path:"eventos/"+id+"/registrations/"+uid,
    data:{uid,status:index<inscritos.length?"registered":"waitlisted",
      order:index<inscritos.length?null:index-inscritos.length+1}
  }));
  return {publicEvent,registrations};
}
function convertPoll(id,data,mapping){
  if(!validText(id,120)||!data||typeof data!=="object"||Array.isArray(data))fail("enquete inválida");
  const votes=data.votosAlunos,options=data.opcoes;
  if(!Array.isArray(votes)||!Array.isArray(options)||options.length<2||options.length>8)
    fail("votos e opções da enquete inválidos");
  if(!validText(data.titulo,200))fail("título da enquete inválido");
  const optionIds=new Set();
  const counts=new Map();
  const safeOptions=[];
  for(const option of options){
    if(!option||typeof option!=="object"||!Number.isInteger(option.id)||!validText(option.texto,100)
      ||!Number.isInteger(option.votos)||option.votos<0||optionIds.has(option.id))
      fail("opções ou contagens da enquete inconsistentes");
    optionIds.add(option.id);counts.set(option.id,0);
    safeOptions.push({id:option.id,texto:option.texto.trim(),votos:option.votos});
  }
  const emails=votes.map(v=>{
    if(!v||typeof v!=="object"||Array.isArray(v)||!Number.isInteger(v.opcaoId)||!optionIds.has(v.opcaoId))
      fail("cédula legada sem opção recuperável");
    counts.set(v.opcaoId,counts.get(v.opcaoId)+1);
    return v.email;
  });
  const uids=identities(emails,mapping);
  for(const option of options)if(option.votos!==counts.get(option.id))
    fail("totais históricos de votos divergentes; exige revisão humana");
  const privateVotes=uids.map((uid,index)=>({
    path:"enquetes/"+id+"/votes/"+uid,
    data:{uid,optionId:votes[index].opcaoId}
  }));
  return {
    publicPoll:{titulo:data.titulo.trim(),ativa:data.ativa===true,opcoes:safeOptions},
    privateVotes
  };
}
function containsIdentifier(value){
  return JSON.stringify(value).includes("@");
}
module.exports={convertEvent,convertPoll,containsIdentifier};
