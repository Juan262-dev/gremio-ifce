const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..","template-supabase","public");

function runPage(script,options={}){
  const nodes=new Map();
  const user=options.user??null;
  const tableData=options.tableData||{};
  let getUserCalls=0,queries=0;
  function element(){
    return {
      hidden:true,textContent:"",value:"",children:[],disabled:false,
      style:{setProperty(){}},classList:{toggle(){}},
      append(...items){this.children.push(...items);},
      replaceChildren(...items){this.children=[...items];},
      addEventListener(name,callback){this.events ||= {};this.events[name]=callback;},
      querySelector(){return element();},
      reset(){}
    };
  }
  function get(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
  const document={
    getElementById:get,
    createElement:element,
    documentElement:{style:{setProperty(){}}}
  };
  function builder(table){
    return {
      select(){return this;},
      order(){return this;},
      limit(){return this;},
      eq(){return this;},
      maybeSingle:async()=>({data:tableData[table]??null,error:null}),
      then(resolve,reject){return Promise.resolve({data:tableData[table]??[],error:null}).then(resolve,reject);}
    };
  }
  const auth={
    getSession:async()=>({data:{session:user?{user}:null},error:null}),
    getUser:async()=>{getUserCalls++;return options.noSessionError?
      {data:{user:null},error:new Error("Auth session missing")}:
      {data:{user},error:null};},
    onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};},
    signOut:async()=>({error:null})
  };
  const api={auth,from(table){queries++;return builder(table);}};
  const config={school:{name:"Escola de Ensaio",gremio:"Grêmio de Teste",color:"#246a49"}};
  const context={
    document,
    window:{confirm:()=>true},
    setTimeout,
    FormData,
    InstalacaoSupabase:{load:async()=>config,start:()=>api}
  };
  const filename=path.join(root,"js",script);
  const source=fs.readFileSync(filename,"utf8");
  return vm.runInNewContext(source,context,{filename}).then(()=>({
    nodes,getUserCalls,queries,get
  }));
}
const verified={id:"11111111-1111-4111-8111-111111111111",email_confirmed_at:"2026-11-23T19:00:00Z"};
test("portal abre login inicial mesmo quando getUser exigiria sessão",async()=>{
  const ui=await runPage("portal.js",{noSessionError:true});
  assert.equal(ui.get("access").hidden,false);
  assert.equal(ui.get("portal").hidden,true);
  assert.equal(ui.getUserCalls,0);
  assert.equal(ui.queries,0);
  assert.match(ui.get("status").textContent,/Entre com sua conta/);
});
test("painel abre login inicial mesmo quando getUser exigiria sessão",async()=>{
  const ui=await runPage("admin.js",{noSessionError:true});
  assert.equal(ui.get("access").hidden,false);
  assert.equal(ui.get("admin").hidden,true);
  assert.equal(ui.getUserCalls,0);
  assert.equal(ui.queries,0);
  assert.match(ui.get("status").textContent,/conta gestora/);
});
test("portal confirmado mas pendente continua bloqueado",async()=>{
  const ui=await runPage("portal.js",{user:verified,tableData:{
    school_members:{display_name:"Fictício",status:"pending"}
  }});
  assert.equal(ui.get("pending").hidden,false);
  assert.equal(ui.get("portal").hidden,true);
  assert.equal(ui.get("request-access").hidden,true);
  assert.equal(ui.getUserCalls,1);
});
test("portal aprovado acessa apenas suas consultas privadas",async()=>{
  const ui=await runPage("portal.js",{user:verified,tableData:{
    school_members:{display_name:"Fictício",status:"approved"}
  }});
  assert.equal(ui.get("portal").hidden,false);
  assert.equal(ui.get("access").hidden,true);
  assert.equal(ui.getUserCalls,1);
  assert.ok(ui.queries>=8);
});
test("admin sem cargo não acessa painel",async()=>{
  const ui=await runPage("admin.js",{user:verified,tableData:{school_roles:null}});
  assert.equal(ui.get("admin").hidden,true);
  assert.equal(ui.get("access").hidden,false);
});
test("admin com cargo ativo acessa painel",async()=>{
  const ui=await runPage("admin.js",{user:verified,tableData:{
    school_roles:{role:"admin",active:true}
  }});
  assert.equal(ui.get("admin").hidden,false);
  assert.equal(ui.get("access").hidden,true);
  assert.equal(ui.getUserCalls,1);
});
