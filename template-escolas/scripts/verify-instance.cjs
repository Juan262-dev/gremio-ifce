#!/usr/bin/env node
"use strict";
// Somente valida configuração pública e duas escolas. Não conecta ao Firebase.
const fs=require("node:fs");
const path=require("node:path");
const {validate,different}=require("../public/js/instance.js");
function read(name){return JSON.parse(fs.readFileSync(path.resolve(name),"utf8"));}
try{
  const files=process.argv.slice(2);
  if(files.length<1||files.length>2)throw Error("Uso: node template-escolas/scripts/verify-instance.cjs caminho.json [outra-escola.json]");
  const a=read(files[0]);
  const valid=validate(a);
  if(files[1]&&!different(a,read(files[1])))throw Error("As duas escolas compartilham ID, URL ou Firebase.");
  process.stdout.write("Configuração pública com formato válido e isolamento declarado.\n");
  process.stdout.write("Instância: "+valid.instanceId+"\n");
  process.stdout.write("ATENÇÃO: formato não comprova regras, acesso, privacidade, licença nem autorização de publicação.\n");
}catch(e){
  process.stderr.write("Configuração rejeitada: "+e.message+"\n");
  process.exitCode=1;
}
