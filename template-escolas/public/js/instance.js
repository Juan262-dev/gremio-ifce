(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object" && module.exports)module.exports=api;
  else root.InstalacaoEscolar=api;
})(typeof window!=="undefined"?window:this,function(){
  "use strict";
  const OLD_PROJECT="gremioifce-92540";
  const CLIENT_FIELDS=["apiKey","authDomain","projectId","appId","messagingSenderId"];
  const forbidden=/(private[_-]?key|service[_-]?account|client[_-]?email|credential|password|secret|token)/i;
  function assertKeys(obj,allowed,label){
    if(!obj||typeof obj!=="object"||Array.isArray(obj))throw Error(label+" inválido.");
    const extra=Object.keys(obj).find(k=>!allowed.includes(k)||forbidden.test(k));
    if(extra)throw Error(label+" contém campo não permitido: "+extra);
  }
  function text(v,max){
    return typeof v==="string"&&v.trim().length>0&&v.length<=max?v.trim():null;
  }
  function validate(data,origin){
    assertKeys(data,["schemaVersion","instanceId","siteOrigin","school","firebase"],"Configuração");
    if(data.schemaVersion!==1)throw Error("Versão de configuração não suportada.");
    if(!text(data.instanceId,60)||! /^[a-z0-9][a-z0-9-]{2,59}$/.test(data.instanceId))
      throw Error("ID da instalação inválido.");
    if(!text(data.siteOrigin,200))throw Error("URL da instalação ausente.");
    let url;
    try{url=new URL(data.siteOrigin);}catch(e){throw Error("URL da instalação inválida.");}
    if(url.protocol!=="https:"||url.pathname!=="/"||url.search||url.hash||url.username||url.password)
      throw Error("É necessária uma origem HTTPS exclusiva da escola.");
    if(origin&&origin!==url.origin)throw Error("Domínio diferente da instalação configurada.");
    if(url.hostname==="localhost"||url.hostname==="127.0.0.1"||url.hostname.endsWith(".example.invalid"))
      throw Error("O domínio fictício ou local não pode iniciar Firebase real.");
    assertKeys(data.school,["name","gremio","contact","color"],"Identidade escolar");
    if(!text(data.school.name,100)||!text(data.school.gremio,100)||!text(data.school.contact,120))
      throw Error("Identidade escolar incompleta.");
    if(! /^#[0-9a-fA-F]{6}$/.test(data.school.color))throw Error("Cor escolar inválida.");
    assertKeys(data.firebase,CLIENT_FIELDS,"Firebase Web");
    for(const k of CLIENT_FIELDS)if(!text(data.firebase[k],200))throw Error("Firebase Web incompleto: "+k);
    const id=data.firebase.projectId;
    if(!/^[a-z][a-z0-9-]{5,45}$/.test(id)
      ||id===OLD_PROJECT||id.startsWith("demo-")||id.includes("ifce"))
      throw Error("Projeto Firebase inválido, de exemplo ou da instalação original.");
    if(data.firebase.authDomain!==id+".firebaseapp.com")
      throw Error("authDomain não corresponde ao Firebase exclusivo da escola.");
    if(! /^1:[0-9]+:web:[a-f0-9]+$/i.test(data.firebase.appId))
      throw Error("appId da aplicação Web inválido.");
    if(!/^[0-9]+$/.test(data.firebase.messagingSenderId))
      throw Error("Sender ID inválido.");
    if(!/^AIza[A-Za-z0-9_-]{20,}$/.test(data.firebase.apiKey))
      throw Error("Chave pública Web não parece válida.");
    return {
      schemaVersion:1,instanceId:data.instanceId,siteOrigin:url.origin,
      school:{...data.school},firebase:{...data.firebase}
    };
  }
  function different(a,b){
    const x=validate(a),y=validate(b);
    return x.instanceId!==y.instanceId&&x.siteOrigin!==y.siteOrigin
      &&x.firebase.projectId!==y.firebase.projectId;
  }
  async function load(){
    if(typeof window==="undefined")throw Error("Carregamento disponível somente no navegador.");
    let response;
    try{response=await fetch("./config/installation.json",{cache:"no-store",credentials:"same-origin"});}
    catch(e){throw Error("Instalação não configurada: arquivo da escola ausente.");}
    if(!response.ok)throw Error("Instalação não configurada: arquivo da escola ausente.");
    const config=validate(await response.json(),window.location.origin);
    if(typeof firebase==="undefined"||typeof firebase.initializeApp!=="function")
      throw Error("Bibliotecas Firebase não carregadas.");
    return config;
  }
  function start(config,name){
    const app=firebase.initializeApp(config.firebase,name);
    return {app,auth:app.auth(),db:app.firestore()};
  }
  return {validate,different,load,start};
});
