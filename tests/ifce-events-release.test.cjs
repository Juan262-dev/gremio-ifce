const {test}=require("node:test");
const assert=require("node:assert/strict");
const {assertEventsReleased}=require("../functions/release-gate.cjs");
const {fortalezaDay,validISODate,counts}=require("../functions/event-service.cjs");
const good={
  eventosV2Habilitados:true,
  manutencao:false,
  painelCongelado:false,
  privacidadeMigracaoBloqueada:false
};
const snap=data=>({exists:true,data:()=>data});
test("sem documento ou autorização explícita as Functions NÃO atendem",()=>{
 assert.throws(()=>assertEventsReleased(null),/bloqueadas/);
 assert.throws(()=>assertEventsReleased({exists:false}),/bloqueadas/);
 assert.throws(()=>assertEventsReleased(snap({})),/bloqueadas/);
 assert.equal(assertEventsReleased(snap(good)),true);
 for(const key of ["eventosV2Habilitados","manutencao","painelCongelado","privacidadeMigracaoBloqueada"]){
  const unsafe={...good,[key]:key==="eventosV2Habilitados"?false:true};
  assert.throws(()=>assertEventsReleased(snap(unsafe)),/bloqueadas/,key);
  const missing={...good};delete missing[key];
  assert.throws(()=>assertEventsReleased(snap(missing)),/bloqueadas/,key);
 }
});
test("a data local de Fortaleza é ISO em qualquer instante UTC",()=>{
 assert.equal(fortalezaDay(new Date("2026-12-01T02:00:00Z")),"2026-11-30");
 assert.equal(fortalezaDay(new Date("2026-12-01T04:00:00Z")),"2026-12-01");
 for(const value of ["2026-11-21","2028-02-29","2099-01-01"])
  assert.equal(validISODate(value),true,value);
 for(const value of ["","21/11/2026","2026-02-29","2026-13-01","2099-1-1",null])
  assert.equal(validISODate(value),false,String(value));
});
test("contadores nunca aceitam fila em evento ilimitado ou vagas livres",()=>{
 assert.throws(()=>counts({vagas:0,esperaCount:1,proximaOrdem:2}),/Contagens/);
 assert.throws(()=>counts({vagas:2,inscritosCount:1,esperaCount:1,proximaOrdem:2}),/Contagens/);
 assert.deepEqual(counts({vagas:2,inscritosCount:2,esperaCount:1,proximaOrdem:3}),
  {vagas:2,inscritos:2,espera:1,seq:3});
});

test("contadores do servidor exigem quatro inteiros explícitos, sem coerção silenciosa",()=>{
 const correto={vagas:2,inscritosCount:1,esperaCount:0,proximaOrdem:1};
 assert.deepEqual(counts(correto),{vagas:2,inscritos:1,espera:0,seq:1});
 for(const campo of Object.keys(correto)){
   const ausente={...correto};delete ausente[campo];
   assert.throws(()=>counts(ausente),/Contagens ou vagas/,campo+" ausente");
   for(const invalido of [null,false,"0",NaN]){
     assert.throws(()=>counts({...correto,[campo]:invalido}),/Contagens ou vagas/,
       campo+" não-numérico");
   }
 }
 assert.deepEqual(counts({vagas:0,inscritosCount:0,esperaCount:0,proximaOrdem:0}),
   {vagas:0,inscritos:0,espera:0,seq:0});
});

