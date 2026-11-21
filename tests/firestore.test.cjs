// Testes totalmente locais no Firestore Emulator; nunca apontar para produção.
const { before, after, beforeEach, test } = require('node:test');
const { readFileSync } = require('node:fs');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const {
  doc, setDoc, updateDoc, getDoc, getDocs, query, collection, where, deleteDoc, runTransaction, serverTimestamp, Timestamp
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

test('Evento v2: publicações sem PII, inscrições privadas e sem escrita direta', async () => {
  await gravarInicial([
    cadastro(aluno, 'Aluno Exemplo'), cadastro(outro, 'Outro Aluno'),
    ['cargos/' + presidente, { nome: 'Presidente', nivel: 'admin' }],
    ['eventos/e1', { titulo: 'Evento de Teste', privacidadeVersao: 2,
      inscritosCount: 1, esperaCount: 0, vagas: 2 }],
    ['eventos/e1/inscricoes/' + aluno, {status:'registered',order:0}]
  ]);
  const dbAluno=usuario(aluno),dbOutro=usuario(outro),dbAdmin=usuario(presidente);
  await assertSucceeds(getDoc(doc(dbAluno,'eventos/e1')));
  await assertSucceeds(getDocs(query(collection(dbAluno,'eventos'),where('privacidadeVersao','==',2))));
  await assertSucceeds(getDoc(doc(dbAluno,'eventos/e1/inscricoes/'+aluno)));
  await assertFails(getDoc(doc(dbOutro,'eventos/e1/inscricoes/'+aluno)));
  await assertFails(getDocs(collection(dbAluno,'eventos/e1/inscricoes')));
  await assertSucceeds(getDocs(collection(dbAdmin,'eventos/e1/inscricoes')));
  await assertFails(setDoc(doc(dbAluno,'eventos/e1/inscricoes/'+outro),{status:'registered'}));
  await assertFails(updateDoc(doc(dbAluno,'eventos/e1'),{inscritos:[aluno]}));
});

test('Enquete v2: voto privado e contagem atômica, sem expor e-mails', async () => {
  const base = {
    titulo: 'Enquete de Teste', ativa: true, privacidadeVersao: 2, criadoEm: Timestamp.now(),
    opcoes: [{ id: 0, texto: 'A', votos: 0 }, { id: 1, texto: 'B', votos: 0 }]
  };
  await gravarInicial([cadastro(aluno, 'Aluno Exemplo'), cadastro(outro, 'Outro Aluno'), ['enquetes/en1', base]]);
  const dbAluno = usuario(aluno), enquete = doc(dbAluno,'enquetes/en1');
  const voto = doc(dbAluno,'enquetes/en1/votos/'+aluno);
  await assertSucceeds(getDoc(enquete));
  await assertFails(setDoc(voto, { opcaoId: 1, criadoEm: serverTimestamp() }));
  await assertSucceeds(runTransaction(dbAluno, async t => {
    const e = await t.get(enquete);
    t.update(enquete, {
      opcoes: e.data().opcoes.map(op => op.id === 1 ? { ...op, votos: op.votos + 1 } : op)
    });
    t.set(voto, { opcaoId: 1, criadoEm: serverTimestamp() });
  }));
  await assertSucceeds(getDoc(voto));
  await assertFails(getDoc(doc(usuario(outro),'enquetes/en1/votos/'+aluno)));
  await assertFails(getDocs(collection(dbAluno,'enquetes/en1/votos')));
  await assertFails(updateDoc(enquete, {
    opcoes: [{ id: 0, texto: 'A', votos: 7 }, { id: 1, texto: 'B', votos: 1 }]
  }));
  await assertFails(setDoc(voto, { opcaoId: 0, criadoEm: serverTimestamp() }));
  const queryV2 = query(collection(dbAluno,'enquetes'),where('privacidadeVersao','==',2));
  await assertSucceeds(getDocs(queryV2));
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

test('Carteirinha: aluno ativo emite, consulta e renova somente a própria', async () => {
  await gravarInicial([cadastro(aluno, 'Aluno Exemplo'), cadastro(outro, 'Outro Aluno')]);
  const db = usuario(aluno);
  const ref = doc(db, 'carteirinhas', aluno);
  const codigo1 = 'a'.repeat(64);
  const codigo2 = 'b'.repeat(64);
  await assertSucceeds(setDoc(ref, { codigo: codigo1, criadoEm: serverTimestamp() }));
  const emitida = await assertSucceeds(getDoc(ref));
  if (emitida.data().codigo !== codigo1) throw Error('Código emitido incorreto');
  await assertFails(getDoc(doc(db, 'carteirinhas', outro)));
  await assertFails(setDoc(doc(db, 'carteirinhas', outro), { codigo: codigo2, criadoEm: serverTimestamp() }));
  await assertFails(updateDoc(ref, { codigo: 'curto', criadoEm: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { codigo: codigo2, criadoEm: serverTimestamp() }));
  const renovada = await assertSucceeds(getDoc(ref));
  if (renovada.data().codigo !== codigo2) throw Error('Renovação não gravada');
  await assertSucceeds(deleteDoc(ref));
});

test('Carteirinha: consulta por código restrita à Presidência e TI', async () => {
  await gravarInicial([
    cadastro(aluno, 'Aluno Exemplo'),
    ['cargos/' + presidente, { nome: 'Presidente', nivel: 'admin' }],
    ['carteirinhas/' + aluno, { codigo: 'c'.repeat(64), criadoEm: Timestamp.now() }]
  ]);
  const studentDB = usuario(aluno);
  const adminDB = usuario(presidente);
  const buscaAluno = query(collection(studentDB, 'carteirinhas'), where('codigo', '==', 'c'.repeat(64)));
  const buscaAdmin = query(collection(adminDB, 'carteirinhas'), where('codigo', '==', 'c'.repeat(64)));
  await assertFails(getDocs(buscaAluno));
  const lista = await assertSucceeds(getDocs(buscaAdmin));
  if (lista.size !== 1) throw Error('Carteirinha não localizada pelo código');
  await assertSucceeds(getDoc(doc(adminDB, 'carteirinhas', aluno)));
});

test('Carteirinha: aluno bloqueado não pode emitir código', async () => {
  await gravarInicial([['alunos/' + aluno, { email: aluno, nome: 'Aluno Bloqueado', ativo: false }]]);
  const db = usuario(aluno);
  await assertFails(setDoc(doc(db, 'carteirinhas', aluno), {
    codigo: 'd'.repeat(64), criadoEm: serverTimestamp()
  }));
});

test('Presença: só Presidência registra pessoa realmente inscrita, uma vez', async () => {
  await gravarInicial([
    cadastro(aluno, 'Aluno Exemplo'), cadastro(outro, 'Outro Aluno'),
    ['cargos/' + presidente, { nome: 'Presidente', nivel: 'admin' }],
    ['eventos/eventoCarteira', { titulo: 'Oficina', privacidadeVersao: 2, inscritosCount: 1, esperaCount: 1, vagas: 1 }],
    ['eventos/eventoCarteira/inscricoes/' + aluno, {uid:aluno,email:aluno,status:'registered',order:null}],
    ['eventos/eventoCarteira/inscricoes/' + outro, {uid:outro,email:outro,status:'waitlisted',order:1}]
  ]);
  const dbAdmin = usuario(presidente);
  const dbAluno = usuario(aluno);
  const presenca = doc(dbAdmin, 'presencas_eventos', 'eventoCarteira', 'alunos', aluno);
  const outroNaEspera = doc(dbAdmin, 'presencas_eventos', 'eventoCarteira', 'alunos', outro);
  const dados = { email: aluno, uid: aluno, conferidoPor: presidente, conferidoEm: serverTimestamp() };
  await assertFails(setDoc(doc(dbAluno, 'presencas_eventos', 'eventoCarteira', 'alunos', aluno), dados));
  await assertFails(setDoc(outroNaEspera, { email: outro, uid: outro, conferidoPor: presidente, conferidoEm: serverTimestamp() }));
  await assertFails(setDoc(presenca, { email: outro, uid: outro, conferidoPor: presidente, conferidoEm: serverTimestamp() }));
  await assertSucceeds(setDoc(presenca, dados));
  await assertSucceeds(getDoc(presenca));
  await assertFails(setDoc(presenca, dados));
  await assertFails(getDoc(doc(dbAluno, 'presencas_eventos', 'eventoCarteira', 'alunos', aluno)));
});

test('Laboratório: Presidência cria rascunho e aluno só lê publicado', async () => {
  await gravarInicial([
    cadastro(aluno, 'Aluno Exemplo'),
    ['cargos/' + presidente, { nome: 'Presidência', nivel: 'admin' }]
  ]);
  const dbAdmin = usuario(presidente);
  const dbAluno = usuario(aluno);
  const ref = doc(dbAdmin, 'laboratorio_conteudos', 'conteudo1');
  const dados = {
    titulo: 'Tabela periódica',
    assunto: 'Química Geral',
    descricao: 'Estude os elementos e suas famílias químicas.',
    link: 'https://example.org/curso',
    publicado: false,
    criadoEm: serverTimestamp()
  };
  await assertSucceeds(setDoc(ref, dados));
  await assertFails(getDoc(doc(dbAluno, 'laboratorio_conteudos', 'conteudo1')));
  await assertFails(getDocs(collection(dbAluno, 'laboratorio_conteudos')));
  await assertSucceeds(updateDoc(ref, { publicado: true, atualizadoEm: serverTimestamp() }));
  await assertSucceeds(getDoc(doc(dbAluno, 'laboratorio_conteudos', 'conteudo1')));
  const publicados = query(collection(dbAluno, 'laboratorio_conteudos'), where('publicado', '==', true));
  const lista = await assertSucceeds(getDocs(publicados));
  if (lista.size !== 1) throw Error('Conteúdo publicado não listado');
  await assertFails(updateDoc(doc(dbAluno, 'laboratorio_conteudos', 'conteudo1'), {
    titulo: 'Alterado por estudante', atualizadoEm: serverTimestamp()
  }));
});

test('Laboratório: alunos não publicam e administradores não alteram autoria', async () => {
  await gravarInicial([
    cadastro(aluno, 'Aluno Exemplo'),
    ['cargos/' + presidente, { nome: 'Presidência', nivel: 'admin' }]
  ]);
  const dbAdmin = usuario(presidente);
  const dbAluno = usuario(aluno);
  const dados = {
    titulo: 'Ligações químicas',
    assunto: 'Química Geral',
    descricao: 'Entenda ligações iônicas e covalentes por meio de modelos.',
    link: '',
    publicado: false,
    criadoEm: serverTimestamp()
  };
  await assertFails(setDoc(doc(dbAluno, 'laboratorio_conteudos', 'invasor'), {
    ...dados, criadoPor: aluno
  }));
  const ref = doc(dbAdmin, 'laboratorio_conteudos', 'valido');
  await assertSucceeds(setDoc(ref, dados));
  await assertFails(updateDoc(ref, { criadoPor: aluno, atualizadoEm: serverTimestamp() }));
  await assertFails(updateDoc(ref, { titulo: 'Editado sem data' }));
  await assertFails(setDoc(doc(dbAdmin, 'laboratorio_conteudos', 'inseguro'), {
    ...dados, link: 'javascript:alert(1)'
  }));
  await assertSucceeds(updateDoc(ref, {
    descricao: 'Atualização do resumo sobre ligações químicas.',
    atualizadoEm: serverTimestamp()
  }));
  await assertSucceeds(deleteDoc(ref));
});


test("Laboratório: aluno ativo salva e consulta apenas o próprio progresso", async () => {
  await gravarInicial([cadastro(aluno,"Aluno Teste"),cadastro(outro,"Outro Estudante"),["cargos/"+presidente,{nome:"Presidência",nivel:"admin"}]]);
  const dbAluno=usuario(aluno), dbOutro=usuario(outro), dbAdmin=usuario(presidente);
  const ref=doc(dbAluno,"laboratorio_progresso",aluno);
  await assertSucceeds(setDoc(ref,{concluidas:["elementos"],atualizadoEm:serverTimestamp()}));
  const docProgresso=await assertSucceeds(getDoc(ref));
  if (!docProgresso.exists() || !docProgresso.data().concluidas.includes("elementos")) throw Error("Progresso privado não foi salvo.");
  await assertSucceeds(updateDoc(ref,{concluidas:["elementos","moleculas"],atualizadoEm:serverTimestamp()}));
  await assertSucceeds(getDoc(ref));
  await assertFails(getDoc(doc(dbOutro,"laboratorio_progresso",aluno)));
  await assertFails(getDoc(doc(dbAdmin,"laboratorio_progresso",aluno)));
  await assertFails(getDocs(collection(dbAluno,"laboratorio_progresso")));
  await assertFails(getDocs(collection(dbAdmin,"laboratorio_progresso")));
  await assertFails(setDoc(doc(dbAluno,"laboratorio_progresso",outro),{
    concluidas:["elementos"],atualizadoEm:serverTimestamp()
  }));
  await assertSucceeds(deleteDoc(ref));
});

test("Laboratório: rejeita campos pessoais, respostas e progresso adulterado", async () => {
  await gravarInicial([cadastro(aluno,"Aluno Teste")]);
  const db=usuario(aluno),ref=doc(db,"laboratorio_progresso",aluno);
  await assertFails(setDoc(ref,{concluidas:["elementos"],email:aluno,atualizadoEm:serverTimestamp()}));
  await assertFails(setDoc(ref,{concluidas:["desafio_inexistente"],atualizadoEm:serverTimestamp()}));
  await assertFails(setDoc(ref,{concluidas:["elementos"],respostas:[1,2,3],atualizadoEm:serverTimestamp()}));
  await assertFails(setDoc(ref,{concluidas:["elementos","moleculas","calculos","reacoes","gremio"],atualizadoEm:serverTimestamp()}));
  await assertFails(setDoc(ref,{concluidas:["elementos"],atualizadoEm:Timestamp.fromDate(new Date("2021-01-01"))}));
  await assertSucceeds(setDoc(ref,{concluidas:["calculos"],atualizadoEm:serverTimestamp()}));
  await assertFails(updateDoc(ref,{atualizadoEm:Timestamp.fromDate(new Date("2020-01-01"))}));
  await assertFails(updateDoc(ref,{concluidas:["calculos","invalido"],atualizadoEm:serverTimestamp()}));
});

test("Laboratório: conta inativa não acessa progresso", async () => {
  await gravarInicial([["alunos/"+aluno,{email:aluno,nome:"Bloqueado",ativo:false,status:"pendente"}]]);
  const db=usuario(aluno),ref=doc(db,"laboratorio_progresso",aluno);
  await assertFails(setDoc(ref,{concluidas:["elementos"],atualizadoEm:serverTimestamp()}));
  await assertFails(getDoc(ref));
});

test('Dados antigos de eventos e enquetes ficam indisponíveis aos estudantes', async () => {
  await gravarInicial([
    cadastro(aluno,'Aluno Exemplo'), ['cargos/'+presidente,{nivel:'admin'}],
    ['enquetes/antiga',{titulo:'Legado',ativa:true,votosAlunos:[{email:aluno,opcaoId:0}],opcoes:[{id:0,texto:'A',votos:1}]}],
    ['eventos/antigo',{titulo:'Evento antigo',vagas:1,inscritos:[aluno],espera:[outro]}]
  ]);
  const student=usuario(aluno),director=usuario(presidente);
  await assertFails(getDoc(doc(student,'enquetes/antiga')));
  await assertFails(getDoc(doc(student,'eventos/antigo')));
  await assertFails(getDocs(collection(student,'enquetes')));
  await assertFails(getDocs(collection(student,'eventos')));
  await assertSucceeds(getDoc(doc(director,'enquetes/antiga')));
  await assertSucceeds(getDoc(doc(director,'eventos/antigo')));
  await assertFails(updateDoc(doc(student,'enquetes/antiga'),{votosAlunos:[aluno]}));
  await assertFails(updateDoc(doc(student,'eventos/antigo'),{inscritos:[aluno]}));
});

test('Gestores não apagam documentos pais deixando votos ou inscrições privados órfãos', async () => {
  await gravarInicial([
    ['cargos/' + presidente, { nome: 'Presidente', nivel: 'admin' }],
    ['enquetes/enq-com-voto', {privacidadeVersao:2,titulo:'Enquete fictícia',ativa:false,
      opcoes:[{id:0,texto:'A',votos:1},{id:1,texto:'B',votos:0}]}],
    ['enquetes/enq-vazia', {privacidadeVersao:2,titulo:'Enquete vazia',ativa:false,
      opcoes:[{id:0,texto:'A',votos:0},{id:1,texto:'B',votos:0}]}],
    ['eventos/ev-com-inscrito', {privacidadeVersao:2,titulo:'Evento',inscritosCount:1,
      esperaCount:0,vagas:2}],
    ['eventos/ev-vazio', {privacidadeVersao:2,titulo:'Evento vazio',inscritosCount:0,
      esperaCount:0,vagas:2}]
  ]);
  const manager=usuario(presidente);
  for(const caminho of ['enquetes/enq-com-voto','enquetes/enq-vazia','eventos/ev-com-inscrito','eventos/ev-vazio']){
    await assertFails(deleteDoc(doc(manager,caminho)));
    const existing=await assertSucceeds(getDoc(doc(manager,caminho)));
    assert.equal(existing.exists(),true);
  }
});
