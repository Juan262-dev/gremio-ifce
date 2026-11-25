/* IFCE 2027 — apenas apresentação/validação de estado, sem escrita no Firebase. */
(function(root,make){
  const api=make();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.AdminPreparacao2027=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PROJETO='gremioifce-92540';
  function estadoImplantacao(projeto,config) {
    if(projeto!==PROJETO)return {nivel:'erro',texto:'Projeto Firebase diferente do IFCE. Verifique antes de prosseguir.'};
    if(!config)return {nivel:'pendente',texto:'Configuração do sistema ausente ou indisponível. Operações bloqueadas por precaução.'};
    const liberado=config.eventosV2Habilitados===true&&config.manutencao===false
      &&config.painelCongelado===false&&config.privacidadeMigracaoBloqueada===false;
    return liberado
      ? {nivel:'atencao',texto:'As chaves permitem operar eventos, mas isso NÃO comprova regras, índices, funções ou migração.'}
      : {nivel:'pendente',texto:'Inscrições v2 bloqueadas pelas chaves de liberação. Nenhuma alteração foi feita.'};
  }
  // Um diagnóstico de cliente jamais comprova as regras/índices publicados.
  // Todos os itens exigem evidência externa; NÃO existe aprovação automática.
  function checklistLancamento(projeto,config){
    const estado=estadoImplantacao(projeto,config);
    const bloqueios=[
      ['regras','Regras Firestore publicadas e testadas em projeto de homologação'],
      ['indices','Índices e funções de eventos implantados e verificados'],
      ['privacidade','Migração e isolamento de votos/inscrições comprovados'],
      ['backup','Backup institucional protegido com verificação de conclusão'],
      ['restauracao','Restauração ensaiada em projeto separado'],
      ['acessos','Acesso e permissões conferidos com contas fictícias'],
      ['auditoria','Tratamento de dados pessoais e histórico revisado'],
      ['aprovacao','Aprovação documentada da direção e da TI']
    ];
    return Object.freeze({
      aptoParaPublicar:false,comprovadosAutomaticamente:0,
      itens:Object.freeze([
        {id:'projeto',nome:'Projeto Firebase IFCE',
          status:estado.nivel==='erro'?'erro':'informativo',
          detalhe:projeto===PROJETO?'ID verificado no cliente; backend real não comprovado.':estado.texto},
        {id:'config',nome:'Configuração operacional',
          status:estado.nivel==='erro'?'erro':estado.nivel==='atencao'?'atencao':'pendente',
          detalhe:estado.texto},
        ...bloqueios.map(([id,nome])=>({id,nome,status:'pendente',
          detalhe:'Exige conferência e evidência institucional fora do navegador.'}))
      ])
    });
  }
  function dataEventoValida(dataISO,agora=new Date()) {
    if(typeof dataISO!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(dataISO))return false;
    const data=new Date(dataISO+'T12:00:00Z');
    if(!Number.isFinite(data.getTime())||data.toISOString().slice(0,10)!==dataISO)
      return false;
    // A escola usa a data de Fortaleza, inclusive na virada do dia em UTC.
    const partes=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
      timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(agora).map(p=>[p.type,p.value]));
    const hoje=partes.year+'-'+partes.month+'-'+partes.day;
    return dataISO>=hoje;
  }
  function resumoEvento(ev) {
    if(!ev||ev.privacidadeVersao!==2)
      return {valido:false,texto:'Evento antigo: precisa de migração verificada.',confirmados:null,aguardando:null,livres:null};
    const cap=ev.vagas,ok=ev.inscritosCount,fila=ev.esperaCount,ord=ev.proximaOrdem;
    const numeros=[cap,ok,fila,ord];
    if(!numeros.every(n=>Number.isSafeInteger(n)&&n>=0)
      ||cap>100000||ok>100000||fila>100000
      ||(cap>0&&ok>cap)||(cap===0&&fila>0)
      ||(cap>0&&fila>0&&ok<cap)||ord<fila)
      return {valido:false,texto:'Contagens inconsistentes: não divulgar nem exportar sem revisão.',confirmados:null,aguardando:null,livres:null};
    return {valido:true,confirmados:ok,aguardando:fila,livres:cap===0?null:cap-ok,
      texto:ok+' confirmação(ões) • '+fila+' aguardando • '+(cap===0?'sem limite de vagas':(cap-ok)+' vaga(s) livre(s)')};
  }
  function resumoExclusao(inventario){
    const conhecidos=['alunos','perfis','aniversarios','carteirinhas','acessos','aceites'];
    const bloqueios=conhecidos.filter(k=>inventario?.[k]==='indisponivel');
    return {
      completo:false,
      texto:bloqueios.length
        ? 'Consulta parcial. Um ou mais documentos não puderam ser verificados; nenhum dado foi apagado.'
        : 'Inventário preliminar. Registros privados, histórico, Authentication e backups exigem processo autorizado; nenhum dado foi apagado.'
    };
  }
  return Object.freeze({PROJETO,estadoImplantacao,resumoEvento,resumoExclusao,dataEventoValida,checklistLancamento});
});
