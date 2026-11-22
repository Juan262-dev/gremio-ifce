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
