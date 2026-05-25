/**
 * TRIMMED vendored GamesModel — types only.
 *
 * RaceBarDog imports only the `IRoundInfoEx` *type* from here. We reproduce
 * just that interface (and its dependency surface) so the import resolves
 * without dragging in the full model/engine graph.
 */
import { IRoundInfo } from "client/Logic/LogicDefinitions";
import { GameLength } from "common/Definitions";

export interface IRoundInfoEx extends IRoundInfo {
  fullGameId: string;
  videoStartDt: string;
  videoEndDt: string;
  videoStartUnix: number;
  videoEndUnix: number;
  roundInterval: GameLength;
}
