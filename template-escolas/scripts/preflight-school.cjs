#!/usr/bin/env node
"use strict";
/*
 * Verificação LOCAL, sem SDK, rede, autenticação, credenciais ou deploy.
 * Não comprova que as regras foram publicadas no projeto Firebase real.
 */
const fs=require("node:fs");
const path=require("node:path");
const {validate,different}=require("../public/js/instance.js");

const root=path.resolve(__dirname,"..");
function validatePreflight(first,second,settings){
  const a=validate(first);
  if(second&&!different(first,second))
    throw Error("As escolas precisam de IDs, origens HTTPS e projetos Firebase diferentes.");
  if(second)validate(second);
  if(!settings||!settings.firebaseJson||typeof settings.rules!=="string")
    throw Error("Configuração de segurança do template ausente.");
  const conf=settings.firebaseJson;
  if(conf.firestore?.rules!=="firestore.rules")
    throw Error("As regras precisam apontar para o arquivo exclusivo do template.");
  if(conf.hosting?.public!=="public")
    throw Error("Hospedagem deve servir apenas a pasta própria da instalação.");
  if(!conf.hosting?.headers?.some(x=>(x.headers||[])
    .some(h=>h.key==="X-Content-Type-Options"&&h.value==="nosniff")))
    throw Error("Cabeçalhos de segurança do hosting não configurados.");
  for(const text of [
    "match /{document=**}",
    "allow read, write: if false;",
    "match /roles/{uid}",
    "allow write: if false;",
    "match /polls/{pollId}",
    "match /votes/{uid}",
    "match /events/{eventId}",
    "match /registrations/{uid}"
  ]){
    if(!settings.rules.includes(text))
      throw Error("Regras do template incompletas: revisar Firestore antes de publicar.");
  }
  return {
    instanceId:a.instanceId,projectId:a.firebase.projectId,
    origin:a.siteOrigin,hasSecondSchool:Boolean(second),
    status:"PREPARACAO_LOCAL_SOMENTE"
  };
}
function readConfig(name){
  return JSON.parse(fs.readFileSync(path.resolve(name),"utf8"));
}
function run(argv){
  if(argv.length<1||argv.length>2)
    throw Error("Uso: node template-escolas/scripts/preflight-school.cjs CAMINHO/installation.json [OUTRA_ESCOLA.json]");
  const result=validatePreflight(
    readConfig(argv[0]),
    argv[1]?readConfig(argv[1]):undefined,
    {
      firebaseJson:JSON.parse(fs.readFileSync(path.join(root,"firebase.json"),"utf8")),
      rules:fs.readFileSync(path.join(root,"firestore.rules"),"utf8")
    }
  );
  process.stdout.write(
    "Pré-verificação LOCAL aprovada para "+result.instanceId+" (projeto "+result.projectId+").\n"+
    (result.hasSecondSchool?"Configurações A/B diferentes na revisão local.\n":"Somente uma configuração inspecionada.\n")+
    "NÃO PUBLICAR: ainda faltam testes reais de Auth, Firestore, backup, privacidade e aprovação institucional.\n"
  );
}
module.exports={validatePreflight,run};
if(require.main===module){
  try{run(process.argv.slice(2));}
  catch(error){
    process.stderr.write("Pré-verificação REPROVADA: "+error.message+"\n");
    process.exitCode=1;
  }
}
