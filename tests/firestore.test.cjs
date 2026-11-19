// Testes totalmente locais no Firestore Emulator; nunca apontar para produção.
const { before, after, beforeEach, test } = require('node:test');
const { readFileSync } = require('node:fs');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const {
  doc, setDoc, updateDoc, getDoc, runTransaction, serverTimestamp, Timestamp
} = require('firebase/firestore');

let env;
const aluno = 'estudante@aluno.ifce.edu.br';
const outro = 'outro@aluno.ifce.edu.br';
const presidente = 'presidencia@ifce.edu.br';
const emergency = 'plantao@ifce.edu.br';

const usuario = (email, uid = email, verificado = true) => env.authenticatedContext(uid, {
  email, email_verified: verificado, auth_time: Math.floor(Date.now() / 1000)
}).firestore();

async function gravarInicial(pares) {
  await env.withSecurityRulesDisabled(async contexto => {
    const db = contexto.firestore();
    for (const [caminho, dados] of pares) await setDoc(doc(db, caminho), dados);
  });
}
const cadastro = (email, nome) => [`alunos/${email}`, { email, nome, ativo: true, status: 'aprovado' }];

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-gremio-ifce',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') }
  });
});
beforeEach(async () => { await env.clearFirestore(); });
after(async () => { if (env) await env.cleanup(); });

test('Aluno pode solicitar cadastro pendente, mas não cadastrar outra pessoa', async () => {
  const db = usuario(aluno);
  await assertSucceeds(setDoc(doc(db, 'alunos', aluno), {
    nome: 'Aluno de Teste', email: aluno, ativo: false, status: 'pendente', criadoEm: serverTimestamp()
  }));
  await assertFails(setDoc(doc(db, 'alunos', outro), {
    nome: 'Outro Aluno', email: outro, ativo: false, status: 'pendente', criadoEm: serverTimestamp()
  }));
});

test('Presidência pode cadastrar e editar aluno, mas aluno não pode editar terceiros', async () => {
  await gravarInicial([['cargos/' + presidente, { nome: 'Presidente', nivel: 'admin' }], cadastro(aluno, 'Aluno Exemplo')]);
  const dbAdmin = usuario(presidente);
  const dbAluno = usuario(aluno);
  await assertSucceeds(setDoc(doc(dbAdmin, 'alunos', outro), {
    nome: 'Outro Aluno', email: outro, ativo: true, turma: '1A'
  }));
  await assertSucceeds(updateDoc(doc(dbAdmin, 'alunos', aluno), { turma: '2B' }));
  await assertFails(updateDoc(doc(dbAluno, 'alunos', outro), { turma: '3C' }));
});

test('Solicitação de material exige nome e e-mail do próprio aluno', async () => {
  await gravarInicial([
    cadastro(aluno, 'Aluno Exemplo'),
    ['materiais/m1', { nome: 'Livro', status: 'Disponível', emprestadoPara: '' }],
    ['materiais/m2', { nome: 'Livro 2', status: 'Disponível', emprestadoPara: '' }]
  ]);
  const db = usuario(aluno);
  await assertSucceeds(updateDoc(doc(db, 'materiais/m1'), {
    status: 'Solicitado', emprestadoPara: `Aluno Exemplo (${aluno})`
  }));
  await assertFails(updateDoc(doc(db, 'materiais/m2'), {
    status: 'Solicitado', emprestadoPara: `Outro Aluno (${outro})`
  }));
});

test('Inscrição preserva vagas e posição da lista de espera', async () => {
  await gravarInicial([
    cadastro(aluno, 'Aluno Exemplo'), cadastro(outro, 'Outro Aluno'),
    ['eventos/e1', { titulo: 'Evento de Teste', inscritos: [], espera: [], vagas: 1 }]
  ]);
  const dbAluno = usuario(aluno);
  const evento = doc(dbAluno, 'eventos/e1');
  await assertSucceeds(runTransaction(dbAluno, async t => {
    const d = await t.get(evento);
    t.update(evento, { inscritos: [...d.data().inscritos, aluno] });
  }));
  const db2 = usuario(outro);
  const evento2 = doc(db2, 'eventos/e1');
  await assertSucceeds(runTransaction(db2, async t => {
    const d = await t.get(evento2);
    t.update(evento2, { espera: [...d.data().espera, outro] });
  }));
  await assertFails(updateDoc(evento2, { inscritos: [outro], espera: [] }));
  await assertSucceeds(runTransaction(dbAluno, async t => {
    const d = await t.get(evento);
    t.update(evento, {
      inscritos: d.data().inscritos.filter(e => e !== aluno).concat([d.data().espera[0]]),
      espera: d.data().espera.slice(1)
    });
  }));
});

test('Enquete permite um voto válido e rejeita alteração do ID da opção', async () => {
  const base = {
    titulo: 'Enquete de Teste', ativa: true, votosAlunos: [], criadoEm: Timestamp.now(),
    opcoes: [{ id: 0, texto: 'A', votos: 0 }, { id: 1, texto: 'B', votos: 0 }]
  };
  await gravarInicial([cadastro(aluno, 'Aluno Exemplo'), cadastro(outro, 'Outro Aluno'), ['enquetes/en1', base]]);
  const enq = doc(usuario(aluno), 'enquetes/en1');
  await assertSucceeds(updateDoc(enq, {
    votosAlunos: [{ email: aluno, opcaoId: 1 }],
    opcoes: [{ id: 0, texto: 'A', votos: 0 }, { id: 1, texto: 'B', votos: 1 }]
  }));
  await assertFails(updateDoc(doc(usuario(outro), 'enquetes/en1'), {
    votosAlunos: [{ email: aluno, opcaoId: 1 }, { email: outro, opcaoId: 0 }],
    opcoes: [{ id: 99, texto: 'A', votos: 1 }, { id: 1, texto: 'B', votos: 1 }]
  }));
});

test('Voto exige cédula da eleição válida e transação atômica', async () => {
  const inicio = Timestamp.fromMillis(Date.now() - 300000);
  const fim = Timestamp.fromMillis(Date.now() + 300000);
  await gravarInicial([
    cadastro(aluno, 'Aluno Exemplo'),
    ['eleicoes/ele1', { nome: 'Eleição teste', inicio, fim, status: 'aberta' }],
    ['eleicoes/ele1/chapas/ch1', { nome: 'Chapa teste' }],
    ['cedulas/hash1', { eleicao: 'ele1', usada: false }]
  ]);
  const db = usuario(aluno);
  const ced = doc(db, 'cedulas/hash1');
  const voto = doc(db, 'votos/hash1');
  await assertSucceeds(runTransaction(db, async t => {
    const c = await t.get(ced);
    if (c.data().usada) throw Error('Cédula já usada');
    t.update(ced, { usada: true });
    t.set(voto, { eleicao: 'ele1', chapa: 'ch1', criadoEm: serverTimestamp() });
  }));
  await assertFails(getDoc(voto));
  await assertFails(setDoc(voto, { eleicao: 'ele1', chapa: 'ch1', criadoEm: serverTimestamp() }));
});

test('Verificação de e-mail impede acesso ao portal quando ativada', async () => {
  await gravarInicial([
    cadastro(aluno, 'Aluno Exemplo'),
    ['config/seguranca', { exigirEmailVerificado: true, sessoesDesdeSeg: 0 }],
    ['mural/m1', { titulo: 'Aviso', mensagem: 'Teste' }]
  ]);
  await assertFails(getDoc(doc(usuario(aluno, 'u1', false), 'mural/m1')));
  await assertSucceeds(getDoc(doc(usuario(aluno, 'u2', true), 'mural/m1')));
});

test('Conta de emergência só pode consultar cadastros pendentes', async () => {
  await gravarInicial([
    ['cargos/' + emergency, { nome: 'Plantão', nivel: 'emergencia' }],
    ['alunos/pendente@aluno.ifce.edu.br', {
      email: 'pendente@aluno.ifce.edu.br', nome: 'Pendente', ativo: false, status: 'pendente'
    }],
    cadastro(aluno, 'Aluno Exemplo')
  ]);
  const db = usuario(emergency);
  await assertSucceeds(getDoc(doc(db, 'alunos/pendente@aluno.ifce.edu.br')));
  await assertFails(getDoc(doc(db, 'alunos', aluno)));
});
