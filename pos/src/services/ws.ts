// TODO: Cliente WebSocket para tiempo real
// - Conectar a ws://backend/tv
// - Auto-reconnect con backoff exponencial
// - Event emitter para gameRound, gameResult, salesClosing, salesClosed
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4097/tv';
