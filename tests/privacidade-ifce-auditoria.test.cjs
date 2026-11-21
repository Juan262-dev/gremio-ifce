const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {preflight,emptyReport,accumulate,clean}=require("../scripts/privacy/audit-ifce-readonly.cjs");
test("auditoria real é bloqueada sem consentimento e projeto correto",()=>{
 assert.throws(()=>preflight({}),/aprovação/);
 assert.throws(()=>preflight({IFCE_AUDIT_APPROVED:"AUTORIZO_AUDITORIA_IFCE_SOMENTE_LEITURA",IFCE_AUDIT_PROJECT_ID:"escola-outra",IFCE_AUDIT_REFERENCE:"ATA_2026"}),/aprovação/);
});
test("cálculo só gera totais; nunca ecoa e-mails nem registros",()=>{
 let report=emptyReport();
 report=accumulate(report,{votosAlunos:[{email:"pessoa@example.invalid",opcaoId:1}]} ,["votosAlunos"]);
 report=accumulate(report,{votosAlunos:[]} ,["votosAlunos"]);
 report=accumulate(report,{titulo:"Sem dado legado"},["votosAlunos"]);
 assert.deepEqual(report,{documentsScanned:3,documentsLegacy:2,legacyFields:2,legacyEntries:1,malformedFields:0});
 assert.ok(!JSON.stringify(report).includes("@"));
 assert.equal(clean({enquetes:report,eventos:emptyReport()}),false);
 assert.equal(clean({enquetes:emptyReport(),eventos:emptyReport()}),true);
});
test("auditoria não realiza escrita, mutação, migração ou acesso no CI",()=>{
 const source=fs.readFileSync(path.resolve(__dirname,"../scripts/privacy/audit-ifce-readonly.cjs"),"utf8");
 assert.match(source,/require\.main===module/);
 assert.match(source,/\.select\(\.\.\.keys\)\.stream\(\)/);
 assert.match(source,/IFCE_AUDIT_APPROVED/);
 assert.doesNotMatch(source,/\.set\(|\.update\(|\.delete\(|\.add\(|\.create\(|runTransaction|batch\(|writeFileSync/);
});
