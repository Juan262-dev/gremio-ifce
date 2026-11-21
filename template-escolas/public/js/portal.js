(async function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const setStatus=(msg,bad=false)=>{$("status").textContent=msg;$("status").classList.toggle("error",bad);};
  const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=String(text);return n;};
  const clear=id=>$(id).replaceChildren();
  let auth,db,member;
  let config;
  function show(id){for(const x of ["access","pending","portal"])$(x).hidden=x!==id;}
  function item(title,detail){
    const wrap=document.createElement("article");wrap.className="item";
    wrap.append(node("h4",title),node("p",detail));return wrap;
  }
  function button(text,fn){
    const b=node("button",text);b.type="button";b.addEventListener("click",async()=>{
      b.disabled=true;try{await fn();}catch(e){setStatus("Não foi possível concluir a operação. Verifique suas permissões e tente novamente.",true);}finally{b.disabled=false;}
    });return b;
  }
  const timestamp=()=>firebase.firestore.FieldValue.serverTimestamp();
  async function access(user){
    if(!user){member=null;show("access");setStatus("Entre com sua conta escolar verificada.");return;}
    await user.reload();await user.getIdToken(true);
    if(!user.emailVerified){
      show("pending");$("pending-text").textContent="Confirme o e-mail enviado pelo Firebase. Depois, clique em Atualizar verificação.";
      $("request-access").hidden=true;setStatus("Verificação de e-mail pendente.");return;
    }
    const snap=await db.collection("members").doc(user.uid).get();
    member=snap.exists?snap.data():null;
    if(!member){
      show("pending");$("request-access").hidden=false;$("pending-text").textContent="Seu e-mail foi verificado. Envie um nome e aguarde a aprovação do Grêmio.";
      setStatus("Cadastro ainda não solicitado.");return;
    }
    $("request-access").hidden=true;
    if(member.status!=="approved"){
      show("pending");$("pending-text").textContent=member.status==="blocked"?"Acesso bloqueado pela gestão.":"Cadastro enviado e aguardando aprovação.";
      setStatus("O cadastro ainda não está aprovado.");return;
    }
    show("portal");setStatus("Acesso autorizado à instalação desta escola.");
    await loadContent(user.uid);
  }
  async function loadContent(uid){
    clear("notice-list");clear("event-list");clear("poll-list");
    const [n,e,p]=await Promise.all(["notices","events","polls"].map(c=>db.collection(c).limit(25).get()));
    if(n.empty)$("notice-list").append(node("p","Nenhum aviso."));
    n.forEach(d=>{const x=d.data();$("notice-list").append(item(x.title,x.body));});
    if(e.empty)$("event-list").append(node("p","Nenhum evento."));
    for(const doc of e.docs){
      const x=doc.data(),w=item(x.title,x.details+" · "+x.when+" · "+x.location);
      const reg=db.collection("events").doc(doc.id).collection("registrations").doc(uid);
      const mine=await reg.get();
      w.append(button(mine.exists?"Cancelar inscrição":"Inscrever-me",async()=>{
        if(mine.exists)await reg.delete();
        else await reg.set({uid,createdAt:timestamp()});
        await loadContent(uid);
      }));
      $("event-list").append(w);
    }
    if(p.empty)$("poll-list").append(node("p","Nenhuma enquete."));
    for(const doc of p.docs){
      const x=doc.data(),w=item(x.question,x.active?"Escolha apenas uma opção.":"Enquete encerrada.");
      const vote=db.collection("polls").doc(doc.id).collection("votes").doc(uid);
      const mine=await vote.get();
      if(mine.exists)w.append(node("p","Seu voto está registrado de forma privada."));
      else if(x.active&&Array.isArray(x.options)){
        const box=document.createElement("div");box.className="choices";
        x.options.forEach((option,index)=>box.append(button(String(option),async()=>{
          await vote.set({uid,optionId:index,createdAt:timestamp()});
          await loadContent(uid);
        })));
        w.append(box);
      }
      $("poll-list").append(w);
    }
  }
  try{
    config=await InstalacaoEscolar.load();
    document.documentElement.style.setProperty("--green",config.school.color);
    $("school-name").textContent=config.school.name;
    $("gremio-name").textContent=config.school.gremio;
    const service=InstalacaoEscolar.start(config,"escola-portal");
    auth=service.auth;db=service.db;
    auth.onAuthStateChanged(u=>access(u).catch(()=>{show("pending");setStatus("Não foi possível conferir a aprovação. Contate a equipe técnica.",true);}));
  }catch(e){show(null);setStatus("Instalação ainda não configurada ou inválida. Nenhuma conexão Firebase iniciada. "+e.message,true);return;}
  $("login-form").addEventListener("submit",async ev=>{
    ev.preventDefault();
    const d=new FormData(ev.currentTarget);
    try{await auth.signInWithEmailAndPassword(String(d.get("email")).trim(),String(d.get("password")));}
    catch(e){setStatus("Não foi possível entrar. Confirme os dados ou procure a gestão.",true);}
  });
  $("signup-form").addEventListener("submit",async ev=>{
    ev.preventDefault();const d=new FormData(ev.currentTarget);
    try{
      const credential=await auth.createUserWithEmailAndPassword(String(d.get("email")).trim(),String(d.get("password")));
      await credential.user.sendEmailVerification();
      setStatus("Conta criada. Verifique o e-mail antes de solicitar aprovação.");
    }catch(e){setStatus("Não foi possível criar a conta. Confira os dados e a política da escola.",true);}
  });
  $("request-access").addEventListener("click",async()=>{
    if(!auth.currentUser||!auth.currentUser.emailVerified)return;
    const name=$("display-name").value.trim();
    if(name.length<3||name.length>80){setStatus("Informe um nome de 3 a 80 caracteres.",true);return;}
    try{
      await db.collection("members").doc(auth.currentUser.uid).set({displayName:name,status:"pending",createdAt:timestamp()});
      await access(auth.currentUser);
    }catch(e){setStatus("A solicitação não foi aceita. Consulte a gestão.",true);}
  });
  $("refresh-access").addEventListener("click",()=>{if(auth.currentUser)access(auth.currentUser).catch(()=>setStatus("Não foi possível atualizar.",true));});
  for(const id of ["signout","signout-pending"])$(id).addEventListener("click",()=>auth.signOut());
})();
