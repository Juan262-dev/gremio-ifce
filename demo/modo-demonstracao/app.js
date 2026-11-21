(function(){
 "use strict";
 const M=window.GremioDemo;
 if(!M)return;
 let state=M.freshState();
 const MENU={
  inicio:["Início","Visão geral"],avisos:["Avisos","Comunicados"],eventos:["Eventos","Agenda"],
  enquetes:["Enquetes","Participação"],sugestoes:["Sugestões","Ouvidoria"],
  carteirinha:["Carteirinha","Identificação fictícia"],estudos:["Estudos","Materiais"],
  comunicados:["Comunicados","Publicar avisos"],participacao:["Participação","Sugestões e enquetes"],
  cadastros:["Cadastros","Aprovações simuladas"],gestao:["Diretoria","Gestão fictícia"]
 };
 const ICONS={inicio:"⌂",avisos:"▤",eventos:"▦",enquetes:"◉",sugestoes:"✎",
  carteirinha:"▣",estudos:"▥",comunicados:"▤",participacao:"◉",cadastros:"☷",gestao:"♧"};
 const $=id=>document.getElementById(id);
 const root=$("app-content");
 function el(tag,cls,text){
   const n=document.createElement(tag);
   if(cls)n.className=cls;
   if(text!==undefined)n.textContent=String(text);
   return n;
 }
 function add(parent,...nodes){nodes.flat().forEach(n=>{if(n!==null&&n!==undefined)parent.appendChild(typeof n==="string"?document.createTextNode(n):n);});return parent;}
 function label(text,cls){return el("span",cls||"",text);}
 function btn(text,callback,cls="button"){
   const n=el("button",cls,text);n.type="button";n.addEventListener("click",callback);return n;
 }
 function badge(text,style=""){return el("span","badge"+(style?" "+style:""),text);}
 function card(title,body,extra){
   const n=el("article","panel-card");
   add(n,el("h3","",title));
   if(body)add(n,el("p","",body));
   if(extra)add(n,extra);
   return n;
 }
 function group(title,subtitle){
   const p=el("div","view-heading");
   add(p,el("h3","",title),el("p","",subtitle));
   return p;
 }
 function action(a){
   const result=M.edit(state,a);
   if(!result.ok){flash(result.error,true);return;}
   state=result.state;
   render(result.message||"");
 }
 function flash(message,error=false){
   const n=$("feedback");n.textContent=message||"";n.classList.toggle("error",Boolean(error));
 }
 function navTo(section){action({type:"section",value:section});}
 function quick(text,section){return btn(text,()=>navTo(section),"menu-jump");}
 function stat(title,count){
   const c=el("div","stat");add(c,el("span","",title),el("strong","",String(count)));return c;
 }
 function formField(name,labelText,tag="input",placeholder="",max=100){
   const lab=el("label","field");lab.htmlFor=name;
   add(lab,labelText);
   const input=el(tag);
   input.id=name;input.name=name;input.placeholder=placeholder;input.maxLength=max;input.required=true;
   if(tag==="input")input.type="text";
   lab.appendChild(input);
   return {lab,input};
 }
 function formSubmit(buttonText,fields,handle,help){
   const f=el("form","panel-card");
   add(f,el("h3","form-title",buttonText));
   fields.forEach(x=>f.appendChild(x.lab));
   if(help)add(f,el("small","form-help",help));
   const submit=el("button","button",buttonText);submit.type="submit";f.appendChild(submit);
   f.addEventListener("submit",event=>{
     event.preventDefault();
     handle(Object.fromEntries(fields.map(x=>[x.input.name,x.input.value])));
   });
   return f;
 }
 function listNotices(notices,limit){
   const div=el("div","entry-list");
   const chosen=limit?notices.slice(0,limit):notices;
   chosen.forEach(n=>{
     const box=el("article","panel-card");
     const top=el("div","card-top");add(top,el("h3","",n.title),badge(n.date||"Exemplo"));
     add(box,top,el("p","",n.body));div.appendChild(box);
   });
   return div;
 }
 function listEvents(events,interactive){
   const wrap=el("div","entry-list");
   events.forEach(e=>{
     const box=el("article","panel-card");
     const header=el("div","card-top");add(header,el("h3","",e.title),badge("Evento fictício"));
     add(box,header,el("p","",e.when+" · "+e.where));
     if(interactive)box.appendChild(btn(e.registered?"Cancelar participação fictícia":"Participar (simulação)",()=>action({type:"register-event",id:e.id}),e.registered?"button outline":"button"));
     else box.appendChild(el("div","small-text",e.registered?"Exemplo: estudante inscrito":"Exemplo: nenhuma inscrição nesta aba"));
     wrap.appendChild(box);
   });
   return wrap;
 }
 function pollView(p,admin=false){
   const container=el("article","panel-card");
   const top=el("div","card-top");
   add(top,el("h3","",p.question),badge(p.closed?"Encerrada":p.voted!==null?"Voto fictício registrado":"Aberta",p.closed?"muted":""));
   container.appendChild(top);
   const total=p.votes.reduce((a,b)=>a+b,0);
   if(admin||p.closed||p.voted!==null){
     p.options.forEach((name,i)=>{
       const pct=total?Math.round(p.votes[i]/total*100):0;
       const line=el("div","result-line"),head=el("div","result-head"),bar=el("div","bar"),fill=el("div");
       fill.style.width=pct+"%";bar.appendChild(fill);
       add(head,label(name),label(p.votes[i]+" votos · "+pct+"%"));
       add(line,head,bar);
       container.appendChild(line);
     });
   }else{
     container.appendChild(el("p","small-text","Escolha uma alternativa. Cada visitante fictício vota uma vez por simulação."));
     const group=el("div","poll-options");
     p.options.forEach((name,i)=>group.appendChild(btn(name+"  ·  votar",()=>action({type:"vote",option:i}),"poll-option")));
     container.appendChild(group);
   }
   if(admin&&!p.closed)container.appendChild(btn("Encerrar enquete fictícia",()=>action({type:"close-poll"}),"button outline"));
   return container;
 }
 function overview(){
   const s=M.view(state),counts=M.summary(state),admin=state.mode==="admin";
   const c=el("div");
   const stats=el("div","stats");
   (admin?[
     ["Avisos",counts.notices],["Eventos",counts.events],["Sugestões pendentes",counts.pendingSuggestions],["Cadastros pendentes",counts.pendingStudents]
   ]:[
     ["Avisos",counts.notices],["Eventos",counts.events],["Inscrições",counts.registrations],["Enquetes",1]
   ]).forEach(pair=>stats.appendChild(stat(pair[0],pair[1])));
   add(c,group(admin?"Painel do Grêmio":"Bem-vindo ao Portal",admin?"Gerencie atividades de uma escola inventada.":"Explore os conteúdos de uma escola de exemplo."),stats);
   const cols=el("div","layout-two");
   const a=el("section"),b=el("section");
   add(a,group("Avisos recentes","Publicados somente na demonstração."),listNotices(s.notices,2));
   add(b,group("Próximos eventos fictícios","Experimente as inscrições na aba Eventos."),listEvents(s.events.slice(0,2),false));
   add(cols,a,b);c.appendChild(cols);
   const row=el("div","row-buttons");
   if(admin)add(row,quick("Criar comunicado","comunicados"),quick("Analisar sugestões","participacao"),quick("Ver cadastros","cadastros"));
   else add(row,quick("Participar de um evento","eventos"),quick("Responder enquete","enquetes"),quick("Enviar sugestão","sugestoes"));
   c.appendChild(row);
   return c;
 }
 function portalNotices(){
   const c=el("div");
   add(c,group("Mural de avisos","Todos os comunicados são criados para esta demonstração."),listNotices(M.view(state).notices));
   return c;
 }
 function portalEvents(){
   const c=el("div");add(c,group("Agenda estudantil","Clique para participar ou cancelar uma inscrição fictícia."),listEvents(M.view(state).events,true));return c;
 }
 function portalPoll(){
   const c=el("div");add(c,group("Enquete do Grêmio","O voto é somente local e não identifica estudantes."),pollView(M.view(state).poll));return c;
 }
 function portalSuggestions(){
   const c=el("div"),s=M.view(state);
   const msg=formField("suggestion","Sua ideia fictícia","textarea","Ex.: Podemos criar um mural cultural ilustrativo?",240);
   add(c,group("Envie uma ideia","O Painel Administrativo poderá aprovar ou arquivar esta sugestão de exemplo."),
     formSubmit("Enviar sugestão de demonstração",[msg],o=>action({type:"suggest",text:o.suggestion}),"Use apenas informações inventadas. Nenhuma mensagem é enviada à escola real."),
     group("Sugestões desta escola de exemplo","A lista é compartilhada entre Portal e Painel nesta aba."));
   const list=el("div","entry-list");
   s.suggestions.forEach(q=>{
     const box=el("article","panel-card"),head=el("div","card-top");
     add(head,el("h3","","Ideia de demonstração"),badge(q.status,q.status==="pendente"?"warn":""));
     add(box,head,el("p","",q.text));list.appendChild(box);
   });
   c.appendChild(list);return c;
 }
 function portalCard(){
   const c=el("div"),s=M.view(state),card=el("div","student-card");
   const top=el("div","top");add(top,label("IDENTIFICAÇÃO DE EXEMPLO"),label("DEMO · NÃO VÁLIDA"));
   const middle=el("div");add(middle,el("h3","","Estudante Demonstração"),el("p","",s.schoolName));
   const bottom=el("div","bottom");add(bottom,label("MATRÍCULA FICTÍCIA: DEMO-001"),label("SEM VALIDADE"));
   add(card,top,middle,bottom);
   add(c,group("Carteirinha ilustrativa","Não comprova vínculo escolar e não contém QR code ou matrícula real."),card);
   return c;
 }
 function portalStudies(){
   const c=el("div"),s=M.view(state);
   add(c,group("Materiais para conhecer a organização","Exemplos de tópicos; não há arquivos ou aulas reais nesta demonstração."));
   const list=el("ul","line-list");
   s.studies.forEach(x=>{const n=el("li");add(n,el("strong","",x),label("Conteúdo de amostra · sem arquivo para baixar"));list.appendChild(n);});
   c.appendChild(list);return c;
 }
 function adminNotices(){
   const c=el("div"),s=M.view(state);
   const title=formField("notice-title","Título do comunicado","input","Título fictício",80);
   const body=formField("notice-body","Mensagem","textarea","Aviso inventado para a escola selecionada",320);
   const cols=el("div","section-split");
   add(cols,formSubmit("Publicar aviso fictício",[title,body],o=>action({type:"new-notice",title:o["notice-title"],body:o["notice-body"]})),
     add(el("div"),group("Comunicados da escola","São exibidos também no Portal de demonstração."),listNotices(s.notices)));
   add(c,cols);return c;
 }
 function adminEvents(){
   const c=el("div"),s=M.view(state);
   const title=formField("event-title","Nome do evento","input","Oficina fictícia",80);
   const when=formField("event-when","Dia e horário de exemplo","input","Quinta, 15h (exemplo)",70);
   const where=formField("event-where","Local de exemplo","input","Sala fictícia",70);
   const cols=el("div","section-split");
   add(cols,formSubmit("Criar evento fictício",[title,when,where],o=>action({type:"new-event",title:o["event-title"],when:o["event-when"],where:o["event-where"]})),
     add(el("div"),group("Agenda da escola","Eventos de exemplo, sem reservas reais."),listEvents(s.events,false)));
   add(c,cols);return c;
 }
 function adminParticipation(){
   const c=el("div"),s=M.view(state);
   add(c,group("Enquete em destaque","Crie ou encerre uma enquete ilustrativa."),pollView(s.poll,true));
   const question=formField("poll-question","Pergunta","input","Que atividade fictícia você prefere?",120);
   const one=formField("poll-one","Alternativa 1","input","Feira cultural",60);
   const two=formField("poll-two","Alternativa 2","input","Oficina de arte",60);
   add(c,formSubmit("Criar nova enquete",[question,one,two],o=>action({type:"new-poll",question:o["poll-question"],options:[o["poll-one"],o["poll-two"]]}),"A nova enquete substituirá a atual apenas na escola fictícia selecionada."),
     group("Sugestões recebidas","Aprove ou arquive ideias enviadas pelo Portal nesta simulação."));
   const list=el("div","entry-list");
   s.suggestions.forEach(sug=>{
     const box=el("article","panel-card"),heading=el("div","card-top");
     add(heading,el("h3","","Sugestão estudantil de exemplo"),badge(sug.status,sug.status==="pendente"?"warn":""));
     add(box,heading,el("p","",sug.text));
     if(sug.status==="pendente"){
       const controls=el("div","row-buttons");
       add(controls,btn("Aprovar",()=>action({type:"moderate",id:sug.id,status:"aprovada"})),
         btn("Arquivar",()=>action({type:"moderate",id:sug.id,status:"arquivada"}),"button outline"));
       box.appendChild(controls);
     }
     list.appendChild(box);
   });
   c.appendChild(list);return c;
 }
 function adminStudents(){
   const c=el("div"),s=M.view(state);
   add(c,group("Solicitações de cadastro","Os perfis são inventados. Nenhuma conta ou permissão real é alterada."));
   const list=el("div","entry-list");
   s.students.forEach(x=>{
     const box=el("article","panel-card"),heading=el("div","card-top");
     add(heading,el("h3","",x.name),badge(x.status,x.status==="pendente"?"warn":""));
     add(box,heading,el("p","","Cadastro de exemplo — sem e-mail, senha, matrícula ou dados pessoais."));
     if(x.status==="pendente")box.appendChild(btn("Aprovar cadastro fictício",()=>action({type:"approve-student",id:x.id})));
     list.appendChild(box);
   });
   c.appendChild(list);return c;
 }
 function adminBoard(){
   const c=el("div"),s=M.view(state);
   add(c,group("Diretoria ilustrativa","Exemplo de organização. A troca real de cargos exigirá autorização e segurança."));
   const list=el("ul","line-list");
   s.board.forEach(x=>{
     const li=el("li");add(li,el("strong","",x.role),label(x.name));list.appendChild(li);
   });
   add(c,list,card("Recursos administrativos simulados","Não há edição de cargos, contas raiz, Firebase, regras de segurança, finanças reais nem eleições reais. Essas áreas dependem de uma futura implementação segura."));
   return c;
 }
 function contents(){
   if(state.section==="inicio")return overview();
   if(state.mode==="portal"){
     return ({avisos:portalNotices,eventos:portalEvents,enquetes:portalPoll,
       sugestoes:portalSuggestions,carteirinha:portalCard,estudos:portalStudies}[state.section]||overview)();
   }
   return ({comunicados:adminNotices,eventos:adminEvents,participacao:adminParticipation,
     cadastros:adminStudents,gestao:adminBoard}[state.section]||overview)();
 }
 function render(message=""){
   const s=M.view(state);
   document.documentElement.style.setProperty("--accent",s.color);
   $("school-select").value=state.schoolId;
   $("sidebar-school").textContent=s.schoolName;
   $("sidebar-gremio").textContent=s.gremioName;
   $("school-avatar").textContent=s.gremioName.charAt(0).toUpperCase();
   $("school-tag").textContent=state.schoolId==="escola-a"?"Escola A · fictícia":"Escola B · fictícia";
   const student=state.mode==="portal";
   $("role-student").classList.toggle("selected",student);
   $("role-student").setAttribute("aria-pressed",String(student));
   $("role-admin").classList.toggle("selected",!student);
   $("role-admin").setAttribute("aria-pressed",String(!student));
   $("menu-heading").textContent=student?"ÁREAS DO PORTAL":"ÁREAS DA GESTÃO";
   $("role-label").textContent=student?"VISÃO DO ESTUDANTE · FICTÍCIA":"VISÃO DA GESTÃO · FICTÍCIA";
   const menus=$("side-nav");menus.replaceChildren();
   M.MENU[state.mode].forEach(id=>{
     const b=btn((ICONS[id]||"◦")+"  "+MENU[id][0],()=>navTo(id),"nav-item");
     if(id===state.section){b.classList.add("active");b.setAttribute("aria-current","page");}
     menus.appendChild(b);
   });
   $("page-title").textContent=MENU[state.section][0];
   $("page-description").textContent=state.section==="inicio"
     ?student?"Explore conteúdos, eventos e participação fictícios.":"Veja e gerencie informações inventadas."
     :MENU[state.section][1]+" · conteúdo exclusivo de demonstração";
   root.replaceChildren(contents());
   flash(message);
 }
 $("school-select").addEventListener("change",e=>action({type:"school",value:e.target.value}));
 $("role-student").addEventListener("click",()=>action({type:"mode",value:"portal"}));
 $("role-admin").addEventListener("click",()=>action({type:"mode",value:"admin"}));
 $("reset-demo").addEventListener("click",()=>{
   if(window.confirm("Reiniciar os exemplos de ambas as escolas? Nada real será alterado."))
     action({type:"reset-all"});
 });
 $("reset-school").addEventListener("click",()=>{
   if(window.confirm("Reiniciar somente os exemplos desta escola fictícia?"))
     action({type:"reset-school"});
 });
 render();
})();
