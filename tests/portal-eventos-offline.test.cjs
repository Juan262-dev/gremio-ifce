const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const portal=require('../portal-eventos-v2.js');
const root=path.resolve(__dirname,'..');

test('inscrições exigem todos os sinalizadores de liberação explícitos',()=>{
 const ok={eventosV2Habilitados:true,manutencao:false,painelCongelado:false,privacidadeMigracaoBloqueada:false};
 assert.equal(portal.liberados(ok),true);
 for(const key of Object.keys(ok)){
  const absent={...ok};delete absent[key];
  assert.equal(portal.liberados(absent),false,key);
 }
 assert.equal(portal.liberados(null),false);
 assert.equal(portal.liberados({...ok,manutencao:true}),false);
});
test('mensagens refletem estado real, sem afirmar promoção em qualquer cancelamento',()=>{
 assert.match(portal.estadoPausado({status:'registered'}),/Inscrição registrada/);
 assert.match(portal.estadoPausado({status:'waitlisted'}),/lista de espera/);
 assert.match(portal.estadoPausado(null),/preparação/);
 assert.match(portal.mensagemFalha({code:'functions/failed-precondition'}),/temporariamente/);
 assert.match(portal.mensagemFalha({code:'functions/not-found'}),/ainda não foi instalado/);
 assert.match(portal.mensagemFalha({code:'functions/permission-denied'}),/cadastro/);
 assert.match(portal.mensagemCancelamento('missing'),/Não foi encontrada/);
 assert.match(portal.mensagemCancelamento('cancelled-waiting'),/saiu da lista/);
 assert.match(portal.mensagemCancelamento('cancelled-promoted'),/recebeu a vaga/);
 assert.equal(portal.mensagemCancelamento('cancelled'),'Inscrição cancelada.');
});
test('Portal impede clique duplicado e atualização antiga, sem troca de identidade visual',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/<script src="portal-eventos-v2\.js"><\/script>/);
 assert.match(html,/PortalEventosV2\.liberados\(d\)/);
 assert.match(html,/operacoesEventoPendentes\.has\(id\)/);
 assert.match(html,/operacoesEventoPendentes\.add\(id\)/);
 assert.match(html,/operacoesEventoPendentes\.delete\(id\)/);
 assert.match(html,/if \(!eventosV2Liberados\)/);
 assert.match(html,/geracao !== eventoRenderGeracao/);
 assert.match(html,/atualizarInscricaoEvento\(id, uid\)/);
 assert.doesNotMatch(html,/A primeira pessoa da fila é promovida automaticamente/);
 assert.match(html,/navbar-ifce/);
});
function environment() {
 const handlers={},stored=new Map(),deleted=[];
 let offline=false;
 let outcome={ok:true,type:'basic',clone(){return this;}};
 const self={
  location:{origin:'https://gremio.example'},
  registration:{scope:'https://gremio.example/gremio-ifce/'},
  addEventListener(type,cb){handlers[type]=cb;},
  skipWaiting(){},clients:{claim:()=>Promise.resolve()}
 };
 const caches={
  async keys(){return ['unrelated-cache','gremio-v1','gremio-portal-v2'];},
  async delete(key){deleted.push(key);return true;},
  async open(){return {put:async(req,val)=>stored.set(req.url,val)};},
  async match(req){return stored.get(typeof req==='string'?req:req.url)||null;}
 };
 const fetch=async()=>{if(offline)throw Error('offline');return outcome;};
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),
  {self,caches,fetch,URL,Set});
 async function dispatch(url,mode='same-origin',method='GET'){
  let answer;const pending=[];
  const request={url:'https://gremio.example/gremio-ifce/'+url,mode,method,
    headers:{has:()=>false}};
  handlers.fetch({request,respondWith(p){answer=p;},waitUntil(p){pending.push(p);}});
  if(!answer)return {intercepted:false};
  try{
   const result=await answer;await Promise.all(pending);
   return {intercepted:true,result};
  }catch(error){return {intercepted:true,error};}
 }
 return {dispatch,stored,handlers,deleted,offline(v){offline=v;},outcome(v){outcome=v;}};
}
test('offline cacheia só arquivos públicos, sem administrar ou guardar parâmetros',async()=>{
 const env=environment();
 assert.equal((await env.dispatch('index.html','navigate')).intercepted,true);
 assert.equal((await env.dispatch('portal-eventos-v2.js')).intercepted,true);
 assert.equal((await env.dispatch('admin.html','navigate')).intercepted,false);
 assert.equal((await env.dispatch('admin-01-base-login.js')).intercepted,false);
 assert.equal((await env.dispatch('index.html?token=privado','navigate')).intercepted,false);
 assert.equal((await env.dispatch('api/private.json')).intercepted,false);
 assert.equal((await env.dispatch('portal-eventos-v2.js','same-origin','POST')).intercepted,false);
 env.offline(true);
 assert.equal((await env.dispatch('portal-eventos-v2.js')).result.ok,true);
 assert.ok((await env.dispatch('carteirinha-aluno.js')).error);
 assert.equal(env.stored.size,2);
});
test('cache não armazena erros HTTP nem devolve HTML quando falta JavaScript',async()=>{
 const env=environment();
 env.outcome({ok:false,status:404,type:'basic',clone(){return this;}});
 const res=await env.dispatch('laboratorio-quimica.js');
 assert.equal(res.result.status,404);
 assert.equal(env.stored.size,0);
 env.offline(true);
 assert.ok((await env.dispatch('laboratorio-quimica.js')).error);
});
test('ativação remove caches antigos do Grêmio mas mantém os de outros sistemas',async()=>{
 const env=environment(),pending=[];
 env.handlers.activate({waitUntil(p){pending.push(p);}});
 await Promise.all(pending);
 assert.deepEqual(env.deleted,['gremio-v1']);
});
