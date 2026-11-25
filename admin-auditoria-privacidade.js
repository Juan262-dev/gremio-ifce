/* Redação preventiva de dados pessoais nos novos registros e na visualização antiga.
 * Não altera documentos existentes nem substitui as regras do Firestore.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.AuditoriaPrivacidade=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function limpar(value,max=240){
    return String(value==null?'':value).slice(0,4000)
      .replace(/\b(senha|password|token|segredo|secret|api[_-]?key|chave[_-]?privada)\s*[:=]\s*[^\s,;]+/gi,'$1: [omitido]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[e-mail omitido]')
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,'[documento omitido]')
      .replace(/[\r\n\t]+/g,' ')
      .trim().slice(0,max);
  }
  function resumir(acao,detalhes){
    return {acao:limpar(acao,100)||'Ação administrativa',
      detalhes:limpar(detalhes,240)};
  }
  return Object.freeze({limpar,resumir});
});
