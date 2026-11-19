/* Laboratório Virtual — módulos interativos adicionais.
 * Simulações matemáticas e modelos estruturais ilustrativos; sem protocolos
 * de experimentos físicos, armazenamento de respostas ou dados pessoais.
 */
(function(root) {
"use strict";
const base = root.LaboratorioQuimica || (typeof require === "function" ? require("./laboratorio-quimica.js") : null);
const MODELOS = Object.freeze([
  { id:"agua", nome:"Água", formula:"H₂O", geometria:"Angular", angulo:"≈ 104,5°", descricao:"O oxigênio central forma duas ligações e possui dois pares de elétrons não ligantes. O modelo mostra o ângulo H–O–H.",
    atomos:[["O",0,0,0],["H",-0.79,0.61,0],["H",0.79,0.61,0]], ligacoes:[[0,1,1],[0,2,1]] },
  { id:"co2", nome:"Dióxido de carbono", formula:"CO₂", geometria:"Linear", angulo:"180°", descricao:"O carbono central apresenta duas regiões de ligação. A geometria molecular é linear.",
    atomos:[["O",-1.2,0,0],["C",0,0,0],["O",1.2,0,0]], ligacoes:[[0,1,2],[1,2,2]] },
  { id:"metano", nome:"Metano", formula:"CH₄", geometria:"Tetraédrica", angulo:"≈ 109,5°", descricao:"Quatro ligações ao redor do carbono apontam para os vértices de um tetraedro.",
    atomos:[["C",0,0,0],["H",0.67,0.67,0.67],["H",-0.67,-0.67,0.67],["H",-0.67,0.67,-0.67],["H",0.67,-0.67,-0.67]], ligacoes:[[0,1,1],[0,2,1],[0,3,1],[0,4,1]] },
  { id:"amonia", nome:"Amônia", formula:"NH₃", geometria:"Piramidal trigonal", angulo:"≈ 107°", descricao:"O nitrogênio tem três ligações e um par de elétrons não ligante, formando uma pirâmide trigonal.",
    atomos:[["N",0,0,0],["H",0.928,0,-0.372],["H",-0.464,0.804,-0.372],["H",-0.464,-0.804,-0.372]], ligacoes:[[0,1,1],[0,2,1],[0,3,1]] },
  { id:"trifluoreto", nome:"Trifluoreto de boro", formula:"BF₃", geometria:"Trigonal plana", angulo:"120°", descricao:"Três regiões de ligação distribuem-se em um plano ao redor do boro. Representação conceitual.",
    atomos:[["B",0,0,0],["F",1,0,0],["F",-0.5,0.866,0],["F",-0.5,-0.866,0]], ligacoes:[[0,1,1],[0,2,1],[0,3,1]] },
  { id:"eteno", nome:"Eteno", formula:"C₂H₄", geometria:"Trigonal plana ao redor de cada carbono", angulo:"≈ 120°", descricao:"A ligação dupla C=C restringe a rotação; a estrutura ilustrada é aproximadamente plana.",
    atomos:[["C",-0.62,0,0],["C",0.62,0,0],["H",-1.22,0.82,0],["H",-1.22,-0.82,0],["H",1.22,0.82,0],["H",1.22,-0.82,0]],
    ligacoes:[[0,1,2],[0,2,1],[0,3,1],[1,4,1],[1,5,1]] }
]);
const EQUACOES = Object.freeze([
  {id:"agua",rotulo:"Formação de água (modelo simbólico)", reagentes:["H2","O2"], produtos:["H2O"], solucao:[2,1,2], explicacao:"Dois H₂ e um O₂ correspondem a duas moléculas de H₂O: quatro átomos de H e dois de O em cada lado."},
  {id:"amonia",rotulo:"Formação de amônia (modelo simbólico)", reagentes:["N2","H2"], produtos:["NH3"], solucao:[1,3,2], explicacao:"O balanço mínimo tem dois nitrogênios e seis hidrogênios de cada lado; não representa condições de produção."},
  {id:"ferro",rotulo:"Formação de óxido de ferro (modelo simbólico)", reagentes:["Fe","O2"], produtos:["Fe2O3"], solucao:[4,3,2], explicacao:"Quatro átomos de ferro e seis de oxigênio em cada lado."},
  {id:"carbonato",rotulo:"Decomposição simbólica de carbonato", reagentes:["CaCO3"], produtos:["CaO","CO2"], solucao:[1,1,1], explicacao:"Um Ca, um C e três O aparecem nos dois lados. Não tente realizar a transformação física."},
  {id:"metano",rotulo:"Equação simbólica do metano", reagentes:["CH4","O2"], produtos:["CO2","H2O"], solucao:[1,2,1,2], explicacao:"Um C, quatro H e quatro O de cada lado, sem instruções de combustão real."}
]);
const MISSOES = Object.freeze([
  {id:"elementos",titulo:"⚛️ Explorador dos elementos",nivel:"Iniciante",perguntas:[
    {p:"Qual é o número atômico do carbono?",o:["6","12","8","14"],c:0,e:"O carbono possui 6 prótons no núcleo: Z = 6."},
    {p:"O símbolo Na corresponde a qual elemento?",o:["Nitrogênio","Sódio","Neônio","Níquel"],c:1,e:"Na é o símbolo do sódio, do latim natrium."},
    {p:"Qual destes elementos pertence aos gases nobres?",o:["Cloro","Oxigênio","Hélio","Sódio"],c:2,e:"Hélio pertence ao grupo 18, o dos gases nobres."}
  ]},
  {id:"moleculas",titulo:"🧬 Geometrias moleculares",nivel:"Intermediário",perguntas:[
    {p:"Qual é a geometria molecular aproximada da água?",o:["Linear","Angular","Tetraédrica","Trigonal plana"],c:1,e:"A água é angular, com ângulo H–O–H próximo de 104,5°."},
    {p:"Qual geometria representa as quatro ligações do metano?",o:["Tetraédrica","Angular","Linear","Quadrada planar"],c:0,e:"No CH₄ as quatro ligações C–H apontam aproximadamente para um tetraedro."},
    {p:"Na molécula CO₂, qual ângulo O–C–O é esperado?",o:["90°","104,5°","120°","180°"],c:3,e:"O CO₂ é linear, com ângulo de 180° entre as ligações."}
  ]},
  {id:"calculos",titulo:"🧮 Investigador dos cálculos",nivel:"Intermediário",perguntas:[
    {p:"Qual é aproximadamente a massa molar da água (H₂O)?",o:["10 g/mol","18 g/mol","28 g/mol","44 g/mol"],c:1,e:"Dois hidrogênios (~1 g/mol cada) e um oxigênio (~16 g/mol) totalizam ~18 g/mol."},
    {p:"Qual relação calcula a quantidade de matéria a partir da massa?",o:["n = M/m","n = m × M","n = m/M","n = V/m"],c:2,e:"A quantidade de matéria em mol é a massa (g) dividida pela massa molar (g/mol)."},
    {p:"Em uma diluição ideal, qual relação é usada?",o:["C₁V₁ = C₂V₂","C₁+C₂ = V₁+V₂","C₁/V₁ = C₂×V₂","C₁ = V₂/V₁"],c:0,e:"Na diluição, a quantidade de soluto é conservada: C₁V₁ = C₂V₂."}
  ]},
  {id:"reacoes",titulo:"⚗️ Mestre do balanceamento e pH",nivel:"Avançado",perguntas:[
    {p:"Quais coeficientes balanceiam H₂ + O₂ → H₂O?",o:["1, 1, 1","2, 1, 2","1, 2, 1","2, 2, 1"],c:1,e:"Com 2 H₂ + O₂ → 2 H₂O são quatro H e dois O em cada lado."},
    {p:"Qual grandeza deve ser conservada no balanceamento?",o:["Número de moléculas","Coeficientes iguais","Número de átomos de cada elemento","Temperatura"],c:2,e:"Em uma equação balanceada, cada elemento tem o mesmo número de átomos nos dois lados."},
    {p:"Qual é o pH neutro do modelo aquoso ideal a 25 °C?",o:["0","3","7","14"],c:2,e:"A 25 °C, no modelo ideal, pH = 7 corresponde à neutralidade."}
  ]}
]);
function classeModelo(id) { return MODELOS.find(m=>m.id===id) || MODELOS[0]; }
function girarPonto([x,y,z],ax,ay) {
  const r = Math.PI/180, cx = Math.cos(ax*r), sx = Math.sin(ax*r), cy = Math.cos(ay*r), sy = Math.sin(ay*r);
  const px=x*cy+z*sy, pz=-x*sy+z*cy;
  return [px, y*cx-pz*sx, y*sx+pz*cx];
}
function contarAtoms(formulas,coeficientes) {
  const soma=Object.create(null);
  if(formulas.length!==coeficientes.length)throw Error("Quantidade de coeficientes incompatível.");
  formulas.forEach((f,i)=>{
    const c=Number(coeficientes[i]);
    if(!Number.isInteger(c)||c<1||c>12)throw Error("Cada coeficiente deve ser um inteiro entre 1 e 12.");
    const atoms=base.massaMolar(f).atomos;
    for(const simbolo of Object.keys(atoms))soma[simbolo]=(soma[simbolo]||0)+atoms[simbolo]*c;
  });
  return soma;
}
function balanceamento(eq,coeficientes) {
  if(!eq || !Array.isArray(eq.reagentes) || !Array.isArray(eq.produtos))throw Error("Equação inválida.");
  const n=eq.reagentes.length;
  if(!Array.isArray(coeficientes)||coeficientes.length!==n+eq.produtos.length)throw Error("Informe todos os coeficientes.");
  const esquerda=contarAtoms(eq.reagentes,coeficientes.slice(0,n));
  const direita=contarAtoms(eq.produtos,coeficientes.slice(n));
  const elementos=[...new Set([...Object.keys(esquerda),...Object.keys(direita)])].sort();
  return {esquerda,direita,elementos,balanceada:elementos.every(s=>esquerda[s]===direita[s])};
}
function modeloPH(valor) {
  const p=Number(valor);
  if(valor==="" || valor===null || !Number.isFinite(p) || p<0 || p>14)throw Error("O pH do modelo deve estar entre 0 e 14.");
  const pOH=14-p;
  return {pH:p,pOH,h:Math.pow(10,-p),oh:Math.pow(10,-pOH),tipo:Math.abs(p-7)<1e-9?"Neutra":p<7?"Ácida":"Básica"};
}
function el(tag,attrs,texto) {
  const node=document.createElement(tag);
  if(attrs)for(const [chave,valor] of Object.entries(attrs)){
    if(chave==="className")node.className=valor;
    else node.setAttribute(chave,valor);
  }
  if(texto!==undefined)node.textContent=String(texto);
  return node;
}
function svgEl(tag,attrs,texto) {
  const node=document.createElementNS("http://www.w3.org/2000/svg",tag);
  if(attrs)for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);
  if(texto!==undefined)node.textContent=String(texto);
  return node;
}
function renderModelo() {
  const m=classeModelo(document.getElementById("lab-molecula").value);
  const ax=Number(document.getElementById("lab-mol-x").value),ay=Number(document.getElementById("lab-mol-y").value);
  const tela=document.getElementById("lab-mol-tela");
  if(!tela)return;
  const svg=svgEl("svg",{viewBox:"0 0 520 310",role:"img","aria-label":"Modelo espacial ilustrativo da molécula de "+m.nome});
  svg.style.width="100%";svg.style.maxHeight="310px";
  const coords=m.atomos.map((a)=>{
    const [x,y,z]=girarPonto(a.slice(1),ax,ay);
    return {simbolo:a[0],x:260+x*95,y:155-y*95,z,raio:a[0]==="H"?17:23};
  });
  for(const [i,j,ordem] of m.ligacoes){
    const a=coords[i],b=coords[j];
    for(let k=0;k<ordem;k++){
      const offset=(k-(ordem-1)/2)*7,dx=b.x-a.x,dy=b.y-a.y;
      const tam=Math.hypot(dx,dy)||1;
      svg.appendChild(svgEl("line",{
        x1:a.x-dy/tam*offset,y1:a.y+dx/tam*offset,
        x2:b.x-dy/tam*offset,y2:b.y+dx/tam*offset,
        stroke:"#64748b","stroke-width":"6","stroke-linecap":"round"
      }));
    }
  }
  const cores={H:"#f8fafc",C:"#374151",O:"#e75b5b",N:"#3b82f6",B:"#e8a6c5",F:"#70c892"};
  coords.map((a,i)=>({...a,i})).sort((a,b)=>a.z-b.z).forEach(a=>{
    const circulo=svgEl("circle",{cx:a.x,cy:a.y,r:a.raio,fill:cores[a.simbolo]||"#d1d5db",stroke:"#334155","stroke-width":"2"});
    const letra=svgEl("text",{x:a.x,y:a.y+5,"text-anchor":"middle","font-size":"17","font-weight":"bold",
      fill:a.simbolo==="C"?"#ffffff":"#10202e"},a.simbolo);
    svg.append(circulo,letra);
  });
  tela.replaceChildren(svg);
  document.getElementById("lab-mol-info").textContent=
    m.nome+" ("+m.formula+") · Geometria: "+m.geometria+" · Ângulo: "+m.angulo+". "+m.descricao;
}
function criarCoeficientes() {
  const eq=EQUACOES.find(e=>e.id===document.getElementById("lab-bal-equacao").value)||EQUACOES[0];
  const box=document.getElementById("lab-bal-campos");box.replaceChildren();
  const t=el("div",{className:"d-flex flex-wrap gap-2 align-items-end mb-2"});
  let pos=0;
  for(const [lado,lista] of [["Reagentes",eq.reagentes],["Produtos",eq.produtos]]){
    t.appendChild(el("span",{className:"small fw-bold align-self-center"},lado+":"));
    for(const formula of lista) {
      const col=el("label",{className:"d-flex flex-column small text-center"});
      col.appendChild(el("span",null,formula));
      const input=el("input",{className:"form-control form-control-sm lab-bal-valor",type:"number",min:"1",max:"12",step:"1",value:"1","data-pos":String(pos++)});
      input.style.width="67px";input.addEventListener("input",atualizarBalanceamento);
      col.appendChild(input);t.appendChild(col);
    }
  }
  box.appendChild(t);
  document.getElementById("lab-bal-gabarito").hidden=true;
  atualizarBalanceamento();
}
function atualizarBalanceamento() {
  const eq=EQUACOES.find(e=>e.id===document.getElementById("lab-bal-equacao").value)||EQUACOES[0];
  const coef=[...document.querySelectorAll("#lab-bal-campos .lab-bal-valor")].map(i=>i.value);
  const saida=document.getElementById("lab-bal-retorno");
  const tabela=document.getElementById("lab-bal-contagem");
  tabela.replaceChildren();
  try{
    const dados=balanceamento(eq,coef);
    const table=el("table",{className:"table table-sm table-bordered small mt-2 mb-1"});
    table.appendChild(el("caption",{className:"small"},"Contagem de átomos: reagentes e produtos"));
    const head=el("thead"),headRow=el("tr");
    ["Elemento","Reagentes","Produtos"].forEach(x=>headRow.appendChild(el("th",{scope:"col"},x)));
    head.appendChild(headRow);table.appendChild(head);
    const tbody=el("tbody");
    dados.elementos.forEach(s=>{
      const linha=el("tr");
      linha.appendChild(el("th",{scope:"row"},s));
      linha.appendChild(el("td",null,dados.esquerda[s]||0));
      linha.appendChild(el("td",null,dados.direita[s]||0));
      if(dados.esquerda[s]!==dados.direita[s])linha.classList.add("table-warning");
      tbody.appendChild(linha);
    });
    table.appendChild(tbody);tabela.appendChild(table);
    saida.textContent=dados.balanceada?"✅ Equação balanceada: a quantidade de átomos é igual dos dois lados.":
      "Ainda não está balanceada. Compare a quantidade de cada elemento na tabela.";
    saida.className="small fw-bold "+(dados.balanceada?"text-success":"text-muted");
  }catch(err){saida.textContent=err.message;saida.className="text-danger small";tabela.replaceChildren();}
}
function mostrarBalanceamento() {
  const eq=EQUACOES.find(e=>e.id===document.getElementById("lab-bal-equacao").value)||EQUACOES[0];
  document.getElementById("lab-bal-gabarito").hidden=false;
  const esquerda=eq.reagentes.map((x,i)=>eq.solucao[i]+" "+x).join(" + ");
  const direita=eq.produtos.map((x,i)=>eq.solucao[i+eq.reagentes.length]+" "+x).join(" + ");
  document.getElementById("lab-bal-gabarito").textContent=esquerda+" → "+direita+". "+eq.explicacao;
}
function renderPH() {
  const resultado=modeloPH(document.getElementById("lab-ph-valor").value);
  const h=document.getElementById("lab-ph-referencia"),texto=document.getElementById("lab-ph-resultado");
  document.getElementById("lab-ph-numero").textContent=resultado.pH.toLocaleString("pt-BR",{maximumFractionDigits:1});
  const hue=resultado.pH<=7? Math.round(resultado.pH/7*115):Math.round(115+(resultado.pH-7)/7*135);
  h.style.backgroundColor="hsl("+hue+",75%,67%)";
  h.textContent="Modelo de solução "+resultado.tipo.toLowerCase()+" · pH "+resultado.pH.toLocaleString("pt-BR");
  texto.textContent="pOH = "+resultado.pOH.toLocaleString("pt-BR",{maximumFractionDigits:1})+
    " · [H⁺] = "+resultado.h.toExponential(2)+" mol/L · [OH⁻] = "+resultado.oh.toExponential(2)+
    " mol/L. Ao variar 1 unidade de pH, [H⁺] varia por um fator de 10.";
}
let sessaoConcluida=new Set();
let missaoAtual=null;
let missaoIndice=0;
let esperandoResposta=false;
let progressoDisponivel=false;
let emailProgresso="";
const IDS=Object.freeze(MISSOES.map(m=>m.id));
function questoesGremio(){
  let banco=[];
  try{if(typeof questoesBanco!=="undefined" && Array.isArray(questoesBanco))banco=questoesBanco;}catch(_){}
  return banco.filter(q=>/qu[ií]mic|estequiometr|ligac|mol[eé]cul|f[ií]sico.qu/i.test(String(q.disciplina||"")) &&
      q.enunciado && Array.isArray(q.alternativas) && q.alternativas.length===4 &&
      q.alternativas.every(a=>typeof a==="string" && a.length>0 && a.length<=250) &&
      Number.isInteger(q.correta) && q.correta>=0 && q.correta<4).slice(0,10).map(q=>({
    p:q.enunciado.slice(0,400),o:q.alternativas.slice(),c:q.correta,e:String(q.explicacao||"Confira o conteúdo correspondente.").slice(0,600)
  }));
}
function missaoSelecionada(){
  const id=document.getElementById("lab-missao-escolha").value;
  if(id==="gremio")return {id:"gremio",titulo:"🧠 Desafio extra do Grêmio",nivel:"Questões cadastradas",perguntas:questoesGremio().slice(0,5)};
  return MISSOES.find(m=>m.id===id)||MISSOES[0];
}
function atualizarMissoes(){
  const escolha=document.getElementById("lab-missao-escolha");
  if(!escolha)return;
  const atual=escolha.value;
  escolha.replaceChildren();
  for(const m of MISSOES)escolha.appendChild(el("option",{value:m.id},m.titulo+" · "+m.nivel));
  if(questoesGremio().length)escolha.appendChild(el("option",{value:"gremio"},"🧠 Desafio extra do Grêmio · questões do Quiz"));
  escolha.value=[...escolha.options].some(o=>o.value===atual)?atual:MISSOES[0].id;
  atualizarPlacar();
}
function atualizarPlacar(){
  const marcado=IDS.filter(id=>sessaoConcluida.has(id)).length;
  const res=document.getElementById("lab-missao-progresso");
  if(!res)return;
  res.textContent=marcado+" de "+MISSOES.length+" missões principais concluídas. "+
    (progressoDisponivel?"Progresso salvo privadamente na sua conta.":"Acompanhamento nesta sessão; sincronização com Firebase indisponível.");
  const texto=document.getElementById("lab-missao-placar");
  texto.replaceChildren();
  for(const m of MISSOES)texto.appendChild(el("span",
    {className:"badge me-1 mb-1 "+(sessaoConcluida.has(m.id)?"bg-success":"bg-secondary")},
    (sessaoConcluida.has(m.id)?"✓ ":"• ")+m.titulo.replace(/^[^\w]+\s*/u,"")));
}
function iniciarMissao() {
  missaoAtual=missaoSelecionada();
  missaoIndice=0;esperandoResposta=false;
  document.getElementById("lab-missao-box").hidden=false;
  mostrarQuestao();
}
function mostrarQuestao() {
  const box=document.getElementById("lab-missao-box");
  box.replaceChildren();
  if(!missaoAtual || !missaoAtual.perguntas.length){
    box.textContent="Ainda não há questões para esse desafio.";
    return;
  }
  const q=missaoAtual.perguntas[missaoIndice];
  box.appendChild(el("p",{className:"small text-muted mb-1"},"Questão "+(missaoIndice+1)+" de "+missaoAtual.perguntas.length));
  box.appendChild(el("h6",{className:"fw-bold"},q.p));
  const respostas=el("div",{className:"d-grid gap-2"});
  const retorno=el("div",{className:"small mt-2","aria-live":"polite",role:"status"});
  const proxima=el("button",{type:"button",className:"btn btn-ifce btn-sm mt-2"},"Próxima questão");
  proxima.hidden=true;
  q.o.forEach((opcao,i)=>{
    const btn=el("button",{type:"button",className:"btn btn-outline-secondary btn-sm text-start"},String.fromCharCode(65+i)+") "+opcao);
    btn.addEventListener("click",()=>{
      if(esperandoResposta)return;
      if(i===q.c){
        esperandoResposta=true;
        retorno.textContent="✅ Correto! "+q.e;
        retorno.className="small text-success mt-2";
        [...respostas.querySelectorAll("button")].forEach(b=>b.disabled=true);
        btn.classList.add("btn-success");
        proxima.hidden=false;
        proxima.textContent=missaoIndice===missaoAtual.perguntas.length-1?"Concluir missão":"Próxima questão";
      }else{
        retorno.textContent="Ainda não. Tente novamente e pense no conceito estudado.";
        retorno.className="small text-warning mt-2";
        btn.disabled=true;
      }
    });
    respostas.appendChild(btn);
  });
  proxima.addEventListener("click",()=>{
    if(!esperandoResposta)return;
    if(missaoIndice+1 < missaoAtual.perguntas.length){
      missaoIndice++;esperandoResposta=false;mostrarQuestao();
    }else{
      concluirMissao(missaoAtual);
    }
  });
  box.append(respostas,retorno,proxima);
}
async function concluirMissao(m){
  if(IDS.includes(m.id)){
    sessaoConcluida.add(m.id);
    atualizarPlacar();
    await salvarProgresso();
  }
  const box=document.getElementById("lab-missao-box");
  box.replaceChildren();
  box.appendChild(el("p",{className:"alert alert-success small mb-2"},"🎉 Missão concluída! Você acertou todas as questões. "+
    (m.id==="gremio"?"Esse desafio extra não altera o progresso principal.":"Seu progresso está atualizado.")));
  const voltar=el("button",{type:"button",className:"btn btn-outline-success btn-sm"},"Escolher outra missão");
  voltar.addEventListener("click",()=>{box.hidden=true;});
  box.appendChild(voltar);
}
async function salvarProgresso() {
  if(!progressoDisponivel || !emailProgresso || typeof db==="undefined")return;
  try{
    const ref=db.collection("laboratorio_progresso").doc(emailProgresso);
    await db.runTransaction(async t=>{
      const antigo=await t.get(ref);
      const remote=antigo.exists && Array.isArray(antigo.data().concluidas)?antigo.data().concluidas:[];
      const unicos=[...new Set([...remote,...sessaoConcluida])].filter(id=>IDS.includes(id));
      t.set(ref,{concluidas:unicos,atualizadoEm:firebase.firestore.FieldValue.serverTimestamp()});
    });
  }catch(err){
    console.warn("Progresso do laboratório indisponível",err.code||err.message);
    progressoDisponivel=false;
    atualizarPlacar();
  }
}
function iniciarProgresso(){
  if(typeof db==="undefined" || typeof usuarioAtual==="undefined" || !usuarioAtual || !usuarioAtual.email)return;
  emailProgresso=String(usuarioAtual.email).trim().toLowerCase();
  progressoDisponivel=false;
  sessaoConcluida=new Set();
  atualizarPlacar();
  const cancelar=db.collection("laboratorio_progresso").doc(emailProgresso).onSnapshot(snap=>{
    progressoDisponivel=true;
    if(snap.exists && Array.isArray(snap.data().concluidas)){
      const ids=snap.data().concluidas.filter(id=>IDS.includes(id));
      sessaoConcluida=new Set([...sessaoConcluida,...ids]);
    }
    atualizarPlacar();
  },err=>{
    console.warn("Acesso ao progresso do laboratório indisponível",err.code||err.message);
    progressoDisponivel=false;
    atualizarPlacar();
  });
  if(typeof unsubs!=="undefined")unsubs.push(cancelar);
}
function iniciarPortal(){
  if(typeof document==="undefined" || !document.getElementById("lab-avancado"))return;
  const area=document.getElementById("lab-avancado");
  if(area.dataset.inicializado!=="sim"){
    area.dataset.inicializado="sim";
    for(const m of MODELOS)document.getElementById("lab-molecula")
      .appendChild(el("option",{value:m.id},m.nome+" · "+m.formula));
    for(const e of EQUACOES)document.getElementById("lab-bal-equacao")
      .appendChild(el("option",{value:e.id},e.rotulo));
    document.getElementById("lab-molecula").addEventListener("change",renderModelo);
    for(const id of ["lab-mol-x","lab-mol-y"])document.getElementById(id).addEventListener("input",renderModelo);
    document.getElementById("lab-mol-resetar").addEventListener("click",()=>{
      document.getElementById("lab-mol-x").value="15";
      document.getElementById("lab-mol-y").value="20";
      renderModelo();
    });
    document.getElementById("lab-bal-equacao").addEventListener("change",criarCoeficientes);
    document.getElementById("lab-bal-gabarito-btn").addEventListener("click",mostrarBalanceamento);
    document.getElementById("lab-ph-valor").addEventListener("input",renderPH);
    document.getElementById("lab-missao-iniciar").addEventListener("click",iniciarMissao);
    document.getElementById("lab-missao-escolha").addEventListener("change",()=>{
      document.getElementById("lab-missao-box").hidden=true;
    });
    renderModelo();criarCoeficientes();renderPH();atualizarMissoes();
  }
  iniciarProgresso();
}
const API=Object.freeze({MODELOS,EQUACOES,MISSOES,girarPonto,balanceamento,modeloPH,iniciarPortal,atualizarMissoes});
root.LaboratorioAvancado=API;
if(typeof module!=="undefined" && module.exports)module.exports=API;
})(typeof window!=="undefined"?window:globalThis);
