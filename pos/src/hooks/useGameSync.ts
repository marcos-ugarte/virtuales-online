// TODO: Hook para suscripción WebSocket a carrera activa
// - Conectar a ws://backend/tv
// - Recibir gameRound, gameResult, gameStateChange
// - Mantener estado local de la carrera activa
// - Reconexión automática
export function useGameSync() {
  // TODO: Implement
  return { currentGame: null, gameState: 'INTRO', odds: null };
}
