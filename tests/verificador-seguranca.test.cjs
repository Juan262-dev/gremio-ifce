const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const M=require("../demo/verificador-seguranca/model.js");
const base=path.resolve(__dirname,"../demo/verificador-seguranca");
const read=x=>fs.readFileSync(path.join(base,x),"utf8");

test("cenário coerente valida somente exemplos e NUNCA libera produção",()=>{
  const r=M.check(M.example("normal"));
  assert.equal(r.summary.blocked,0);
  assert.equal(r.summary.status,"PENDENTE");
  assert.equal(r.summary.examplePassed,r.summary.exampleTotal);
  assert.equal(r.publication.allowed,false);
  assert.ok(r.manual.length>=7);
  assert.ok(r.manual.every(x=>x.status==="pendente"));
});
test("projetos repetidos entre escolas bloqueiam implantação fictícia",()=>{
  const r=M.check(M.example("shared"));
  assert.equal(r.summary.status,"BLOQUEADO");
  assert.equal(r.automatic.find(x=>x.id==="school-isolation").passed,false);
  assert.equal(r.publication.allowed,false);
});
test("Portal e Painel da mesma escola usando projetos distintos bloqueiam",()=>{
  const r=M.check(M.example("mixed"));
  assert.equal(r.automatic.find(x=>x.id==="one-project").passed,false);
  assert.equal(r.summary.status,"BLOQUEADO");
});
test("projeto original IFCE e projeto real são rejeitados",()=>{
  const a=M.check(M.example("origin"));
  assert.equal(a.summary.status,"BLOQUEADO");
  assert.equal(a.automatic.find(x=>x.id==="demo-ids").passed,false);
  const input=M.example("normal");input.a.portal="firebase-producao";
  assert.equal(M.check(input).summary.status,"BLOQUEADO");
});
test("HTTP, domínios reais, URLs com credenciais e iguais são bloqueados",()=>{
  const r=M.check(M.example("url"));
  assert.equal(r.automatic.find(x=>x.id==="safe-urls").passed,false);
  const input=M.example("normal");
  input.a.url="https://escola.com.br";
  assert.equal(M.check(input).summary.status,"BLOQUEADO");
  input.a.url="https://escola-a.example.invalid";
  input.b.url=input.a.url;
  assert.equal(M.check(input).automatic.find(x=>x.id==="different-urls").passed,false);
  input.b.url="https://user:senha@escola-b.example.invalid";
  assert.equal(M.check(input).automatic.find(x=>x.id==="safe-urls").passed,false);
});
test("ausência de dados e IDs inválidos falham de forma segura",()=>{
  const empty=M.check({});
  assert.equal(empty.summary.status,"BLOQUEADO");
  assert.equal(empty.publication.allowed,false);
  const input=M.example("normal");input.a.admin="demo-X";input.b.portal="";
  assert.equal(M.check(input).summary.status,"BLOQUEADO");
});
test("campos fora da lista não são aceitos, sem armazenar segredos",()=>{
  const data=M.cleanInput({a:{portal:" demo-abc ",admin:"demo-abc",url:"https://a.example.invalid",private_key:"SEGREDO"},b:{portal:"demo-xyz",admin:"demo-xyz",url:"https://b.example.invalid",apiKey:"SEGREDO"},password:"SEGREDO"});
  assert.deepEqual(Object.keys(data),["a","b"]);
  for(const id of ["a","b"])assert.deepEqual(Object.keys(data[id]),["portal","admin","url"]);
  assert.equal(data.a.portal,"demo-abc");
  assert.equal(JSON.stringify(data).includes("SEGREDO"),false);
});
test("CSP, links e interface locais não usam Firebase real ou rede",()=>{
  const html=read("index.html"),ui=read("app.js"),model=read("model.js");
  for(const id of ["scenario","check","reset","automatic-results","manual-results","release-gate","overall-status"])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.match(html,/Publicação real bloqueada/);
  assert.match(html,/Este protótipo nunca libera produção/);
  assert.doesNotMatch(html,/<script[^>]+src=["']https?:|firebase\.gstatic/i);
  assert.doesNotMatch(ui,/fetch\s*\(|XMLHttpRequest|initializeApp\s*\(|\.innerHTML\s*=|localStorage|sessionStorage/);
  assert.match(ui,/\.textContent/);
  assert.match(model,/allowed:false/);
});
test("integração com a Central e roteiro de produção seguem pendentes",()=>{
  const center=fs.readFileSync(path.resolve(__dirname,"../demo/central-implantacao/index.html"),"utf8");
  assert.match(center,/verificador-seguranca\/index\.html/);
  const doc=read("README.md");
  assert.match(doc,/não acessa dados/i);
  assert.match(doc,/Critério de prontidão para valer/i);
  assert.match(doc,/NUNCA libera produção|sempre false/i);
});
