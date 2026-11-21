#!/usr/bin/env node
"use strict";
// Transição MANUAL de gestores de UMA escola, nunca acionada por páginas ou CI.
// Só execute em ambiente institucional homologado, com aprovação formal da direção.
const fs=require("node:fs");
const path=require("node:path");
const {validate}=require("../public/js/instance.js");

function validatePlan(input,config){
  const cfg=validate(config);
  if(!input||typeof input!=="object")throw Error("Parâmetros institucionais ausentes.");
  if(input.TRANSFER_APPROVED!=="CONFIRMO_DIRECAO")
    throw Error("A troca precisa de aprovação explícita da direção.");
  if(!input.FIREBASE_PROJECT_ID||input.FIREBASE_PROJECT_ID!==cfg.firebase.projectId)
    throw Error("Projeto diferente da instância escolar aprovada.");
  const old=String(input.FORMER_ADMIN_UID||""),next=String(input.NEW_ADMIN_UID||"");
  const valid=v=>/^[A-Za-z0-9_-]{6,128}$/.test(v);
  if(!valid(old)||!valid(next)||old===next)
    throw Error("UIDs distintos de administradores são obrigatórios.");
  return {projectId:cfg.firebase.projectId,formerUid:old,newUid:next};
}

function readCredential(file,expected){
  if(!file||!fs.existsSync(file))throw Error("Arquivo de conta de serviço ausente.");
  const resolved=path.resolve(file);
  const repoRoot=path.resolve(__dirname,"../..");
  if(resolved===repoRoot||resolved.startsWith(repoRoot+path.sep))
    throw Error("Conta de serviço deve ficar fora do repositório.");
  let credential;
  try{credential=JSON.parse(fs.readFileSync(resolved,"utf8"));}
  catch(e){throw Error("Arquivo técnico inválido.");}
  if(credential.type!=="service_account"
    ||credential.project_id!==expected
    ||typeof credential.private_key!=="string"
    ||!credential.private_key.includes("BEGIN PRIVATE KEY"))
    throw Error("Credencial da escola incorreta.");
  return resolved;
}

async function main(){
  const configFile=path.join(__dirname,"../public/config/installation.json");
  if(!fs.existsSync(configFile))throw Error("Configuração escolar ausente.");
  const cfg=JSON.parse(fs.readFileSync(configFile,"utf8"));
  const plan=validatePlan(process.env,cfg);
  readCredential(process.env.GOOGLE_APPLICATION_CREDENTIALS,plan.projectId);
  const admin=require("firebase-admin");
  const app=admin.initializeApp({
    credential:admin.credential.applicationDefault(),
    projectId:plan.projectId
  },"troca-diretoria-escolar");
  try{
    const successor=await app.auth().getUser(plan.newUid);
    if(successor.disabled||!successor.emailVerified)
      throw Error("A nova conta deve estar ativa e com e-mail verificado.");
    const db=app.firestore();
    const former=db.doc("roles/"+plan.formerUid);
    const next=db.doc("roles/"+plan.newUid);
    const history=db.collection("system_transfers").doc();
    await db.runTransaction(async tx=>{
      const [oldRole,newRole]=await Promise.all([tx.get(former),tx.get(next)]);
      if(!oldRole.exists||oldRole.data().role!=="admin"||oldRole.data().active!==true)
        throw Error("O gestor anterior não possui cargo administrativo ativo.");
      if(newRole.exists)throw Error("Novo UID já possui cargo: exige revisão manual.");
      tx.create(next,{
        role:"admin",active:true,createdAt:admin.firestore.FieldValue.serverTimestamp()
      });
      tx.update(former,{active:false});
      tx.create(history,{
        fromUid:plan.formerUid,toUid:plan.newUid,
        projectId:plan.projectId,
        completedAt:admin.firestore.FieldValue.serverTimestamp()
      });
    });
    process.stdout.write("Troca da diretoria concluída nesta escola. Acessos antigos revogados nas regras.\n");
  }finally{
    await app.delete();
  }
}
module.exports={validatePlan,readCredential};
if(require.main===module){
  main().catch(e=>{
    process.stderr.write("Troca interrompida: "+e.message+"\n");
    process.exitCode=1;
  });
}
