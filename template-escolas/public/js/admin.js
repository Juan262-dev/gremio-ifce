(async function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const status=(text,bad=false)=>{$("status").textContent=text;$("status").classList.toggle("error",bad);};
  const elem=(tag,text)=>{const x=document.createElement(tag);x.textContent=String(text);return x;};
  const timestamp=()=>firebase.firestore.FieldValue.serverTimestamp();
  let auth,db;
  function show(logged){$("admin").hidden=!logged;$("access").hidden=logged;}
  function btn(text,fn){
    const b=elem("button",text);b.type="button";
    b.addEventListener("click",async()=>{b.disabled=true;try{await fn();}catch(e){status("Operação negada ou indisponível.",true);}finally{b.disabled=false;}});
    return b;
  }
  async function loadMembers(){
    const list=$("member-list");list.replaceChildren();
    const found=await db.collection("members").limit(60).get();
    if(found.empty)list.append(elem("p","Nenhuma solicitação."));
    found.forEach(doc=>{
      const m=doc.data(),w=document.createElement("article");w.className="item";
      w.append(elem("h4",m.displayName),elem("p",m.status==="pending"?"Pendente":m.status==="approved"?"Aprovado":"Bloqueado"));
      if(m.status==="pending")w.append(btn("Aprovar cadastro",async()=>{
        await doc.ref.update({status:"approved"});await loadMembers();status("Cadastro aprovado. Mudança válida apenas nesta instalação.");
      }));
      list.append(w);
    });
  }
  async function check(user){
    if(!user){show(false);status("Acesso administrativo exige uma conta verificada e cargo autorizado.");return;}
    await user.reload();await user.getIdToken(true);
    if(!user.emailVerified){show(false);status("Verifique o e-mail antes de entrar na gestão.",true);return;}
    const role=await db.collection("roles").doc(user.uid).get();
    if(!role.exists||role.data().role!=="admin"||role.data().active!==true){
      show(false);status("Conta sem permissão administrativa. O cargo não pode ser criado por esta tela.",true);return;
    }
    show(true);status("Gestor autorizado para esta instalação. As permissões também são verificadas pelo Firestore.");
    await loadMembers();
  }
  try{
    const config=await InstalacaoEscolar.load();
    document.documentElement.style.setProperty("--green",config.school.color);
    $("school-name").textContent=config.school.name;
    $("gremio-name").textContent=config.school.gremio;
    const service=InstalacaoEscolar.start(config,"escola-admin");
    auth=service.auth;db=service.db;
    auth.onAuthStateChanged(user=>check(user).catch(()=>{show(false);status("Não foi possível validar as permissões.",true);}));
  }catch(e){show(false);$("access").hidden=true;status("Instalação não configurada. Firebase não iniciado. "+e.message,true);return;}
  $("login-form").addEventListener("submit",async ev=>{
    ev.preventDefault();const data=new FormData(ev.currentTarget);
    try{await auth.signInWithEmailAndPassword(String(data.get("email")).trim(),String(data.get("password")));}
    catch(e){status("Credenciais inválidas ou acesso indisponível.",true);}
  });
  $("signout").addEventListener("click",()=>auth.signOut());
  function handleForm(id,fn){
    $(id).addEventListener("submit",async ev=>{
      ev.preventDefault();
      const values=Object.fromEntries(new FormData(ev.currentTarget));
      const b=ev.currentTarget.querySelector('button[type="submit"]');
      b.disabled=true;
      try{await fn(values);ev.currentTarget.reset();status("Conteúdo atualizado nesta instalação.");}
      catch(e){status("Não foi possível salvar. Confira os dados e suas permissões.",true);}
      finally{b.disabled=false;}
    });
  }
  handleForm("notice-form",async v=>db.collection("notices").add({
    title:String(v.title).trim(),body:String(v.body).trim(),createdAt:timestamp()
  }));
  handleForm("event-form",async v=>db.collection("events").add({
    title:String(v.title).trim(),details:String(v.details).trim(),
    when:String(v.when).trim(),location:String(v.location).trim(),createdAt:timestamp()
  }));
  handleForm("poll-form",async v=>db.collection("polls").add({
    question:String(v.question).trim(),options:[String(v.option1).trim(),String(v.option2).trim()],
    active:true,createdAt:timestamp()
  }));
})();
