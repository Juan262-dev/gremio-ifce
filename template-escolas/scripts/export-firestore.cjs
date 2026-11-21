#!/usr/bin/env node
"use strict";
// Exportação REAL só após autorização da escola. Não executa em CI.
const {spawnSync}=require("node:child_process");
const CONFIRM="AUTORIZO_EXPORTACAO_INSTITUCIONAL";
function deny(s){throw Error("Exportação bloqueada: "+s);}
function planBackup({projectId,bucket,prefix}){
  if(typeof projectId!=="string"||!/^[a-z][a-z0-9-]{5,45}$/.test(projectId)||projectId.startsWith("demo-"))deny("projeto inválido");
  if(typeof bucket!=="string"||!/^[a-z0-9][a-z0-9._-]{5,62}$/.test(bucket)||bucket.includes(".."))deny("bucket inválido");
  if(typeof prefix!=="string"||!/^firestore-backups\/\d{4}-\d\d-\d\dT\d{6}Z\/[a-z0-9-]{6,46}$/.test(prefix)||!prefix.endsWith("/"+projectId))
    deny("prefixo precisa ser único e terminar com o projeto correto");
  return Object.freeze({projectId,bucket,prefix,uri:"gs://"+bucket+"/"+prefix});
}
function verifyBucket(meta,project,plan){
  const errors=[];
  if(meta?.name!==plan.bucket)errors.push("nome de bucket diferente");
  if(!project?.projectNumber||String(meta?.projectNumber)!==String(project.projectNumber))errors.push("bucket de outro projeto");
  if(meta?.iamConfiguration?.uniformBucketLevelAccess?.enabled!==true)errors.push("acesso uniforme desativado");
  if(meta?.iamConfiguration?.publicAccessPrevention!=="enforced")errors.push("acesso público não bloqueado");
  if(Number(meta?.retentionPolicy?.retentionPeriod)<2592000||!meta?.retentionPolicy?.retentionPeriod)errors.push("retenção menor que 30 dias");
  if(meta?.versioning?.enabled!==true)errors.push("versionamento ausente");
  if(typeof meta?.encryption?.defaultKmsKeyName!=="string"||!meta.encryption.defaultKmsKeyName.startsWith("projects/"))
    errors.push("CMEK obrigatória");
  return {ok:!errors.length,errors};
}
function gcloud(args){
  const x=spawnSync("gcloud",args,{shell:false,encoding:"utf8",timeout:120000,maxBuffer:1024*1024});
  if(x.error||x.status!==0)deny("gcloud negado/indisponível, consulte a TI");
  return x.stdout.trim();
}
function execute(plan,env=process.env){
  if(env.BACKUP_APPROVED_PROJECT_ID!==plan.projectId
    ||env.BACKUP_EXECUTE!==CONFIRM
    ||typeof env.BACKUP_APPROVAL_REFERENCE!=="string"
    ||!/^[-A-Za-z0-9_/]{6,120}$/.test(env.BACKUP_APPROVAL_REFERENCE))
    deny("autorização específica ausente");
  const project=JSON.parse(gcloud(["projects","describe",plan.projectId,"--format=json"]));
  const bucket=JSON.parse(gcloud(["storage","buckets","describe","gs://"+plan.bucket,"--format=json"]));
  const check=verifyBucket(bucket,project,plan);
  if(!check.ok)deny(check.errors.join("; "));
  gcloud(["firestore","export",plan.uri,"--project="+plan.projectId,"--database=(default)","--quiet"]);
  return {submitted:true,projectId:plan.projectId};
}
function main(){
  const args=process.argv.slice(2),values={};
  for(let i=0;i<args.length;i++){
    const key=args[i];
    if(key==="--execute"){if(values.execute)deny("duplicação");values.execute=true;continue;}
    if(!["--project","--bucket","--prefix"].includes(key)||!args[i+1]||values[key])deny("argumentos inválidos");
    values[key]=args[++i];
  }
  const plan=planBackup({projectId:values["--project"],bucket:values["--bucket"],prefix:values["--prefix"]});
  if(!values.execute){
    process.stdout.write("ENSAIO SEM REDE: "+plan.uri+". Nenhum backup executado.\n");
    return;
  }
  const r=execute(plan);
  process.stdout.write("Exportação solicitada para "+r.projectId+". Confirme conclusão e restauração separadamente.\n");
}
module.exports={planBackup,verifyBucket,execute};
if(require.main===module){try{main();}catch(e){process.stderr.write(e.message+"\n");process.exitCode=1;}}
