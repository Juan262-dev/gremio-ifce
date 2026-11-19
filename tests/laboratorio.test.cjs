// Testes de cálculos didáticos: executados em Node sem Firebase.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const lab = require("../laboratorio-quimica.js");

test("tabela tem os 118 elementos, número atômico e símbolos únicos", () => {
  assert.equal(lab.elementos.length, 118);
  assert.equal(new Set(lab.elementos.map(e => e.simbolo)).size, 118);
  for (let i = 0; i < 118; i++) assert.equal(lab.elementos[i].z, i + 1);
  assert.equal(lab.elementos[0].simbolo, "H");
  assert.equal(lab.elementos[5].nome, "Carbono");
  assert.equal(lab.elementos[117].simbolo, "Og");
});

test("massa molar H2O, CO2, Ca(OH)2 e glicose", () => {
  assert.ok(Math.abs(lab.massaMolar("H2O").massa - 18.015) < 0.0001);
  assert.ok(Math.abs(lab.massaMolar("CO2").massa - 44.009) < 0.0001);
  assert.ok(Math.abs(lab.massaMolar("Ca(OH)2").massa - 74.092) < 0.0001);
  assert.ok(Math.abs(lab.massaMolar("C6H12O6").massa - 180.156) < 0.0001);
});

test("aceita agrupamentos e hidratos matemáticos sem manipulação física", () => {
  assert.ok(Math.abs(lab.massaMolar("CuSO4·5H2O").massa - 249.684) < 0.0001);
  assert.equal(lab.massaMolar("Al2(SO4)3").atomos.O, 12);
  assert.equal(lab.massaMolar("K4[Fe(CN)6]").atomos.N, 6);
});

test("rejeita fórmulas malformadas e elementos inexistentes", () => {
  for (const formula of ["", "Xx2", "Ca(OH2", "H2O)", "H0", "Na-1", "2H2O", "CuSO4·", "H99999", "h2O"]) {
    assert.throws(() => lab.massaMolar(formula), undefined, formula);
  }
});

test("quantidade, concentração e diluição verificam dados", () => {
  assert.ok(Math.abs(lab.quantidade(18.015, "H2O").mols - 1) < 0.0000001);
  assert.equal(lab.concentracao(0.5, 2), 0.25);
  assert.equal(lab.diluicao(2, 50, 0.5), 200);
  assert.throws(() => lab.quantidade(0, "H2O"));
  assert.throws(() => lab.concentracao(0.5, 0));
  assert.throws(() => lab.diluicao(1, 50, 2));
});
