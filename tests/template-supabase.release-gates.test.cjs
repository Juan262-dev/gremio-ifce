const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const base=path.join(__dirname,"..","template-supabase");
const read=p=>readFileSync(path.join(base,p),"utf8");
const {checkPair}=require("../template-supabase/scripts/verify-school-pair.cjs");
const sample=(id,site,project,key)=>({
 schemaVersion:1,backend:"supabase",instanceId:id,siteOrigin:site,
 school:{name:id,gremio:"Grêmio Teste",contact:"teste@example.invalid",color:"#246a49"},
 supabase:{url:"https://"+project+".supabase.co",publishableKey:"sb_publishable_"+key.repeat(40)}
});
test("bloquear reuso de banco, domínio, ID ou chave entre escolas",()=>{
 const a=sample("escola-aaa","https://escola-aaa.example.org","abcdefghijklmnopqrst","A");
 const b=sample("escola-bbb","https://escola-bbb.example.org","zyxwvutsrqponmlkjihg","B");
 assert.equal(checkPair(a,b).valid,true);
 assert.throws(()=>checkPair(a,{...b,supabase:{...b.supabase,url:a.supabase.url}}));
 assert.throws(()=>checkPair(a,{...b,siteOrigin:a.siteOrigin}));
 assert.throws(()=>checkPair(a,{...b,instanceId:a.instanceId}));
 assert.throws(()=>checkPair(a,{...b,supabase:{...b.supabase,publishableKey:a.supabase.publishableKey}}));
});
test("smoke de Auth é bloqueado por padrão e nunca inicia silenciosamente",()=>{
 const script=path.join(base,"scripts","auth-readonly-smoke.cjs");
 const run=spawnSync(process.execPath,[script],{
   env:{PATH:process.env.PATH,RUN_REAL_AUTH_SMOKE:"NO"},encoding:"utf8"
 });
 assert.equal(run.status,1);
 assert.match(run.stderr,/Teste real não habilitado/);
 assert.match(read("scripts/auth-readonly-smoke.cjs"),/TEST_ACCOUNT_FICTITIOUS/);
 assert.match(read("scripts/auth-readonly-smoke.cjs"),/school_members/);
});
test("ensaio SQL de restauração exige banco vazio e tem rollback",()=>{
 const sql=read("sql/verify-backup-restore-rollback.sql");
 assert.match(sql,/begin;/);
 assert.match(sql,/banco não está vazio/);
 assert.match(sql,/create temp table backup_members/);
 assert.match(sql,/create temp table backup_votes/);
 assert.match(sql,/Restauração de votos divergiu/);
 assert.match(sql,/rollback;\s*$/);
});
test("documentação não simula autorização jurídica nem homologação externa",()=>{
 const lic=read("docs/LICENCIAMENTO-E-AUTORIA.md");
 const priv=read("docs/PRIVACIDADE-MODELO-ESCOLA.md");
 const backup=read("docs/BACKUP-RESTAURACAO.md");
 const isolamento=read("docs/PLANO-HOMOLOGACAO-DUAS-ESCOLAS.md");
 assert.match(lic,/licença não concedida/i);
 assert.match(priv,/Status: PENDENTE/i);
 assert.match(backup,/recuperação real de desastre permanece pendente/i);
 assert.match(isolamento,/não é possível com apenas um projeto/i);
});
