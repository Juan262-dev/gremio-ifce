(function(root,factory){
  const api=factory();
  if(typeof module==="object" && module.exports)module.exports=api;
  else root.VerificadorDemoModel=api;
})(typeof window!=="undefined"?window:this,function(){
  "use strict";
  // Verificação LOCAL de configurações inventadas. NÃO consulta nem valida Firebase real.
  const scenarios={
    normal:{label:"Exemplo coerente",schools:{
      a:{portal:"demo-escola-a",admin:"demo-escola-a",url:"https://escola-a.example.invalid"},
      b:{portal:"demo-escola-b",admin:"demo-escola-b",url:"https://escola-b.example.invalid"}
    }},
    shared:{label:"Duas escolas compartilham um Firebase (erro)",schools:{
      a:{portal:"demo-escola-a",admin:"demo-escola-a",url:"https://escola-a.example.invalid"},
      b:{portal:"demo-escola-a",admin:"demo-escola-a",url:"https://escola-b.example.invalid"}
    }},
    mixed:{label:"Portal e Painel diferentes (erro)",schools:{
      a:{portal:"demo-escola-a",admin:"demo-outra-instancia",url:"https://escola-a.example.invalid"},
      b:{portal:"demo-escola-b",admin:"demo-escola-b",url:"https://escola-b.example.invalid"}
    }},
    origin:{label:"Projeto de origem do IFCE (erro)",schools:{
      a:{portal:"gremioifce-92540",admin:"gremioifce-92540",url:"https://escola-a.example.invalid"},
      b:{portal:"demo-escola-b",admin:"demo-escola-b",url:"https://escola-b.example.invalid"}
    }},
    url:{label:"Hospedagem insegura (erro)",schools:{
      a:{portal:"demo-escola-a",admin:"demo-escola-a",url:"http://escola-a.example.invalid"},
      b:{portal:"demo-escola-b",admin:"demo-escola-b",url:"https://escola-b.example.invalid"}
    }}
  };
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function example(name){
    return copy((Object.prototype.hasOwnProperty.call(scenarios,name)?scenarios[name]:scenarios.normal).schools);
  }
  function cleanInput(input){
    const out={a:{},b:{}};
    for(const school of ["a","b"]){
      for(const field of ["portal","admin","url"]){
        const value=input && input[school] && input[school][field];
        out[school][field]=typeof value==="string"?value.trim().slice(0,160):"";
      }
    }
    return out;
  }
  function check(input){
    const s=cleanInput(input);
    const a=s.a,b=s.b;
    const project=v=>/^demo-[a-z0-9](?:[a-z0-9-]{1,52}[a-z0-9])?$/.test(v)
      && !/ifce|gremioifce/i.test(v);
    const url=v=>{
      try{
        const u=new URL(v);
        return u.protocol==="https:" && u.username===""&&u.password==="" &&
          u.port===""&&u.search===""&&u.hash===""&&
          /^([a-z0-9-]+\.)+example\.invalid$/.test(u.hostname) &&
          (u.pathname==="/"||u.pathname==="");
      }catch{return false;}
    };
    const all=[a.portal,a.admin,b.portal,b.admin];
    const checks=[
      {id:"demo-ids",label:"Identificadores de projetos fictícios",passed:all.every(project),
        detail:"Aceita apenas IDs demo-* de exemplo; não aceita projetos reais ou o Firebase original."},
      {id:"one-project",label:"Portal e Painel de cada escola usam o mesmo projeto",passed:a.portal===a.admin && b.portal===b.admin && all.every(Boolean),
        detail:"Dentro de cada instituição, as duas interfaces precisam usar a mesma configuração validada."},
      {id:"school-isolation",label:"Projetos exclusivos entre escolas",passed:Boolean(a.portal&&b.portal&&a.portal!==b.portal),
        detail:"Escola A e Escola B nunca devem compartilhar o projeto Firebase."},
      {id:"safe-urls",label:"Endereços HTTPS reservados para demonstração",passed:url(a.url)&&url(b.url),
        detail:"Use somente domínios fictícios *.example.invalid, sem URLs públicas reais."},
      {id:"different-urls",label:"Endereços separados entre escolas",passed:a.url!==b.url && Boolean(a.url&&b.url),
        detail:"Instalações escolares devem ter hospedagem e escopo próprios."}
    ];
    const manual=[
      {id:"rights",label:"Licença, autoria pública e autorização das imagens",owner:"Mantenedores e direção",why:"O projeto público ainda não possui licença redistribuível confirmada."},
      {id:"privacy",label:"Privacidade de enquetes/eventos e dados de estudantes",owner:"Responsável por dados e equipe técnica",why:"É preciso corrigir a exposição potencial de e-mails e definir retenção/exclusão."},
      {id:"rules",label:"Security Rules testadas em Firebase Emulator",owner:"Responsável técnico",why:"O formulário não executa o emulador e não comprova regras implantadas."},
      {id:"bootstrap",label:"Primeiro administrador criado fora do navegador",owner:"Responsável técnico autorizado",why:"Contas privilegiadas e permissões precisam ser provisionadas em fluxo auditável."},
      {id:"cross-access",label:"Isolamento real entre duas instalações confirmado",owner:"Responsável técnico",why:"É preciso testar Auth, Firestore, Portal e Admin de A e B com dados fictícios."},
      {id:"backup",label:"Backup e restauração ensaiada com dados fictícios",owner:"Escola e responsável técnico",why:"A restauração deve ser testada e protegida antes da entrada em produção."},
      {id:"approval",label:"Homologação e aprovação institucional explícitas",owner:"Direção e responsáveis",why:"Um formulário nunca é autorização de publicação ou compartilhamento de dados."}
    ];
    const failures=checks.filter(c=>!c.passed);
    return {
      automatic:checks.map(c=>({...c,status:c.passed?"exemplo-coerente":"bloqueado"})),
      manual:manual.map(c=>({...c,status:"pendente"})),
      summary:{examplePassed:checks.length-failures.length,exampleTotal:checks.length,
        blocked:failures.length, pending:manual.length,
        status:failures.length?"BLOQUEADO":"PENDENTE",
        message:failures.length
          ?"Os exemplos contêm incompatibilidades. Revise os dados fictícios."
          :"Os exemplos passaram nos testes locais de formato. Isso NÃO valida Firebase real."},
      publication:{allowed:false,reason:"Instalação real indisponível: regras, privacidade, licença, provisionamento e homologação requerem implementação e avaliação humana."}
    };
  }
  return {scenarios,example,cleanInput,check};
});
