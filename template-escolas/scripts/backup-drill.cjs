"use strict";
/*
 * ENSAIO OFFLINE de backup/restauração de DADOS FICTÍCIOS.
 * Não acessa nem salva Firestore, Authentication, banco de dados ou credenciais.
 * NÃO é ferramenta de backup real e não recupera papéis administrativos.
 */
const crypto=require("node:crypto");
const allowedCollections=new Set(["members","notices","events","polls","suggestions","registrations","votes"]);
const ID="(?:[a-z0-9][a-z0-9-]{0,70})";
const UID="(?:uid-demo-[a-z0-9-]{4,64})";
const patterns=[
  {re:new RegExp("^members/("+UID+")$"),kind:"members"},
  {re:new RegExp("^notices/("+ID+")$"),kind:"notices"},
  {re:new RegExp("^events/("+ID+")$"),kind:"events"},
  {re:new RegExp("^polls/("+ID+")$"),kind:"polls"},
  {re:new RegExp("^suggestions/("+ID+")$"),kind:"suggestions"},
  {re:new RegExp("^events/("+ID+")/registrations/("+UID+")$"),kind:"registrations"},
  {re:new RegExp("^polls/("+ID+")/votes/("+UID+")$"),kind:"votes"}
];
const fields={
  members:["displayName","status","createdAt"],
  notices:["title","body","createdAt"],
  events:["title","details","when","location","createdAt"],
  polls:["question","options","active","createdAt"],
  suggestions:["ownerUid","body","status","createdAt"],
  registrations:["uid","createdAt"],
  votes:["uid","optionId","createdAt"]
};
function stop(reason){throw Error("Ensaio recusado: "+reason);}
function demoIdentity(v,what){
  if(typeof v!=="string"||!/^demo-[a-z0-9-]{6,70}$/.test(v)
    ||v==="demo-gremio-ifce"||v.includes("gremioifce"))stop(what+" não é um identificador de ensaio.");
  return v;
}
function sanitizeDoc(doc){
  if(!doc||typeof doc!=="object"||Array.isArray(doc))stop("documento inválido");
  const {path,data}=doc;
  if(typeof path!=="string")stop("caminho inválido");
  const match=patterns.map(x=>({...x,m:path.match(x.re)})).find(x=>x.m);
  if(!match)stop("coleção ou identificador não permitidos");
  if(!data||typeof data!=="object"||Array.isArray(data))stop("conteúdo de documento inválido");
  const expected=fields[match.kind];
  if(Object.keys(data).length!==expected.length||Object.keys(data).some(k=>!expected.includes(k)))
    stop("campos extras ou dados incompletos não permitidos");
  if(Object.values(data).some(v=>v===null||v===undefined))stop("campos sem valor");
  const text=JSON.stringify(data);
  // Não confundir este filtro com detecção suficiente de dados pessoais.
  if(/@|password|senha|secret|token|cpf|matr[ií]cula|private[_-]?key/i.test(text))
    stop("possível dado sensível em arquivo fictício");
  if(typeof data.createdAt!=="string"||data.createdAt!=="2026-01-01T00:00:00Z")
    stop("data fictícia de referência obrigatória");
  if(match.kind==="members"){
    if(!/^Estudante Fictício \d{2}$/.test(data.displayName)
      ||!["pending","approved","blocked"].includes(data.status))stop("cadastro não fictício ou status inválido");
  }
  if(match.kind==="suggestions"){
    if(!/^uid-demo-[a-z0-9-]{4,64}$/.test(data.ownerUid)
      ||typeof data.body!=="string"||data.body.length>500
      ||!["pending","approved","archived"].includes(data.status))stop("sugestão inválida");
  }
  if(match.kind==="polls"){
    if(typeof data.question!=="string"||!Array.isArray(data.options)
      ||data.options.length<2||data.options.length>4
      ||!data.options.every(x=>typeof x==="string"&&x.length>=1&&x.length<=80)
      ||typeof data.active!=="boolean")stop("enquete inválida");
  }
  for(const k of ["title","body","details","when","location"]){
    if(Object.hasOwn(data,k)&&(typeof data[k]!=="string"||!data[k].trim()||data[k].length>1500))
      stop("texto de demonstração inválido");
  }
  if(["registrations","votes"].includes(match.kind)&&data.uid!==match.m[match.m.length-1])
    stop("UID do registro diferente do caminho");
  if(match.kind==="votes"&&(!Number.isInteger(data.optionId)||data.optionId<0||data.optionId>3))
    stop("opção do voto fictício inválida");
  // Role, cargo e bootstrap intencionalmente não fazem parte deste ensaio.
  return {path,data:JSON.parse(JSON.stringify(data))};
}
function envelopeBody(snapshot){
  return {
    schemaVersion:snapshot.schemaVersion,
    instanceId:snapshot.instanceId,
    projectId:snapshot.projectId,
    documents:snapshot.documents
  };
}
function checksum(body){
  return crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
}
function makeSnapshot({instanceId,projectId,documents}){
  demoIdentity(instanceId,"Instância");demoIdentity(projectId,"Projeto");
  if(!Array.isArray(documents)||documents.length<1||documents.length>100)stop("volume de ensaio inválido");
  const clean=documents.map(sanitizeDoc);
  const paths=clean.map(x=>x.path);
  if(new Set(paths).size!==paths.length)stop("documentos duplicados");
  const body={schemaVersion:1,instanceId,projectId,documents:clean};
  return {...body,checksum:checksum(body)};
}
function dryRunRestore(snapshot,target){
  if(!snapshot||typeof snapshot!=="object")stop("snapshot inválido");
  const t={instanceId:demoIdentity(target?.instanceId,"Instância destino"),projectId:demoIdentity(target?.projectId,"Projeto destino")};
  if(snapshot.instanceId!==t.instanceId||snapshot.projectId!==t.projectId)
    stop("restauração entre escolas ou projetos diferentes");
  if(snapshot.schemaVersion!==1||typeof snapshot.checksum!=="string")stop("versão ou assinatura ausente");
  const copy=makeSnapshot({instanceId:snapshot.instanceId,projectId:snapshot.projectId,documents:snapshot.documents});
  if(!crypto.timingSafeEqual(Buffer.from(snapshot.checksum),Buffer.from(copy.checksum)))
    stop("conteúdo adulterado ou incompatível");
  return {
    dryRun:true,
    instanceId:t.instanceId,projectId:t.projectId,
    documentCount:copy.documents.length,
    documentPaths:copy.documents.map(x=>x.path),
    rolesRestored:false,
    writesPerformed:0
  };
}
module.exports={makeSnapshot,dryRunRestore};
