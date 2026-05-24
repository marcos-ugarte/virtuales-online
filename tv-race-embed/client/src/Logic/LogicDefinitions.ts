import { GameLength, GameType, IBetCodeDecimals, IGameRoundData, IRttStatistic, ISockServResponseMessageInit, PerformanceSetting, SkinType } from "common/Definitions";
import * as PIXI from "pixi.js";
import { Resource, Texture } from "pixi.js";

export interface IDriverInfo {
  key: string;
  value: string;
  arrow?: boolean;
}

export interface IDriver {
  color: number;
  firstName: string;
  lastName: string;
  driverInfos: IDriverInfo[]; // length: 5 for kart, 4 for dogs
  driverRaceInfos?: IDriverInfo[];
  driverBarText: string;
  driverPattern?: DriverPattern;
  color2?: number;
  heritageShort?: string;
}

export enum DriverPattern {
  COLOR_ONLY = 0,
  YELLOW_BLACK_2 = 1,
  BLACK_WHITE_6 = 2,
  BLACK_WHITE_6_b = 3 // the tilted bars in the driverpresentation look different
}

export type RoundBonusType = "x2" | "x3" | undefined;

export interface IHistoryDriver {
  driverIndex: number;
  finishTime: string;
  quote: number;
  firstName: string;
  lastName: string;
}

export interface IHistoryDriverDog63 extends IHistoryDriver {
  betCodeId: number;
}

export interface IRoundHistory {
  round: number;
  roundBonusType?: RoundBonusType;
  first: IHistoryDriver;
  second: IHistoryDriver;
  it_code_event?: string;
}

export interface IDog63RoundHistoryP2P3 {
  name: string;
  quoteP2?: IDog63QuoteInfo;
  quoteP3: IDog63QuoteInfo;
}

export interface IDog63RoundHistoryAccoppiata {
  nioio: IDog63RoundHistoryTrio;
  entries: IDog63RoundHistoryAccoppiataEntry[];
}

export interface IDog63RoundHistoryTrio {
  nio: IDog63QuoteInfo;
  io: IDog63QuoteInfo;
}

export interface IDog63RoundHistoryAccoppiataEntry {
  firstDriverIndex: number;
  secondDriverIndex: number;
  quote: number;
  betCodeId: number;
}

export interface IDog63RoundHistory {
  round: number;
  roundBonusType?: RoundBonusType;
  drivers: IHistoryDriverDog63[];
  p2p3: IDog63RoundHistoryP2P3[];
  accoppiata: IDog63RoundHistoryAccoppiata;
  trio: IDog63RoundHistoryTrio;
  disparyText: string;
  disparyQuote: IDog63QuoteInfo;
  bassoText: string;
  bassoQuote: IDog63QuoteInfo;
  somma2Number: number;
  somma2Quote: IDog63QuoteInfo;
  somma3Number: number;
  somma3Quote: IDog63QuoteInfo;
}

export interface IDog63SuprimiEntry {
  drivers: number[];
  quote: number;
  betCodeId: number;
}

export interface IDog63Suprimi {
  block1: IDog63SuprimiEntry[][];
  block2: IDog63SuprimiEntry[][];
  block3: IDog63SuprimiEntry[][];
}

export interface IDog63QuoteInfo {
  quote: number;
  betCodeId: number;
}

export interface IDog63QuoteEntry {
  driverIndex: number;
  quotes: IDog63QuoteInfo[];
  peso: string;
  ultime5: number[];
  val: number;
}

export interface IDog63QuoteBottomEntry {
  places: number[];
  quote: number;
  betCodeId: number;
}

export interface IDog63Quotes {
  entries: IDog63QuoteEntry[];
  middleEntries: IDog63QuoteInfo[][];
  bottomEntries: IDog63QuoteBottomEntry[];
}

export interface IDog633rd {
  quotesPerColumn: number[][];
}

export interface IJackpotHistory {
  round: number;
  id: string;
  date: string;
  time: string;
  name: string;
  amount: string;
  amountUnformated: number;
}

export interface IColors {
  white: number;
  green: number;
  red: number;
  panelColor: number;
  panelColorBottom: number;
  panelColorBottomNumber: number;
}

export interface IColorsC4 {
  green: number;
  red: number;
  panelColorBottom: number;
}

export interface ITrackInfo {
  key: string;
  value: string;
}

export interface ITrackItem {
  abbr?: string;
  interval?: string;
  line1: string;
  line2?: string;
  curveType?: string;
}

export interface ITrackSegment {
  line1: string;
  lapNumber: string;
}

export interface ITrack {
  name: string;
  country: string;
  facts: ITrackInfo[]; // length: 3
  items: ITrackItem[];
  segments?: ITrackSegment[];
  lapMapFacts?: string[];
}

export interface IIntervalDriver {
  driverIndex: number;
  time: string;
  odds?: number;
}

export interface IAnimInterval {
  startTime: number;
  duration: number;
  fromRight?: boolean;
}

export type GameAnims<T extends IAnimInterval = IAnimInterval> = Record<string, T[]>;

export function createEmptyDogAnims<T extends IAnimInterval>() {
  const ret: GameAnims<T> = {
    dog6: [],
    dog8: []
  };
  return ret;
}

export interface IRaceInterval {
  title: string;
  startTime: number;
  duration: number;
  drivers?: IIntervalDriver[];
}

export interface IResult {
  first: IIntervalDriver;
  second: IIntervalDriver;
  third?: IIntervalDriver;
  clockEndTime?: number;
  jackpotWonText?: string;
  roundBonusType?: RoundBonusType;
  overlayStart?: string;
  overlayEnd?: string;
  resultOffsetTime?: number;
}

export interface IRoundInfo {
  gameId: number;
  sendPlan: string;
  raceNumber: string;
  raceStart: string;
  winningNumber?: number;
  jackpotValue?: number;
  oldJackpotValue?: number;
  it_code_event?: string;
  it_code_schedule?: string;
}

export interface IGameInfo {
  videoLanguage: string; // "it"
  gameType: GameType;
  eventType: string;
  gameSkin: SkinType;
  gameLength: GameLength;
  currentIntroGameLength: GameLength;
  performance: PerformanceSetting;
  oddsAlwaysOn: boolean;
  music: {
    volumeIntro: number;
    volumeRace: number;
    speakerTime: string;
  };
  speakerTimesArray: number[];
  companyLogo?: {
    image: PIXI.Texture;
    imageBackground?: PIXI.Texture;
    imageText?: PIXI.Texture;
    color?: string;
    color2?: string;
  };
  additionalTextures?: {
    headerImage: PIXI.Texture;
    inFightImage: PIXI.Texture;
    inFightImageBig: PIXI.Texture;
    fightResultHexImage: PIXI.Texture;
    wipeBackgroundTexture: PIXI.Texture;
    resultBackgroundTexture: PIXI.Texture;
  };
  haveDbPot: boolean;
  useOverlays: boolean;
}

//*****************

export type IResultBet = {
  r1: number;
  r2: number;
  r3: number;
  quote: number;
};

export type IQuoteRound = {
  result: string;
  quote: number;
};

export type IQuotes = {
  fight: number;
  fighters: IFighterQuotes[];
  quotesTie: IQuoteRound[];
};

export type IFighterQuotes = {
  //fight: number;
  rounds: IQuoteRound[];
  result: string;
  name: string;
  winnerBet: number;
  combiBet: number;
};

export type IHit = {
  round: number;
  timestamp: number;
  fist: number;
  kick: number;
};

export type IFightRoundResult = {
  round: number;
  fighter: number;
};

export type IFightResultRound = {
  fighter: number;
  quote: number;
  blueFistCount: number;
  blueKickCount: number;
  redFistCount: number;
  redKickCount: number;
};

export type IFightResult = {
  fighter: number;
  roundResults: IFightResultRound[];
  quote: number;
  resultBetQuote: number;
};

export type IFightInfo = {
  hits: IHit[][];
  roundResults: IFightRoundResult[];
  result: IFightResult;
};

export type IFightHistoryRow = {
  fightNumber: string;
  rounds: IFightHistoryRowRound[];
  resultFighterIndex: number;
  resultFighter: IDriver;
  winningBet: number;
  combiBet: number;
};

export type IFightVideo = {
  name: string;
  url: string;
  jpg: string;
  length: number;
};

export type IFightVideos = {
  fightName: string;
  round1: IFightVideo[];
  round2: IFightVideo[];
  round3: IFightVideo[];
  round1Result: IFightVideo;
  round2Result: IFightVideo;
  round3Result: IFightVideo;
  finalResult: IFightVideo;
};

export type IFightHistoryRowRound = {
  fighterIndex: number;
  quote: number;
  bar: number;
};

export type IBoxRingPresentationFact = {
  title: string;
  values: string[];
  postfix: string;
  startTime: number;
  duration: number;

  // rounds: 3
  // duration: 3 mins
  // weight: cruiser
};

//*****************

export interface IModel {
  roundInfo: IRoundInfo;
  drivers: IDriver[];
  oddsGridFirstTwoInOrder?: boolean;
  odds: number[];
  track: ITrack;
  history: IRoundHistory[];
  jackpotHistory: IJackpotHistory[] | undefined;
  result: IResult | null;
  raceIntervals: IRaceInterval[];
  colors: IColors;

  resultBet?: IResultBet[][];
  fightQuotes?: IQuotes;
  fightResult?: IFightInfo;
  fightHistory?: IFightHistoryRow[];
  boxRingPresentationFacts?: IBoxRingPresentationFact[];
  fightVideos?: IFightVideos;

  dog63History?: IDog63RoundHistory[];
  dog63Suprimi?: IDog63Suprimi;
  dog63Quotes?: IDog63Quotes;
  dog63rd?: IDog633rd;
  dog63QuotesSide?: IDog63SuprimiEntry[][];
}

export interface IHorseDog6C4Model {
  roundInfo: IRoundInfo;
  prevRoundInfo: IRoundInfo;
  odds: number[];
  history: IRoundHistory[];
  bonus: IHorseC4Bonus;
  oldResult: IResult;
  result: IResult;
  colors: IColors;
}

export interface IDog6C4Bonus {
  value: number;
  infoText1: string;
  infoText2: string;
  infoText3: string;
  infoText4: string;
  infoText5: string;
}

export interface IHorseC4Bonus {
  value: number;
  infoText1: string;
  infoText2: string;
  infoText3: string;
  infoText4: string;
  infoText5: string;
}

export interface IRouletteModel {
  rouletteStats: IRouletteStats;
  lastRoundInfo: IRoundInfo;
  roundInfo: IRoundInfo;
  history: IRouletteRoundHistory[];
}
export interface IRouletteRoundHistory {
  round: number;
  winnerNumber: number;
}
export interface IRouletteStats {
  allNumbers: number[];
  generalStats: IRouletteGeneralStats;
}

export interface IRouletteGeneralStats {
  hotNumbers: number[];
  coldNumbers: number[];
  areas: number[];
  red: number;
  black: number;
}

export interface IInitData {
  initResult: ISockServResponseMessageInit;
  gamepool: IGameRoundData[];

  rttStatistics?: IRttStatistic;
}

export enum VideoState {
  None = "None",
  Intro = "Intro",
  Race = "Race",
  Paused = "Paused"
}

export type VideoUrlInfo = {
  url: string;
  length: number;
};

export type CompanyLogo = {
  image: Texture<Resource>;
  imageBackground: Texture<Resource> | undefined;
  imageText: Texture<Resource> | undefined;
};

export interface ILogicImplementation {
  // initialize general application state - called when app starts
  isRegistered(): boolean;
  onInit(): Promise<void>;
  // destroy application state - called when app closes
  onExit(): void;
  // called when player touches the VideoOverlay -> start the video with the current server time
  onStarted(): Promise<void>;

  // video is ready for playing with the given video time
  onCanPlay(preparedVideoTime: number): void;

  // it is time to fade to another video state (e.g. end of video, ...) - fill fade texture and start fade
  onTimeForFade(targetState: VideoState): void;

  getCurrentGameId(): number;

  // it is time to start playing (fade is finished)
  onTimeForPlay(targetState: VideoState): void;

  // fill state info and return video url
  onFillStateInfo(state: VideoState): VideoUrlInfo[];

  // video time update event (fired as long as the video plays...) - videoTime may jump during fade...
  onVideoTimeUpdate(videoTime: number): void;
  // general update event -> fired more often and even if no video plays
  onUpdate(deltaTime: number): void;

  // get the localized text...
  getText(textId: string): string;

  formatTime(time: number, options?: { minutes?: boolean; seconds?: boolean; hundredth?: boolean }): string;
  formatRound(round: number): string;
  formatOdds(oddsNumber: number, comma?: number): string;
  formatOddsC4(oddsNumber: number): string;
  formatNumber(value: number, commaCount: number): string;

  initGame(gameInfo: IGameInfo): void;
  setLanguageId(languageId: string): void;

  hasJackpotBounus(): boolean;

  getGameInfo(): IGameInfo;

  getBetTypeDecimalPlaces(): IBetCodeDecimals[] | null | undefined;

  isIntroSoundEnabled(): boolean;
  getIsProgrammInSetup(): boolean;
  inRaceBreak(): boolean;
  getExtraLoadTime(): number;
  updateGameLoopLength(gameLength: GameLength, beforeGameLength: GameLength, isSetUp: boolean): void;
  getIsMultipleGameLengthes(): boolean;
  updateIntroGameLength(gameLength: GameLength): void;
  getCurrentIntroGameLength(): GameLength;

  checkStartNextVideoLoop(time: number): void;
  getRaceStartTime(): number;
  raceStarted(): boolean;
  reloadWindow(): void;
}
