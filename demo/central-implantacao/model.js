(function(root,factory){
  const model=factory();
  if(typeof module === "object" && module.exports) module.exports=model;
  else root.CentralDemoModel=model;
})(typeof window !== "undefined" ? window : this,function(){
  "use strict";
  const MODULES=["avisos","eventos","carteirinha","estudos","enquetes"];
  const DEFAULT_STATE={
    schoolName:"Escola Exemplo A",
    campus:"Unidade Central",
    city:"Cidade Fictícia",
    gremioName:"Grêmio Estudantil Exemplo",
    contact:"gremio@escola.example.invalid",
    theme:"#246a49",
    portalTitle:"Portal do Aluno",
    adminTitle:"Painel Administrativo",
    modules:{avisos:true,eventos:true,carteirinha:true,estudos:true,enquetes:false},
    demoProjectId:"demo-escola-exemplo",
    firebaseAcknowledged:false,
    adminAcknowledged:false,
    reviewAcknowledged:false
  };
  const TEXT_FIELDS={
    schoolName:80,campus:60,city:60,gremioName:80,contact:100,
    portalTitle:65,adminTitle:65,demoProjectId:64
  };
  function plainText(value,max){return typeof value==="string" ? value.trim().slice(0,max) : "";}
  function freshState(){return {...DEFAULT_STATE,modules:{...DEFAULT_STATE.modules}};}
  function sanitizeDraft(input){
    const s=freshState();
    if(!input || typeof input!=="object" || Array.isArray(input))return s;
    for(const [key,max] of Object.entries(TEXT_FIELDS)){
      if(Object.prototype.hasOwnProperty.call(input,key))s[key]=plainText(input[key],max);
    }
    if(typeof input.theme==="string" && /^#[0-9a-f]{6}$/i.test(input.theme))s.theme=input.theme.toLowerCase();
    if(input.modules && typeof input.modules==="object" && !Array.isArray(input.modules)){
      for(const key of MODULES) if(typeof input.modules[key]==="boolean") s.modules[key]=input.modules[key];
    }
    for(const key of ["firebaseAcknowledged","adminAcknowledged","reviewAcknowledged"]){
      if(typeof input[key]==="boolean")s[key]=input[key];
    }
    return s;
  }
  function validateStep(index,input){
    const s=sanitizeDraft(input);
    const errors=[];
    if(index===0){
      if(s.schoolName.length<3)errors.push("Informe um nome de escola fictício com pelo menos 3 caracteres.");
      if(s.gremioName.length<3)errors.push("Informe o nome fictício do Grêmio.");
      if(s.contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.contact))errors.push("O contato de exemplo precisa ter formato de e-mail.");
    }else if(index===1){
      if(!/^#[0-9a-f]{6}$/i.test(s.theme))errors.push("Escolha uma cor válida.");
      if(s.portalTitle.length<3 || s.adminTitle.length<3)errors.push("Informe os títulos dos dois aplicativos.");
    }else if(index===2){
      if(!/^demo-[a-z0-9-]{3,54}$/.test(s.demoProjectId))errors.push("Use apenas um identificador fictício começando por demo-.");
      if(!s.firebaseAcknowledged)errors.push("Confirme que esta etapa não conecta ao Firebase real.");
    }else if(index===3){
      if(!s.adminAcknowledged)errors.push("Confirme que o primeiro gestor exige procedimento técnico seguro.");
    }else if(index===4){
      if(!s.reviewAcknowledged)errors.push("Confirme que finalizar a demonstração não publica aplicativos.");
    }else{
      errors.push("Etapa desconhecida.");
    }
    return {ok:errors.length===0,errors};
  }
  function progress(input){
    const complete=[0,1,2,3,4].map(i=>validateStep(i,input).ok);
    return {complete,percent:complete.filter(Boolean).length*20};
  }
  function releaseStatus(){
    return {
      allowed:false,
      blockers:[
        "Template genérico ainda não implementado",
        "Firebase e primeiro administrador reais não provisionados",
        "Segurança, privacidade, licença e homologação pendentes"
      ]
    };
  }
  return {MODULES,DEFAULT_STATE,freshState,sanitizeDraft,validateStep,progress,releaseStatus};
});
