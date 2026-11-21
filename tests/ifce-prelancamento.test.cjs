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
 const release=read("functions/release-gate.cjs");
 assert.match(release,/privacidadeMigracaoBloqueada/);
 assert.match(service,/runTransaction/);
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

test("operações destrutivas de documentos pais ficam bloqueadas até limpeza privada",()=>{
 const rules=read("firestore.rules"),actions=read("admin-06-eleicao-eventos.js");
 const poll=rules.slice(rules.indexOf("match /enquetes/{id}"),rules.indexOf("match /reivindicacoes/{id}"));
 const event=rules.slice(rules.indexOf("match /eventos/{id}"),rules.indexOf("match /jogos/{id}"));
 assert.match(poll,/allow delete: if false/);
 assert.match(event,/allow delete: if false/);
 assert.match(actions,/Exclusão bloqueada para proteger votos privados/);
 assert.match(actions,/inscrições privadas exigem tratamento/);
});

test("painel não mostra presença fictícia e relatório consulta apenas subcoleção privada",()=>{
 const activity=read("admin-05-financeiro-diretorias.js");
 assert.doesNotMatch(activity,/0 \/\* presença em subcoleção restrita \*\//);
 assert.doesNotMatch(activity,/atv\.filter\(e => 0/);
 assert.match(activity,/Consulta restrita/);
 assert.match(activity,/Presenças confirmadas:/);
 assert.match(activity,/collection\('presencas_eventos'\)/);
 assert.match(activity,/get\(\{ source: 'server' \}\)/);
 assert.match(activity,/não disponíveis para esta conta/);
});
