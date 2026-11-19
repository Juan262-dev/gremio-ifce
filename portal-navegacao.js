/* Portal do Aluno: navegação por 5 áreas, preservando cada seção/ID existente.
 * A visibilidade funcional (regras, manutenção e recursos) permanece nas rotinas
 * originais; este módulo só organiza a apresentação e nunca libera permissões.
 */
(function (root) {
  "use strict";
  const GRUPOS = Object.freeze({
    inicio: Object.freeze({ nome: "Início", icone: "🏠", descricao: "Acompanhe os avisos e acesse rapidamente os serviços.",
      secoes: Object.freeze(["sec-avisos", "sec-aniversario"]) }),
    estudos: Object.freeze({ nome: "Estudos", icone: "📚", descricao: "Materiais, simuladores, exercícios e recursos para aprender.",
      secoes: Object.freeze(["sec-estudos", "sec-laboratorio", "sec-quiz", "sec-cartoes", "sec-videos"]) }),
    atividades: Object.freeze({ nome: "Atividades", icone: "📅", descricao: "Eventos, jogos, inscrições e empréstimos.",
      secoes: Object.freeze(["sec-eventos", "sec-jogos", "sec-materiais"]) }),
    gremio: Object.freeze({ nome: "Grêmio", icone: "🤝", descricao: "Participe das decisões e acompanhe as ações da representação estudantil.",
      secoes: Object.freeze(["sec-enquetes", "sec-pautas", "sec-realizacoes", "sec-eleicao", "sec-sugestoes"]) }),
    perfil: Object.freeze({ nome: "Perfil", icone: "👤", descricao: "Sua identificação, preferências, privacidade e suporte.",
      secoes: Object.freeze(["sec-carteira", "sec-primeiro", "sec-privacidade", "sec-ajuda"]) })
  });
  const ROTULOS = Object.freeze({
    "sec-avisos": "📢 Avisos", "sec-aniversario": "🎂 Aniversários",
    "sec-estudos": "📖 Materiais e provas", "sec-laboratorio": "🧪 Laboratório",
    "sec-quiz": "🧠 Quiz", "sec-cartoes": "🃏 Cartões de revisão", "sec-videos": "🎬 Vídeos",
    "sec-eventos": "📅 Eventos", "sec-jogos": "🏆 Jogos", "sec-materiais": "🎲 Materiais",
    "sec-enquetes": "📊 Enquetes", "sec-pautas": "✊ Reivindicações",
    "sec-realizacoes": "✅ Realizações", "sec-eleicao": "🗳️ Eleições", "sec-sugestoes": "💡 Sugestões",
    "sec-carteira": "🪪 Carteirinha", "sec-primeiro": "⚙️ Editar perfil",
    "sec-privacidade": "🔐 Privacidade", "sec-ajuda": "🆘 Ajuda"
  });
  const DESTAQUES = Object.freeze([
    { alvo: "sec-carteira", icone: "🪪", titulo: "Minha carteirinha" },
    { alvo: "sec-eventos", icone: "📅", titulo: "Próximos eventos" },
    { alvo: "sec-laboratorio", icone: "🧪", titulo: "Laboratório Virtual" },
    { alvo: "sec-sugestoes", icone: "💬", titulo: "Falar com o Grêmio" }
  ]);
  let preparado = false, grupoAtual = "inicio", secaoAtual = null, recursos = {};
  function obterGrupo(id) {
    return Object.keys(GRUPOS).find(k => GRUPOS[k].secoes.includes(id)) || null;
  }
  function estaDisponivel(id) {
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    if (!el || el.style.display === "none") return false;
    const recurso = id.startsWith("sec-") ? id.slice(4) : id;
    return recursos[recurso] !== false;
  }
  function construir(tag, cls, texto) {
    const no = document.createElement(tag);
    if (cls) no.className = cls;
    if (texto !== undefined) no.textContent = texto;
    return no;
  }
  function criarPainel() {
    const portal = document.getElementById("portal-aluno");
    if (!portal || document.getElementById("portal-app-painel")) return;
    const painel = construir("section", "portal-app-painel");
    painel.id = "portal-app-painel";
    painel.setAttribute("aria-label", "Navegação da área selecionada");
    painel.appendChild(construir("p", "portal-app-selo", "GRÊMIO IFCE · PORTAL DO ALUNO"));
    const h = construir("h1", "portal-app-titulo");
    h.id = "portal-app-titulo";
    painel.appendChild(h);
    const p = construir("p", "portal-app-descricao");
    p.id = "portal-app-descricao";
    painel.appendChild(p);
    const atalhos = construir("nav", "portal-app-subnav");
    atalhos.id = "portal-app-subnav";
    atalhos.setAttribute("aria-label", "Ferramentas desta área");
    painel.appendChild(atalhos);
    const dashboard = construir("div", "portal-app-dashboard");
    dashboard.id = "portal-app-dashboard";
    dashboard.appendChild(construir("h2", "portal-app-dashboard-titulo", "Acesso rápido"));
    const grade = construir("div", "portal-app-dashboard-grade");
    DESTAQUES.forEach(d => {
      const b = construir("button", "portal-app-atalho", "");
      b.type = "button"; b.dataset.portalAlvo = d.alvo;
      b.appendChild(construir("span", "portal-app-atalho-icone", d.icone));
      b.appendChild(construir("span", "", d.titulo));
      grade.appendChild(b);
    });
    dashboard.appendChild(grade);
    painel.appendChild(dashboard);
    const vazio = construir("p", "portal-app-vazio", "Nenhuma ferramenta disponível nesta área no momento.");
    vazio.id = "portal-app-vazio";
    painel.appendChild(vazio);
    const primeiro = document.getElementById("sec-primeiro");
    portal.insertBefore(painel, primeiro);
  }
  function atualizarInterface() {
    const portal = document.getElementById("portal-aluno");
    if (!portal) return;
    const grupo = GRUPOS[grupoAtual];
    const titulo = document.getElementById("portal-app-titulo");
    if (titulo) titulo.textContent = grupo.icone + " " + grupo.nome;
    const descricao = document.getElementById("portal-app-descricao");
    if (descricao) descricao.textContent = grupo.descricao;
    const disponiveis = grupo.secoes.filter(estaDisponivel);
    if (!disponiveis.includes(secaoAtual)) secaoAtual = disponiveis[0] || null;
    for (const [key, info] of Object.entries(GRUPOS)) {
      for (const id of info.secoes) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("portal-secao-ativa", key === grupoAtual && id === secaoAtual);
      }
    }
    const subnav = document.getElementById("portal-app-subnav");
    if (subnav) {
      subnav.replaceChildren();
      disponiveis.forEach(id => {
        const b = construir("button", "portal-app-subitem" + (id === secaoAtual ? " ativo" : ""), ROTULOS[id] || id);
        b.type = "button"; b.dataset.portalAlvo = id;
        b.setAttribute("aria-pressed", String(id === secaoAtual));
        subnav.appendChild(b);
      });
    }
    const dashboard = document.getElementById("portal-app-dashboard");
    if (dashboard) dashboard.hidden = grupoAtual !== "inicio";
    const vazio = document.getElementById("portal-app-vazio");
    if (vazio) vazio.hidden = disponiveis.length > 0;
    const nav = document.getElementById("bottom-nav");
    if (nav) nav.querySelectorAll("button[data-portal-grupo]").forEach(b => {
      const ativo = b.dataset.portalGrupo === grupoAtual;
      b.classList.toggle("ativo", ativo);
      b.setAttribute("aria-current", ativo ? "page" : "false");
    });
    document.querySelectorAll("#portal-app-dashboard [data-portal-alvo]").forEach(b => {
      b.hidden = !estaDisponivel(b.dataset.portalAlvo);
    });
  }
  function abrir(grupo, alvo, rolar) {
    if (!GRUPOS[grupo]) return false;
    grupoAtual = grupo;
    secaoAtual = alvo && GRUPOS[grupo].secoes.includes(alvo) && estaDisponivel(alvo) ? alvo : null;
    atualizarInterface();
    if (rolar) {
      const painel = document.getElementById("portal-app-painel");
      if (painel && painel.scrollIntoView) painel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return true;
  }
  function irPara(id) {
    const grupo = obterGrupo(id);
    if (!grupo || !estaDisponivel(id)) return false;
    abrir(grupo, id, false);
    const el = document.getElementById(id);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  function atualizarRecursos(novos) {
    recursos = novos && typeof novos === "object" ? novos : {};
    if (preparado) atualizarInterface();
  }
  function preparar() {
    if (typeof document === "undefined" || preparado) return;
    const portal = document.getElementById("portal-aluno");
    const nav = document.getElementById("bottom-nav");
    if (!portal || !nav) return;
    criarPainel();
    for (const [key, grupo] of Object.entries(GRUPOS)) {
      grupo.secoes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.dataset.portalGrupo = key;
      });
    }
    nav.addEventListener("click", e => {
      const b = e.target.closest("button[data-portal-grupo]");
      if (b && nav.contains(b)) abrir(b.dataset.portalGrupo, null, true);
    });
    const painel = document.getElementById("portal-app-painel");
    painel.addEventListener("click", e => {
      const b = e.target.closest("button[data-portal-alvo]");
      if (b && painel.contains(b)) irPara(b.dataset.portalAlvo);
    });
    preparado = true;
    portal.classList.add("portal-app-ativo");
    atualizarInterface();
  }
  function iniciar() {
    preparar();
    abrir("inicio", null, false);
  }
  const API = Object.freeze({ GRUPOS, ROTULOS, DESTAQUES, obterGrupo,
    preparar, iniciar, abrir, irPara, atualizarRecursos });
  root.PortalNavegacao = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
