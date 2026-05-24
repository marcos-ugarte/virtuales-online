import { IAnimInterval } from "./../src/Logic/LogicDefinitions";
import { trackPresentationDogSettings, trackPresentationHorseSettings, trackPresentationSulkySettings } from "./OddsAlwaysOnSettings";

interface IPositions {
  x: number;
  y: number;
  width?: number;
}

interface ITrackPositionsGametype {
  trackName: IPositions;
  timesCircle: IPositions;
  turns: IPositions[];
  segments: IPositions[];
  lapMapFacts: IPositions[];
}

interface ITrackPositions {
  dog6: ITrackPositionsGametype;
  dog8: ITrackPositionsGametype;
  dog63: ITrackPositionsGametype;
  horse: ITrackPositionsGametype;
  sulky: ITrackPositionsGametype;
  dog6_oao: ITrackPositionsGametype;
  dog8_oao: ITrackPositionsGametype;
  dog63_oao: ITrackPositionsGametype;
  horse_oao: ITrackPositionsGametype;
  sulky_oao: ITrackPositionsGametype;
}
interface IAnimsGametype {
  bottomResultBar: IAnimInterval;
  trackName: IAnimInterval[];
  lapInfo: IAnimInterval[];
  background: IAnimInterval[];
  turns: ITrackPresentationAnims;
  segments: ITrackPresentationAnims;
  lapMapFacts: ITrackPresentationAnims;
}

export interface ITrackPresentationAnims {
  presentationAnim: IAnimInterval;
  items: IAnimInterval[];
}
interface IElementTimings {
  dog6: IAnimsGametype;
  dog8: IAnimsGametype;
  dog63: IAnimsGametype;
  horse: IAnimsGametype;
  sulky: IAnimsGametype;
}

const TrackPresentationHorsePositions: ITrackPositionsGametype = {
  trackName: { x: 0, y: 426 },
  timesCircle: { x: 130, y: 234 },
  turns: [
    { x: 297, y: 52 }, // Finish line
    { x: 435, y: 141 }, // Startbox 1
    { x: 380, y: 204 }, // Startbox 2
    { x: 338, y: 248 }, // Startbox 3
    { x: 464, y: 80 } // Startbox 4
  ],
  segments: [
    { x: 301, y: 34 },
    { x: 464, y: 120 },
    { x: 308, y: 302 },
    { x: 148, y: 202 }
  ],
  lapMapFacts: [
    { x: 466, y: 98, width: 145 },
    { x: 233, y: 52, width: 118 },
    { x: 58, y: 212, width: 140 },
    { x: 312, y: 260, width: 145 }
  ]
};
const TrackPresentationSulkyPositions: ITrackPositionsGametype = {
  trackName: { x: 0, y: 426 },
  timesCircle: { x: 130, y: 234 },
  turns: [
    { x: 233, y: 112 }, // Finish line
    { x: 432, y: 141 }, // Startbox 1
    { x: 406, y: 182 }, // Startbox 2
    { x: 358, y: 218 } // Startbox 3
  ],
  segments: [
    { x: 448, y: 120 }, // 150m
    { x: 305, y: 62 }, // 400m
    { x: 242, y: 125 }, // 850m
    { x: 390, y: 193 } // 1200m
  ],
  lapMapFacts: [
    { x: 456, y: 110, width: 145 }, // Weather
    { x: 232, y: 52, width: 118 }, // Temp
    { x: 130, y: 127, width: 140 }, // Humidity
    { x: 392, y: 185, width: 145 } // Wind
  ]
};
const TrackPresentationDefaultPositions: ITrackPositionsGametype = {
  trackName: { x: 0, y: 424 },
  timesCircle: { x: 120, y: 185 },
  turns: [
    { x: 435, y: 218 }, // Finish line
    { x: 342, y: 320 }, // Startbox 1
    { x: 173, y: 44 }, // Startbox 2
    { x: 124, y: 92 }, // Startbox 3
    { x: 278, y: 363 } // Startbox 4
  ],
  segments: [
    { x: 473, y: 149 }, // 100m
    { x: 192, y: 49 }, // 200m
    { x: 61, y: 255 },
    { x: 344, y: 344 },
    { x: 409, y: 262 }
  ],
  lapMapFacts: [
    { x: 459, y: 38, width: 145 }, // Weather
    { x: 32, y: 73, width: 30 }, // Temp
    { x: -42, y: 336, width: 140 }, // Humidity
    { x: 390, y: 288, width: 145 } // Wind
  ]
};
const TrackPresentationDefaultAnimTimings: IAnimsGametype = {
  bottomResultBar: { startTime: 0, duration: 426 },
  trackName: [
    { startTime: 1.55, duration: 4.54 }, // trackname
    { startTime: 6.71, duration: 4.9 }, // trackname
    { startTime: 12.21, duration: 7.25 } // trackname
  ],
  lapInfo: [
    { startTime: 6.33, duration: 2.5 },
    { startTime: 9.12, duration: 2.35 },
    { startTime: 11.98, duration: 3.2 },
    { startTime: 15.22, duration: 3.7 }
  ],
  background: [
    {
      startTime: 1.35,
      duration: 5
    },
    {
      startTime: 6.48,
      duration: 5.5
    },
    {
      startTime: 11.98,
      duration: 7.78
    }
  ],
  turns: {
    presentationAnim: {
      startTime: 1.3,
      duration: 1
    },
    items: [
      { startTime: 2.45 + 1.5, duration: 2 }, // Finish Line
      { startTime: 0.82 + 1.5, duration: 2 }, // Startbox 1
      { startTime: 1.02 + 1.5, duration: 2 }, // Startbox 2
      { startTime: 1.58 + 1.5, duration: 2 }, // Startbox 3
      { startTime: 1.88 + 1.5, duration: 2 } // Startbox 4
    ]
  },
  segments: {
    presentationAnim: {
      startTime: 6.7,
      duration: 1.35
    },
    items: [
      { startTime: 7.59, duration: 10 }, // 100m
      { startTime: 8.06, duration: 10, fromRight: true },
      { startTime: 8.48, duration: 10, fromRight: true },
      { startTime: 8.9, duration: 10 }
    ]
  },
  lapMapFacts: {
    presentationAnim: {
      startTime: 12.1,
      duration: 4.68
    },
    items: [
      { startTime: 15.29, duration: 3.57 }, // Weather
      { startTime: 16.09, duration: 3.2 }, // Temp
      { startTime: 16.69, duration: 2.58 }, // Humidity
      { startTime: 17.09, duration: 1.78 } // Wind
    ]
  }
};

export const TrackPresentation120AnimTimings: IAnimsGametype = {
  bottomResultBar: { startTime: 0, duration: 426 },
  trackName: [
    { startTime: 0.0, duration: 3.25 }, // trackname
    { startTime: 3.7, duration: 3.6 }, // trackname
    { startTime: 7.8, duration: 5.3 } // trackname
  ],
  lapInfo: [
    { startTime: 3.5, duration: 1.8 },
    { startTime: 5.45, duration: 1.9 },
    { startTime: 7.6, duration: 2.2 },
    { startTime: 9.8, duration: 2.75 }
  ],
  background: [
    {
      startTime: 1.35,
      duration: 5
    },
    {
      startTime: 6.5,
      duration: 5.5
    },
    {
      startTime: 12,
      duration: 7.78
    }
  ],
  turns: {
    presentationAnim: {
      startTime: 51.35,
      duration: 5
    },
    items: [
      { startTime: 2.15, duration: 3.3 }, // Finish Line
      { startTime: 0.5, duration: 3.3 }, // Startbox 1
      { startTime: 0.7, duration: 3.3 }, // Startbox 2
      { startTime: 1.1, duration: 3.3 }, // Startbox 3
      { startTime: 1.3, duration: 3.3 } // Startbox 4
    ]
  },
  segments: {
    presentationAnim: {
      startTime: 56.5,
      duration: 5.5
    },
    items: [
      { startTime: 4, duration: 7 }, // 100m
      { startTime: 4.5, duration: 7, fromRight: true },
      { startTime: 4.9, duration: 7, fromRight: true },
      { startTime: 5.4, duration: 7 }
    ]
  },
  lapMapFacts: {
    presentationAnim: {
      startTime: 56.5,
      duration: 5.5
    },
    items: [
      { startTime: 10, duration: 2.7 }, // Weather
      { startTime: 10.4, duration: 2.6 }, // Temp
      { startTime: 10.8, duration: 2.2 }, // Humidity
      { startTime: 11.2, duration: 1.45 } // Wind
    ]
  }
};

const TrackPresentationDog6AnimTimings: IAnimsGametype = {
  bottomResultBar: TrackPresentationDefaultAnimTimings.bottomResultBar,
  trackName: TrackPresentationDefaultAnimTimings.trackName,
  lapInfo: TrackPresentationDefaultAnimTimings.lapInfo,
  turns: TrackPresentationDefaultAnimTimings.turns,
  background: TrackPresentationDefaultAnimTimings.background,
  segments: TrackPresentationDefaultAnimTimings.segments,
  /*segments: {
    presentationAnim: {
      startTime: 6.5,
      duration: 1.5
    },
    items: [
      { startTime: 7.5, duration: 10 }, // 100m
      { startTime: 6.46 + 1.5, duration: 10, fromRight: true },
      { startTime: 6.88 + 1.5, duration: 10, fromRight: true },
      { startTime: 7.3 + 1.5, duration: 10 }
    ]
  },*/
  lapMapFacts: TrackPresentationDefaultAnimTimings.lapMapFacts
};

export const TrackPresentationPositions: ITrackPositions = {
  dog6: TrackPresentationDefaultPositions,
  dog8: TrackPresentationDefaultPositions,
  dog63: TrackPresentationDefaultPositions,
  horse: TrackPresentationHorsePositions,
  sulky: TrackPresentationSulkyPositions,
  dog6_oao: {
    ...trackPresentationDogSettings,
    trackName: TrackPresentationDefaultPositions.trackName,
    turns: TrackPresentationDefaultPositions.turns,
    segments: TrackPresentationDefaultPositions.segments,
    lapMapFacts: TrackPresentationDefaultPositions.lapMapFacts
  },
  dog8_oao: {
    ...trackPresentationDogSettings,
    trackName: TrackPresentationDefaultPositions.trackName,
    turns: TrackPresentationDefaultPositions.turns,
    segments: TrackPresentationDefaultPositions.segments,
    lapMapFacts: TrackPresentationDefaultPositions.lapMapFacts
  },
  dog63_oao: {
    ...trackPresentationDogSettings,
    trackName: TrackPresentationDefaultPositions.trackName,
    turns: TrackPresentationDefaultPositions.turns,
    segments: TrackPresentationDefaultPositions.segments,
    lapMapFacts: TrackPresentationDefaultPositions.lapMapFacts
  },
  horse_oao: {
    ...trackPresentationHorseSettings,
    trackName: TrackPresentationHorsePositions.trackName,
    turns: TrackPresentationHorsePositions.turns,
    segments: TrackPresentationHorsePositions.segments,
    lapMapFacts: TrackPresentationHorsePositions.lapMapFacts
  },
  sulky_oao: {
    ...trackPresentationSulkySettings,
    trackName: TrackPresentationSulkyPositions.trackName,
    turns: TrackPresentationSulkyPositions.turns,
    segments: TrackPresentationSulkyPositions.segments,
    lapMapFacts: TrackPresentationSulkyPositions.lapMapFacts
  }
};

export const KartTrackPresentationSettings = {
  turnItemDimensions: {
    turn: {
      width: 113,
      longWidth: 122,
      height: 31,
      textContainerOffset: 28
    },
    start_finish: {
      width: 118,
      height: 0,
      textContainerOffset: 0
    },
    highspeed: {
      width: 120,
      height: 16,
      textContainerOffset: 28
    }
  },
  turnItem: {
    line1: {
      x: 0,
      y: 2
    },
    line2: {
      x: 0,
      y: 22
    },
    interval: {
      x: 2.6,
      y: -5.8
    },
    curveType: {
      x: 85,
      y: 36
    }
  },
  finishLine: {
    x: 198,
    y: 374
  },
  startLine: {
    x: 156,
    y: 222
  },
  turn1: {
    x: -6,
    y: 211
  },
  turn2: {
    x: 11,
    y: 160
  },
  turn3: {
    x: 23,
    y: 95
  },
  turn4: {
    x: 220,
    y: 7
  },
  turn5: {
    x: 163,
    y: 155
  },
  highspeed1: {
    x: 167,
    y: 125
  },
  turn6: {
    x: 340,
    y: 49
  },
  hill: {
    x: 364,
    y: 125
  },
  turn7: {
    x: 234,
    y: 244
  },
  highspeed2: {
    x: 158,
    y: 267
  }
};

export const TrackPresentationAnimTimings: IElementTimings = {
  dog6: TrackPresentationDog6AnimTimings,
  dog8: TrackPresentationDefaultAnimTimings,
  dog63: TrackPresentationDefaultAnimTimings,
  horse: {
    bottomResultBar: { startTime: 0, duration: 18 },
    trackName: [
      { startTime: 0.25, duration: 3.39 }, // trackname
      { startTime: 4.56, duration: 4.3 }, // trackname
      { startTime: 9.9, duration: 7.4 } // trackname
    ],
    lapInfo: [
      //? Lapinfo top right
      { startTime: 4.4, duration: 2.3 },
      { startTime: 7.2, duration: 1.8 },
      { startTime: 9.7, duration: 3.15 },
      { startTime: 13.1, duration: 3.75 }
    ],
    background: [
      {
        startTime: 1.35,
        duration: 5
      },
      {
        startTime: 6.5,
        duration: 5.5
      },
      {
        startTime: 12,
        duration: 7.78
      }
    ],
    turns: {
      presentationAnim: {
        startTime: 1.1,
        duration: 5
      },
      items: [
        { startTime: 2.1, duration: 6 }, // Finish Line
        { startTime: 0.6, duration: 6 }, // Startbox 1
        { startTime: 0.9, duration: 6 }, // Startbox 2
        { startTime: 1.28, duration: 6 }, // Startbox 3
        { startTime: 1.58, duration: 6 } // Startbox 4
      ]
    },
    segments: {
      presentationAnim: {
        startTime: 6.5,
        duration: 5.5
      },
      items: [
        { startTime: 5.7, duration: 10 }, // 100m
        { startTime: 6.1, duration: 10 }, // 400m
        { startTime: 6.99, duration: 10 }, // 850m
        { startTime: 7.4, duration: 10 } // 1200m
      ]
    },
    lapMapFacts: {
      presentationAnim: {
        startTime: 9.5,
        duration: 5.5
      },
      items: [
        { startTime: 14.0, duration: 3.6 }, // Weather
        { startTime: 13.6, duration: 3.6 }, // Temp
        { startTime: 15.2, duration: 2 }, // Humidity
        { startTime: 14.8, duration: 1.7 } // Wind
      ]
    }
  },
  sulky: {
    bottomResultBar: { startTime: 0, duration: 18 },
    trackName: [
      { startTime: 0.25, duration: 3.39 }, // trackname
      { startTime: 4.56, duration: 4.3 }, // trackname
      { startTime: 9.9, duration: 7.4 } // trackname
    ],
    lapInfo: [
      { startTime: 4.4, duration: 2.3 },
      { startTime: 7.2, duration: 1.8 },
      { startTime: 9.7, duration: 3.15 },
      { startTime: 13.1, duration: 3.75 }
    ],
    background: [
      {
        startTime: 0.35,
        duration: 5
      },
      {
        startTime: 6.5,
        duration: 5.5
      },
      {
        startTime: 12,
        duration: 7.78
      }
    ],
    turns: {
      presentationAnim: {
        startTime: 0.25,
        duration: 1
      },
      items: [
        { startTime: 2.1, duration: 2 }, // Finish Line
        { startTime: 1.28, duration: 2 }, // Startbox 1
        { startTime: 0.9, duration: 2 }, // Startbox 2
        { startTime: 0.6, duration: 2 } // Startbox 3
      ]
    },
    segments: {
      presentationAnim: {
        startTime: 6.5,
        duration: 1.35
      },
      items: [
        { startTime: 5.4, duration: 7 }, // 100m
        { startTime: 6.2, duration: 7, fromRight: true }, // 400m
        { startTime: 6.7, duration: 7, fromRight: true }, // 850m
        { startTime: 7.4, duration: 7 } // 1200m
      ]
    },
    lapMapFacts: {
      presentationAnim: {
        startTime: 9.8,
        duration: 5.5
      },
      items: [
        { startTime: 13.12, duration: 2.9 }, // Weather
        { startTime: 13.8, duration: 2.49, fromRight: true }, // Temp
        { startTime: 14.3, duration: 2.28, fromRight: true }, // Humidity
        { startTime: 15, duration: 1.9 } // Wind
      ]
    }
  }
};
