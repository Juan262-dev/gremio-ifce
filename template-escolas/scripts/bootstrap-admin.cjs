#!/usr/bin/env node
"use strict";
// Execução MANUAL pelo responsável técnico, FORA do site e do CI.
// Não publique credenciais de serviço no repositório ou na hospedagem.
const fs=require("node:fs");
const path=require("node:path");
const {validate}=require("../public/js/instance.js");

async function main(){
  const configPath=path.join(__dirname,"../public/config/installation.json");
  if(!fs.existsSync(configPath))throw Error("Instalação não configurada.");
  const cfg=validate(JSON.parse(fs.readFileSync(configPath,"utf8")));
  const expected=process.env.FIREBASE_PROJECT_ID;
  const uid=process.env.INITIAL_ADMIN_UID;
  const keyPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if(process.env.INITIAL_ADMIN_APPROVED!=="CONFIRMO_AUTORIZACAO_ESCOLA")
    throw Error("Exige confirmação institucional explícita.");
  if(!expected||expected!==cfg.firebase.projectId)
    throw Error("FIREBASE_PROJECT_ID diferente da instância aprovada.");
  if(!uid||! /^[A-Za-z0-9_-]{6,128}$/.test(uid))throw Error("INITIAL_ADMIN_UID inválido.");
  if(!keyPath||!fs.existsSync(keyPath))throw Error("Credencial técnica externa ausente.");
  const cred=path.resolve(keyPath),repoRoot=path.resolve(__dirname,"../..");
  if(cred===repoRoot||cred.startsWith(repoRoot+path.sep))
    throw Error("Credenciais devem permanecer fora do repositório.");
  // Uma credencial da escola A jamais deve ser usada para gerenciar B.
  let service;
  try{service=JSON.parse(fs.readFileSync(cred,"utf8"));}
  catch(e){throw Error("Credencial técnica inválida.");}
  if(service.type!=="service_account"
    ||service.project_id!==expected
    ||typeof service.private_key!=="string"
    ||!service.private_key.includes("BEGIN PRIVATE KEY"))
    throw Error("A conta de serviço não corresponde ao Firebase desta escola.");
  // O SDK Admin nunca deve ser empacotado para os navegadores.
  const admin=require("firebase-admin");
  const app=admin.initializeApp({
    credential:admin.credential.applicationDefault(),
    projectId:expected
  },"bootstrap-escola");
  try{
    const record=await app.auth().getUser(uid);
    if(!record.emailVerified||record.disabled)
      throw Error("O primeiro administrador precisa de conta ativa com e-mail verificado.");
    const db=app.firestore();
    const lock=db.doc("system/bootstrap"),role=db.doc("roles/"+uid);
    await db.runTransaction(async tx=>{
      const [existingLock,existingRole]=await Promise.all([tx.get(lock),tx.get(role)]);
      if(existingLock.exists||existingRole.exists)
        throw Error("Bootstrap já executado ou UID já associado a um cargo.");
      tx.create(lock,{
        uid,completedAt:admin.firestore.FieldValue.serverTimestamp(),
        version:1
      });
      tx.create(role,{
        role:"admin",active:true,createdAt:admin.firestore.FieldValue.serverTimestamp()
      });
    });
    process.stdout.write("Primeiro administrador provisionado nesta escola. Nenhuma outra escola foi alterada.\n");
  }finally{
    await app.delete();
  }
}
main().catch(err=>{
  process.stderr.write("Provisionamento interrompido: "+err.message+"\n");
  process.exitCode=1;
});
