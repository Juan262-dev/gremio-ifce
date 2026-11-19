/* Carteirinha digital: identificador opaco, sem dados pessoais no QR Code.
 * A validade é consultada no Firestore por uma conta da Presidência/TI.
 * Uma imagem do QR Code não prova identidade e pode ser copiada.
 */
let carteirinhaCodigoAtual = null;

function carteiraEstado(mensagem, tipo = 'muted') {
  const el = document.getElementById('carteirinha-digital-estado');
  if (!el) return;
  el.textContent = mensagem;
  el.className = 'small mb-3 text-' + tipo;
}

function limparCarteirinhaDigital() {
  carteirinhaCodigoAtual = null;
  const visual = document.getElementById('carteirinha-visual');
  const btnCriar = document.getElementById('btn-gerar-carteirinha');
  const btnSalvar = document.getElementById('btn-salvar-qr-carteirinha');
  const qr = document.getElementById('carteirinha-qr');
  if (visual) visual.style.display = 'none';
  if (btnCriar) btnCriar.style.display = 'none';
  if (btnSalvar) btnSalvar.style.display = 'none';
  if (qr) qr.replaceChildren();
}

async function carregarCarteirinhaDigital() {
  limparCarteirinhaDigital();
  if (!usuarioAtual || !auth.currentUser) return;
  const email = usuarioAtual.email;
  carteiraEstado('Consultando sua carteirinha...');
  try {
    // Evita apresentar uma carteirinha antiga se estivermos offline.
    const doc = await db.collection('carteirinhas').doc(email).get({ source: 'server' });
    if (!usuarioAtual || usuarioAtual.email !== email) return;
    if (!doc.exists) {
      carteiraEstado('Você ainda não emitiu sua carteirinha. A emissão é opcional.');
      document.getElementById('btn-gerar-carteirinha').style.display = '';
      return;
    }
    const data = doc.data();
    if (!data.codigo || !/^[a-f0-9]{64}$/.test(data.codigo)) {
      carteiraEstado('O código da carteirinha é inválido. Peça ajuda ao TI.', 'danger');
      return;
    }
    await exibirCarteirinhaDigital(email, data);
  } catch (e) {
    console.error('carteirinha digital', e);
    if (!usuarioAtual || usuarioAtual.email !== email) return;
    carteiraEstado('Não foi possível consultar sua carteirinha. Conecte-se à internet e tente novamente.', 'danger');
  }
}

async function exibirCarteirinhaDigital(email, data) {
  const codigo = data.codigo;
  if (!usuarioAtual || usuarioAtual.email !== email) return;
  const qr = document.getElementById('carteirinha-qr');
  const visual = document.getElementById('carteirinha-visual');
  const nome = document.getElementById('carteirinha-nome');
  const turma = document.getElementById('carteirinha-turma');
  const emissao = document.getElementById('carteirinha-emissao');
  nome.textContent = usuarioAtual.nome || 'Aluno';
  turma.textContent = usuarioAtual.turma || 'Não informada no cadastro';
  if (!usuarioAtual.turma) {
    // Complemento visual informado pelo próprio aluno (não é autenticado pela secretaria).
    try {
      const pf = await db.collection('perfis').doc(email).get();
      if (usuarioAtual && usuarioAtual.email === email && pf.exists) {
        turma.textContent = pf.data().turma || 'Não informada';
      }
    } catch (_) { /* turma opcional */ }
  }
  if (!usuarioAtual || usuarioAtual.email !== email) return;
  emissao.textContent = data.criadoEm && data.criadoEm.toDate
    ? 'Emitida em ' + data.criadoEm.toDate().toLocaleDateString('pt-BR')
    : 'Emitida pelo Portal do Aluno';

  carteirinhaCodigoAtual = codigo;
  qr.replaceChildren();
  if (typeof QRCode !== 'function') {
    visual.style.display = '';
    carteiraEstado('Carteirinha emitida, mas não foi possível carregar o QR Code. Reabra com internet.', 'warning');
    return;
  }
  // O fragmento (#) não é enviado ao servidor web durante a navegação.
  const destino = new URL('admin.html', window.location.href);
  destino.hash = 'carteira=' + codigo;
  new QRCode(qr, {
    text: destino.href,
    width: 174, height: 174,
    colorDark: '#10291b', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
  visual.style.display = '';
  document.getElementById('btn-salvar-qr-carteirinha').style.display = '';
  carteiraEstado('Carteirinha emitida. Apresente o QR Code à equipe do Grêmio.', 'success');
}

async function gerarCarteirinhaDigital() {
  if (!usuarioAtual || !auth.currentUser) return;
  if (!navigator.onLine) {
    aviso('Conecte-se à internet para emitir sua carteirinha.', 'warning');
    return;
  }
  if (!window.crypto || typeof crypto.getRandomValues !== 'function') {
    aviso('Seu navegador não permite gerar um código seguro. Atualize-o e tente novamente.', 'warning');
    return;
  }
  const email = usuarioAtual.email;
  const btn = document.getElementById('btn-gerar-carteirinha');
  btn.disabled = true;
  carteiraEstado('Gerando seu código seguro...');
  try {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const codigo = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
    // Só cria: as regras impedem alterações do código pelo aluno.
    await db.collection('carteirinhas').doc(email).set({ codigo, criadoEm: TS() });
    await carregarCarteirinhaDigital();
    aviso('Sua carteirinha digital foi emitida!', 'success');
  } catch (e) {
    console.error('emitir carteirinha', e);
    carteiraEstado('Não foi possível emitir. Verifique sua conexão ou tente atualizar o portal.', 'danger');
    btn.style.display = '';
  } finally {
    btn.disabled = false;
  }
}

function baixarQrCarteirinha() {
  if (!carteirinhaCodigoAtual || !usuarioAtual) return;
  const qr = document.getElementById('carteirinha-qr');
  const canvas = qr.querySelector('canvas');
  const img = qr.querySelector('img');
  const src = canvas ? canvas.toDataURL('image/png') : (img && img.src);
  if (!src || !src.startsWith('data:image/png')) {
    aviso('Não foi possível salvar o QR Code neste navegador.', 'warning');
    return;
  }
  const a = document.createElement('a');
  a.href = src;
  a.download = 'qr-carteirinha-gremio-ifce.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
