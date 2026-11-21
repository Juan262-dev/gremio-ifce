// Primeiros passos do Portal — textos inclusivos, fluxo e acessibilidade.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

const tela = html.match(/<div id="screen-onboarding">([\s\S]*?)<nav class="navbar navbar-dark navbar-ifce/);
assert.ok(tela, 'tela de entrada presente');

test('as duas etapas de apresentação falam com estudantes de todos os cursos', () => {
  assert.match(tela[1], /GRÊMIO IFCE/);
  assert.match(tela[1], /estudantes de todos os cursos do IFCE Crateús/);
  assert.match(tela[1], /O GRÊMIO É <span>SEU<\/span>/);
  assert.match(tela[1], /TUDO EM <span>UM LUGAR<\/span>/);
  assert.doesNotMatch(tela[1], /REAGINDO AO|CONEXÃO ACADÊMICA|estudante de Química|reação de distância/);
});

test('a segunda etapa apresenta funções que existem no Portal', () => {
  assert.match(tela[1], /avisos e eventos/);
  assert.match(tela[1], /carteirinha/);
  assert.match(tela[1], /materiais de estudo/);
  assert.match(tela[1], /sugestões ao Grêmio/);
  for (const id of ['sec-avisos','sec-eventos','sec-carteira','sec-estudos','sec-sugestoes'])
    assert.match(html, new RegExp('id="' + id + '"'), id);
});

test('a terceira etapa mantém login, cadastro pendente de aprovação e recuperação', () => {
  assert.equal((tela[1].match(/class="slide-chem"/g)||[]).length, 3);
  assert.match(tela[1], /Use seu e-mail institucional/);
  assert.match(tela[1], /Primeiro acesso\? Solicitar cadastro/);
  assert.match(tela[1], /a gestão do Grêmio analisará o cadastro antes de liberar o acesso/);
  for (const id of [
    'aluno-email-input','aluno-senha-input','btn-login-aluno','cad-aluno',
    'cad-nome','cad-email','cad-senha','cad-senha2','btn-cad-aluno'
  ]) assert.match(tela[1], new RegExp('id="' + id + '"'), id);
  assert.match(tela[1], /onclick="fazerLoginAluno\(\)"/);
  assert.match(tela[1], /onclick="enviarCadastroAluno\(\)"/);
  assert.match(tela[1], /onclick="recuperarSenha\(\);return false"/);
  assert.match(tela[1], /política de privacidade e os termos de uso/);
});

test('os campos de acesso têm rótulos vinculados e preferências não presumem curso', () => {
  assert.match(tela[1], /<label for="aluno-email-input">E-mail institucional<\/label>/);
  assert.match(tela[1], /<label for="aluno-senha-input">Senha<\/label>/);
  assert.match(html, /id="perf-turma"[^>]+placeholder="Ex.: 1º ano A"/);
  for (const id of ['sec-primeiro', 'perf-materias', 'perf-lembretes'])
    assert.match(html, new RegExp('id="' + id + '"'));
  assert.match(html, /onclick="salvarPerfil\(\)"/);
});

test('indicadores preservam as três etapas com nomes acessíveis', () => {
  const dots = [...tela[1].matchAll(/<div class="dot-chem(?: active)?"[^>]+><\/div>/g)].map(x=>x[0]);
  assert.equal(dots.length, 3);
  for(let i=0;i<3;i++){
    assert.match(dots[i], new RegExp('onclick="irParaSlide\\(' + i + '\\)"'));
    assert.match(dots[i], /role="button"/);
    assert.match(dots[i], /tabindex="0"/);
    assert.match(dots[i], /aria-label="Etapa [123]:/);
    assert.match(dots[i], /aria-pressed="(?:true|false)"/);
  }
  assert.match(dots[0], /aria-pressed="true"/);
  assert.match(dots[1], /aria-pressed="false"/);
  assert.match(dots[2], /aria-pressed="false"/);
});

test('Enter e Espaço acionam a etapa e atualizam o estado acessível', () => {
  const code = html.slice(html.indexOf('let slideAtual = 0;'), html.indexOf('let startX = 0;'));
  assert.match(code, /function irParaSlide\(i\)/);
  assert.match(code, /addEventListener\('keydown'/);
  const dots=[0,1,2].map(()=>({
    attrs:{}, classes:new Set(),
    classList:{ toggle() {} },
    setAttribute(k,v){ this.attrs[k]=v; },
    closest(sel){return sel==='.dot-chem'?this:null;}
  }));
  let onkeydown;
  const wrapper={style:{transform:''}};
  const doc={
    getElementById:id=>id==='slidesWrapperChem'?wrapper:null,
    querySelectorAll:selector=>selector==='.dot-chem'?dots:[],
    querySelector:selector=>selector==='.dots-container-chem'?{
      addEventListener(type,cb){ if(type==='keydown')onkeydown=cb; }
    }:null
  };
  const ctx=vm.createContext({document:doc});
  vm.runInContext(code,ctx);
  assert.equal(typeof onkeydown,'function');
  let prevented=false;
  onkeydown({target:dots[1],key:'Enter',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(wrapper.style.transform,'translateX(-100%)');
  assert.equal(dots[1].attrs['aria-pressed'],'true');
  assert.equal(dots[0].attrs['aria-pressed'],'false');
  onkeydown({target:dots[2],key:' ',preventDefault(){}});
  assert.equal(wrapper.style.transform,'translateX(-200%)');
  assert.equal(dots[2].attrs['aria-pressed'],'true');
  onkeydown({target:dots[0],key:'Escape',preventDefault(){throw Error('key unsupported')}});
  assert.equal(wrapper.style.transform,'translateX(-200%)');
});

test('não modifica a navegação após login e preserva o acesso a recursos atuais', () => {
  const nav=html.match(/<nav id="bottom-nav"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav);
  assert.deepEqual([...nav.matchAll(/data-portal-grupo="([^"]+)"/g)].map(x=>x[1]),[
    'inicio','estudos','atividades','gremio','perfil'
  ]);
  for (const src of ['portal-navegacao.js','laboratorio-quimica.js','laboratorio-avancado.js'])
    assert.ok(html.includes('<script src="' + src + '"></script>'), src);
  assert.match(html, /auth\.onAuthStateChanged/);
  assert.match(html, /PortalNavegacao\.iniciar\(\)/);
  assert.match(html, /onclick="fazerLogoutAluno\(\)"/);
});

test('scripts embutidos permanecem sintaticamente válidos', () => {
  for(const [i,m] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries())
    assert.doesNotThrow(()=>new Function(m[1]), 'script interno '+i);
});
