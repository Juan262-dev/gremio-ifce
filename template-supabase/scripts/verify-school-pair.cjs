#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {validate,different}=require("../public/js/instance.js");
function read(file){
 const full=path.resolve(file);
 return JSON.parse(fs.readFileSync(full,"utf8"));
}
function checkPair(a,b){
 const x=validate(a),y=validate(b);
 if(!different(x,y))throw Error("Instalações usam a mesma origem, identificador ou projeto Supabase.");
 if(x.supabase.publishableKey===y.supabase.publishableKey)
   throw Error("Instalações usam a mesma chave pública; revisar isolamento.");
 return {valid:true,schools:2};
}
if(require.main===module){
 try{
  if(process.argv.length!==4)throw Error("Informe 2 arquivos installation.json distintos.");
  checkPair(read(process.argv[2]),read(process.argv[3]));
  console.log("OK: configurações de duas escolas diferem. Testes reais entre Auth e bancos ainda obrigatórios.");
 }catch(err){console.error("Falha de configuração: "+err.message);process.exitCode=1;}
}
module.exports={checkPair};
