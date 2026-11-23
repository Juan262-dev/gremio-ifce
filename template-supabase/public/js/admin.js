(async function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=String(text);return n;};
 const status=(message,bad=false)=>{$("status").textContent=message;$("status").classList.toggle("error",bad);};
 const result=({data,error})=>{if(error)throw error;return data;};
 let api,user=null;
 function show(allowed){$("admin").hidden=!allowed;$("access").hidden=allowed;}
 function card(title,body){const e=node("article","");e.className="item";e.append(node("h4",title),node("p",body));return e;}
 function action(text,fn){
   const b=node("button",text);b.type="button";
   b.addEventListener("click",async()=>{
     b.disabled=true;
     try{await fn();}catch(e){status("Operação não autorizada ou indisponível.",true);}
     finally{b.disabled=false;}
   });return b;
 }
 async function loadMembers(){
   const list=$("member-list");list.replaceChildren();
   const data=result(await api.from("school_members")
     .select("user_id,display_name,status").order("created_at",{ascending:false}).limit(60));
   if(!data.length)list.append(node("p","Nenhuma solicitação."));
   for(const m of data){
     const w=card(m.display_name,m.status==="pending"?"Pendente":
       m.status==="approved"?"Aprovado":"Bloqueado");
     if(m.status==="pending")w.append(action("Aprovar cadastro",async()=>{
       result(await api.from("school_members").update({status:"approved"})
         .eq("user_id",m.user_id));await loadMembers();status("Cadastro aprovado.");
     }));
     list.append(w);
   }
 }
 async function loadSuggestions(){
   const list=$("suggestion-list");list.replaceChildren();
   const data=result(await api.from("school_suggestions")
     .select("id,body,status").order("created_at",{ascending:false}).limit(60));
   if(!data.length)list.append(node("p","Nenhuma sugestão enviada."));
   for(const s of data){
     const w=card(s.status==="pending"?"Em análise":s.status==="approved"?"Aprovada":"Arquivada",s.body);
     if(s.status==="pending"){
       const buttons=node("div","");buttons.className="button-row";
       for(const [text,value] of [["Aprovar","approved"],["Arquivar","archived"]]){
         buttons.append(action(text,async()=>{
           result(await api.from("school_suggestions").update({status:value}).eq("id",s.id));
           await loadSuggestions();status("Sugestão atualizada.");
         }));
       }
       w.append(buttons);
     }
     list.append(w);
   }
 }
 async function loadStudies(){
   const list=$("study-admin-list");list.replaceChildren();
   const data=result(await api.from("school_study_materials")
     .select("id,title,content").order("created_at",{ascending:false}).limit(50));
   if(!data.length)list.append(node("p","Nenhum material publicado."));
   for(const m of data){
     const w=card(m.title,m.content);
     w.append(action("Excluir material",async()=>{
       if(!window.confirm("Excluir este material textual?"))return;
       result(await api.from("school_study_materials").delete().eq("id",m.id));
       await loadStudies();status("Material excluído.");
     }));list.append(w);
   }
 }
 async function authCheck(candidate){
   if(!candidate){user=null;show(false);status("Entre com uma conta gestora verificada.");return;}
   try{
     const fresh=result(await api.auth.getUser()).user;
     if(!fresh||!fresh.email_confirmed_at)throw Error("E-mail não confirmado");
     const role=result(await api.from("school_roles")
       .select("role,active").eq("user_id",fresh.id).maybeSingle());
     if(!role||role.role!=="admin"||role.active!==true)throw Error("Sem cargo");
     user=fresh;show(true);
     status("Gestor autorizado. As operações são verificadas pelas políticas do banco.");
     await Promise.all([loadMembers(),loadSuggestions(),loadStudies()]);
   }catch(e){user=null;show(false);status("Conta sem cargo ativo ou sem confirmação. Procure a TI da escola.",true);}
 }
 try{
   const config=await InstalacaoSupabase.load();
   document.documentElement.style.setProperty("--green",config.school.color);
   $("school-name").textContent=config.school.name;
   $("gremio-name").textContent=config.school.gremio;
   api=InstalacaoSupabase.start(config);
   api.auth.onAuthStateChange((_event,session)=>setTimeout(()=>authCheck(session?.user||null),0));
   // A tela de login deve abrir também quando não existe sessão.
   // Para autorizar a gestão, authCheck sempre consulta getUser() e a RLS.
   const initial=result(await api.auth.getSession());
   await authCheck(initial.session?.user||null);
 }catch(e){$("access").hidden=true;show(false);$("access").hidden=true;status("Instalação indisponível: "+e.message,true);return;}
 $("login-form").addEventListener("submit",async ev=>{
   ev.preventDefault();const d=new FormData(ev.currentTarget);
   try{
     result(await api.auth.signInWithPassword({
       email:String(d.get("email")).trim(),password:String(d.get("password"))
     }));
     await authCheck(result(await api.auth.getUser()).user);
   }catch(e){status("Não foi possível entrar no painel.",true);}
 });
 $("signout").addEventListener("click",async()=>{
   await api.auth.signOut();show(false);user=null;
 });
 function form(id,fn){
   $(id).addEventListener("submit",async ev=>{
     ev.preventDefault();if(!user)return;
     const values=Object.fromEntries(new FormData(ev.currentTarget));
     const b=ev.currentTarget.querySelector('button[type="submit"]');b.disabled=true;
     try{await fn(values);ev.currentTarget.reset();status("Dados atualizados nesta escola.");}
     catch(e){status("Não foi possível salvar. Confira os limites e sua autorização.",true);}
     finally{b.disabled=false;}
   });
 }
 function text(value,max){
   const s=String(value||"").trim();
   if(!s||s.length>max)throw Error("Texto inválido");
   return s;
 }
 form("study-form",async v=>{
   result(await api.from("school_study_materials").insert({
     title:text(v.title,100),content:text(v.content,2000),created_by:user.id
   }));
   await loadStudies();
 });
 form("notice-form",async v=>{
   result(await api.from("school_notices").insert({
     title:text(v.title,100),body:text(v.body,1500),created_by:user.id
   }));
 });
 form("event-form",async v=>{
   result(await api.from("school_events").insert({
     title:text(v.title,100),details:text(v.details,1000),
     when_text:text(v.when,100),location:text(v.location,120),created_by:user.id
   }));
 });
 form("poll-form",async v=>{
   const a=text(v.option1,80),b=text(v.option2,80);
   if(a.toLowerCase()===b.toLowerCase())throw Error("Opções iguais");
   result(await api.from("school_polls").insert({
     question:text(v.question,200),options:[a,b],active:true,created_by:user.id
   }));
 });
})();
