/* Disponibilidade de eventos v2 e mensagens do Portal. Sem dados privados. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortalEventosV2 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function liberados(config) {
    return !!config
      && config.eventosV2Habilitados === true
      && config.manutencao === false
      && config.painelCongelado === false
      && config.privacidadeMigracaoBloqueada === false;
  }
  function estadoPausado(registro) {
    if (registro && registro.status === 'registered')
      return 'Inscrição registrada · alterações temporariamente suspensas';
    if (registro && registro.status === 'waitlisted')
      return 'Aguardando vaga · alterações temporariamente suspensas';
    return 'Inscrições em preparação pelo Grêmio';
  }
  function mensagemFalha(erro) {
    const codigo = String(erro && erro.code || '');
    if (codigo === 'functions/failed-precondition' || codigo === 'failed-precondition')
      return 'Inscrições temporariamente indisponíveis. O Grêmio está preparando o sistema.';
    if (codigo === 'functions/not-found' || codigo === 'not-found' ||
        codigo === 'functions/unimplemented' || codigo === 'unimplemented')
      return 'O serviço de inscrições ainda não foi instalado. Procure a gestão do Grêmio.';
    if (codigo === 'functions/unauthenticated' || codigo === 'unauthenticated')
      return 'Confirme o e-mail da sua conta e entre novamente antes de se inscrever.';
    if (codigo === 'functions/permission-denied' || codigo === 'permission-denied')
      return 'Seu cadastro ainda não está autorizado para inscrições. Consulte a gestão.';
    if (codigo === 'functions/unavailable' || codigo === 'unavailable' ||
        codigo === 'functions/deadline-exceeded' || codigo === 'deadline-exceeded')
      return 'Serviço temporariamente indisponível. Verifique sua conexão e tente depois.';
    return 'Não foi possível concluir esta operação. Confira sua conexão e tente novamente.';
  }
  function mensagemCancelamento(status) {
    if (status === 'missing') return 'Não foi encontrada uma inscrição ativa para cancelar.';
    if (status === 'cancelled-waiting') return 'Você saiu da fila de participantes aguardando vaga.';
    if (status === 'cancelled-promoted')
      return 'Inscrição cancelada. A primeira pessoa da fila recebeu a vaga.';
    return 'Inscrição cancelada.';
  }
  return Object.freeze({liberados, estadoPausado, mensagemFalha, mensagemCancelamento});
});
