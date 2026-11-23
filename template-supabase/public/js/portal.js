(async function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const elt=(tag,value)=>{const el=document.createElement(tag);el.textContent=String(value);return el;};
 const list=id=>{const el=$(id);el.replaceChildren();return el;};
 const note=(message,bad=false)=>{$("status").textContent=message;$("status").classList.toggle("error",bad);};
 const check=({data,error})=>{if(error)throw error;return data;};
 const visible=section=>["access","pending","portal"].forEach(id=>$(id).hidden=id!==section);
 let api,currentUser=null,loading=false;
 function entry(title,body){const e=elt("article","");e.className="item";e.append(elt("h4",title),elt("p",body));return e;}
 function action(title,fn){
   const b=elt("button",title);b.type="button";
   b.addEventListener("click",async()=>{
     b.disabled=true;
     try{await fn();}catch(e){note("Não foi possível concluir. Verifique o acesso, a conexão ou tente novamente.",true);}
     finally{b.disabled=false;}
   });return b;
 }
 async function memberStatus(user){
   return check(await api.from("school_members").select("display_name,status")
     .eq("user_id",user.id).maybeSingle());
 }
 async function listContent(uid){
   const [notices,events,polls,studies,suggestions,registrations,votes]=await Promise.all([
     api.from("school_notices").select("id,title,body").order("created_at",{ascending:false}).limit(25),
     api.from("school_events").select("id,title,details,when_text,location").order("created_at",{ascending:false}).limit(25),
     api.from("school_polls").select("id,question,options,active").order("created_at",{ascending:false}).limit(25),
     api.from("school_study_materials").select("title,content").order("created_at",{ascending:false}).limit(25),
     api.from("school_suggestions").select("body,status").eq("user_id",uid).order("created_at",{ascending:false}).limit(20),
     api.from("school_registrations").select("event_id").eq("user_id",uid),
     api.from("school_votes").select("poll_id").eq("user_id",uid)
   ]);
   const n=check(notices),e=check(events),p=check(polls),s=check(studies),sug=check(suggestions);
   const mineEvents=new Set(check(registrations).map(x=>x.event_id));
   const minePolls=new Set(check(votes).map(x=>x.poll_id));
   const ns=list("notice-list"),es=list("event-list"),ps=list("poll-list"),
     ss=list("study-list"),gs=list("suggestion-list");
   if(!n.length)ns.append(elt("p","Nenhum aviso."));
   for(const x of n)ns.append(entry(x.title,x.body));
   if(!s.length)ss.append(elt("p","Nenhum material publicado."));
   for(const x of s)ss.append(entry(x.title,x.content));
   if(!e.length)es.append(elt("p","Nenhum evento disponível."));
   for(const x of e){
     const card=entry(x.title,x.details+" · "+x.when_text+" · "+x.location);
     const registered=mineEvents.has(x.id);
     card.append(action(registered?"Cancelar inscrição":"Inscrever-me",async()=>{
       if(registered){
         if(!window.confirm("Cancelar sua inscrição neste evento?"))return;
         check(await api.from("school_registrations").delete()
           .eq("event_id",x.id).eq("user_id",uid));
       }else check(await api.from("school_registrations").insert({event_id:x.id,user_id:uid}));
       await listContent(uid);note("Inscrição atualizada.");
     }));
     es.append(card);
   }
   if(!p.length)ps.append(elt("p","Nenhuma enquete publicada."));
   for(const x of p){
     const card=entry(x.question,x.active?"Vote uma única vez.":"Enquete encerrada.");
     if(minePolls.has(x.id))card.append(elt("p","Seu voto foi registrado de forma privada."));
     else if(x.active&&Array.isArray(x.options)){
       const options=elt("div","");options.className="choices";
       x.options.forEach((choice,index)=>options.append(action(choice,async()=>{
         check(await api.from("school_votes").insert({poll_id:x.id,user_id:uid,option_index:index}));
         await listContent(uid);note("Voto registrado.");
       })));card.append(options);
     }
     ps.append(card);
   }
   if(!sug.length)gs.append(elt("p","Você ainda não enviou sugestões."));
   for(const x of sug){
     const labels={pending:"Em análise",approved:"Aprovada",archived:"Arquivada"};
     gs.append(entry(labels[x.status]||"Em análise",x.body));
   }
 }
 async function access(user){
   if(loading)return;
   loading=true;
   try{
     currentUser=user||null;
     if(!user){visible("access");note("Entre com sua conta exclusiva desta escola.");return;}
     const refreshed=check(await api.auth.getUser()).user;
     if(!refreshed){visible("access");return;}
     currentUser=refreshed;
     if(!refreshed.email_confirmed_at){
       visible("pending");$("request-access").hidden=true;
       $("pending-text").textContent="Confirme seu e-mail para solicitar acesso. Consulte sua caixa de entrada.";
       note("Aguardando confirmação do e-mail.");return;
     }
     const member=await memberStatus(refreshed);
     if(!member){
       visible("pending");$("request-access").hidden=false;
       $("pending-text").textContent="Informe seu nome e solicite aprovação à gestão da escola.";
       note("Cadastro ainda não solicitado.");return;
     }
     $("request-access").hidden=true;
     if(member.status!=="approved"){
       visible("pending");
       $("pending-text").textContent=member.status==="blocked"?
         "Cadastro bloqueado pela gestão.":"Cadastro enviado. Aguarde aprovação da escola.";
       note("Acesso ainda não aprovado.");return;
     }
     visible("portal");note("Acesso autorizado a esta escola.");
     await listContent(refreshed.id);
   }catch(e){visible("pending");note("Não foi possível verificar sua permissão. Procure a equipe técnica.",true);}
   finally{loading=false;}
 }
 try{
   const config=await InstalacaoSupabase.load();
   document.documentElement.style.setProperty("--green",config.school.color);
   $("school-name").textContent=config.school.name;
   $("gremio-name").textContent=config.school.gremio;
   api=InstalacaoSupabase.start(config);
   api.auth.onAuthStateChange((_event,session)=>{
     // Consultas fora do callback de Auth evitam bloqueio interno de sessão.
     setTimeout(()=>access(session?.user||null),0);
   });
   const initial=await api.auth.getUser();
   check(initial);await access(initial.data.user);
 }catch(e){visible(null);note("Instalação indisponível: "+e.message,true);return;}
 $("login-form").addEventListener("submit",async ev=>{
   ev.preventDefault();
   const d=new FormData(ev.currentTarget);
   try{
     check(await api.auth.signInWithPassword({
       email:String(d.get("email")).trim(),password:String(d.get("password"))
     }));
     const result=check(await api.auth.getUser());await access(result.user);
   }catch(e){note("Não foi possível entrar. Verifique os dados e a confirmação do e-mail.",true);}
 });
 $("signup-form").addEventListener("submit",async ev=>{
   ev.preventDefault();const d=new FormData(ev.currentTarget);
   try{
     check(await api.auth.signUp({
       email:String(d.get("email")).trim(),password:String(d.get("password"))
     }));
     note("Solicitação de conta recebida. Confira o e-mail e entre após confirmar.");
   }catch(e){note("Não foi possível solicitar uma conta.",true);}
 });
 $("request-access").addEventListener("click",async()=>{
   const user=currentUser,name=$("display-name").value.trim();
   if(!user||!user.email_confirmed_at||name.length<3||name.length>80){
     note("Informe um nome válido após confirmar seu e-mail.",true);return;
   }
   try{
     check(await api.from("school_members").insert({user_id:user.id,display_name:name,status:"pending"}));
     await access(user);
   }catch(e){note("Cadastro não enviado; procure a gestão.",true);}
 });
 $("suggestion-form").addEventListener("submit",async ev=>{
   ev.preventDefault();
   const d=new FormData(ev.currentTarget),body=String(d.get("body")||"").trim();
   if(!currentUser||body.length<1||body.length>500){note("Sugestão inválida.",true);return;}
   const b=ev.currentTarget.querySelector('button[type="submit"]');b.disabled=true;
   try{
     check(await api.from("school_suggestions").insert({user_id:currentUser.id,body,status:"pending"}));
     ev.currentTarget.reset();await listContent(currentUser.id);note("Sugestão enviada.");
   }catch(e){note("Não foi possível enviar sugestão.",true);}
   finally{b.disabled=false;}
 });
 $("refresh-access").addEventListener("click",async()=>{
   const r=await api.auth.getUser();if(r.error)note("Não foi possível atualizar.",true);
   else await access(r.data.user);
 });
 for(const id of ["signout","signout-pending"]){
   $(id).addEventListener("click",async()=>{await api.auth.signOut();currentUser=null;visible("access");});
 }
})();
