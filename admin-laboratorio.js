/* Gestão de conteúdos complementares do Laboratório Virtual.
 * O painel controla publicação; as permissões reais estão no firestore.rules.
 * Inserções de alunos nunca são aceitas neste módulo.
 */
let labAdminDocs = [];
function labAdminAutorizado() {
  return !!auth.currentUser && !!emailLogado &&
    (emailLogado === ROOT_EMAIL || nivelReal === "admin");
}
function labAdminCampo(id) {
  return document.getElementById(id).value.trim();
}
function labAdminMensagem(texto, erro) {
  const box = document.getElementById("lab-admin-mensagem");
  if (!box) return;
  box.textContent = texto;
  box.className = erro ? "small text-warning mb-2" : "small text-success mb-2";
}
function labAdminUrlValida(valor) {
  if (!valor) return true;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch (_) { return false; }
}
function limparFormularioLaboratorio() {
  for (const id of ["lab-admin-id", "lab-admin-titulo", "lab-admin-descricao", "lab-admin-link"]) {
    document.getElementById(id).value = "";
  }
  document.getElementById("lab-admin-assunto").value = "Química Geral";
  document.getElementById("lab-admin-publicado").checked = false;
  document.getElementById("lab-admin-salvar").textContent = "Adicionar conteúdo";
  labAdminMensagem("Pronto para cadastrar um novo conteúdo.", false);
}
async function salvarConteudoLaboratorio() {
  if (!labAdminAutorizado()) {
    labAdminMensagem("Somente Presidência/TI podem modificar conteúdos.", true);
    return;
  }
  const id = labAdminCampo("lab-admin-id");
  const titulo = labAdminCampo("lab-admin-titulo");
  const assunto = labAdminCampo("lab-admin-assunto");
  const descricao = labAdminCampo("lab-admin-descricao");
  const link = labAdminCampo("lab-admin-link");
  const publicado = document.getElementById("lab-admin-publicado").checked;
  if (titulo.length < 4 || titulo.length > 120 || !assunto || assunto.length > 80 ||
      descricao.length < 10 || descricao.length > 1000 ||
      link.length > 500 || !labAdminUrlValida(link)) {
    labAdminMensagem("Informe título (4–120), assunto, descrição (10–1000) e link HTTPS válido, se houver.", true);
    return;
  }
  const btn = document.getElementById("lab-admin-salvar");
  btn.disabled = true;
  try {
    const campos = { titulo, assunto, descricao, link, publicado };
    if (id) {
      await db.collection("laboratorio_conteudos").doc(id).update({
        ...campos, atualizadoEm: TS()
      });
    } else {
      await db.collection("laboratorio_conteudos").add({
        ...campos, criadoEm: TS()
      });
    }
    if (typeof registrarAcao === "function") registrarAcao(
      id ? "Conteúdo do laboratório editado" : "Conteúdo do laboratório cadastrado", titulo
    );
    limparFormularioLaboratorio();
    labAdminMensagem(publicado ? "Conteúdo salvo e publicado." : "Conteúdo salvo como rascunho.", false);
  } catch (e) {
    console.error("salvarConteudoLaboratorio", e);
    labAdminMensagem("Falha ao salvar no Firebase. Confira as regras novas e as permissões.", true);
  } finally {
    btn.disabled = false;
  }
}
function editarConteudoLaboratorio(id) {
  if (!labAdminAutorizado()) return;
  const d = labAdminDocs.find(x => x.id === id);
  if (!d) return;
  document.getElementById("lab-admin-id").value = id;
  for (const campo of ["titulo", "assunto", "descricao", "link"]) {
    document.getElementById("lab-admin-" + campo).value = d[campo] || "";
  }
  document.getElementById("lab-admin-publicado").checked = !!d.publicado;
  document.getElementById("lab-admin-salvar").textContent = "Salvar alterações";
  irPara('secao-laboratorio');
  labAdminMensagem("Editando: " + d.titulo, false);
}
async function excluirConteudoLaboratorio(id) {
  if (!labAdminAutorizado()) return;
  const d = labAdminDocs.find(x => x.id === id);
  if (!d || !confirm("Excluir permanentemente o conteúdo “" + d.titulo + "”?")) return;
  try {
    await db.collection("laboratorio_conteudos").doc(id).delete();
    if (typeof registrarAcao === "function") registrarAcao("Conteúdo do laboratório excluído", d.titulo);
    labAdminMensagem("Conteúdo excluído.", false);
    if (labAdminCampo("lab-admin-id") === id) limparFormularioLaboratorio();
  } catch (e) {
    console.error("excluirConteudoLaboratorio", e);
    labAdminMensagem("Não foi possível excluir o conteúdo.", true);
  }
}
function renderizarConteudosLaboratorioAdmin() {
  const caixa = document.getElementById("lab-admin-lista");
  if (!caixa) return;
  caixa.replaceChildren();
  if (!labAdminDocs.length) {
    caixa.textContent = "Nenhum conteúdo cadastrado. Crie o primeiro acima.";
    return;
  }
  for (const item of labAdminDocs) {
    const div = document.createElement("article");
    div.className = "p-3 mb-2 rounded border";
    div.style.borderColor = "var(--ifce-card-border)";
    const t = document.createElement("strong");
    t.className = "d-block text-white";
    t.textContent = item.titulo || "Conteúdo sem título";
    const desc = document.createElement("p");
    desc.className = "small text-muted-custom mb-2";
    desc.textContent = (item.assunto || "") + " · " + (item.publicado ? "Publicado" : "Rascunho") +
      " · " + (item.descricao || "");
    const botoes = document.createElement("div");
    botoes.className = "d-flex flex-wrap gap-2";
    const editar = document.createElement("button");
    editar.type = "button";
    editar.className = "btn btn-outline-light btn-sm";
    editar.textContent = "Editar";
    editar.onclick = function () { editarConteudoLaboratorio(item.id); };
    const excluir = document.createElement("button");
    excluir.type = "button";
    excluir.className = "btn btn-outline-danger btn-sm";
    excluir.textContent = "Excluir";
    excluir.onclick = function () { excluirConteudoLaboratorio(item.id); };
    botoes.append(editar, excluir);
    div.append(t, desc, botoes);
    caixa.appendChild(div);
  }
}
function carregarLaboratorioAdmin() {
  if (!labAdminAutorizado()) return;
  const caixa = document.getElementById("lab-admin-lista");
  if (!caixa) return;
  caixa.textContent = "Carregando conteúdos...";
  // Carrega todos os conteúdos, incluindo rascunhos. Somente a equipe autorizada
  // pode executar essa consulta (enforced pelo Firebase).
  const desligar = db.collection("laboratorio_conteudos").limit(200)
    .onSnapshot(function (snapshot) {
      labAdminDocs = snapshot.docs.map(function (d) { return { id: d.id, ...d.data() }; })
        .sort(function (a, b) {
          const data = x => x.criadoEm && x.criadoEm.toMillis ? x.criadoEm.toMillis() : 0;
          return data(b) - data(a);
        });
      renderizarConteudosLaboratorioAdmin();
    }, function (erro) {
      console.error("laboratorio admin", erro);
      caixa.textContent = "Não foi possível consultar o laboratório. Verifique as regras no Firebase.";
    });
  if (typeof unsubs !== "undefined") unsubs.push(desligar);
}
