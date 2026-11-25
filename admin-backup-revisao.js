/* Inspeção LOCAL de backup exportado pelo painel. Nenhuma leitura/gravação Firebase.
 * Um resultado sem erros NÃO certifica restauração, consistência ou segurança.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BackupRevisao=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const COLECOES=Object.freeze(['cargos','alunos','reivindicacoes','eventos',
    'sugestoes','materiais','jogos','enquetes','mural','membros_punidos',
    'caixa','orcamentos','contas','atas','tarefas','estudos','provas',
    'questoes','flashcards','documentos','reunioes','listas_presenca',
    'encaminhamentos','divulgacoes','artes','videos','atividades_diversidade',
    'materiais_diversidade']);
  function analisar(dados,projetoAtual){
    if(!dados||typeof dados!=='object'||Array.isArray(dados)
      ||typeof dados.geradoEm!=='string'
      ||!Number.isFinite(Date.parse(dados.geradoEm)))
      throw Error('Arquivo não corresponde a um backup reconhecido do Painel.');
    if(typeof projetoAtual!=='string'||!projetoAtual.trim())
      throw Error('Projeto Firebase não identificado; nenhuma restauração permitida.');
    const origem=dados.origemProjetoId;
    if(origem!==undefined&&(typeof origem!=='string'||!origem.trim()||origem!==projetoAtual))
      throw Error('Backup de outro projeto ou origem inválida: restauração bloqueada.');
    let total=0;
    const colecoes=[];
    for(const nome of COLECOES){
      const registros=dados[nome];
      if(registros===undefined)continue;
      if(!Array.isArray(registros))throw Error('Estrutura incorreta em '+nome+'.');
      const vistos=new Set();
      for(const item of registros){
        if(!item||typeof item!=='object'||Array.isArray(item)
          ||typeof item.id!=='string'||item.id.length<1||item.id.length>150
          ||item.id==='.'||item.id==='..'||item.id.includes('/')
          ||vistos.has(item.id)||Object.keys(item).some(k=>['__proto__','constructor','prototype'].includes(k)))
          throw Error('IDs ou registros inconsistentes em '+nome+'.');
        vistos.add(item.id);
      }
      total+=registros.length;
      if(total>30000)throw Error('Arquivo grande demais para revisão no navegador.');
      colecoes.push({nome,quantidade:registros.length});
    }
    if(!total)throw Error('Arquivo sem coleções restauráveis.');
    const adicionais=dados.arquivoSuplementar&&typeof dados.arquivoSuplementar==='object'
      ?Object.keys(dados.arquivoSuplementar).length:0;
    const avisos=[
      'Apenas coleções principais são restauradas pelo fluxo antigo do Painel.',
      'Authentication, subcoleções privadas, regras, índices e arquivos exigem recuperação separada.',
      'A revisão do arquivo não é uma restauração de ensaio nem homologação.'
    ];
    if(!origem)avisos.unshift('Projeto de origem não consta no backup antigo: confirme a procedência antes de prosseguir.');
    if(adicionais)avisos.push('Há coleções suplementares que não são restauradas automaticamente.');
    return {total,colecoes,origemConfirmada:Boolean(origem),adicionais,
      prontoParaPublicar:false,avisos};
  }
  return Object.freeze({COLECOES,analisar});
});
