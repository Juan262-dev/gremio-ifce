#!/usr/bin/env node
"use strict";
// Diagnóstico de leitura, SOMENTE pela TI IFCE com credenciais externas.
// Nunca registra e-mails, nomes, UID ou identificadores de documentos.
const fs=require("node:fs"),path=require("node:path");
const PROJECT_ID="gremioifce-92540";
const CONSENT="AUTORIZO_AUDITORIA_IFCE_SOMENTE_LEITURA";
function refuse(reason){throw Error("Auditoria bloqueada: "+reason);}
function preflight(env=process.env){
  if(env.IFCE_AUDIT_APPROVED!==CONSENT||env.IFCE_AUDIT_PROJECT_ID!==PROJECT_ID
     ||typeof env.IFCE_AUDIT_REFERENCE!=="string"
     ||!/^[-A-Za-z0-9_/]{6,120}$/.test(env.IFCE_AUDIT_REFERENCE))
    refuse("falta aprovação formal e projeto IFCE correto");
  const file=env.GOOGLE_APPLICATION_CREDENTIALS;
  if(typeof file!=="string"||!fs.existsSync(file))refuse("credencial técnica externa ausente");
  const real=fs.realpathSync(file);
  const root=path.resolve(__dirname,"../..");
  if(real===root||real.startsWith(root+path.sep))refuse("credencial dentro do repositório");
  let contents;
  try{contents=JSON.parse(fs.readFileSync(real,"utf8"));}
  catch(e){refuse("credencial técnica inválida");}
  if(contents.type!=="service_account"||contents.project_id!==PROJECT_ID)
    refuse("credencial de projeto errado");
  return {projectId:PROJECT_ID};
}
function emptyReport(){return {documentsScanned:0,documentsLegacy:0,legacyFields:0,legacyEntries:0,malformedFields:0};}
function accumulate(report,data,keys){
  const row={...report,documentsScanned:report.documentsScanned+1};
  let hasLegacy=false;
  for(const field of keys){
    if(Object.prototype.hasOwnProperty.call(data,field)){
      hasLegacy=true;row.legacyFields++;
      if(Array.isArray(data[field]))row.legacyEntries+=data[field].length;
      else row.malformedFields++;
    }
  }
  if(hasLegacy)row.documentsLegacy++;
  return row;
}
async function scanCollection(db,name,keys){
  let report=emptyReport();
  // stream, não extrair dados pessoais para discos/logs de CI.
  const stream=db.collection(name).select(...keys).stream();
  for await (const snapshot of stream){
    report=accumulate(report,snapshot.data()||{},keys);
  }
  return report;
}
async function scan(db){
  return {
    enquetes:await scanCollection(db,"enquetes",["votosAlunos"]),
    eventos:await scanCollection(db,"eventos",["inscritos","espera"])
  };
}
function clean(report){
  if(!report||!report.enquetes||!report.eventos)refuse("relatório inválido");
  return ["enquetes","eventos"].every(k=>
    report[k].legacyFields===0&&report[k].malformedFields===0
  );
}
async function main(){
  const {projectId}=preflight();
  const admin=require("firebase-admin");
  const app=admin.initializeApp({credential:admin.credential.applicationDefault(),projectId},"auditoria-ifce-somente-leitura");
  try{
    const report=await scan(app.firestore());
    // Saída agregada; IDs, e-mails, nomes e conteúdo não são impressos.
    process.stdout.write("Auditoria agregada IFCE (campos antigos): "+JSON.stringify(report)+"\n");
    if(!clean(report)){
      process.stderr.write("ATENÇÃO: documentos legados ainda exigem migração e bloqueio de leituras indevidas.\n");
      process.exitCode=2;
    }else{
      process.stdout.write("Nenhum campo legado encontrado nestas coleções; ainda exige teste de regras e interfaces.\n");
    }
  }finally{await app.delete();}
}
module.exports={PROJECT_ID,preflight,emptyReport,accumulate,scan,clean};
if(require.main===module){main().catch(e=>{process.stderr.write(e.message+"\n");process.exitCode=1;});}
