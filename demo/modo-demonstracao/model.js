(function(root,factory){
  const api=factory();
  if(typeof module==="object" && module.exports) module.exports=api;
  else root.GremioDemo=api;
})(typeof window!=="undefined"?window:this,function(){
  "use strict";
  // Apenas pessoas, instituições, eventos e dados inventados. NUNCA conectar a produção.
  const SCHOOL_IDS=["escola-a","escola-b"];
  const MENU={
    portal:["inicio","avisos","eventos","enquetes","sugestoes","carteirinha","estudos"],
    admin:["inicio","comunicados","eventos","participacao","cadastros","gestao"]
  };
  const FIXTURES={
    "escola-a":{
      id:"escola-a",schoolName:"Escola Horizonte (fictícia)",gremioName:"Grêmio Movimento",color:"#26694d",
      notices:[
        {id:"aviso-1",title:"Bem-vindos ao Grêmio!",body:"Este é um comunicado de exemplo criado apenas para o passeio pelo sistema.",date:"Demonstração"},
        {id:"aviso-2",title:"Reunião aberta de ideias",body:"Vamos conversar sobre projetos culturais e espaços de convivência fictícios.",date:"Demonstração"}
      ],
      events:[
        {id:"evento-1",title:"Oficina de cartazes",when:"Quinta, 14h (exemplo)",where:"Sala de projetos fictícia",registered:false},
        {id:"evento-2",title:"Roda de conversa",when:"Sexta, 10h (exemplo)",where:"Pátio de demonstração",registered:false}
      ],
      poll:{id:"poll-1",question:"Qual atividade fictícia vem primeiro?",options:["Feira cultural","Campeonato de jogos","Oficina de música"],votes:[3,2,1],voted:null,closed:false},
      suggestions:[{id:"sug-1",text:"Criar um mural de ideias para os estudantes da escola fictícia.",status:"pendente"}],
      students:[
        {id:"aluno-1",name:"Estudante Exemplo 01",status:"pendente"},
        {id:"aluno-2",name:"Estudante Exemplo 02",status:"aprovado"}
      ],
      board:[{role:"Presidência",name:"Pessoa Fictícia A"},{role:"Comunicação",name:"Pessoa Fictícia B"}],
      studies:["Roteiro de estudo ilustrativo","Guia de projetos estudantis"],
      sequence:3
    },
    "escola-b":{
      id:"escola-b",schoolName:"Colégio Aurora (fictício)",gremioName:"Grêmio Voz Ativa",color:"#345d86",
      notices:[
        {id:"aviso-1",title:"Semana de ideias",body:"Participe das atividades inventadas para apresentar o portal aos alunos.",date:"Demonstração"}
      ],
      events:[{id:"evento-1",title:"Clube de leitura",when:"Terça, 16h (exemplo)",where:"Biblioteca de exemplo",registered:false}],
      poll:{id:"poll-1",question:"Qual projeto de exemplo você prefere?",options:["Horta escolar","Clube de cinema"],votes:[4,3],voted:null,closed:false},
      suggestions:[{id:"sug-1",text:"Organizar uma troca fictícia de livros entre turmas.",status:"aprovada"}],
      students:[{id:"aluno-1",name:"Estudante Exemplo 03",status:"pendente"}],
      board:[{role:"Presidência",name:"Pessoa Fictícia C"},{role:"Cultura",name:"Pessoa Fictícia D"}],
      studies:["Leitura coletiva de exemplo"],
      sequence:3
    }
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  function freshState(){
    return {schoolId:"escola-a",mode:"portal",section:"inicio",schools:clone(FIXTURES)};
  }
  function view(state){return state.schools[state.schoolId];}
  function textInput(v,max,min=1){
    if(typeof v!=="string")return null;
    const s=v.trim().replace(/\s+/g," ");
    return s.length>=min && s.length<=max?s:null;
  }
  function edit(state,action){
    if(!state||!action||typeof action!=="object")return {ok:false,error:"Ação inválida."};
    const s=clone(state);
    if(action.type==="school"){
      if(!SCHOOL_IDS.includes(action.value))return {ok:false,error:"Escola fictícia inválida."};
      s.schoolId=action.value;s.mode="portal";s.section="inicio";
      return {ok:true,state:s};
    }
    if(action.type==="mode"){
      if(!MENU[action.value])return {ok:false,error:"Aplicativo inválido."};
      s.mode=action.value;s.section="inicio";
      return {ok:true,state:s};
    }
    if(action.type==="section"){
      if(!MENU[s.mode].includes(action.value))return {ok:false,error:"Seção indisponível na demonstração."};
      s.section=action.value;return {ok:true,state:s};
    }
    if(action.type==="reset-all")return {ok:true,state:freshState()};
    if(action.type==="reset-school"){
      s.schools[s.schoolId]=clone(FIXTURES[s.schoolId]);
      s.section="inicio";
      return {ok:true,state:s};
    }
    const school=view(s);
    // Operações são locais, em memória, restritas ao aplicativo fictício exibido.
    if(action.type==="register-event"){
      if(s.mode!=="portal")return {ok:false,error:"Ação disponível no Portal de demonstração."};
      const ev=school.events.find(x=>x.id===action.id);
      if(!ev)return {ok:false,error:"Evento fictício não encontrado."};
      ev.registered=!ev.registered;
      return {ok:true,state:s,message:ev.registered?"Inscrição fictícia confirmada.":"Inscrição fictícia desfeita."};
    }
    if(action.type==="vote"){
      if(s.mode!=="portal")return {ok:false,error:"Votação ilustrativa disponível no Portal."};
      const i=action.option;
      if(school.poll.closed||school.poll.voted!==null)return {ok:false,error:"Este voto fictício não pode ser repetido."};
      if(!Number.isInteger(i)||i<0||i>=school.poll.options.length)return {ok:false,error:"Opção de exemplo inválida."};
      school.poll.votes[i]+=1;school.poll.voted=i;
      return {ok:true,state:s,message:"Voto de demonstração registrado apenas nesta aba."};
    }
    if(action.type==="suggest"){
      if(s.mode!=="portal")return {ok:false,error:"Envie sugestões fictícias pelo Portal."};
      const content=textInput(action.text,240,8);
      if(!content)return {ok:false,error:"Escreva de 8 a 240 caracteres fictícios."};
      school.suggestions.unshift({id:"sug-"+school.sequence++,text:content,status:"pendente"});
      return {ok:true,state:s,message:"Sugestão fictícia enviada à fila do Painel."};
    }
    if(action.type==="new-notice"){
      if(s.mode!=="admin")return {ok:false,error:"Ação disponível no Painel ilustrativo."};
      const title=textInput(action.title,80,3),body=textInput(action.body,320,8);
      if(!title||!body)return {ok:false,error:"Aviso: título de 3 a 80 e texto de 8 a 320 caracteres."};
      school.notices.unshift({id:"aviso-"+school.sequence++,title,body,date:"Agora (simulado)"});
      return {ok:true,state:s,message:"Aviso publicado somente na escola fictícia selecionada."};
    }
    if(action.type==="new-event"){
      if(s.mode!=="admin")return {ok:false,error:"Ação disponível no Painel ilustrativo."};
      const title=textInput(action.title,80,3),when=textInput(action.when,70,3),where=textInput(action.where,70,3);
      if(!title||!when||!where)return {ok:false,error:"Evento: preencha título, horário fictício e local (3 a 70 caracteres)."};
      school.events.unshift({id:"evento-"+school.sequence++,title,when,where,registered:false});
      return {ok:true,state:s,message:"Evento fictício criado. Veja o Portal para participar."};
    }
    if(action.type==="moderate"){
      if(s.mode!=="admin")return {ok:false,error:"Ação disponível no Painel ilustrativo."};
      const suggestion=school.suggestions.find(x=>x.id===action.id);
      if(!suggestion||suggestion.status!=="pendente"||!["aprovada","arquivada"].includes(action.status))
        return {ok:false,error:"Sugestão pendente inválida."};
      suggestion.status=action.status;
      return {ok:true,state:s,message:"Sugestão fictícia "+action.status+"."};
    }
    if(action.type==="approve-student"){
      if(s.mode!=="admin")return {ok:false,error:"Ação disponível no Painel ilustrativo."};
      const student=school.students.find(x=>x.id===action.id);
      if(!student||student.status!=="pendente")return {ok:false,error:"Cadastro pendente inexistente."};
      student.status="aprovado";
      return {ok:true,state:s,message:"Cadastro fictício aprovado apenas no simulador."};
    }
    if(action.type==="new-poll"){
      if(s.mode!=="admin")return {ok:false,error:"Ação disponível no Painel ilustrativo."};
      const question=textInput(action.question,120,8);
      if(!Array.isArray(action.options)||action.options.length<2||action.options.length>4||!question)
        return {ok:false,error:"Enquete: pergunta de 8 a 120 caracteres e 2 a 4 opções."};
      const opts=action.options.map(v=>textInput(v,60,2));
      if(opts.some(v=>!v)||new Set(opts.map(v=>v.toLowerCase())).size!==opts.length)
        return {ok:false,error:"Informe opções fictícias distintas, de 2 a 60 caracteres."};
      school.poll={id:"poll-"+school.sequence++,question,options:opts,votes:opts.map(()=>0),voted:null,closed:false};
      return {ok:true,state:s,message:"Enquete de demonstração disponível no Portal."};
    }
    if(action.type==="close-poll"){
      if(s.mode!=="admin"||school.poll.closed)return {ok:false,error:"Esta enquete não pode ser encerrada."};
      school.poll.closed=true;
      return {ok:true,state:s,message:"Enquete fictícia encerrada."};
    }
    return {ok:false,error:"Ação não reconhecida."};
  }
  function summary(s){
    const school=view(s);
    return {
      notices:school.notices.length,
      events:school.events.length,
      pendingSuggestions:school.suggestions.filter(x=>x.status==="pendente").length,
      pendingStudents:school.students.filter(x=>x.status==="pendente").length,
      registrations:school.events.filter(x=>x.registered).length
    };
  }
  return {SCHOOL_IDS,MENU,FIXTURES,freshState,view,edit,summary};
});
