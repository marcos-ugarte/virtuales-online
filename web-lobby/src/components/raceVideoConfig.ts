import type { GameKey } from '../types/websocket';

/** Game types we render race video for. Horsec is on the roadmap but
 *  excluded — video assets aren't ready. Used by both the desktop
 *  LiveMonitor (auto-pick filter) and the mobile in-card video host. */
export const MONITOR_GAMES: GameKey[] = ['dog', 'dog8'];
