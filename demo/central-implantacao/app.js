(function(){
  "use strict";
  const M=window.CentralDemoModel;
  if(!M)return;
  const KEY="gremio-central-demo-v1";
  const TITLES=[
    ["Identificação da escola","Comece pelos dados públicos da instituição e do Grêmio."],
    ["Aparência e recursos","Escolha uma identidade fictícia e veja as duas prévias."],
    ["Conexão Firebase","Entenda o isolamento necessário sem acessar projetos reais."],
    ["Administrador inicial","Conheça o procedimento futuro, sem criar contas."],
    ["Revisão final","Conclua apenas a simulação de implantação."]
  ];
  let state=M.freshState(), step=0, logoUrl=null;
  const $=id=>document.getElementById(id);
  const stepButtons=[...document.querySelectorAll("[data-goto]")];
  function notify(text){$("step-feedback").textContent=text;}
  function errors(messages){
    const panel=$("form-errors");
    panel.textContent=messages.join(" ");
    panel.hidden=messages.length===0;
  }
  function draft(){
    try{
      const parsed=JSON.parse(sessionStorage.getItem(KEY)||"null");
      if(parsed && typeof parsed==="object")state=M.sanitizeDraft(parsed);
    }catch(e){/* Armazenamento pode estar bloqueado; o formulário continua funcional. */}
  }
  function save(){
    try{
      sessionStorage.setItem(KEY,JSON.stringify(M.sanitizeDraft(state)));
      notify("Rascunho fictício guardado somente nesta aba. Nada foi enviado ou publicado.");
    }catch(e){notify("Não foi possível guardar nesta aba. A simulação continua disponível até fechar a página.");}
  }
  function syncInputs(){
    document.querySelectorAll("[data-field]").forEach(el=>{
      const key=el.dataset.field;
      if(el.type==="checkbox")el.checked=Boolean(state[key]);
      else el.value=state[key]||"";
    });
    document.querySelectorAll("[data-module]").forEach(el=>{el.checked=Boolean(state.modules[el.dataset.module]);});
  }
  function updatePreview(){
    const school=state.schoolName||"Escola Exemplo";
    const gremio=state.gremioName||"Grêmio Exemplo";
    $("preview-school").textContent=school;
    $("preview-gremio").textContent=gremio;
    $("preview-portal-title").textContent=state.portalTitle||"Portal do Aluno";
    $("preview-admin-title").textContent=state.adminTitle||"Painel Administrativo";
    $("portal-logo").textContent=(gremio.trim().charAt(0)||"G").toUpperCase();
    document.querySelector(".mini-square").textContent=(gremio.trim().charAt(0)||"G").toUpperCase();
    document.documentElement.style.setProperty("--preview-color",/^#[0-9a-f]{6}$/i.test(state.theme)?state.theme:"#246a49");
    const pills=$("preview-modules");
    pills.replaceChildren();
    const labels={avisos:"Avisos",eventos:"Eventos",carteirinha:"Carteirinha",estudos:"Estudos",enquetes:"Enquetes"};
    for(const name of M.MODULES){
      if(!state.modules[name])continue;
      const tag=document.createElement("span");
      tag.textContent=labels[name];
      pills.appendChild(tag);
    }
    $("sum-school").textContent=school;
    $("sum-gremio").textContent=gremio;
    $("sum-project").textContent=state.demoProjectId||"Não definido";
    $("sum-progress").textContent=M.progress(state).percent+"% da simulação preenchida";
  }
  function render(){
    const progress=M.progress(state);
    $("progress-bar").value=progress.percent;
    $("progress-label").textContent=progress.percent+"%";
    stepButtons.forEach((el,i)=>{
      const current=i===step;
      el.classList.toggle("current",current);
      if(current)el.setAttribute("aria-current","step");
      else el.removeAttribute("aria-current");
      el.querySelector(".step-state").textContent=progress.complete[i]?"✓":"—";
    });
    document.querySelectorAll("[data-panel]").forEach((el,i)=>{el.hidden=i!==step;});
    $("step-heading").textContent=TITLES[step][0];
    $("step-description").textContent=TITLES[step][1];
    $("step-badge").textContent="Etapa "+(step+1)+" de 5";
    $("back").disabled=step===0;
    $("next").textContent=step===4?"Concluir demonstração":"Continuar →";
    updatePreview();
  }
  function goTo(next){
    if(next<0||next>4)return;
    step=next;
    errors([]);notify("");
    render();
    $("step-heading").setAttribute("tabindex","-1");
    $("step-heading").focus({preventScroll:true});
  }
  function next(){
    errors([]);
    const result=M.validateStep(step,state);
    if(!result.ok){errors(result.errors);$("form-errors").focus();return;}
    if(step<4){goTo(step+1);return;}
    const all=M.progress(state).complete.every(Boolean);
    if(!all){errors(["Existem etapas pendentes. Preencha as etapas indicadas antes de finalizar a simulação."]);return;}
    const release=M.releaseStatus();
    if(release.allowed){errors(["Esta demonstração não pode autorizar uma publicação."]);return;}
    notify("Simulação concluída. A implantação real continua bloqueada. Nenhum aplicativo, banco ou conta foi criado.");
  }
  function selectLogo(file){
    const img=$("portal-image"),placeholder=$("portal-logo");
    if(logoUrl){URL.revokeObjectURL(logoUrl);logoUrl=null;}
    img.hidden=true;placeholder.hidden=false;img.removeAttribute("src");
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>1024*1024){
      errors(["Escolha um PNG, JPG ou WEBP de até 1 MB."]);
      $("logo-upload").value="";
      return;
    }
    logoUrl=URL.createObjectURL(file);
    img.src=logoUrl;
    img.hidden=false;
    placeholder.hidden=true;
    notify("Logotipo exibido apenas nesta aba. Ele não será salvo ou enviado.");
  }
  function bind(){
    document.querySelectorAll("[data-field]").forEach(el=>{
      el.addEventListener(el.type==="checkbox"?"change":"input",()=>{
        const value=el.type==="checkbox"?el.checked:el.value;
        const proposal={...state,[el.dataset.field]:value};
        state=M.sanitizeDraft(proposal);
        errors([]);
        render();
      });
    });
    document.querySelectorAll("[data-module]").forEach(el=>{
      el.addEventListener("change",()=>{
        state=M.sanitizeDraft({...state,modules:{...state.modules,[el.dataset.module]:el.checked}});
        render();
      });
    });
    stepButtons.forEach(el=>el.addEventListener("click",()=>goTo(Number(el.dataset.goto))));
    $("back").addEventListener("click",()=>goTo(step-1));
    $("next").addEventListener("click",next);
    $("save").addEventListener("click",save);
    $("reset").addEventListener("click",()=>{
      if(!confirm("Reiniciar todos os dados fictícios desta demonstração?"))return;
      try{sessionStorage.removeItem(KEY);}catch(e){}
      state=M.freshState();
      $("logo-upload").value="";
      selectLogo(null);
      syncInputs();
      goTo(0);
      notify("Demonstração reiniciada. Nenhum dado externo foi alterado.");
    });
    $("logo-upload").addEventListener("change",e=>selectLogo(e.target.files&&e.target.files[0]));
    window.addEventListener("pagehide",()=>{if(logoUrl)URL.revokeObjectURL(logoUrl);});
  }
  draft();
  bind();
  syncInputs();
  render();
})();
