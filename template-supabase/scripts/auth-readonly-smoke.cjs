#!/usr/bin/env node
"use strict";
// Smoke test READ-ONLY de Supabase Auth + Data API para CONTA FICTÍCIA.
// Nunca imprime senha, chave, token ou dados pessoais. Não cria usuários.
// Não executar em ambiente de produção com conta real.
async function main(){
  if(process.env.RUN_REAL_AUTH_SMOKE!=="YES"){
    throw Error("Teste real não habilitado. Use somente ambiente de homologação e conta fictícia; defina RUN_REAL_AUTH_SMOKE=YES.");
  }
  const url=process.env.TEST_SUPABASE_URL||"";
  const key=process.env.TEST_SUPABASE_PUBLISHABLE_KEY||"";
  const email=process.env.TEST_EMAIL||"";
  const password=process.env.TEST_PASSWORD||"";
  const expected=process.env.EXPECTED_MEMBER_STATUS||"";
  if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(url)
    ||!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key)
    ||!/^\S+@\S+\.\S+$/.test(email) || process.env.TEST_ACCOUNT_FICTITIOUS!=="YES" // caixa de testes autorizada, nunca conta de aluno
    ||!password||!["approved","pending","blocked"].includes(expected)){
    throw Error("Configuração inválida. Use e-mail de teste autorizado, TEST_ACCOUNT_FICTITIOUS=YES, chave publishable e status esperado.");
  }
  const origin=new URL(url).origin;
  const headers={apikey:key,"Content-Type":"application/json"};
  async function request(path,options={}){
    const response=await fetch(origin+path,{
      ...options,headers:{...headers,...(options.headers||{})},signal:AbortSignal.timeout(10000)
    });
    const text=await response.text();
    let body=null;
    try{body=text?JSON.parse(text):null;}catch{throw Error("Servidor retornou conteúdo inválido");}
    return {status:response.status,body};
  }
  const anon=await request("/rest/v1/school_members?select=user_id&limit=1");
  if(![401,403].includes(anon.status))throw Error("Bloqueio de leitura anon não confirmado.");
  const login=await request("/auth/v1/token?grant_type=password",{
    method:"POST",body:JSON.stringify({email,password})
  });
  if(login.status!==200||!login.body?.access_token)throw Error("Falha de login com conta fictícia confirmada.");
  const jwt=login.body.access_token;
  const authHeaders={Authorization:"Bearer "+jwt};
  const who=await request("/auth/v1/user",{headers:authHeaders});
  if(who.status!==200||!who.body?.id||!who.body?.email_confirmed_at)
    throw Error("Conta não verificada ou token inválido.");
  if(who.body.email?.toLowerCase()!==email.toLowerCase())throw Error("Identidade do token divergente.");
  const query="?select=user_id,status&user_id=eq."+encodeURIComponent(who.body.id);
  const member=await request("/rest/v1/school_members"+query,{headers:authHeaders});
  if(member.status!==200||!Array.isArray(member.body)||member.body.length!==1
      ||member.body[0].user_id!==who.body.id||member.body[0].status!==expected)
    throw Error("Isolamento de cadastro/status não confirmado.");
  const notices=await request("/rest/v1/school_notices?select=id&limit=1",{headers:authHeaders});
  if(notices.status!==200||!Array.isArray(notices.body))throw Error("Leitura de avisos via RLS falhou.");
  if(expected!=="approved"&&notices.body.length!==0)throw Error("Conta pendente/bloqueada visualizou avisos.");
  process.stdout.write("OK: Auth confirmada, membro isolado, acesso anon negado e RLS de avisos coerente.\n");
}
main().catch(error=>{
  process.stderr.write("Falha no smoke test: "+error.message+"\n");
  process.exitCode=1;
});
