"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const security=require("../admin-preparacao-2027.js");
const priv=require("../admin-auditoria-privacidade.js");
const backup=require("../admin-backup-revisao.js");

test("checklist 2027 nunca homologa Firebase com base apenas em sinalizadores do cliente",()=>{
 const config={eventosV2Habilitados:true,manutencao:false,
  painelCongelado:false,privacidadeMigracaoBloqueada:false};
 const estado=security.checklistLancamento(security.PROJETO,config);
 assert.equal(estado.aptoParaPublicar,false);
 assert.equal(estado.comprovadosAutomaticamente,0);
 assert.ok(estado.itens.length>=10);
 assert.ok(estado.itens.some(x=>x.id==="backup"&&x.status==="pendente"));
 assert.ok(estado.itens.some(x=>x.id==="restauracao"&&x.status==="pendente"));
 assert.ok(estado.itens.some(x=>x.id==="aprovacao"&&x.status==="pendente"));
 assert.equal(security.checklistLancamento("projeto-incorreto",config).itens[0].status,"erro");
 const ti=read("admin-07-ti.js");
 assert.match(ti,/checklistLancamento\(projeto, dadosConfiguracao\)/);
 assert.match(ti,/get\(\{ source: 'server' \}\)/);
 assert.doesNotMatch(read("admin-preparacao-2027.js"),/firebase deploy|initializeApp\(/);
});
test("inspeção local de backup não confunde arquivo parcial com restauração integral",()=>{
 const sample={geradoEm:"2026-11-24T12:00:00.000Z",
  origemProjetoId:"gremioifce-92540",alunos:[{id:"aluno-ficticio-01",nome:"Aluno Fictício"}],
  arquivoSuplementar:{config:[]}};
 const r=backup.analisar(sample,security.PROJETO);
 assert.equal(r.total,1);
 assert.equal(r.prontoParaPublicar,false);
 assert.equal(r.origemConfirmada,true);
 assert.match(r.avisos.join(" "),/Authentication/);
 assert.match(r.avisos.join(" "),/suplementares/);
 assert.throws(()=>backup.analisar(sample,"outro-projeto"),/bloqueada/);
 assert.throws(()=>backup.analisar({...sample,alunos:[sample.alunos[0],sample.alunos[0]]},security.PROJETO),/inconsistentes/);
 assert.throws(()=>backup.analisar({...sample,alunos:[{id:"x/y"}]},security.PROJETO),/inconsistentes/);
 assert.throws(()=>backup.analisar({...sample,alunos:"dados"},security.PROJETO),/Estrutura/);
 assert.throws(()=>backup.analisar({...sample,geradoEm:"inválido"},security.PROJETO),/reconhecido/);
 const legacy=backup.analisar({...sample,origemProjetoId:undefined},security.PROJETO);
 assert.equal(legacy.origemConfirmada,false);
 assert.match(legacy.avisos[0],/origem não consta/);
 const ti=read("admin-07-ti.js");
 const preview=ti.slice(ti.indexOf("async function revisarArquivoBackup"),
  ti.indexOf("async function restaurarBackup"));
 assert.match(preview,/BackupRevisao\.analisar/);
 assert.doesNotMatch(preview,/\.set\(|\.update\(|\.delete\(|\.commit\(/);
 assert.match(ti,/Esta restauração é PARCIAL/);
});
test("novos logs removem e-mail, documento e credenciais dos detalhes",()=>{
 const safe=priv.resumir("Punição aplicada maria@example.org",
  "maria@example.org | senha=segredo123 token:abc999 | CPF 123.456.789-01");
 assert.doesNotMatch(JSON.stringify(safe),/maria@example\.org|segredo123|abc999|123\.456\.789-01/);
 assert.match(safe.detalhes,/omitido/);
 assert.ok(safe.acao.length<=100&&safe.detalhes.length<=240);
 const base=read("admin-01-base-login.js"),ti=read("admin-07-ti.js");
 assert.match(base,/AuditoriaPrivacidade\.resumir\(acao, detalhes\)/);
 assert.match(ti,/AuditoriaPrivacidade\.resumir\(a\.acao, a\.detalhes\)/);
 assert.match(base,/autor: u \? u\.email/);
});
test("consultas volumosas usam count agregado e avisos são paginados",()=>{
 const admin=read("admin-01-base-login.js");
 const inventory=admin.slice(admin.indexOf("async function carregarInventarioTI()"),
  admin.indexOf("let pendTI = []"));
 assert.match(inventory,/\.count\(\)\.get\(\)/);
 assert.doesNotMatch(inventory,/\.limit\(1000\)\.get\(\)/);
 const portal=read("index.html");
 const avisos=portal.slice(portal.indexOf("const TAMANHO_PAGINA_AVISOS"),
  portal.indexOf("/* ---------- Enquetes ---------- */"));
 assert.match(avisos,/\.limit\(TAMANHO_PAGINA_AVISOS\)/);
 assert.match(avisos,/\.startAfter\(ultimoAvisoDoc\)/);
 assert.match(avisos,/Carregar avisos anteriores/);
 assert.match(avisos,/renderNotificacoes\(\)/);
});
test("scripts do painel continuam sintaticamente válidos e sem mudança de layout",()=>{
 for(const name of ["admin-07-ti.js","admin-01-base-login.js",
    "admin-preparacao-2027.js","admin-auditoria-privacidade.js",
    "admin-backup-revisao.js","admin-04-gestao-diretoria.js"])
  assert.doesNotThrow(()=>new vm.Script(read(name),{filename:name}),name);
 const html=read("admin.html");
 assert.match(html,/id="ti-lancamento-2027"/);
 assert.match(html,/id="ti-backup-revisao"/);
 assert.match(html,/admin-auditoria-privacidade\.js/);
 assert.match(html,/admin-backup-revisao\.js/);
 assert.match(html,/card-title-chem/);
 assert.match(html,/id="secao-ti"/);
});
test("instalação escolar tem roteiro técnico e não libera automaticamente",()=>{
 const {proximosPassos}=require("../template-escolas/scripts/setup-school.cjs");
 assert.ok(proximosPassos().length>=4);
 const cli=read("template-escolas/scripts/preflight-school.cjs");
 assert.match(cli,/verificarCreditos/);
 assert.match(cli,/proximosPassos/);
 assert.doesNotMatch(cli,/firebase deploy|initializeApp\(/);
});
