const {test}=require("node:test");
const assert=require("node:assert/strict");
const adv=require("../laboratorio-avancado.js");
const lab=require("../laboratorio-quimica.js");

test("seis modelos moleculares possuem ligações e átomos válidos",()=>{
  assert.equal(adv.MODELOS.length,6);
  for(const m of adv.MODELOS){
    assert.ok(m.formula&&m.geometria&&m.descricao);
    assert.ok(m.atomos.length>=3);
    for(const [a,b,tipo] of m.ligacoes){
      assert.ok(a>=0&&a<m.atomos.length&&b>=0&&b<m.atomos.length);
      assert.ok([1,2,3].includes(tipo));
    }
  }
  const agua=adv.MODELOS.find(m=>m.id==="agua");
  assert.equal(agua.atomos.length,3);
  const co2=adv.MODELOS.find(m=>m.id==="co2");
  assert.equal(co2.geometria,"Linear");
});

test("rotação de molécula preserva distâncias 3D",()=>{
  const p=[1.2,0.5,-1.4];
  const d=Math.hypot(...p);
  for(const ax of [-180,-65,0,30,90,170])
    for(const ay of [-120,0,55,180]) {
      const v=adv.girarPonto(p,ax,ay);
      assert.ok(Math.abs(Math.hypot(...v)-d)<1e-10);
    }
});

test("balanceamento das cinco equações demonstra conservação de átomos",()=>{
  for(const eq of adv.EQUACOES){
    const resposta=adv.balanceamento(eq,eq.solucao);
    assert.equal(resposta.balanceada,true,eq.id);
    assert.deepEqual(Object.fromEntries(Object.entries(resposta.esquerda)),Object.fromEntries(Object.entries(resposta.direita)));
  }
});

test("coeficientes errados ou inválidos são detectados",()=>{
  const eq=adv.EQUACOES.find(e=>e.id==="agua");
  assert.equal(adv.balanceamento(eq,[1,1,1]).balanceada,false);
  assert.equal(adv.balanceamento(eq,[2,1,2]).balanceada,true);
  assert.throws(()=>adv.balanceamento(eq,[0,1,1]),/inteiro/);
  assert.throws(()=>adv.balanceamento(eq,[2,1,2.5]),/inteiro/);
  assert.throws(()=>adv.balanceamento(eq,[2,1]),/coeficientes/);
  assert.throws(()=>adv.balanceamento(eq,[13,1,1]),/inteiro/);
});

test("modelo pH ideal usa relação pH+pOH=14 e escala logarítmica",()=>{
  const neutro=adv.modeloPH(7);
  assert.equal(neutro.tipo,"Neutra");
  assert.equal(neutro.pOH,7);
  assert.ok(Math.abs(neutro.h-1e-7)<1e-16);
  assert.equal(adv.modeloPH(4).tipo,"Ácida");
  assert.equal(adv.modeloPH(10).tipo,"Básica");
  assert.ok(Math.abs(adv.modeloPH(6).h/adv.modeloPH(7).h-10)<1e-10);
  assert.equal(adv.modeloPH(0).h,1);
  assert.ok(Math.abs(adv.modeloPH(14).oh-1)<1e-15);
});

test("pH rejeita entradas fora do intervalo do simulador",()=>{
  for(const v of [-1,14.5,"","texto",null,Infinity,-Infinity,NaN]){
    assert.throws(()=>adv.modeloPH(v),undefined,String(v));
  }
});

test("missões têm perguntas completas com alternativas e gabarito válido",()=>{
  assert.deepEqual(adv.MISSOES.map(m=>m.id),["elementos","moleculas","calculos","reacoes"]);
  for(const m of adv.MISSOES){
    assert.equal(m.perguntas.length,3);
    for(const q of m.perguntas){
      assert.ok(q.p.length>10&&q.e.length>10);
      assert.equal(q.o.length,4);
      assert.ok(Number.isInteger(q.c)&&q.c>=0&&q.c<4);
      assert.ok(q.o[q.c]);
    }
  }
});

test("dados químicos usados em equações são reconhecidos pela calculadora existente",()=>{
  for(const eq of adv.EQUACOES)
    for(const f of [...eq.reagentes,...eq.produtos])assert.ok(lab.massaMolar(f).massa>0);
});
