"use strict";
// Só libera Cloud Functions quando a implantação v2 foi homologada e
// a gestão ativou explicitamente o recurso na configuração do IFCE.
// Nenhum valor é inferido como "liberado" quando configuração está ausente.
function assertEventsReleased(configSnapshot){
  const state=configSnapshot?.exists ? configSnapshot.data() : null;
  if(!state
    ||state.eventosV2Habilitados!==true
    ||state.manutencao!==false
    ||state.painelCongelado!==false
    ||state.privacidadeMigracaoBloqueada!==false){
    const err=new Error("Inscrições bloqueadas até a liberação técnica do sistema.");
    err.code="failed-precondition";
    throw err;
  }
  return true;
}
module.exports={assertEventsReleased};
