#!/usr/bin/env node
"use strict";
// Auditoria SEM REDE: não lê bancos, dados estudantis nem credenciais.
// Estabelece teto da dívida técnica existente, nunca declara privacidade resolvida.
const fs=require("node:fs");
const path=require("node:path");
const TOKENS=["votosAlunos","inscritos","espera"];
// Contagens existentes em 21/11/2026; números não são requisitos funcionais.
// Na medida em que a migração for concluída, estes valores DEVEM diminuir a zero.
const BASELINE={
  "index.html":                 [5,9,20],
  "admin.html":                 [0,2,2],
  "admin-02-comunicacao-estudos.js":[1,5,0],
  "admin-03-alunos-punicoes.js":[0,1,0],
  "admin-04-gestao-diretoria.js":[3,4,0],
  "admin-05-financeiro-diretorias.js":[0,9,0],
  "admin-06-eleicao-eventos.js":[0,4,1],
  "admin-07-ti.js":             [1,0,0],
  "admin-carteirinhas.js":      [0,2,1],
  "firestore.rules":            [3,7,3]
};
function tokens(content){
  return TOKENS.map(term=>(content.match(new RegExp("\\b"+term+"\\b","g"))||[]).length);
}
function auditRoot(root){
  if(!fs.existsSync(root)||!fs.statSync(root).isDirectory())throw Error("Diretório de código inválido.");
  const failures=[],counts={};
  const files=fs.readdirSync(root).filter(n=>/\.(js|html|rules)$/.test(n)&&fs.statSync(path.join(root,n)).isFile());
  for(const file of files){
    const content=fs.readFileSync(path.join(root,file),"utf8");
    const actual=tokens(content);
    const expected=BASELINE[file]||[0,0,0];
    counts[file]=actual;
    TOKENS.forEach((term,index)=>{
      if(actual[index]>expected[index]){
        failures.push(file+": novas referências ao legado ("+term+"): "+actual[index]+" > "+expected[index]);
      }
    });
  }
  // Failing if the original file disappears keeps this gate independent of renames.
  for(const file of Object.keys(BASELINE))if(!files.includes(file))
    failures.push("Arquivo legado ausente, atualizar auditoria somente com revisão: "+file);
  return {ok:failures.length===0,failures,counts,baseline:BASELINE};
}
if(require.main===module){
  const result=auditRoot(path.resolve(__dirname,"../.."));
  for(const failure of result.failures)process.stderr.write("ERRO de privacidade: "+failure+"\n");
  process.stdout.write("Aviso: a instalação IFCE ainda possui referências legadas com dados pessoais.\n");
  process.stdout.write("Auditoria regressiva: "+(result.ok?"sem novos usos detectados":"regressão detectada")+"\n");
  process.exitCode=result.ok?0:1;
}
module.exports={BASELINE,TOKENS,tokens,auditRoot};
