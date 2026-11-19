/* Conferência de carteirinha: somente Presidência e TI autorizados
 * recebem acesso ao documento e ao cadastro pelas regras do Firestore.
 * Nunca aceitar QR Code como prova de identidade sem consultar o servidor.
 */
let carteirinhaPendenteUrl = null;
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
  document.getElementById('secao-carteirinhas').scrollIntoView({ behavior: 'smooth', block: 'start' });
  consultarCarteirinhaCodigo();
}

document.getElementById('consulta-carteira-codigo')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') consultarCarteirinhaCodigo();
});
