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
const CREDITO_ORIGEM="Origem do sistema: Grêmio IFCE Campus Crateús";
const LINK_ORIGEM="https://github.com/Juan262-dev/gremio-ifce";
function verificarCreditos(portal,painel){
  for(const html of [portal,painel]){
    if(typeof html!=="string"||!html.includes(CREDITO_ORIGEM)
      ||!html.includes(LINK_ORIGEM)||!html.includes("Projeto original"))
      throw Error("Créditos de origem ausentes do Portal ou Painel escolar.");
  }
  return true;
}
function proximosPassos(result){
  return [
    "Revisar domínio, configurações e permissões do Firebase exclusivo: "+result.projectId,
    "Conferir regras e índices efetivamente publicados; validar permissões com contas fictícias.",
    "Testar backup protegido e restauração em projeto separado; conferir Firebase Auth.",
    "Obter autorizações de uso, licença e crédito original; documentar aprovação institucional.",
    "Somente após homologação formal considerar publicação controlada."
  ];
}
function validatePreflight(first,second,settings){
  const a=validate(first);
  if(second&&!different(first,second))
    throw Error("As escolas precisam de IDs, origens HTTPS e projetos Firebase diferentes.");
  if(second)validate(second);
  if(!settings||!settings.firebaseJson||typeof settings.rules!=="string")
    throw Error("Configuração de segurança do template ausente.");
  verificarCreditos(settings.portalHtml,settings.adminHtml);
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
    status:"PREPARACAO_LOCAL_SOMENTE",creditosConferidosLocalmente:true
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
      rules:fs.readFileSync(path.join(root,"firestore.rules"),"utf8"),
      portalHtml:fs.readFileSync(path.join(root,"public/index.html"),"utf8"),
      adminHtml:fs.readFileSync(path.join(root,"public/admin.html"),"utf8")
    }
  );
  process.stdout.write(
    "Pré-verificação LOCAL aprovada para "+result.instanceId+" (projeto "+result.projectId+").\n"+
    (result.hasSecondSchool?"Configurações A/B diferentes na revisão local.\n":"Somente uma configuração inspecionada.\n")+
    "Créditos originais presentes nas páginas verificadas localmente (não é proteção jurídica).\n"+
    proximosPassos(result).map((passo,i)=>(i+1)+". "+passo).join("\n")+"\n"+
    "NÃO PUBLICAR: ainda faltam testes reais de Auth, Firestore, backup, privacidade e aprovação institucional.\n"
  );
}
module.exports={validatePreflight,verificarCreditos,proximosPassos,run};
if(require.main===module){
  try{run(process.argv.slice(2));}
  catch(error){
    process.stderr.write("Pré-verificação REPROVADA: "+error.message+"\n");
    process.exitCode=1;
  }
}
