(function(){
  "use strict";
  const Model=window.VerificadorDemoModel;
  if(!Model)return;
  const $=id=>document.getElementById(id);
  const fields=[...document.querySelectorAll("[data-school][data-field]")];
  function read(){
    const data={a:{},b:{}};
    for(const el of fields)data[el.dataset.school][el.dataset.field]=el.value;
    return data;
  }
  function fill(data){
    for(const el of fields)el.value=data[el.dataset.school][el.dataset.field]||"";
  }
  function row(item,kind){
    const li=document.createElement("li");
    const heading=document.createElement("div");
    heading.className="result-title";
    const title=document.createElement("strong");
    title.textContent=item.label;
    const status=document.createElement("span");
    const failed=item.status==="bloqueado";
    const pending=item.status==="pendente";
    status.className=pending?"wait":failed?"bad":"good";
    status.textContent=pending?"PENDENTE":failed?"BLOQUEADO":"COERENTE (EXEMPLO)";
    heading.append(title,status);
    const detail=document.createElement("p");
    detail.textContent=kind==="manual"?item.why:item.detail;
    li.append(heading,detail);
    if(item.owner){
      const owner=document.createElement("small");
      owner.textContent="Responsável: "+item.owner;
      li.appendChild(owner);
    }
    return li;
  }
  function inspect(){
    const result=Model.check(read());
    const status=$("overall-status");
    status.textContent=result.summary.status;
    status.className="status "+(result.summary.status==="BLOQUEADO"?"blocked":"pending");
    $("result-message").textContent=result.summary.message;
    $("count-good").textContent=result.summary.examplePassed+"/"+result.summary.exampleTotal;
    $("count-blocked").textContent=String(result.summary.blocked);
    $("count-pending").textContent=String(result.summary.pending);
    $("automatic-results").replaceChildren(...result.automatic.map(x=>row(x,"automatic")));
    $("manual-results").replaceChildren(...result.manual.map(x=>row(x,"manual")));
    $("release-gate").textContent=result.publication.allowed?
      "Revisão de produção indisponível neste protótipo":
      "Instalação real indisponível · Sem deploy";
  }
  $("scenario").addEventListener("change",e=>{fill(Model.example(e.target.value));inspect();});
  $("check").addEventListener("click",inspect);
  $("reset").addEventListener("click",()=>{
    $("scenario").value="normal";
    fill(Model.example("normal"));
    inspect();
  });
  fill(Model.example("normal"));
  inspect();
})();
