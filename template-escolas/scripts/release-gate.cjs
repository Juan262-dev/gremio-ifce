#!/usr/bin/env node
"use strict";
// Gate de EVIDÊNCIAS, não é uma aprovação institucional nem uma ferramenta de deploy.
const fs=require("node:fs"),crypto=require("node:crypto"),path=require("node:path");
const REQUIRED=["direitos_licenca","privacidade_alunos","legado_ifce","regras_firestore","isolamento_firebase","backup_restauracao","paridade_funcional","aprovacao_direcao"];
function evaluate(m,project,now=Date.now()){
  if(!m||typeof m!=="object"||Array.isArray(m))return {ok:false,missing:["manifesto inválido"]};
  const missing=[];
  if(m.version!==1||m.projectId!==project||!project)missing.push("instalação incorreta");
  const t=Date.parse(m.approvedAt);
  if(!Number.isFinite(t)||t>now||now-t>90*86400000)missing.push("aprovação recente ausente");
  for(const key of REQUIRED){
    const x=m.requirements?.[key];
    if(x?.status!=="approved"||typeof x.evidenceId!=="string"||!/^[-A-Za-z0-9_/]{8,160}$/.test(x.evidenceId))
      missing.push(key);
  }
  return {ok:!missing.length,missing};
}
function verify(bytes,signature,publicKey,project,now=Date.now()){
  if(!Buffer.isBuffer(bytes)||!Buffer.isBuffer(signature))throw Error("Arquivos de aprovação inválidos");
  if(!crypto.verify(null,bytes,publicKey,signature))return {ok:false,missing:["assinatura não confere"]};
  return evaluate(JSON.parse(bytes.toString("utf8")),project,now);
}
function main(){
  const a=process.argv.slice(2);
  if(a.length!==8||a[0]!=="--manifest"||a[2]!=="--signature"||a[4]!=="--public-key"||a[6]!=="--project")
    throw Error("Uso: --manifest <json> --signature <sig> --public-key <pem> --project <id>");
  const root=path.resolve(__dirname,"../..");
  for(const f of [a[1],a[3],a[5]]){
    const resolved=path.resolve(f);
    if(resolved===root||resolved.startsWith(root+path.sep))
      throw Error("Assinaturas e evidências devem ficar fora do Git");
  }
  const result=verify(fs.readFileSync(a[1]),fs.readFileSync(a[3]),fs.readFileSync(a[5]),a[7]);
  if(!result.ok)throw Error("NÃO HOMOLOGADO: "+result.missing.join(", "));
  process.stdout.write("Evidências com assinatura verificável. Autoridade institucional requer verificação externa. NENHUM DEPLOY feito.\n");
}
module.exports={REQUIRED,evaluate,verify};
if(require.main===module){try{main();}catch(e){process.stderr.write(e.message+"\n");process.exitCode=1;}}
