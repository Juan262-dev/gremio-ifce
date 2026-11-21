#!/usr/bin/env node
"use strict";
/**
 * Migração OPERACIONAL com acesso privilegiado: remove listas de e-mails
 * de enquetes/eventos e gera registros privados por UID.
 * Somente operador autorizado, com backup/restauração confirmados e
 * manutenção ativada. NUNCA roda no GitHub Actions.
 *
 * Não faz deploy, não cria contas, não exporta nem publica e-mails.
 * Mantém bloqueados os fluxos de inscrições até a versão transacional.
 */
const fs=require("node:fs");
const path=require("node:path");
const admin=require("firebase-admin");
const crypto=require("node:crypto");
const {convertEvent,convertPoll}=require("./rehearse-migration.cjs");
const PROJECT_ID="gremioifce-92540";
const APPROVAL="AUTORIZO_MIGRACAO_PRIVACIDADE_IFCE";
const BACKUP="CONFIRMO_BACKUP_E_RESTAURACAO_TESTADOS";
const MIGRATION_VERSION=2;
function stop(message){throw Error("Migração interrompida: "+message);}
function preflight(env=process.env,execute=false){
  if(env.IFCE_MIGRATION_PROJECT_ID!==PROJECT_ID
    ||env.IFCE_MIGRATION_APPROVED!==APPROVAL
    ||typeof env.IFCE_MIGRATION_APPROVAL_REF!=="string"
    ||!/^[-A-Za-z0-9_/]{8,120}$/.test(env.IFCE_MIGRATION_APPROVAL_REF))
    stop("projeto ou autorização institucional ausente");
  if(!env.GOOGLE_APPLICATION_CREDENTIALS||!fs.existsSync(env.GOOGLE_APPLICATION_CREDENTIALS))
    stop("credencial institucional ausente");
  const credential=fs.realpathSync(env.GOOGLE_APPLICATION_CREDENTIALS);
  const repoRoot=path.resolve(__dirname,"../..");
  if(credential===repoRoot||credential.startsWith(repoRoot+path.sep))
    stop("arquivo de serviço dentro do repositório");
  let service;
  try{service=JSON.parse(fs.readFileSync(credential,"utf8"));}
  catch(e){stop("credencial institucional inválida");}
  if(service.type!=="service_account"||service.project_id!==PROJECT_ID)
    stop("credencial pertence a outro projeto");
  if(execute&&(env.IFCE_MIGRATION_BACKUP_RESTORED!==BACKUP
    ||typeof env.IFCE_MIGRATION_BACKUP_OPERATION!=="string"
    ||!/^projects\/gremioifce-92540\/databases\/\(default\)\/operations\/[-A-Za-z0-9_]{10,200}$/.test(env.IFCE_MIGRATION_BACKUP_OPERATION)
    ||env.IFCE_MIGRATION_EXECUTE!=="EXECUTAR_MIGRACAO_COM_MAINTENCAO"))
    stop("comprovação externa de backup, restauração e confirmação obrigatória");
  return {projectId:PROJECT_ID,execute};
}
function identityEmails(kind,source){
  if(kind==="eventos")return [...(source.inscritos||[]),...(source.espera||[])];
  return (source.votosAlunos||[]).map(v=>typeof v==="string"?v:v?.email);
}
function safeRecordCount(v){if(!Number.isInteger(v)||v<0||v>350)stop("excesso de registros por documento (revisão manual)");return v;}
function build(kind,id,data,mapping){
  if(!["eventos","enquetes"].includes(kind))stop("coleção não permitida");
  if(!data||typeof data!=="object"||Array.isArray(data))stop("documento inválido");
  if(kind==="eventos"&&Object.hasOwn(data,"presentes")
    &&(!Array.isArray(data.presentes)||data.presentes.length>0))
    stop("presenças antigas exigem migração e validação humana");
  const hasOld=kind==="eventos"
    ?Object.hasOwn(data,"inscritos")||Object.hasOwn(data,"espera")
    :Object.hasOwn(data,"votosAlunos");
  if(data.privacidadeVersao===MIGRATION_VERSION&&!hasOld)return {skip:true,kind,id,documents:[]};
  if(data.privacidadeVersao===MIGRATION_VERSION&&hasOld)stop("documento marcado seguro ainda contém dados antigos");
  if(kind==="eventos"){
    const fixed={...data,inscritos:data.inscritos||[],espera:data.espera||[]};
    const converted=convertEvent(id,fixed,mapping);
    safeRecordCount(converted.registrations.length);
    const emailByUid=new Map();
    identityEmails(kind,fixed).forEach(email=>{
      const key=email.trim().toLowerCase();
      emailByUid.set(mapping[key],key);
    });
    return {
      skip:false,kind,id,
      counts:{inscritosCount:converted.publicEvent.numeroInscritos,
        esperaCount:converted.publicEvent.numeroEmEspera,
        proximaOrdem:converted.publicEvent.numeroEmEspera},
      documents:converted.registrations.map(r=>({
        path:r.path.replace("/registrations/","/inscricoes/"),
        data:{
          uid:r.data.uid,
          email:emailByUid.get(r.data.uid),
          status:r.data.status,
          order:r.data.order
        }
      })),
      remove:["inscritos","espera",...(Object.hasOwn(data,"presentes")?["presentes"]:[])]
    };
  }
  const fixed={...data,votosAlunos:data.votosAlunos||[]};
  const converted=convertPoll(id,fixed,mapping);
  safeRecordCount(converted.privateVotes.length);
  return {
    skip:false,kind,id,counts:{},
    documents:converted.privateVotes.map(r=>({
      path:r.path.replace("/votes/","/votos/"),
      data:{opcaoId:r.data.optionId}
    })),
    remove:["votosAlunos"]
  };
}
function summary(plans){
  const affected=plans.filter(p=>!p.skip);
  const count=(kind)=>affected.filter(p=>p.kind===kind).length;
  return {
    events:count("eventos"),polls:count("enquetes"),
    privateRecords:affected.reduce((n,p)=>n+p.documents.length,0),
    alreadyMigrated:plans.length-affected.length,
    writesPerformed:0,containsEmail:false
  };
}
async function buildPlans(db,auth){
  const snapshots=[];
  for(const kind of ["eventos","enquetes"]){
    const s=await db.collection(kind).get();
    for(const doc of s.docs)snapshots.push({kind,id:doc.id,ref:doc.ref,
      updateTime:doc.updateTime,data:doc.data()});
  }
  const allEmails=new Set();
  for(const row of snapshots)for(const email of identityEmails(row.kind,row.data)){
    if(typeof email!=="string"||!email.includes("@"))stop("identidade legada inválida");
    allEmails.add(email.trim().toLowerCase());
  }
  const mapping={};
  for(const email of allEmails){
    let account;
    try{account=await auth.getUserByEmail(email);}
    catch(e){stop("há identidade sem UID no Firebase Auth; revisão manual exigida");}
    if(!account.uid||account.email?.toLowerCase()!==email||account.disabled)
      stop("identidade Auth inválida ou desativada");
    mapping[email]=account.uid;
  }
  return snapshots.map(row=>({...row,plan:build(row.kind,row.id,row.data,mapping)}));
}
function safetyFreeze(data){
  return data?.manutencao===true&&data?.painelCongelado===true
    &&data?.privacidadeMigracaoBloqueada===true;
}
async function commitRow(db,row){
  if(row.plan.skip)return false;
  const d=admin.firestore.FieldValue;
  await db.runTransaction(async t=>{
    const freezeRef=db.doc("config/sistema");
    const [guard,parent]=await Promise.all([t.get(freezeRef),t.get(row.ref)]);
    if(!guard.exists||!safetyFreeze(guard.data()))stop("manutenção completa desativada");
    if(!parent.exists||!parent.updateTime.isEqual(row.updateTime))
      stop("dados mudaram desde a auditoria; reinicie o ensaio");
    const refs=row.plan.documents.map(v=>db.doc(v.path));
    if(refs.length>350)stop("limite transacional excedido");
    for(const ref of refs){
      const already=await t.get(ref);
      if(already.exists)stop("registro privado já existe; revisão de duplicações obrigatória");
    }
    // Todas as leituras são feitas antes das escritas para atomicidade.
    for(let i=0;i<refs.length;i++){
      t.create(refs[i],{...row.plan.documents[i].data,criadoEm:d.serverTimestamp()});
    }
    const patch={...row.plan.counts,privacidadeVersao:MIGRATION_VERSION};
    for(const key of row.plan.remove)patch[key]=d.delete();
    t.update(row.ref,patch);
  },{maxAttempts:1});
  return true;
}
async function main(){
  const execute=process.argv.includes("--execute");
  if(process.argv.slice(2).some(arg=>arg!=="--execute"))stop("argumento desconhecido");
  preflight(process.env,execute);
  const app=admin.initializeApp({
    credential:admin.credential.applicationDefault(),projectId:PROJECT_ID
  },"migracao-privacidade-ifce-v2");
  try{
    const db=app.firestore(),auth=app.auth();
    const system=await db.doc("config/sistema").get();
    if(!system.exists||!safetyFreeze(system.data()))
      stop("ative manutenção, congelamento e bloqueio explícito no Firebase IFCE");
    const rows=await buildPlans(db,auth),plans=rows.map(r=>r.plan);
    const report=summary(plans);
    if(!execute){
      process.stdout.write("ENSAIO autorizado, SOMENTE LEITURA: "+JSON.stringify(report)+"\n");
      process.stdout.write("Nenhum dado alterado. Antes de executar confirme backup/restauração, regras, clientes e aprovação.\n");
      return;
    }
    if(report.events+report.polls===0){
      process.stdout.write("Nenhum documento pendente de migração; confirme as regras e os módulos.\n");
      return;
    }
    let count=0;
    for(const row of rows)if(await commitRow(db,row))count++;
    process.stdout.write("Documentos convertidos para estrutura privada: "+count+
      ". Não desligue a manutenção antes da homologação funcional.\n");
  }finally{await app.delete();}
}
module.exports={PROJECT_ID,preflight,build,safeRecordCount,safetyFreeze,summary};
if(require.main===module){
  main().catch(e=>{process.stderr.write(e.message+"\n");process.exitCode=1;});
}
