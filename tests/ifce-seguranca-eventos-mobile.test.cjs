const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const r=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const model=require('../admin-preparacao-2027.js');
test('diagnóstico não confunde sinalizadores com homologação, nem aceita projeto diferente',()=>{
 assert.equal(model.estadoImplantacao('outra-escola',{}).nivel,'erro');
 assert.equal(model.estadoImplantacao(model.PROJETO,null).nivel,'pendente');
 const ok={eventosV2Habilitados:true,manutencao:false,painelCongelado:false,privacidadeMigracaoBloqueada:false};
 assert.equal(model.estadoImplantacao(model.PROJETO,ok).nivel,'atencao');
 assert.match(model.estadoImplantacao(model.PROJETO,ok).texto,/NÃO comprova/);
 for(const key of Object.keys(ok)){const d={...ok};delete d[key];assert.equal(model.estadoImplantacao(model.PROJETO,d).nivel,'pendente');}
});
test('resumo de evento nunca transforma valores ausentes/inválidos em zero',()=>{
 const ok={privacidadeVersao:2,vagas:2,inscritosCount:2,esperaCount:1,proximaOrdem:3};
 assert.deepEqual(Object.assign({},model.resumoEvento(ok)),
   {valido:true,confirmados:2,aguardando:1,livres:0,texto:'2 confirmação(ões) • 1 aguardando • 0 vaga(s) livre(s)'});
 for(const input of [{...ok,inscritosCount:undefined},{...ok,esperaCount:-1},{...ok,vagas:1},{...ok,proximaOrdem:0},{...ok,vagas:0},{privacidadeVersao:1}]){
  const res=model.resumoEvento(input);
  assert.equal(res.valido,false);
  assert.equal(res.confirmados,null);
 }
 assert.equal(model.resumoEvento({...ok,vagas:0,esperaCount:0}).livres,null);
});
test('inventário de exclusão nunca se declara concluído',()=>{
 assert.equal(model.resumoExclusao({alunos:'presente'}).completo,false);
 assert.match(model.resumoExclusao({perfis:'indisponivel'}).texto,/Consulta parcial/);
});
test('HTML preserva identidade e fornece painéis acessíveis',()=>{
 const html=r('admin.html');
 assert.match(html,/admin-preparacao-2027\.js/);
 assert.match(html,/id="ti-implantacao-v2"[^>]*aria-live="polite"/);
 assert.match(html,/Verificar pendências/);
 assert.match(html,/Dia no calendário \(obrigatório\)/);
 assert.match(html,/id="lista-eventos-admin" aria-live="polite"/);
 assert.match(html,/card-title-chem/);
});

test('Portal informa conexão offline e erros de consultas com alertas acessíveis',()=>{
 const portal=r('index.html');
 assert.match(portal,/id="estado-conexao-portal"[^>]*role="status"[^>]*aria-live="polite"/);
 assert.match(portal,/function atualizarEstadoConexaoPortal\(\)/);
 assert.match(portal,/window\.addEventListener\('offline', atualizarEstadoConexaoPortal\)/);
 assert.match(portal,/navigator\.onLine === false/);
 assert.match(portal,/function ouvir\(query, cb, onError\)/);
 assert.match(portal,/ultimoAvisoConsulta > 12000/);
 assert.match(portal,/Enquetes indisponíveis agora/);
 assert.match(portal,/Eventos indisponíveis agora/);
 assert.match(portal,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(portal,/min-height:44px/);
});
test('TI impede exclusão parcial, pedidos falsamente concluídos e exclusão em massa',()=>{
 const ti=r('admin-07-ti.js'), adm4=r('admin-04-gestao-diretoria.js'),
   adm3=r('admin-03-alunos-punicoes.js'), adm6=r('admin-06-eleicao-eventos.js');
 const section=ti.slice(ti.indexOf('async function concluirExclusaoTI'),
   ti.indexOf('function carregarFontesTI'));
 assert.match(section,/conferirInventarioExclusao/);
 assert.doesNotMatch(section,/\.update\(|\.delete\(|\.set\(/);
 const inventory=adm4.slice(adm4.indexOf('async function conferirInventarioExclusao'),
   adm4.indexOf('function gerarRegrasNovoRaiz'));
 assert.match(inventory,/get\(\{ source: 'server' \}\)/);
 assert.doesNotMatch(inventory,/batch\.commit|\.delete\(|\.update\(/);
 assert.doesNotMatch(adm3.slice(adm3.indexOf('async function excluirAlunosBloqueados'),adm3.indexOf('function carregarPortalConfig')),/apagarEmLotes/);
 assert.match(adm6,/Exclusão direta bloqueada/);
});
test('Gestão de eventos apresenta contagem validada, relatório sem identidade e presença privada',()=>{
 const adm6=r('admin-06-eleicao-eventos.js');
 assert.match(adm6,/AdminPreparacao2027\.resumoEvento\(ev\)/);
 assert.match(adm6,/exportarResumoEvento/);
 assert.match(adm6,/contarPresencasEvento/);
 assert.match(adm6,/presencas_eventos/);
 const trechoPresencas = adm6.slice(adm6.indexOf('contarPresencasEvento: async'),
   adm6.indexOf('exportarInscritos: async'));
 assert.match(trechoPresencas,/\.collection\('alunos'\)\.count\(\)\.get\(\)/);
 assert.match(trechoPresencas,/Number\.isSafeInteger\(total\)/);
 assert.doesNotMatch(trechoPresencas,/\.collection\('alunos'\)\.get\(/);
 assert.match(adm6,/if \(!soRaiz\(\)\)/);
 assert.match(adm6,/confirmar\('A lista contém e-mails/);
});

test('Painel sinaliza dados incompletos e valida datas reais pelo calendário de Fortaleza',()=>{
 const ev={privacidadeVersao:2,vagas:1,inscritosCount:0,esperaCount:0,proximaOrdem:0};
 assert.equal(model.resumoEvento(ev).valido,true);
 const semVagas={...ev};delete semVagas.vagas;
 assert.equal(model.resumoEvento(semVagas).valido,false);
 assert.equal(model.resumoEvento({...ev,vagas:"0"}).valido,false);
 const viradaUTC=new Date('2026-11-30T02:30:00Z'); // 29/11 no Ceará
 assert.equal(model.dataEventoValida('2026-11-29',viradaUTC),true);
 assert.equal(model.dataEventoValida('2026-11-28',viradaUTC),false);
 assert.equal(model.dataEventoValida('2028-02-29',viradaUTC),true);
 assert.equal(model.dataEventoValida('2026-02-29',viradaUTC),false);
 assert.equal(model.dataEventoValida('2026-13-01',viradaUTC),false);
 assert.equal(model.dataEventoValida('',viradaUTC),false);
 assert.match(r('admin-06-eleicao-eventos.js'),/AdminPreparacao2027\.dataEventoValida\(dataISO\)/);
});

