const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Portal IFCE não escreve e-mails nas enquetes nem em eventos compartilhados",()=>{
 const portal=read("index.html"),admEnq=read("admin-02-comunicacao-estudos.js"),
 admEv=read("admin-06-eleicao-eventos.js");
 assert.doesNotMatch(portal,/votosAlunos/);
 assert.match(portal,/\.collection\('votos'\)\.doc\(uid\)/);
 assert.match(admEnq,/privacidadeVersao: 2/);
 assert.match(admEv,/inscritosCount: 0, esperaCount: 0/);
 assert.match(portal,/httpsCallable\('inscreverEventoSeguro'\)/);
 assert.match(portal,/httpsCallable\('cancelarEventoSeguro'\)/);
});
test("regras v2 impedem consulta de listas legadas e exclusão de cédulas",()=>{
 const rules=read("firestore.rules");
 assert.match(rules,/function enquetePublicaSegura/);
 assert.match(rules,/function eventoPublicoSeguro/);
 assert.match(rules,/match \/votos\/\{uid\}/);
 assert.match(rules,/match \/inscricoes\/\{uid\}/);
 assert.match(rules,/allow update, delete: if false/);
 assert.match(rules,/request\.auth\.uid == uid/);
});
test("segurança do backend de eventos requer validação Auth e transação",()=>{
 const server=read("functions/index.js"),service=read("functions/event-service.cjs");
 assert.match(server,/request\.auth\?\.uid/);
 assert.match(server,/email_verified!==true/);
 assert.match(server,/privacidadeMigracaoBloqueada/);
 assert.match(service,/runTransaction/);
 const release=read("functions/release-gate.cjs");
 assert.match(release,/eventosV2Habilitados/);
 assert.match(server,/assertEventsReleased\(system\)/);
 assert.match(service,/orderBy\("order","asc"\)/);
 assert.match(service,/tx\.update\(first\.ref/);
 assert.doesNotMatch(service,/request\.data\.uid/);
});
test("pré-homologação não marca aprovação fictícia nem instala em produção",()=>{
 const checklist=read("docs/homologacao/IFCE-PRE-LANCAMENTO-2027.md");
 assert.match(checklist,/NÃO HOMOLOGADO/);
 assert.match(checklist,/PENDENTE/);
 assert.match(checklist,/não é homologação institucional/);
 const workflow=read(".github/workflows/firestore-rules.yml");
 assert.doesNotMatch(workflow, /firebase deploy|gcloud firestore export/);
});
