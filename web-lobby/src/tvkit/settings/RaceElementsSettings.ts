export interface IPositions {
  x: number;
  y: number;
  tint?: number;
  width?: number;
  height?: number;
}

export interface ITrackPositionsGametype {
  intervalText?: IPositions;
  intervalItems: IPositions[];
  winnerItems: IPositions[];
  test?: any;
}

export interface RacePositions {
  horse: ITrackPositionsGametype;
  sulky: ITrackPositionsGametype;
  dog6: ITrackPositionsGametype;
  dog8: ITrackPositionsGametype;
  dog63: ITrackPositionsGametype;
}

export interface ITimings {
  startTime: number;
  duration: number;
  fromRight?: boolean;
}

export interface IAnimsGametype {
  intervalItems: ITimings[];
}

export interface IElementTimings {
  horse: IAnimsGametype;
  sulky: IAnimsGametype;
  dog6: IAnimsGametype;
  dog8: IAnimsGametype;
  dog63: IAnimsGametype;
}

const RaceElementDefaultAnimTimings: IAnimsGametype = {
  intervalItems: [
    // ranking shown below map in race
    { startTime: 0, duration: 1.2 }, // first place
    { startTime: 0.4, duration: 1.3 }, // second place
    { startTime: 0.8, duration: 1.4 } // ? third place
  ]
};

const RaceElementDefaultPositions: ITrackPositionsGametype = {
  intervalText: { x: 11, y: 187 },
  winnerItems: [
    { x: 62, y: 152, width: 648, height: 296 },
    { x: 62, y: 152, width: 648, height: 296 },
    { x: 485, y: 208.5, width: 566, height: 274 }
  ],
  intervalItems: [
    // ranking shown below map in race
    { x: -5, y: 202 }, // first place
    { x: -10, y: 230 }, // second place
    { x: -15, y: 256 } // ? third place ?
  ]
};

export const RaceElementPositions: RacePositions = {
  sulky: RaceElementDefaultPositions,
  dog6: RaceElementDefaultPositions,
  dog8: RaceElementDefaultPositions,
  dog63: RaceElementDefaultPositions,
  horse: {
    winnerItems: [
      { x: 60, y: 155, width: 648, height: 296 },
      { x: 73, y: 167, width: 648, height: 296 },
      { x: 496, y: 223.5, width: 566, height: 274 }
    ],
    intervalItems: RaceElementDefaultPositions.intervalItems
  }
};

export const RaceElementAnimTimings: IElementTimings = {
  dog6: RaceElementDefaultAnimTimings,
  dog8: RaceElementDefaultAnimTimings,
  dog63: RaceElementDefaultAnimTimings,
  horse: {
    intervalItems: [
      // ranking shown below map in race
      { startTime: 0.2, duration: 1.9 }, // first place
      { startTime: 0.4, duration: 2.3 }, // second place
      { startTime: 0.8, duration: 2.7 } // ? third place
    ]
  },
  sulky: {
    intervalItems: [
      // ranking shown below map in race
      { startTime: 0.2, duration: 1.96 }, // first place
      { startTime: 0.5, duration: 2 }, // second place
      { startTime: 0.8, duration: 2.7 } // ? third place
    ]
  }
};
