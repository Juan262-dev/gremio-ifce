const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.join(__dirname,"..","template-supabase");
const read=name=>fs.readFileSync(path.join(base,name),"utf8");
const config=require("../template-supabase/public/js/instance.js");
const school=()=>({
  schemaVersion:1,backend:"supabase",instanceId:"escola-a",
  siteOrigin:"https://escola-a.example.org",
  school:{name:"Escola A",gremio:"Grêmio A",contact:"contato@escola-a.org",color:"#246a49"},
  supabase:{url:"https://abcdefghijklmnopqrst.supabase.co",publishableKey:"sb_publishable_"+("Z".repeat(40))}
});
test("configuração da escola valida URL, chave pública e origem",()=>{
 const data=school();
 assert.equal(config.validate(data,data.siteOrigin).school.name,"Escola A");
 for(const wrong of [
   {...data,backend:"firebase"},
   {...data,siteOrigin:"http://escola-a.example.org"},
   {...data,siteOrigin:"https://escola.example.invalid"},
   {...data,supabase:{...data.supabase,publishableKey:"sb_secret_"+"X".repeat(20)}},
   {...data,supabase:{...data.supabase,url:"https://wrong.example.com"}},
   {...data,supabase:{...data.supabase,service_role:"privado"}},
   {...data,school:{...data.school,color:"red"}}
 ])assert.throws(()=>config.validate(wrong));
 assert.throws(()=>config.validate(data,"https://outra-escola.org"));
});
test("instalações independentes precisam de domínios e projetos diferentes",()=>{
 const a=school(),b=school();
 b.instanceId="escola-b";b.siteOrigin="https://escola-b.example.org";
 b.supabase.url="https://zyxwvutsrqponmlkjihg.supabase.co";
 assert.equal(config.different(a,b),true);
 assert.equal(config.different(a,{...b,supabase:a.supabase}),false);
 assert.equal(config.different(a,{...b,siteOrigin:a.siteOrigin}),false);
 assert.equal(config.different(a,{...b,instanceId:a.instanceId}),false);
});
test("configuração de exemplo não conecta e não contém credenciais de serviço",()=>{
 const example=JSON.parse(read("public/config/installation.example.json"));
 assert.throws(()=>config.validate(example));
 assert.equal(example.backend,"supabase");
 assert.ok(!JSON.stringify(example).includes("sb_secret_"));
 assert.ok(!JSON.stringify(example).includes("service_role"));
});
test("RLS habilitada em todas as tabelas e sem grant para anon",()=>{
 const sql=read("sql/schema.sql");
 const names=[
   "school_members","school_roles","school_notices","school_study_materials","school_events",
   "school_registrations","school_polls","school_votes","school_suggestions"
 ];
 for(const name of names){
   assert.match(sql,new RegExp("create table public\\."+name+"\\s*\\(","i"));
   assert.match(sql,new RegExp("alter table public\\."+name+" enable row level security;","i"));
 }
 assert.match(sql,/revoke all on public\.school_members[\s\S]*from anon, authenticated;/);
 assert.doesNotMatch(sql,/grant\s+(select|insert|update|delete|all)[\s\S]{0,110}\s+to\s+anon\b/i);
 assert.match(sql,/create policy vote_once/);
 assert.match(sql,/primary key\(poll_id,user_id\)/);
 assert.match(sql,/create policy member_request[\s\S]*status='pending'/);
 assert.match(sql,/create policy registration_create[\s\S]*school_private\.is_approved/);
});
test("gestão é concedida apenas externamente e funções de segurança são privadas",()=>{
 const sql=read("sql/schema.sql");
 assert.match(sql,/create function school_private\.is_admin\(\)/);
 assert.match(sql,/security definer set search_path = ''/);
 assert.match(sql,/a\.email_confirmed_at is not null/);
 assert.match(sql,/revoke all on function school_private\.is_admin/);
 assert.doesNotMatch(sql,/grant\s+insert\s+on\s+public\.school_roles\s+to\s+authenticated/);
 assert.match(sql,/create policy role_own_read/);
});
test("portal e painel usam somente Supabase e preservam crédito original",()=>{
 for(const file of ["public/index.html","public/admin.html"]){
   const html=read(file);
   assert.match(html,/supabase-js@2\.119\.2/);
   assert.match(html,/connect-src 'self' https:\/\/\*\.supabase\.co/);
   assert.match(html,/Origem do sistema: Grêmio IFCE Campus Crateús/);
   assert.doesNotMatch(html,/firebasejs\/|https:\/\/\*\.googleapis\.com/);
 }
 const portal=read("public/js/portal.js"),admin=read("public/js/admin.js");
 assert.match(portal,/school_votes/);
 assert.match(portal,/school_registrations/);
 assert.match(portal,/school_members/);
 assert.match(admin,/school_roles/);
 assert.match(admin,/role\.role!=="admin"/);
 assert.doesNotMatch(admin,/insert\(\{\s*user_id:.*role:/s);
});

test("cliente não pode definir IDs ou datas geradas pelo servidor",()=>{
 const sql=read("sql/schema.sql");
 const columns={
  school_members:"user_id, display_name, status",
  school_notices:"title, body, created_by",
  school_study_materials:"title, content, created_by",
  school_events:"title, details, when_text, location, created_by",
  school_registrations:"event_id, user_id",
  school_polls:"question, options, active, created_by",
  school_votes:"poll_id, user_id, option_index",
  school_suggestions:"user_id, body, status"
 };
 for(const [name,allowed] of Object.entries(columns)){
   assert.ok(sql.includes("grant insert ("+allowed+") on public."+name+" to authenticated;"));
 }
 assert.doesNotMatch(sql,/grant\s+select,\s*insert\s+on\s+public\.school_/i);
 assert.match(sql,/school_private\.valid_poll_options\(options\)/);
 assert.match(sql,/count\(distinct lower\(btrim\(value\)\)\)/);
 assert.match(sql,/array_ndims\(items\) <> 1/);
});

test("todas as chaves estrangeiras críticas possuem índices e migração isolada",()=>{
 const schema=read("sql/schema.sql");
 const followup=read("sql/indexes-existing-install.sql");
 const names=[
  "school_notices_author_idx",
  "school_study_materials_author_idx",
  "school_events_author_idx",
  "school_registrations_user_idx",
  "school_polls_author_idx",
  "school_votes_user_idx"
 ];
 for(const name of names){
  assert.ok(schema.includes("create index "+name+" on public.school_"),name);
  assert.ok(followup.includes("create index "+name+" on public.school_"),name);
 }
});
test("testes SQL de permissões nunca persistem contas de ensaio",()=>{
 const script=read("sql/verify-rls-tests.sql");
 assert.match(script,/begin;/);
 assert.match(script,/rollback;\s*$/);
 assert.match(script,/Projeto não está vazio/);
 assert.match(script,/set local role authenticated/);
 assert.match(script,/if not duplicate_blocked/);
 assert.match(script,/if not foreign_vote_blocked/);
});
