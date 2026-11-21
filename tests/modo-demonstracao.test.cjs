const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const M=require("../demo/modo-demonstracao/model.js");
const base=path.join(__dirname,"../demo/modo-demonstracao");

function apply(s,action){
  const result=M.edit(s,action);
  assert.equal(result.ok,true,result.error);
  return result.state;
}
test("Portal e Painel usam duas escolas inteiramente fictícias e independentes",()=>{
  let s=M.freshState();
  assert.deepEqual(M.SCHOOL_IDS,["escola-a","escola-b"]);
  assert.match(M.view(s).schoolName,/fictícia/i);
  const oldB=JSON.stringify(s.schools["escola-b"]);
  s=apply(s,{type:"mode",value:"admin"});
  s=apply(s,{type:"new-notice",title:"Aviso demonstrativo",body:"Criado na Escola A apenas."});
  assert.equal(JSON.stringify(s.schools["escola-b"]),oldB);
  assert.equal(s.schools["escola-a"].notices[0].title,"Aviso demonstrativo");
  s=apply(s,{type:"school",value:"escola-b"});
  assert.equal(s.mode,"portal");
  assert.ok(!M.view(s).notices.some(n=>n.title==="Aviso demonstrativo"));
});
test("Portal: inscrições e voto único alteram apenas estado em memória",()=>{
  let s=M.freshState();
  const event=M.view(s).events[0].id;
  s=apply(s,{type:"register-event",id:event});
  assert.equal(M.view(s).events[0].registered,true);
  s=apply(s,{type:"register-event",id:event});
  assert.equal(M.view(s).events[0].registered,false);
  const option=0,original=M.view(s).poll.votes[option];
  s=apply(s,{type:"vote",option});
  assert.equal(M.view(s).poll.votes[option],original+1);
  assert.equal(M.edit(s,{type:"vote",option:1}).ok,false);
});
test("Portal e Admin: sugestão, aprovação e cadastro funcionam somente na escola atual",()=>{
  let s=M.freshState();
  s=apply(s,{type:"suggest",text:"Adicionar uma biblioteca de exemplos."});
  assert.equal(M.view(s).suggestions[0].status,"pendente");
  const id=M.view(s).suggestions[0].id;
  assert.equal(M.edit(s,{type:"moderate",id,status:"aprovada"}).ok,false);
  s=apply(s,{type:"mode",value:"admin"});
  s=apply(s,{type:"moderate",id,status:"aprovada"});
  assert.equal(M.view(s).suggestions[0].status,"aprovada");
  assert.equal(M.edit(s,{type:"moderate",id,status:"arquivada"}).ok,false);
  const student=M.view(s).students[0].id;
  s=apply(s,{type:"approve-student",id:student});
  assert.equal(M.view(s).students[0].status,"aprovado");
});
test("Admin cria evento e enquete de exemplo; Portal recebe atualizações",()=>{
  let s=apply(M.freshState(),{type:"mode",value:"admin"});
  s=apply(s,{type:"new-event",title:"Feira de ideias",when:"Exemplo: 15h",where:"Pátio de exemplo"});
  s=apply(s,{type:"new-poll",question:"Qual projeto fictício você escolhe?",options:["Música","Leitura"]});
  assert.equal(M.view(s).events[0].title,"Feira de ideias");
  assert.deepEqual(M.view(s).poll.votes,[0,0]);
  s=apply(s,{type:"mode",value:"portal"});
  assert.ok(M.view(s).events.some(e=>e.title==="Feira de ideias"));
  s=apply(s,{type:"vote",option:1});
  assert.equal(M.view(s).poll.votes[1],1);
});
test("valida e rejeita entradas maliciosas, ações sem contexto e escola desconhecida",()=>{
  let s=M.freshState();
  assert.equal(M.edit(s,{type:"school",value:"producao"}).ok,false);
  assert.equal(M.edit(s,{type:"new-notice",title:"Olá",body:"Texto muito curto"}).ok,false);
  assert.equal(M.edit(s,{type:"suggest",text:"a"}).ok,false);
  assert.equal(M.edit(s,{type:"vote",option:-1}).ok,false);
  s=apply(s,{type:"mode",value:"admin"});
  assert.equal(M.edit(s,{type:"new-poll",question:"Pergunta demonstrativa?",options:["Mesmo","Mesmo"]}).ok,false);
  assert.equal(M.edit(s,{type:"section",value:"firebase"}).ok,false);
});
test("reset por escola não afeta outra escola; reset geral repõe fixtures originais",()=>{
  let s=M.freshState();
  s=apply(s,{type:"mode",value:"admin"});
  s=apply(s,{type:"new-notice",title:"Novo comunicado",body:"Texto ilustrativo suficientemente longo."});
  const b=JSON.stringify(s.schools["escola-b"]);
  s=apply(s,{type:"reset-school"});
  assert.equal(JSON.stringify(s.schools["escola-b"]),b);
  assert.deepEqual(s.schools["escola-a"],M.FIXTURES["escola-a"]);
  s=apply(s,{type:"school",value:"escola-b"});
  s=apply(s,{type:"reset-all"});
  assert.deepEqual(s,M.freshState());
});
test("página offline possui aviso explícito, CSP proibindo conexões e scripts locais",()=>{
  const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
  const ui=fs.readFileSync(path.join(base,"app.js"),"utf8");
  const readme=fs.readFileSync(path.join(base,"README.md"),"utf8");
  for(const item of ["DEMONSTRAÇÃO — DADOS FICTÍCIOS","Portal do Aluno","Painel Administrativo",
    "school-select","side-nav","reset-demo","app-content"])
    assert.ok(html.includes(item),item);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.doesNotMatch(html,/<script[^>]+src=["']https?:/i);
  assert.doesNotMatch(html,/firebase\.gstatic|AIzaSy|gremioifce-92540/i);
  assert.doesNotMatch(ui,/fetch\s*\(|XMLHttpRequest|firebase\.|initializeApp\s*\(|\.innerHTML\s*=/);
  assert.match(ui,/textContent/);
  assert.match(readme,/simulação/i);
  assert.match(readme,/não.*Firebase real/i);
  const center=fs.readFileSync(path.join(__dirname,"../demo/central-implantacao/index.html"),"utf8");
  assert.match(center,/modo-demonstracao\/index\.html/);
});
