/* Configuração e inicialização de uma instalação Supabase independente.
   Exporta validação pura para testes; não conecta em caso de configuração inválida. */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  else root.InstalacaoSupabase=api;
})(typeof window!=="undefined"?window:this,function(){
  "use strict";
  const permitted=["schemaVersion","backend","instanceId","siteOrigin","school","supabase"];
  const forbidden=/(secret|service[_-]?role|service[_-]?key|private[_-]?key|password|credential|access[_-]?token)/i;
  function fields(data,names,label){
    if(!data||typeof data!=="object"||Array.isArray(data))throw Error(label+" inválido.");
    for(const k of Object.keys(data)){
      if(!names.includes(k)||forbidden.test(k))throw Error(label+": campo não permitido "+k);
    }
  }
  function nonempty(value,max){
    return typeof value==="string"&&value.trim().length>0&&value.length<=max;
  }
  function validate(data,origin){
    fields(data,permitted,"Instalação");
    if(data.schemaVersion!==1||data.backend!=="supabase")throw Error("Provedor ou versão incorretos.");
    if(!nonempty(data.instanceId,60)||!/^[a-z0-9][a-z0-9-]{2,59}$/.test(data.instanceId))
      throw Error("Identificador escolar inválido.");
    let site;
    try{site=new URL(data.siteOrigin);}catch(e){throw Error("Origem escolar inválida.");}
    if(site.protocol!=="https:"||site.pathname!=="/"||site.search||site.hash||site.username||site.password)
      throw Error("A escola precisa de uma origem HTTPS exclusiva.");
    if(origin&&origin!==site.origin)throw Error("Esta hospedagem não pertence à instalação configurada.");
    if(/\.invalid$/.test(site.hostname)||site.hostname==="localhost"||site.hostname==="127.0.0.1")
      throw Error("Origem de exemplo não pode iniciar uma instalação real.");
    fields(data.school,["name","gremio","contact","color"],"Identidade escolar");
    for(const field of ["name","gremio","contact"]){
      if(!nonempty(data.school[field],field==="contact"?120:100))throw Error("Identidade escolar incompleta.");
    }
    if(!/^#[0-9a-f]{6}$/i.test(data.school.color))throw Error("Cor da escola inválida.");
    fields(data.supabase,["url","publishableKey"],"Conexão Supabase");
    let url;
    try{url=new URL(data.supabase.url);}catch(e){throw Error("URL Supabase inválida.");}
    if(url.protocol!=="https:"||!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url.origin)
       ||url.pathname!=="/"||url.search||url.hash||url.username||url.password)
      throw Error("Use exclusivamente a URL HTTPS do projeto Supabase da escola.");
    if(!nonempty(data.supabase.publishableKey,300)||!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(data.supabase.publishableKey))
      throw Error("Use apenas a chave pública publishable do Supabase.");
    return Object.freeze({
      schemaVersion:1,backend:"supabase",instanceId:data.instanceId,siteOrigin:site.origin,
      school:{...data.school},supabase:{url:url.origin,publishableKey:data.supabase.publishableKey}
    });
  }
  function different(a,b){
    const x=validate(a),y=validate(b);
    return x.instanceId!==y.instanceId&&x.siteOrigin!==y.siteOrigin&&x.supabase.url!==y.supabase.url;
  }
  async function load(){
    if(typeof window==="undefined")throw Error("Disponível somente em navegador.");
    const response=await fetch("./config/installation.json",{cache:"no-store",credentials:"same-origin"});
    if(!response.ok)throw Error("Arquivo de configuração escolar ausente.");
    return validate(await response.json(),window.location.origin);
  }
  function start(config){
    if(typeof supabase==="undefined"||typeof supabase.createClient!=="function")
      throw Error("Biblioteca Supabase não carregada.");
    return supabase.createClient(config.supabase.url,config.supabase.publishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
  }
  return Object.freeze({validate,different,load,start});
});
