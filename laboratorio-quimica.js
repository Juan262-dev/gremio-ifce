/* Laboratório Virtual de Química — dados científicos locais e matemática didática.
 * Massa atômica arredondada de referência (RDKit); nuclídeos radioativos têm
 * massas isotópicas exemplificativas, não valores-padrão IUPAC.
 * Não executa nem ensina procedimentos de experimentação física.
 */
(function (root) {
  "use strict";
  const RAW = "H|Hidrogênio|1.008|1|1\nHe|Hélio|4.003|1|18\nLi|Lítio|6.941|2|1\nBe|Berílio|9.012|2|2\nB|Boro|10.812|2|13\nC|Carbono|12.011|2|14\nN|Nitrogênio|14.007|2|15\nO|Oxigênio|15.999|2|16\nF|Flúor|18.998|2|17\nNe|Neônio|20.18|2|18\nNa|Sódio|22.99|3|1\nMg|Magnésio|24.305|3|2\nAl|Alumínio|26.982|3|13\nSi|Silício|28.086|3|14\nP|Fósforo|30.974|3|15\nS|Enxofre|32.067|3|16\nCl|Cloro|35.453|3|17\nAr|Argônio|39.948|3|18\nK|Potássio|39.098|4|1\nCa|Cálcio|40.078|4|2\nSc|Escândio|44.956|4|3\nTi|Titânio|47.867|4|4\nV|Vanádio|50.944|4|5\nCr|Crômio|51.996|4|6\nMn|Manganês|54.938|4|7\nFe|Ferro|55.845|4|8\nCo|Cobalto|58.933|4|9\nNi|Níquel|58.693|4|10\nCu|Cobre|63.546|4|11\nZn|Zinco|65.39|4|12\nGa|Gálio|69.723|4|13\nGe|Germânio|72.61|4|14\nAs|Arsênio|74.922|4|15\nSe|Selênio|78.96|4|16\nBr|Bromo|79.904|4|17\nKr|Criptônio|83.8|4|18\nRb|Rubídio|85.468|5|1\nSr|Estrôncio|87.62|5|2\nY|Ítrio|88.906|5|3\nZr|Zircônio|91.224|5|4\nNb|Nióbio|92.906|5|5\nMo|Molibdênio|95.94|5|6\nTc|Tecnécio|98|5|7\nRu|Rutênio|101.07|5|8\nRh|Ródio|102.906|5|9\nPd|Paládio|106.42|5|10\nAg|Prata|107.868|5|11\nCd|Cádmio|112.412|5|12\nIn|Índio|114.818|5|13\nSn|Estanho|118.711|5|14\nSb|Antimônio|121.76|5|15\nTe|Telúrio|127.6|5|16\nI|Iodo|126.904|5|17\nXe|Xenônio|131.29|5|18\nCs|Césio|132.905|6|1\nBa|Bário|137.328|6|2\nLa|Lantânio|138.906|6|3\nCe|Cério|140.116|6|0\nPr|Praseodímio|140.908|6|0\nNd|Neodímio|144.24|6|0\nPm|Promécio|145|6|0\nSm|Samário|150.36|6|0\nEu|Európio|151.964|6|0\nGd|Gadolínio|157.25|6|0\nTb|Térbio|158.925|6|0\nDy|Disprósio|162.5|6|0\nHo|Hólmio|164.93|6|0\nEr|Érbio|167.26|6|0\nTm|Túlio|168.934|6|0\nYb|Itérbio|173.04|6|0\nLu|Lutécio|174.967|6|0\nHf|Háfnio|178.49|6|4\nTa|Tântalo|180.948|6|5\nW|Tungstênio|183.84|6|6\nRe|Rênio|186.207|6|7\nOs|Ósmio|190.23|6|8\nIr|Irídio|192.217|6|9\nPt|Platina|195.078|6|10\nAu|Ouro|196.967|6|11\nHg|Mercúrio|200.59|6|12\nTl|Tálio|204.383|6|13\nPb|Chumbo|207.2|6|14\nBi|Bismuto|208.98|6|15\nPo|Polônio|209|6|16\nAt|Astato|210|6|17\nRn|Radônio|222|6|18\nFr|Frâncio|223|7|1\nRa|Rádio|226|7|2\nAc|Actínio|227|7|3\nTh|Tório|232.038|7|0\nPa|Protactínio|231.036|7|0\nU|Urânio|238.029|7|0\nNp|Netúnio|237|7|0\nPu|Plutônio|244|7|0\nAm|Amerício|243|7|0\nCm|Cúrio|247|7|0\nBk|Berquélio|247|7|0\nCf|Califórnio|251|7|0\nEs|Einstênio|252|7|0\nFm|Férmio|257|7|0\nMd|Mendelévio|258|7|0\nNo|Nobélio|259|7|0\nLr|Laurêncio|262|7|0\nRf|Rutherfórdio|267|7|4\nDb|Dúbnio|268|7|5\nSg|Seabórgio|269|7|6\nBh|Bóhrio|270|7|7\nHs|Hássio|269|7|8\nMt|Meitnério|278|7|9\nDs|Darmstádio|281|7|10\nRg|Roentgênio|281|7|11\nCn|Copernício|285|7|12\nNh|Nihônio|284|7|13\nFl|Fleróvio|289|7|14\nMc|Moscóvio|288|7|15\nLv|Livermório|293|7|16\nTs|Tenessino|292|7|17\nOg|Oganessônio|294|7|18";
  const elementos = Object.freeze(RAW.split("\n").map(function (linha, i) {
    const a = linha.split("|");
    return Object.freeze({ z: i + 1, simbolo: a[0], nome: a[1],
      massa: Number(a[2]), periodo: Number(a[3]), grupo: Number(a[4]) });
  }));
  const porSimbolo = Object.fromEntries(elementos.map(function (e) { return [e.simbolo, e]; }));
  const familias = {
    alcalino: "Metais alcalinos", alcalinoTerroso: "Metais alcalino-terrosos",
    transicao: "Metais de transição", posTransicao: "Outros metais",
    semimetal: "Semimetais", naoMetal: "Não metais",
    halogenio: "Halogênios", nobre: "Gases nobres",
    lantanideo: "Lantanídeos", actinideo: "Actinídeos"
  };
  function categoria(e) {
    if (e.z >= 57 && e.z <= 71) return "lantanideo";
    if (e.z >= 89 && e.z <= 103) return "actinideo";
    if (e.grupo === 18) return "nobre";
    if (e.grupo === 17) return "halogenio";
    if (e.simbolo !== "H" && e.grupo === 1) return "alcalino";
    if (e.grupo === 2) return "alcalinoTerroso";
    if (["B", "Si", "Ge", "As", "Sb", "Te", "Po"].includes(e.simbolo)) return "semimetal";
    if (["H", "C", "N", "O", "P", "S", "Se"].includes(e.simbolo)) return "naoMetal";
    if (e.grupo >= 3 && e.grupo <= 12) return "transicao";
    return "posTransicao";
  }
  function massaMolar(formula) {
    if (typeof formula !== "string") throw Error("Informe uma fórmula química.");
    const texto = formula.replace(/\s+/g, "").replace(/[∙⋅]/g, "·");
    if (!texto || texto.length > 90) throw Error("Informe uma fórmula de até 90 caracteres.");
    if (!/^[A-Za-z0-9()[\].·]+$/.test(texto)) throw Error("A fórmula contém caracteres não reconhecidos.");
    const composicao = Object.create(null);
    function somar(destino, atomos, fator) {
      for (const simbolo of Object.keys(atomos)) {
        destino[simbolo] = (destino[simbolo] || 0) + atomos[simbolo] * fator;
        if (destino[simbolo] > 100000) throw Error("Quantidade de átomos muito grande.");
      }
    }
    function interpretar(fragmento) {
      let i = 0;
      function numero() {
        const inicio = i;
        while (i < fragmento.length && /[0-9]/.test(fragmento[i])) i++;
        if (inicio === i) return 1;
        const n = Number(fragmento.slice(inicio, i));
        if (!Number.isInteger(n) || n < 1 || n > 999) throw Error("Índice químico deve estar entre 1 e 999.");
        return n;
      }
      function grupo(terminador, profundidade) {
        if (profundidade > 12) throw Error("Fórmula com muitos agrupamentos.");
        const atomos = Object.create(null);
        let itens = 0;
        while (i < fragmento.length) {
          const ch = fragmento[i];
          if (ch === ")" || ch === "]") {
            if (ch !== terminador) throw Error("Parênteses ou colchetes incorretos.");
            i++;
            if (!itens) throw Error("Agrupamento vazio.");
            return atomos;
          }
          if (ch === "(" || ch === "[") {
            i++;
            const sub = grupo(ch === "(" ? ")" : "]", profundidade + 1);
            somar(atomos, sub, numero());
          } else if (/[A-Z]/.test(ch)) {
            let simbolo = fragmento[i++];
            if (i < fragmento.length && /[a-z]/.test(fragmento[i])) simbolo += fragmento[i++];
            if (!porSimbolo[simbolo]) throw Error("Elemento desconhecido: " + simbolo + ".");
            somar(atomos, { [simbolo]: 1 }, numero());
          } else {
            throw Error("Símbolo ou índice inválido na fórmula.");
          }
          itens++;
        }
        if (terminador) throw Error("Faltou fechar um agrupamento.");
        if (!itens) throw Error("Fórmula vazia.");
        return atomos;
      }
      const atomos = grupo(null, 0);
      if (i !== fragmento.length) throw Error("Símbolos extras após a fórmula.");
      return atomos;
    }
    const partes = texto.split(/[·.]/);
    for (let p = 0; p < partes.length; p++) {
      let trecho = partes[p];
      if (!trecho) throw Error("Notação de hidrato incompleta.");
      let coeficiente = 1;
      if (p > 0) {
        const match = trecho.match(/^\d+/);
        if (match) {
          coeficiente = Number(match[0]);
          if (coeficiente < 1 || coeficiente > 999) throw Error("Coeficiente de hidratação inválido.");
          trecho = trecho.slice(match[0].length);
        }
      }
      if (!trecho) throw Error("Faltou a fórmula após o coeficiente.");
      somar(composicao, interpretar(trecho), coeficiente);
    }
    const massa = Object.keys(composicao).reduce(function (total, simbolo) {
      return total + porSimbolo[simbolo].massa * composicao[simbolo];
    }, 0);
    if (!Number.isFinite(massa) || massa > 10000000) throw Error("Fórmula fora do limite didático.");
    return { massa: massa, atomos: Object.assign({}, composicao) };
  }
  function positivo(valor, nome) {
    const n = Number(String(valor).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) throw Error(nome + " deve ser maior que zero.");
    return n;
  }
  function quantidade(massaGramas, formula) {
    const m = positivo(massaGramas, "A massa");
    const molar = massaMolar(formula).massa;
    return { mols: m / molar, molar: molar };
  }
  function concentracao(mols, volumeL) {
    return positivo(mols, "A quantidade de matéria") / positivo(volumeL, "O volume");
  }
  function diluicao(c1, v1, c2) {
    const inicial = positivo(c1, "A concentração inicial");
    const volume = positivo(v1, "O volume inicial");
    const final = positivo(c2, "A concentração final");
    if (final > inicial) throw Error("Em uma diluição, a concentração final não pode ser maior.");
    return inicial * volume / final;
  }
  function formatar(n, casas) {
    return n.toLocaleString("pt-BR", { maximumFractionDigits: casas === undefined ? 4 : casas });
  }
  function normalizar(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
  /* Elementos favoritos: dados mínimos somente neste dispositivo, isolados por
   * UID Firebase e sem chamadas ao Firestore. Se o armazenamento do navegador
   * não estiver acessível, a lista permanece útil apenas durante a sessão. */
  const PREFIXO_FAVORITOS = "gremio-lab-elementos-favoritos-v1:";
  let favoritos = new Set();
  let chaveFavoritosAtiva = null;
  let elementoSelecionado = 6;
  let storageFavoritos = null;
  function normalizarFavoritos(valores) {
    if (!Array.isArray(valores)) return [];
    const lista = new Set();
    for (const z of valores) {
      if (typeof z === "number" && Number.isInteger(z) && z >= 1 && z <= elementos.length) lista.add(z);
    }
    return [...lista].sort((a, b) => a - b);
  }
  function chaveFavoritos(uid) {
    if (typeof uid !== "string" || uid.length < 1 || uid.length > 180 || !/^[A-Za-z0-9_.:-]+$/.test(uid)) return null;
    return PREFIXO_FAVORITOS + uid;
  }
  function lerFavoritos(storage, chave) {
    if (!storage || !chave) return [];
    try {
      const valor = storage.getItem(chave);
      return valor === null ? [] : normalizarFavoritos(JSON.parse(valor));
    } catch (_) {
      return [];
    }
  }
  function salvarFavoritos(storage, chave, valores) {
    if (!storage || !chave) return false;
    try {
      storage.setItem(chave, JSON.stringify(normalizarFavoritos(valores)));
      return true;
    } catch (_) {
      return false;
    }
  }
  function prepararFavoritos() {
    const uid = typeof auth !== "undefined" && auth.currentUser ? auth.currentUser.uid : null;
    const chave = chaveFavoritos(uid);
    if (chave === chaveFavoritosAtiva) return;
    chaveFavoritosAtiva = chave;
    favoritos = new Set();
    elementoSelecionado = 6;
    try { storageFavoritos = window.localStorage; } catch (_) { storageFavoritos = null; }
    favoritos = new Set(lerFavoritos(storageFavoritos, chave));
    const aviso = document.getElementById("lab-favoritos-privacidade");
    if (aviso) aviso.textContent = chave
      ? "Seus elementos ficam somente neste navegador, separados por conta. Não sincronizam com outros aparelhos."
      : "Entre na sua conta para salvar favoritos neste navegador.";
  }
  function renderListaFavoritos() {
    const lista = document.getElementById("lab-favoritos-lista");
    const contador = document.getElementById("lab-favoritos-contador");
    if (!lista || !contador) return;
    const zlist = normalizarFavoritos([...favoritos]);
    contador.textContent = zlist.length + (zlist.length === 1 ? " elemento marcado" : " elementos marcados");
    lista.replaceChildren();
    if (!zlist.length) {
      const vazio = document.createElement("span");
      vazio.className = "small text-muted";
      vazio.textContent = "Nenhum elemento favorito. Selecione um elemento na tabela e toque em ☆ Adicionar.";
      lista.appendChild(vazio);
    } else {
      for (const z of zlist) {
        const e = elementos[z - 1];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-outline-success btn-sm";
        btn.dataset.favoritoZ = String(z);
        btn.textContent = "★ " + e.simbolo + " · " + e.nome;
        btn.setAttribute("aria-label", "Consultar " + e.nome + ", elemento favorito");
        lista.appendChild(btn);
      }
    }
    const somente = document.getElementById("lab-favoritos-somente");
    if (somente) somente.disabled = zlist.length === 0;
    if (somente && !zlist.length) somente.checked = false;
  }
  function atualizarBotaoFavorito() {
    const btn = document.getElementById("lab-favorito-alternar");
    if (!btn) return;
    const e = elementos[elementoSelecionado - 1];
    const marcado = favoritos.has(elementoSelecionado);
    btn.textContent = marcado ? "★ Remover dos favoritos" : "☆ Adicionar aos favoritos";
    btn.setAttribute("aria-pressed", String(marcado));
    btn.setAttribute("aria-label", (marcado ? "Remover " : "Adicionar ") + e.nome +
      (marcado ? " dos favoritos" : " aos favoritos"));
  }
  function alternarFavorito() {
    const z = elementoSelecionado;
    if (!elementos[z - 1]) return;
    if (favoritos.has(z)) favoritos.delete(z);
    else favoritos.add(z);
    const salvo = salvarFavoritos(storageFavoritos, chaveFavoritosAtiva, [...favoritos]);
    renderListaFavoritos();
    atualizarBotaoFavorito();
    renderTabela();
    const aviso = document.getElementById("lab-favoritos-resultado");
    if (aviso) aviso.textContent = (favoritos.has(z) ? "Marcado: " : "Removido: ") + elementos[z - 1].nome +
      (salvo ? ". Salvo neste navegador." : ". Disponível apenas nesta sessão.");
  }
  function elementoBotao(e) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "lab-elemento lab-" + categoria(e) + (favoritos.has(e.z) ? " lab-favorito" : "");
    b.style.gridColumn = String(e.grupo);
    b.style.gridRow = String(e.periodo);
    b.dataset.numero = String(e.z);
    b.setAttribute("aria-label", e.nome + ", " + e.simbolo + ", número atômico " + e.z + (favoritos.has(e.z) ? ", favorito" : ""));
    const numero = document.createElement("small");
    numero.textContent = String(e.z);
    const simbolo = document.createElement("strong");
    simbolo.textContent = e.simbolo;
    b.append(numero, simbolo);
    return b;
  }
  function exibirDetalhe(z) {
    const e = elementos[z - 1];
    const caixa = document.getElementById("lab-detalhes");
    if (!e || !caixa) return;
    elementoSelecionado = z;
    const grupo = e.grupo === 0 ? "bloco f" : "grupo " + e.grupo;
    caixa.textContent = e.nome + " (" + e.simbolo + ") · Z = " + e.z +
      " · Massa de referência ≈ " + formatar(e.massa, 3) + " u · Período " +
      e.periodo + ", " + grupo + " · " + familias[categoria(e)] + ".";
    atualizarBotaoFavorito();
  }
  function renderTabela() {
    const principal = document.getElementById("lab-tabela");
    const listaF = document.getElementById("lab-bloco-f");
    if (!principal || !listaF) return;
    const filtro = normalizar(document.getElementById("lab-busca").value);
    const familia = document.getElementById("lab-familia").value;
    const somenteFavoritos = document.getElementById("lab-favoritos-somente")?.checked || false;
    principal.replaceChildren();
    listaF.replaceChildren();
    for (const e of elementos) {
      const botao = elementoBotao(e);
      if (filtro && !normalizar(e.nome + " " + e.simbolo + " " + e.z).includes(filtro)) {
        botao.classList.add("lab-apagado");
      }
      if (familia && categoria(e) !== familia) botao.classList.add("lab-apagado");
      if (somenteFavoritos && !favoritos.has(e.z)) botao.classList.add("lab-apagado");
      (e.grupo === 0 ? listaF : principal).appendChild(botao);
      if (e.grupo === 0) {
        botao.style.gridColumn = String((e.periodo === 6 ? e.z - 57 : e.z - 89));
        botao.style.gridRow = String(e.periodo - 5);
      }
    }
  }
  function ajustarCampos() {
    const modo = document.getElementById("lab-operacao").value;
    for (const [id, visivel] of [
      ["lab-campo-formula", modo === "molar" || modo === "quantidade"],
      ["lab-campo-massa", modo === "quantidade"],
      ["lab-campo-mols", modo === "concentracao"],
      ["lab-campo-volume", modo === "concentracao"],
      ["lab-campo-diluicao", modo === "diluicao"]
    ]) document.getElementById(id).hidden = !visivel;
    document.getElementById("lab-resultado").textContent = "Informe os dados e selecione Calcular.";
  }
  function calcularUI() {
    const g = id => document.getElementById(id).value.trim();
    const modo = g("lab-operacao");
    const resultado = document.getElementById("lab-resultado");
    try {
      let texto;
      if (modo === "molar") {
        const m = massaMolar(g("lab-formula")).massa;
        texto = "Massa molar ≈ " + formatar(m, 4) + " g/mol. Soma das massas atômicas na fórmula.";
      } else if (modo === "quantidade") {
        const r = quantidade(g("lab-massa"), g("lab-formula"));
        texto = "n = m / M = " + formatar(positivo(g("lab-massa"), "A massa"), 4) +
          " g / " + formatar(r.molar, 4) + " g/mol = " + formatar(r.mols, 6) + " mol.";
      } else if (modo === "concentracao") {
        texto = "C = n / V = " + formatar(concentracao(g("lab-mols"), g("lab-volume")), 6) + " mol/L.";
      } else if (modo === "diluicao") {
        const v2 = diluicao(g("lab-c1"), g("lab-v1"), g("lab-c2"));
        texto = "C₁V₁ = C₂V₂ ⇒ V₂ = " + formatar(v2, 4) + " mL (volume final teórico).";
      } else throw Error("Selecione uma operação válida.");
      resultado.className = "alert alert-success small mt-2 mb-0";
      resultado.textContent = texto;
    } catch (e) {
      resultado.className = "alert alert-warning small mt-2 mb-0";
      resultado.textContent = e.message;
    }
  }
  function linkSeguro(link) {
    try {
      const url = new URL(link);
      return url.protocol === "https:" ? url.href : null;
    } catch (_) { return null; }
  }
  function renderConteudos(docs) {
    const box = document.getElementById("lab-conteudos");
    if (!box) return;
    box.replaceChildren();
    if (!docs.length) {
      box.textContent = "Ainda não há conteúdos complementares publicados pelo Grêmio.";
      return;
    }
    const ordenados = docs.slice().sort((a, b) => {
      const d = x => x.criadoEm && typeof x.criadoEm.toMillis === "function" ? x.criadoEm.toMillis() : 0;
      return d(b) - d(a);
    });
    for (const item of ordenados) {
      const bloco = document.createElement("article");
      bloco.className = "border rounded p-3 mb-2 bg-light";
      const titulo = document.createElement("strong");
      titulo.className = "d-block";
      titulo.textContent = item.titulo || "Conteúdo";
      const descricao = document.createElement("p");
      descricao.className = "small text-muted mb-1";
      descricao.textContent = (item.assunto || "Química") + " · " + (item.descricao || "");
      bloco.append(titulo, descricao);
      const href = linkSeguro(item.link);
      if (href) {
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Abrir conteúdo de estudo";
        a.className = "btn btn-sm btn-outline-success";
        bloco.appendChild(a);
      }
      box.appendChild(bloco);
    }
  }
  function iniciarPortal() {
    if (typeof document === "undefined") return;
    const secao = document.getElementById("sec-laboratorio");
    if (!secao) return;
    if (secao.dataset.labPronto !== "sim") {
      secao.dataset.labPronto = "sim";
      document.getElementById("lab-busca").addEventListener("input", renderTabela);
      document.getElementById("lab-familia").addEventListener("change", renderTabela);
      document.getElementById("lab-favorito-alternar").addEventListener("click", alternarFavorito);
      document.getElementById("lab-favoritos-somente").addEventListener("change", renderTabela);
      document.getElementById("lab-favoritos-lista").addEventListener("click", function (ev) {
        const alvo = ev.target.closest("button[data-favorito-z]");
        if (!alvo) return;
        exibirDetalhe(Number(alvo.dataset.favoritoZ));
        document.getElementById("lab-detalhes").scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      document.getElementById("lab-operacao").addEventListener("change", ajustarCampos);
      document.getElementById("lab-calcular").addEventListener("click", calcularUI);
      for (const id of ["lab-tabela", "lab-bloco-f"]) {
        document.getElementById(id).addEventListener("click", function (ev) {
          const botao = ev.target.closest("button[data-numero]");
          if (botao) exibirDetalhe(Number(botao.dataset.numero));
        });
      }
      document.getElementById("lab-exemplo").addEventListener("click", function () {
        document.getElementById("lab-operacao").value = "molar";
        ajustarCampos();
        document.getElementById("lab-formula").value = "Ca(OH)2";
        calcularUI();
      });
      ajustarCampos();
    }
    prepararFavoritos();
    renderListaFavoritos();
    renderTabela();
    exibirDetalhe(elementoSelecionado);
    const caixa = document.getElementById("lab-conteudos");
    caixa.textContent = "Carregando conteúdos complementares...";
    if (typeof db === "undefined" || typeof usuarioAtual === "undefined" || !usuarioAtual) return;
    // A consulta filtrada permite leitura somente dos conteúdos publicados.
    const cancelar = db.collection("laboratorio_conteudos").where("publicado", "==", true)
      .limit(100).onSnapshot(function (snap) {
        renderConteudos(snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
      }, function (erro) {
        console.error("laboratorio_conteudos", erro);
        caixa.textContent = "Não foi possível carregar os conteúdos. As ferramentas científicas continuam disponíveis.";
      });
    if (typeof unsubs !== "undefined") unsubs.push(cancelar);
  }
  const API = Object.freeze({
    elementos: elementos, categoria: categoria, massaMolar: massaMolar,
    quantidade: quantidade, concentracao: concentracao, diluicao: diluicao,
    iniciarPortal: iniciarPortal, renderTabela: renderTabela,
    normalizarFavoritos: normalizarFavoritos, chaveFavoritos: chaveFavoritos,
    lerFavoritos: lerFavoritos, salvarFavoritos: salvarFavoritos
  });
  root.LaboratorioQuimica = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
