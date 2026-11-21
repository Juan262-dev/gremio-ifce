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
  async function loadStudyMaterials(){
    const list=$("study-admin-list");list.replaceChildren();
    const snapshot=await db.collection("studyMaterials").limit(50).get();
    if(snapshot.empty)list.append(elem("p","Nenhum material de estudo nesta escola."));
    snapshot.forEach(doc=>{
      const m=doc.data(),box=document.createElement("article");box.className="item";
      box.append(elem("h4",m.title),elem("p",m.content));
      box.append(btn("Excluir material",async()=>{
        if(!window.confirm("Excluir este conteúdo textual da escola?"))return;
        await doc.ref.delete();await loadStudyMaterials();status("Material excluído.");
      }));
      list.append(box);
    });
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
  async function loadSuggestions(){
    const list=$("suggestion-list");list.replaceChildren();
    const found=await db.collection("suggestions").limit(60).get();
    if(found.empty)list.append(elem("p","Nenhuma sugestão recebida."));
    found.forEach(doc=>{
      const s=doc.data(),w=document.createElement("article");
      w.className="item";
      w.append(elem("h4",s.status==="pending"?"Em análise":s.status==="approved"?"Aprovada":"Arquivada"),elem("p",s.body));
      if(s.status==="pending"){
        const actions=document.createElement("div");actions.className="button-row";
        actions.append(
          btn("Aprovar",async()=>{
            await doc.ref.update({status:"approved"});await loadSuggestions();status("Sugestão aprovada.");
          }),
          btn("Arquivar",async()=>{
            await doc.ref.update({status:"archived"});await loadSuggestions();status("Sugestão arquivada.");
          })
        );
        w.append(actions);
      }
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
    await Promise.all([loadMembers(),loadSuggestions(),loadStudyMaterials()]);
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
  handleForm("study-form",async v=>{
    const title=String(v.title||"").trim(),content=String(v.content||"").trim();
    if(!title||title.length>100||!content||content.length>2000)
      throw Error("Material inválido");
    await db.collection("studyMaterials").add({title,content,createdAt:timestamp()});
    await loadStudyMaterials();
  });
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
