// Firestore Emulator isolado. Não usa Firebase real nem alunos reais.
const {before,after,beforeEach,test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {initializeTestEnvironment,assertSucceeds,assertFails}=require("@firebase/rules-unit-testing");
const {doc,setDoc,updateDoc,getDoc,getDocs,collection,query,where,limit,deleteDoc,serverTimestamp,Timestamp}=require("firebase/firestore");
let env;
const adminUid="diretora-demo",one="estudante-demo-a",other="estudante-demo-b";
const ctx=(uid,verified=true)=>env.authenticatedContext(uid,{email:uid+"@example.invalid",email_verified:verified}).firestore();
async function seed(items){
  await env.withSecurityRulesDisabled(async c=>{
    for(const [key,data] of items)await setDoc(doc(c.firestore(),key),data);
  });
}
const adminRole=["roles/"+adminUid,{role:"admin",active:true}];
const member=uid=>["members/"+uid,{displayName:"Estudante Fictício",status:"approved",createdAt:Timestamp.now()}];
const notice=["notices/aviso-1",{title:"Aviso de teste",body:"Conteúdo público aos aprovados",createdAt:Timestamp.now()}];
const event=["events/evento-1",{title:"Evento de teste",details:"Atividade fictícia",when:"Quarta, 14h",location:"Sala exemplo",createdAt:Timestamp.now()}];
const poll=["polls/enquete-1",{question:"Que atividade de exemplo você prefere?",options:["Feira","Música"],active:true,createdAt:Timestamp.now()}];

before(async()=>{
  env=await initializeTestEnvironment({
    projectId:"demo-gremio-escola-teste",
    firestore:{host:"127.0.0.1",port:8081,rules:readFileSync("template-escolas/firestore.rules","utf8")}
  });
});
beforeEach(async()=>env.clearFirestore());
after(async()=>{if(env)await env.cleanup();});

test("cadastro começa pendente, verificado e somente no próprio UID",async()=>{
  await assertSucceeds(setDoc(doc(ctx(one),"members",one),{displayName:"Estudante de exemplo",status:"pending",createdAt:serverTimestamp()}));
  await assertFails(setDoc(doc(ctx(other,false),"members",other),{displayName:"Outro exemplo",status:"pending",createdAt:serverTimestamp()}));
  await assertFails(setDoc(doc(ctx(one),"members",other),{displayName:"Outro exemplo",status:"pending",createdAt:serverTimestamp()}));
  await assertFails(setDoc(doc(ctx(one),"members","outro-id"),{displayName:"Outro exemplo",status:"approved",createdAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(ctx(one),"members",one),{status:"approved"}));
});
test("cargo de administrador nunca pode ser criado ou alterado pelo cliente",async()=>{
  await seed([adminRole]);
  await assertFails(setDoc(doc(ctx(one),"roles",one),{role:"admin",active:true}));
  await assertFails(setDoc(doc(ctx(adminUid),"roles",one),{role:"admin",active:true}));
  await assertFails(updateDoc(doc(ctx(adminUid),"roles",adminUid),{active:false}));
  await assertSucceeds(getDoc(doc(ctx(adminUid),"roles",adminUid)));
});
test("alunos pendentes e não verificados não leem publicações; aprovados leem",async()=>{
  await seed([adminRole,member(one),notice,event,poll]);
  await assertSucceeds(getDoc(doc(ctx(one),"notices/aviso-1")));
  await assertSucceeds(getDocs(collection(ctx(one),"events")));
  await assertFails(getDoc(doc(ctx(other),"notices/aviso-1")));
  await assertFails(getDoc(doc(ctx(one,false),"notices/aviso-1")));
  await assertFails(getDocs(collection(ctx(other),"polls")));
  await assertSucceeds(getDoc(doc(ctx(adminUid),"notices/aviso-1")));
});
test("gestor autoriza cadastro sem poder alterar campos privados ou cargos",async()=>{
  await seed([adminRole,["members/"+one,{displayName:"Pessoa Exemplo",status:"pending",createdAt:Timestamp.now()}]]);
  await assertSucceeds(updateDoc(doc(ctx(adminUid),"members",one),{status:"approved"}));
  await assertFails(updateDoc(doc(ctx(one),"members",one),{status:"blocked"}));
  await assertFails(updateDoc(doc(ctx(adminUid),"members",one),{displayName:"Outro nome"}));
});
test("documentos coletivos rejeitam listas de e-mails e gravadores sem cargo",async()=>{
  await seed([adminRole,member(one)]);
  const good={title:"Novo aviso",body:"Conteúdo fictício",createdAt:serverTimestamp()};
  await assertSucceeds(setDoc(doc(ctx(adminUid),"notices/new"),good));
  await assertFails(setDoc(doc(ctx(one),"notices/user"),good));
  await assertFails(setDoc(doc(ctx(adminUid),"notices/leak"),{...good,emails:["aluno@example.invalid"]}));
  await assertFails(setDoc(doc(ctx(adminUid),"events/leak"),{title:"Evento",details:"Atividade",when:"Amanhã",location:"Sala",createdAt:serverTimestamp(),inscritos:["aluno@example.invalid"]}));
  await assertFails(setDoc(doc(ctx(adminUid),"polls/leak"),{question:"Qual a atividade?",options:["Arte","Leitura"],active:true,createdAt:serverTimestamp(),votosAlunos:["aluno@example.invalid"]}));
});
test("inscrições são privadas por UID: leitura cruzada e listagem estudantil negadas",async()=>{
  await seed([adminRole,member(one),member(other),event]);
  const ref=doc(ctx(one),"events/evento-1/registrations/"+one);
  await assertSucceeds(setDoc(ref,{uid:one,createdAt:serverTimestamp()}));
  await assertFails(getDoc(doc(ctx(other),"events/evento-1/registrations/"+one)));
  await assertFails(getDocs(collection(ctx(other),"events/evento-1/registrations")));
  await assertFails(setDoc(doc(ctx(other),"events/evento-1/registrations/"+one),{uid:one,createdAt:serverTimestamp()}));
  await assertSucceeds(getDoc(doc(ctx(adminUid),"events/evento-1/registrations/"+one)));
  await assertSucceeds(deleteDoc(ref));
});
test("votos por UID são privados, únicos, válidos e não alteráveis",async()=>{
  await seed([adminRole,member(one),member(other),poll]);
  const vote=doc(ctx(one),"polls/enquete-1/votes/"+one);
  await assertSucceeds(setDoc(vote,{uid:one,optionId:1,createdAt:serverTimestamp()}));
  await assertFails(setDoc(vote,{uid:one,optionId:0,createdAt:serverTimestamp()}));
  await assertFails(deleteDoc(vote));
  await assertFails(getDoc(doc(ctx(other),"polls/enquete-1/votes/"+one)));
  await assertFails(getDocs(collection(ctx(other),"polls/enquete-1/votes")));
  await assertFails(setDoc(doc(ctx(other),"polls/enquete-1/votes/"+other),{uid:other,optionId:9,createdAt:serverTimestamp()}));
  await assertSucceeds(getDoc(doc(ctx(adminUid),"polls/enquete-1/votes/"+one)));
});
test("coleções não previstas e bootstrap ficam bloqueados para qualquer conta",async()=>{
  await seed([adminRole,member(one)]);
  await assertFails(getDoc(doc(ctx(adminUid),"system/bootstrap")));
  await assertFails(setDoc(doc(ctx(adminUid),"system/bootstrap"),{uid:adminUid}));
  await assertFails(setDoc(doc(ctx(adminUid),"caixa/registro"),{valor:1}));
  await assertFails(getDoc(doc(ctx(one),"caixa/registro")));
});

test("enquetes rejeitam opções com dados estruturados, duplicadas ou excessivas",async()=>{
  await seed([adminRole]);
  const ref=doc(ctx(adminUid),"polls/invalid");
  const basic={question:"Qual atividade deseja?",active:true,createdAt:serverTimestamp()};
  await assertFails(setDoc(ref,{...basic,options:["Arte",{email:"aluno@example.invalid"}]}));
  await assertFails(setDoc(ref,{...basic,options:["Mesmo","Mesmo"]}));
  await assertFails(setDoc(ref,{...basic,options:["Arte","x".repeat(81)]}));
  await assertSucceeds(setDoc(ref,{...basic,options:["Arte","Leitura","Música"]}));
});

test("sugestões: aluno somente cria e lê as próprias; não se autoaprova",async()=>{
  await seed([adminRole,member(one),member(other)]);
  const student=ctx(one),another=ctx(other),manager=ctx(adminUid);
  const mine=doc(student,"suggestions/s1");
  await assertSucceeds(setDoc(mine,{ownerUid:one,body:"Criar uma feira cultural de exemplo.",status:"pending",createdAt:serverTimestamp()}));
  await assertFails(getDoc(doc(another,"suggestions/s1")));
  await assertFails(getDocs(collection(another,"suggestions")));
  await assertSucceeds(getDocs(
    query(collection(student,"suggestions"),where("ownerUid","==",one),limit(20))
  ));
  await assertFails(updateDoc(mine,{status:"approved"}));
  await assertFails(setDoc(doc(another,"suggestions/forged"),{
    ownerUid:one,body:"Sugestão forjada",status:"pending",createdAt:serverTimestamp()
  }));
  await assertFails(setDoc(doc(ctx("pendente"),"suggestions/pending"),{
    ownerUid:"pendente",body:"Sem aprovação",status:"pending",createdAt:serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(manager,"suggestions/s1"),{status:"approved"}));
  await assertFails(updateDoc(doc(manager,"suggestions/s1"),{body:"Texto adulterado"}));
  await assertFails(deleteDoc(doc(manager,"suggestions/s1")));
});

test("dois projetos do emulador: mesmo UID não transfere cargo ou cadastro entre escolas",async()=>{
  // Mesmo endpoint local, bancos/projetos distintos, sem dados reais.
  const projectB=await initializeTestEnvironment({
    projectId:"demo-colegio-independente-b",
    firestore:{host:"127.0.0.1",port:8081,rules:readFileSync("template-escolas/firestore.rules","utf8")}
  });
  try{
    await seed([adminRole,member(one),notice]);
    await projectB.clearFirestore();
    const bAdmin=projectB.authenticatedContext(adminUid,{
      email:adminUid+"@example.invalid",email_verified:true
    }).firestore();
    const bStudent=projectB.authenticatedContext(one,{
      email:one+"@example.invalid",email_verified:true
    }).firestore();
    await assertFails(getDoc(doc(bAdmin,"notices/aviso-1")));
    await assertFails(getDocs(collection(bStudent,"notices")));
    await assertFails(setDoc(doc(bAdmin,"notices/new"),{
      title:"Tentativa",body:"Acesso cruzado bloqueado",createdAt:serverTimestamp()
    }));
    await projectB.withSecurityRulesDisabled(async c=>{
      const db=c.firestore();
      await setDoc(doc(db,"members",one),{
        displayName:"Cadastro só da escola B",status:"approved",createdAt:Timestamp.now()
      });
      await setDoc(doc(db,"notices","aviso-b"),{
        title:"Somente escola B",body:"Conteúdo isolado",createdAt:Timestamp.now()
      });
    });
    await assertSucceeds(getDoc(doc(bStudent,"notices/aviso-b")));
    await assertFails(getDoc(doc(ctx(one),"notices/aviso-b")));
    await assertFails(getDoc(doc(bAdmin,"notices/aviso-b")));
  }finally{await projectB.cleanup();}
});
