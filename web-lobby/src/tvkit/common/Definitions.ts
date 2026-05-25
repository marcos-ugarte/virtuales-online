export interface IPointLike {
  x: number;
  y: number;
}

export type PerformanceSetting = "low" | "medium" | "high";
export type GameType = "kart5" | "dog6" | "dog8" | "box" | "dog63" | "horse" | "roulette" | "sulky";
export type EventType = "kart" | "dog" | "dog8" | "wgp" | "dog63" | "horse" | "rtt" | "sulky";
export type GameLength = 60 | 120 | 180 | 240 | 300 | 320 | 360 | 384 | 432;
export type SkinType = 10 | 11 | 1;
export enum SkinTypeDefinition {
  MODERN = 10,
  MODERN_ODDS_ALWAYS_ON = 11,
  CLASSIC = 1
}

// ---------- socket server definitions ------------------------------------------

export enum DeviceTypes {
  Androidtv2 = "androidtv2",
  Terminal = "terminal"
}

export enum SockServMessageType {
  Init = "init",

  DeviceReconnect = "reconnect",
  Translation = "translation",
  GameRound = "gameRound",
  GameResult = "gameResult",
  ServerTime = "time",
  SendLog = "sendLog",
  Error = "error"
}

export enum BetofferTypes {
  interval = "interval",
  template = "template"
}

export interface ISockServMessage {
  msgType: SockServMessageType;
}

export interface ISockServIdMessage extends ISockServMessage {
  msgId: number;
}

export interface ISockServResponseMessage extends ISockServIdMessage {
  duration: number;
  errorId?: number;
}

export interface ISockServResponseMessageError {
  msgId: number;
  error: any;
}

export interface ISockServResponseMessageInit {
  setting: IInitSettings;
  gamepool: IGameRoundData[];
  translations: ILanguageText[];
  haveDbPot: boolean;
  intro: IGameRoundResultIntroVideo | IMultipleIntroVideos[];
  music: {
    volumeIntro: number;
    volumeRace: number;
    speakerTime: string;
  };
  param: {
    extraload: number;
    contsync: boolean;
    maxraceupd: number;
    streamScreen: boolean;
  };
  betCodeDecimals?: IBetCodeDecimals[];
}
export interface ISockServResponseMessageReconnect {}
export interface ISockServResponseMessageTranslation {
  translations: ILanguageText[];
}

export interface IInitSettings {
  betofferId: number;
  languageId: string;
  betoffers: IBetOffers[];
  videoLanguage: string;
  videooverlayLogo: string;
  oddsGridFirstTwoInOrder: boolean;
  skinVersion: number;
  enableSound: boolean;
  useOverlays: boolean;
}

export interface IBetCodeDecimals {
  betCodeId: number;
  decimalPlaces: number;
}

export interface IBetOffers {
  id: number;
  eventtype: string;
  roundInterval: any;
  starttime: string;
  nbrEvents: number;
  bonusNbr2x: number;
  bonusNbr3x: number;
  numberCompetitor: number;
  numberWinner: number;
  firstNumber: number;
  numberOdds: number;
  type: BetofferTypes;
  roundIntervals: number[];
}

export interface ILanguageText {
  langId: string;
  tokens: ILanguageToken[];
}

export interface ILanguageToken {
  id: string;
  value: string;
  fontSize: number;
  charSpace: number;
}

export interface ISockServResponseMessageTime {
  serverTimeUnix: number;
  serverTime: string;
  duration: number;
}

export interface ISockServeMessageGameRound {
  gameId: string | null;
  offset: number;
}
export interface ISockServResponseMessageGameRound {
  gamepool: IGameRoundData[];
  rttStatistics?: IRttStatistic;
}

export interface IGameRoundResultData {
  finish: IGameResult | null;
  interval: IIntervals | null;
  bonus: number;
  videoname: IGameRoundResultVideo;
  jackpot: null | IResultJackpotData;
  wgpRounds?: IWgpRounds;
  overlayEnd?: string;
  overlayStart?: string;
  rttStatistics?: IRttStatistic;
}

export interface IRttStatistic {
  countTotal: number;
  countRed: number;
  countBlack: number;
  countOdd: number;
  countEven: number;
  countLow: number;
  countHigh: number;
  countColumn1: number;
  countColumn2: number;
  countColumn3: number;
  countDozen1: number;
  countDozen2: number;
  countDozen3: number;
  coldNumbers: IRttStatisticNumbers[];
  hotNumbers: IRttStatisticNumbers[];
  rareNumbers: IRttStatisticNumbersRare[];
  numbers: IRttStatisticNumbers[];
}

export interface IRttStatisticNumbers {
  number: number;
  count: number;
}
export interface IRttStatisticNumbersRare {
  number: number;
  lastAppearance: string;
  roundsWithout: number;
}

export interface IResultJackpotData {
  ticketId: string;
  amount: number;
  currency: string;
  location: string;
}

export interface IGameRoundResultVideo {
  mp4: string;
  jpg: string;
}

export interface IGameRoundResultIntroVideo extends IGameRoundResultVideo {
  mp3: string;
}

export interface IMultipleIntroVideos {
  roundInterval: number;
  mp4: string;
  jpg: string;
  mp3: string;
}

export interface IGameRoundData extends IGameRoundResultData {
  id: string;
  idSchedule: string;
  idBetoffer: string;
  videoStartDt: string;
  videoEndDt: string;
  eventType: string;
  odds: number[];
  competitors: any;
  creDt: string;
  jackpotInfo: IBonusResultData | null;
  roundInterval: GameLength;
  courseConditions?: string;
  weather?: string;
  temperature?: number;
  humidity?: number;
  wind?: string;
  wgpInfo?: IWgpInfo;
  wgpRounds?: IWgpRounds;
  it_code_event?: string;
  it_code_schedule?: string;
}

export interface IBonusResultData {
  bonusValue: number;
  oldBonusValue: number;
  bonusHistory: IBonusHistoryResultData[];
}

export interface IFighterInfos {
  age: number;
  heritageLong: string;
  heritageShort: string;
  name: string;
  type: string;
  weight: number;
  strikeRate: number;
  winRate: number;
}

export interface IWgpInfo {
  fighterBlue: IFighterInfos;
  fighterRed: IFighterInfos;
  filename: string;
  mp4: string;
  mp3: string;
  jpg: string;
  raceID: number;
  weightClass: string;
}

export interface IWgpClip {
  blueFistCount: number;
  blueFistEvents: string;
  blueKickCount: number;
  blueKickEvents: string;
  clipID: number;
  filename: string;
  length: number;
  jpg: string;
  mp4: string;
  redFistCount: number;
  redFistEvents: string;
  redKickCount: number;
  redKickEvents: string;
}

export interface IWgpRoundInfo {
  blueFistCount: number;
  blueKickCount: number;
  clip1: IWgpClip;
  clip2?: IWgpClip;
  clip3?: IWgpClip;
  clip4?: IWgpClip;
  redFistCount: number;
  redKickCount: number;
  filename: string;
  jpg: string;
  mp4: string;
}

export interface IWgpRounds {
  round1: IWgpRoundInfo;
  round2: IWgpRoundInfo;
  round3: IWgpRoundInfo;
}

export interface IBonusHistoryResultData {
  round: number;
  id: string;
  date: string;
  time: string;
  name: string;
  amount: number;
}

export interface ICompetitorKart {
  firstName: string;
  lastName: string;
  nationality: string;
  height: number;
  weight: number;
  last5: string | undefined;
  nbr1: number | undefined;
  nbr2: number | undefined;
  nbr3: number | undefined;
  racesForStatistic: number | undefined;
  trend: number | undefined;
}

export interface ICompetitorDataDog {
  name: string;
  weight: number;
  strikeRate: number;
  resultHistory?: string;
  last5: string | undefined;
  nbr1: number | undefined;
  nbr2: number | undefined;
  nbr3: number | undefined;
  racesForStatistic: number | undefined;
  trend: number | undefined;
}

export interface ICompetitorDataHorse {
  age: number;
  name: string;
  sex: string;
  strikeRate: number;
  weight: number;
  last5: string | undefined;
  nbr1: number | undefined;
  nbr2: number | undefined;
  nbr3: number | undefined;
  racesForStatistic: number | undefined;
  trend: number | undefined;
}

export interface IGameResult {
  "1": IGameResultElem;
  "2": IGameResultElem;
  "3"?: IGameResultElem;
  "4"?: IGameResultElem;
}

export interface IIntervals {
  "1": IIntervalElem[];
  "2": IIntervalElem[];
  "3": IIntervalElem[];
}

export interface IIntervalElem {
  competitorIndex: number;
  time: number;
}

export interface IGameResultElem {
  competitorIndex: number;
  time: number;
}

export interface ISockServGameResultData extends IGameRoundResultData {
  id: string;
}

export interface ISockServGameResultResponse extends ISockServMessage {
  gameresult: ISockServGameResultData;
  rttStatistics?: IRttStatistic;
}

export function typed<T>(obj: T) {
  return obj;
}

/*
export interface ISockServSessionDescriptionMessage {
  description: RTCSessionDescriptionInit;
}

export interface ISockServCandidateMessage {
  candidate: RTCIceCandidate;
}
export interface IMediaSoupRequest {
  request: any;
}

export interface IMediaSoupNotification {
  notification: any;
}
*/
