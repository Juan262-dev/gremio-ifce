#!/usr/bin/env node
"use strict";
// Assistente local para o responsável técnico. Não conecta, implanta ou publica.
const fs=require("node:fs");
const path=require("node:path");
const readline=require("node:readline/promises");
const I=require("../public/js/instance.js");

function assemble(values){
  if(!values||typeof values!=="object")throw Error("Campos ausentes.");
  return I.validate({
    schemaVersion:1,
    instanceId:values.instanceId,
    siteOrigin:values.siteOrigin,
    school:{
      name:values.schoolName,
      gremio:values.gremioName,
      contact:values.schoolContact,
      color:values.color
    },
    firebase:{
      apiKey:values.apiKey,
      authDomain:values.authDomain,
      projectId:values.projectId,
      appId:values.appId,
      messagingSenderId:values.messagingSenderId
    }
  });
}

function writeOnce(filename,config){
  const validated=I.validate(config);
  if(path.basename(filename)!=="installation.json")
    throw Error("Nome de arquivo de instalação não permitido.");
  const folder=path.dirname(filename);
  if(!fs.existsSync(folder)||!fs.statSync(folder).isDirectory())
    throw Error("Pasta da escola não encontrada.");
  const payload=JSON.stringify(validated,null,2)+"\n";
  fs.writeFileSync(filename,payload,{flag:"wx",mode:0o600,encoding:"utf8"});
  return filename;
}

function proximosPassos(){
  return [
    "Execute a pré-verificação local do Portal/Painel, das regras e dos créditos originais.",
    "Configure projeto Firebase, domínio, regras, índices e permissões exclusivos da escola.",
    "Confirme contas e acesso de gestão usando o Firebase Emulator e projeto de ensaio.",
    "Teste backup/restauração e formalize a autorização institucional antes do uso real."
  ];
}
function details(config){
  const valid=I.validate(config);
  return {
    school:valid.school.name,
    gremio:valid.school.gremio,
    origin:valid.siteOrigin,
    projectId:valid.firebase.projectId
  };
}

async function main(){
  if(!process.stdin.isTTY||!process.stdout.isTTY)
    throw Error("Execute este assistente manualmente em um terminal confiável.");
  const args=process.argv.slice(2);
  if(args.some(x=>x!=="--dry-run"))
    throw Error("Uso: node template-escolas/scripts/setup-school.cjs [--dry-run]");
  const dryRun=args.includes("--dry-run");
  const configFile=path.join(__dirname,"../public/config/installation.json");
  if(!dryRun&&fs.existsSync(configFile))
    throw Error("Já existe uma instalação. Para evitar substituição, nenhuma alteração foi feita.");
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});
  const ask=async question=>(await rl.question(question+" ")).trim();
  let values;
  try{
    process.stdout.write("\n=== Preparação de escola — versão técnica experimental ===\n");
    process.stdout.write("Não use Firebase do IFCE, dados de alunos, senhas nem credenciais de serviço.\n");
    process.stdout.write("Este assistente NÃO cria Firebase, administrador nem publica o sistema.\n");
    process.stdout.write("1/5 Identificação institucional e domínio HTTPS\n");
    values={
      instanceId:await ask("ID simples da escola (letras minúsculas, números, hífens):"),
      siteOrigin:await ask("Endereço público HTTPS exclusivo (sem caminho):"),
      schoolName:await ask("Nome público da escola:"),
      gremioName:await ask("Nome público do Grêmio:"),
      schoolContact:await ask("Contato institucional público:"),
      color:"#246a49"
    };
    process.stdout.write("2/5 Identidade visual\n");
    const color=await ask("Cor principal no formato #RRGGBB (Enter = #246a49):");
    values.color=color||values.color;
    process.stdout.write("3/5 Firebase Web exclusivo da escola\n");
    values.projectId=await ask("projectId da escola (nunca do IFCE):");
    values.apiKey=await ask("apiKey pública do aplicativo Web:");
    values.authDomain=await ask("authDomain do próprio projeto:");
    values.appId=await ask("appId do aplicativo Web:");
    values.messagingSenderId=await ask("messagingSenderId do mesmo aplicativo:");
    const config=assemble(values);
    process.stdout.write("4/5 Administrador inicial — ainda NÃO provisionado\n");
    process.stdout.write("O técnico deverá seguir o bootstrap manual após licença, regras e homologação.\n");
    process.stdout.write("5/5 Revisão da configuração pública\n");
    const summary=details(config);
    process.stdout.write(JSON.stringify(summary,null,2)+"\n");
    process.stdout.write("Próximos passos (nenhum é executado por este assistente):\n");
    process.stdout.write(proximosPassos().map((s,i)=>(i+1)+". "+s).join("\n")+"\n");
    process.stdout.write("Verificações reais de segurança, domínio, Auth e regras ainda estão pendentes.\n");
    if(dryRun){
      process.stdout.write("ENSAIO: nenhum arquivo foi gravado ou publicado.\n");
      return;
    }
    const confirmation=await ask("Para gravar apenas nesta cópia local, digite GRAVAR-EXEMPLO:");
    if(confirmation!=="GRAVAR-EXEMPLO")
      throw Error("Gravação cancelada. Nenhum arquivo foi criado.");
    writeOnce(configFile,config);
    process.stdout.write("Arquivo local criado, ignorado pelo Git. NÃO publicar antes da revisão institucional.\n");
  }finally{
    rl.close();
  }
}
module.exports={assemble,writeOnce,details,proximosPassos};
if(require.main===module){
  main().catch(error=>{
    process.stderr.write("Preparação interrompida: "+error.message+"\n");
    process.exitCode=1;
  });
}
