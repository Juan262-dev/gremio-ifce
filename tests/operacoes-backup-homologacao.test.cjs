const {test}=require("node:test");
const assert=require("node:assert/strict");
const crypto=require("node:crypto"),fs=require("node:fs"),path=require("node:path");
const {planBackup,verifyBucket,execute}=require("../template-escolas/scripts/export-firestore.cjs");
const {REQUIRED,evaluate,verify}=require("../template-escolas/scripts/release-gate.cjs");
const plan=planBackup({projectId:"escola-horizonte",bucket:"backup-escola-horizonte",prefix:"firestore-backups/2026-11-21T080000Z/escola-horizonte"});
const bucket={name:plan.bucket,projectNumber:"12345",iamConfiguration:{uniformBucketLevelAccess:{enabled:true},publicAccessPrevention:"enforced"},retentionPolicy:{retentionPeriod:"2592000"},versioning:{enabled:true},encryption:{defaultKmsKeyName:"projects/escola-horizonte/locations/us/keyRings/backup/cryptoKeys/key"}};
test("plano só aceita destino explícito e separado por projeto",()=>{
 assert.match(plan.uri,/gs:\/\//);
 assert.throws(()=>planBackup({projectId:"demo-escola",bucket:"backup-escola-horizonte",prefix:plan.prefix}),/inválido/);
 assert.throws(()=>planBackup({projectId:"escola-horizonte",bucket:plan.bucket,prefix:"firestore-backups/2026-11-21T080000Z/empresa-estranha"}),/prefixo/);
});
test("reprova qualquer proteção ausente no bucket",()=>{
 assert.equal(verifyBucket(bucket,{projectNumber:"12345"},plan).ok,true);
 for(const changed of [
  {...bucket,projectNumber:"12346"},
  {...bucket,iamConfiguration:{uniformBucketLevelAccess:{enabled:false},publicAccessPrevention:"enforced"}},
  {...bucket,iamConfiguration:{uniformBucketLevelAccess:{enabled:true},publicAccessPrevention:"inherited"}},
  {...bucket,retentionPolicy:{retentionPeriod:"100"}},
  {...bucket,versioning:{enabled:false}},
  {...bucket,encryption:{}}
 ])assert.equal(verifyBucket(changed,{projectNumber:"12345"},plan).ok,false);
});
test("sem aprovação não chama gcloud em operações reais",()=>{
 assert.throws(()=>execute(plan,{}),/autorização/);
 assert.throws(()=>execute(plan,{BACKUP_APPROVED_PROJECT_ID:plan.projectId,BACKUP_EXECUTE:"INCORRETO",BACKUP_APPROVAL_REFERENCE:"ATA-2026"}),/autorização/);
});
const manifest=()=>({version:1,projectId:"escola-horizonte",approvedAt:new Date().toISOString(),requirements:Object.fromEntries(REQUIRED.map(x=>[x,{status:"approved",evidenceId:"ATA_2026/"+x}]))});
test("gate bloqueia aprovação ausente, desatualizada ou de outra escola",()=>{
 assert.equal(evaluate(null,"escola-horizonte").ok,false);
 assert.equal(evaluate(manifest(),"escola-horizonte").ok,true);
 assert.equal(evaluate(manifest(),"escola-diferente").ok,false);
 const m=manifest();delete m.requirements.privacidade_alunos;
 assert.equal(evaluate(m,"escola-horizonte").ok,false);
});
test("gate confere assinatura Ed25519 sem publicar ou executar Firebase",()=>{
 const keys=crypto.generateKeyPairSync("ed25519");
 const data=Buffer.from(JSON.stringify(manifest()));
 const sig=crypto.sign(null,data,keys.privateKey);
 assert.equal(verify(data,sig,keys.publicKey,"escola-horizonte").ok,true);
 assert.equal(verify(Buffer.from("{}"),sig,keys.publicKey,"escola-horizonte").ok,false);
 const s=fs.readFileSync(path.join(__dirname,"../template-escolas/scripts/release-gate.cjs"),"utf8");
 assert.doesNotMatch(s,/spawnSync|execSync|initializeApp|firebase deploy/);
});
