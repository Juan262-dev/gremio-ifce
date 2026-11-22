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
  function resumoEvento(ev) {
    if(!ev||ev.privacidadeVersao!==2)
      return {valido:false,texto:'Evento antigo: precisa de migração verificada.',confirmados:null,aguardando:null,livres:null};
    const cap=ev.vagas===undefined?0:ev.vagas,ok=ev.inscritosCount,fila=ev.esperaCount,ord=ev.proximaOrdem;
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
  return Object.freeze({PROJETO,estadoImplantacao,resumoEvento,resumoExclusao});
});
