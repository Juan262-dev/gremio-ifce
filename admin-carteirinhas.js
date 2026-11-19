/* Conferência de carteirinha: somente Presidência e TI autorizados
 * recebem acesso ao documento e ao cadastro pelas regras do Firestore.
 * Nunca aceitar QR Code como prova de identidade sem consultar o servidor.
 */
let carteirinhaPendenteUrl = null;
let carteirinhaConferida = null;
if (window.location.hash.startsWith('#carteira=')) {
  carteirinhaPendenteUrl = window.location.hash.slice('#carteira='.length);
  // Remove o código do histórico e evita repassá-lo em capturas e compartilhamentos.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

function adminPodeConferirCarteirinha() {
  return !!auth.currentUser && !!emailLogado
    && (emailLogado === ROOT_EMAIL || nivelReal === 'admin');
}

function extrairCodigoCarteirinha(valor) {
  const texto = String(valor || '').trim();
  const match = texto.match(/(?:^|#carteira=)([a-f0-9]{64})$/i);
  return match ? match[1].toLowerCase() : null;
}

function resultadoCarteirinha(mensagem, tipo) {
  const el = document.getElementById('consulta-carteira-resultado');
  if (!el) return;
  el.textContent = mensagem;
  el.className = 'small alert ' + (tipo === 'ok' ? 'alert-success' : tipo === 'erro' ? 'alert-danger' : 'alert-secondary');
}

async function consultarCarteirinhaCodigo() {
  if (!adminPodeConferirCarteirinha()) {
    resultadoCarteirinha('Somente Presidência e TI podem conferir carteirinhas.', 'erro');
    return;
  }
  const input = document.getElementById('consulta-carteira-codigo');
  const codigo = extrairCodigoCarteirinha(input.value);
  // Uma nova consulta revoga o estado de conferência anterior no painel.
  carteirinhaConferida = null;
  document.getElementById('carteira-checkin').style.display = 'none';
  document.getElementById('btn-checkin-carteirinha').disabled = true;
  if (!codigo) {
    resultadoCarteirinha('Código inválido: utilize o QR Code ou informe os 64 caracteres do identificador.', 'erro');
    return;
  }
  if (!navigator.onLine) {
    resultadoCarteirinha('É necessário estar conectado à internet para conferir a validade.', 'erro');
    return;
  }
  resultadoCarteirinha('Consultando o Firebase...', 'espera');
  const emailConferente = emailLogado;
  try {
    // Fonte obrigatoriamente servidor: não é seguro considerar a cache válida.
    const registros = await db.collection('carteirinhas').where('codigo', '==', codigo).limit(2).get({ source: 'server' });
    if (emailLogado !== emailConferente) return;
    if (registros.size !== 1) {
      resultadoCarteirinha('Carteirinha NÃO VÁLIDA: código inexistente ou duplicado.', 'erro');
      return;
    }
    const carteiraDoc = registros.docs[0];
    const email = carteiraDoc.id;
    const [aluno, punicao] = await Promise.all([
      db.collection('alunos').doc(email).get({ source: 'server' }),
      db.collection('membros_punidos').doc(email).get({ source: 'server' })
    ]);
    if (emailLogado !== emailConferente) return;
    const punido = punicao.exists && punicao.data().expiraEm
      && punicao.data().expiraEm.toMillis() > Date.now();
    if (!aluno.exists || aluno.data().ativo !== true
        || ['pendente', 'recusado', 'excluido'].includes(aluno.data().status)
        || punido) {
      resultadoCarteirinha('Carteirinha NÃO VÁLIDA: cadastro inativo, pendente, excluído ou suspenso.', 'erro');
      return;
    }
    const nome = aluno.data().nome || 'Aluno sem nome cadastrado';
    const turma = aluno.data().turma || 'não informada no cadastro';
    resultadoCarteirinha('CARTEIRINHA VÁLIDA — ' + nome + ' | Turma: ' + turma
      + ' | Cadastro ativo. Confira visualmente a identidade do portador.', 'ok');
    carteirinhaConferida = { email, codigo };
    await carregarEventosCarteirinha();
  } catch (e) {
    console.error('verificar carteirinha', e);
    resultadoCarteirinha('Não foi possível verificar no servidor. Nenhuma validade foi confirmada.', 'erro');
  }
}

function abrirConsultaCarteirinhaPendente() {
  if (!carteirinhaPendenteUrl || !adminPodeConferirCarteirinha()) return;
  const input = document.getElementById('consulta-carteira-codigo');
  if (!input) return;
  input.value = carteirinhaPendenteUrl;
  carteirinhaPendenteUrl = null;
  if (typeof mostrarAba === 'function') mostrarAba('alunos', false);
  irPara('secao-carteirinhas');
  consultarCarteirinhaCodigo();
}

document.getElementById('consulta-carteira-codigo')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') consultarCarteirinhaCodigo();
});

/* A conferência da inscrição é separada da carteirinha: um QR válido
 * não autoriza entrada em um evento sem inscrição e checagem humana. */
async function carregarEventosCarteirinha() {
  if (!adminPodeConferirCarteirinha() || !carteirinhaConferida) return;
  const select = document.getElementById('carteira-evento');
  const painel = document.getElementById('carteira-checkin');
  select.replaceChildren(new Option('Selecione um evento', ''));
  painel.style.display = '';
  document.getElementById('carteira-status-evento').textContent = 'Carregando eventos...';
  try {
    const snap = await db.collection('eventos').orderBy('dataISO', 'desc').limit(60).get({ source: 'server' });
    for (const doc of snap.docs) {
      const ev = doc.data();
      select.appendChild(new Option((ev.titulo || 'Evento') + ' — ' + (ev.data || ev.dataISO || 'sem data'), doc.id));
    }
    document.getElementById('carteira-status-evento').textContent = snap.empty
      ? 'Nenhum evento disponível para conferência.'
      : 'Escolha o evento para verificar a inscrição do aluno.';
  } catch (e) {
    console.error('eventos para carteirinha', e);
    document.getElementById('carteira-status-evento').textContent = 'Não foi possível consultar os eventos.';
  }
}

async function verificarInscricaoCarteirinha() {
  const botao = document.getElementById('btn-checkin-carteirinha');
  const status = document.getElementById('carteira-status-evento');
  botao.disabled = true;
  const verificada = carteirinhaConferida;
  const eventoId = document.getElementById('carteira-evento').value;
  if (!adminPodeConferirCarteirinha() || !verificada || !eventoId) {
    status.textContent = 'Escolha um evento após conferir uma carteirinha válida.';
    return;
  }
  status.textContent = 'Conferindo inscrição e presença...';
  try {
    const [evento, presenca, carteira] = await Promise.all([
      db.collection('eventos').doc(eventoId).get({ source: 'server' }),
      db.collection('presencas_eventos').doc(eventoId).collection('alunos').doc(verificada.email).get({ source: 'server' }),
      db.collection('carteirinhas').doc(verificada.email).get({ source: 'server' })
    ]);
    if (!carteirinhaConferida || carteirinhaConferida.codigo !== verificada.codigo ||
        document.getElementById('carteira-evento').value !== eventoId) return;
    if (!carteira.exists || carteira.data().codigo !== verificada.codigo) {
      carteirinhaConferida = null;
      status.textContent = 'QR Code revogado. Confira uma nova carteirinha.';
      return;
    }
    if (!evento.exists || !(evento.data().inscritos || []).includes(verificada.email)) {
      status.textContent = 'Aluno não inscrito neste evento. Não é possível confirmar presença.';
      return;
    }
    if (presenca.exists) {
      status.textContent = 'Presença já confirmada anteriormente neste evento.';
      return;
    }
    status.textContent = 'Inscrição confirmada. Confira o estudante presencialmente antes de marcar a presença.';
    botao.disabled = false;
  } catch (e) {
    console.error('inscrição carteirinha', e);
    status.textContent = 'Falha na consulta ao Firebase. Nenhuma presença foi confirmada.';
  }
}

async function registrarPresencaCarteirinha() {
  const botao = document.getElementById('btn-checkin-carteirinha');
  const status = document.getElementById('carteira-status-evento');
  const verificada = carteirinhaConferida;
  const eventoId = document.getElementById('carteira-evento').value;
  if (botao.disabled || !adminPodeConferirCarteirinha() || !verificada || !eventoId) return;
  if (!navigator.onLine) { status.textContent = 'É necessário estar conectado à internet.'; return; }
  if (!confirm('Você conferiu pessoalmente o estudante e deseja registrar sua presença neste evento?')) return;
  botao.disabled = true;
  status.textContent = 'Registrando presença...';
  try {
    const eventoRef = db.collection('eventos').doc(eventoId);
    const alunoRef = db.collection('alunos').doc(verificada.email);
    const carteiraRef = db.collection('carteirinhas').doc(verificada.email);
    const presencaRef = db.collection('presencas_eventos').doc(eventoId)
      .collection('alunos').doc(verificada.email);
    await db.runTransaction(async t => {
      const [evento, aluno, carteira, presenca] = await Promise.all([
        t.get(eventoRef), t.get(alunoRef), t.get(carteiraRef), t.get(presencaRef)
      ]);
      if (!evento.exists || !(evento.data().inscritos || []).includes(verificada.email)) {
        throw new Error('O aluno não está inscrito neste evento.');
      }
      if (!aluno.exists || !aluno.data().ativo || aluno.data().status === 'excluido') {
        throw new Error('O cadastro do aluno não está ativo.');
      }
      if (!carteira.exists || carteira.data().codigo !== verificada.codigo) {
        throw new Error('A carteirinha foi substituída ou revogada.');
      }
      if (presenca.exists) throw new Error('A presença já foi registrada.');
      t.set(presencaRef, { email: verificada.email, conferidoPor: emailLogado, conferidoEm: TS() });
    });
    status.textContent = 'Presença confirmada com sucesso no Firebase.';
    registrarAcao('Presença por carteirinha', 'Evento ' + eventoId);
  } catch (e) {
    console.error('check-in carteirinha', e);
    status.textContent = 'Não foi possível confirmar: ' + (e.message || 'erro na operação');
  }
}
