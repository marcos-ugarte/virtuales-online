import { BottomBarItemDogAnim } from "client/VideoScreen/dog/BottomBarItemDog";

const horseBottomBarTimings = {
  384: {
    default: [
      {
        startTime: 2.0,
        duration: 25.4,
        infoStartTime: 1.6,
        infoTime: 3.28,
        fadeInTime: 0.6,
        fadeOutStart: 2.05,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      { startTime: 70.4, duration: 29.3 }, // 44.0 },
      {
        startTime: 102.8,
        duration: 18.5,
        infoStartTime: 1.4,
        infoTime: 2.323,
        fadeInTime: 0.4,
        fadeOutStart: 1.7,
        fadeOutTime: 0.3,
        fadeTimePerLine: undefined
      },
      {
        startTime: 157.0,
        duration: 20.3,
        infoStartTime: 1.7,
        infoTime: 2.55,
        fadeInTime: 0.4,
        fadeOutStart: 1.7,
        fadeOutTime: 0.3,
        fadeTimePerLine: 0.1
      }
    ],
    bonus: [
      {},
      {},
      {},
      {
        startTime: 162.0,
        duration: 15.2,
        infoStartTime: 1.8,
        infoTime: 1.75,
        fadeInTime: 0.4,
        fadeOutStart: 1.7,
        fadeOutTime: 0.3,
        fadeTimePerLine: 0.1
      }
    ]
  },
  getAnims(withBonus: boolean): BottomBarItemDogAnim[] {
    if (withBonus) {
      return this[384].default
        .map((item, index) => {
          const bonusItem = this[384].bonus[index];
          return bonusItem && Object.keys(bonusItem).length > 0 ? bonusItem : item;
        })
        .filter((item) => item.startTime !== undefined && item.duration !== undefined) as BottomBarItemDogAnim[];
    } else {
      return this[384].default as BottomBarItemDogAnim[];
    }
  }
};

const dog6BottomBarTimings = {
  120: {
    default: [
      {
        startTime: 1.8,
        duration: 12.8,
        infoStartTime: 1.19,
        infoTime: 1.99,
        fadeInTime: 0.2,
        fadeOutStart: 1.24,
        fadeOutTime: 0.2,
        fadeTimePerLine: undefined
      },
      {
        startTime: 33.5,
        duration: 24.7,
        infoStartTime: 1.9,
        infoTime: 3.84,
        fadeInTime: 0.4,
        fadeOutStart: 2.4,
        fadeOutTime: 0.25,
        fadeTimePerLine: undefined
      }
    ],
    bonus: [
      {},
      {
        startTime: 37.8,
        duration: 20.5,
        infoStartTime: 1.7,
        infoTime: 3.18,
        fadeInTime: 0.4,
        fadeOutStart: 1.95,
        fadeOutTime: 0.25,
        fadeTimePerLine: undefined
      }
    ],
    it: []
  },
  180: {
    default: [
      {
        startTime: 3.5,
        duration: 21.1,
        infoStartTime: 1.4,
        infoTime: 3.32,
        fadeInTime: 0.4,
        fadeOutStart: 2.16,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 70.6,
        duration: 19.5,
        infoStartTime: undefined,
        infoTime: undefined,
        fadeInTime: undefined,
        fadeOutStart: undefined,
        fadeOutTime: undefined,
        fadeTimePerLine: undefined
      },
      {
        startTime: 93.5,
        duration: 24.5,
        infoStartTime: 1.9,
        infoTime: 3.96,
        fadeInTime: 0.4,
        fadeOutStart: 2.5,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      }
    ],
    bonus: [
      {
        startTime: 2.8,
        duration: 16.6,
        infoStartTime: 1.05,
        infoTime: 2.65,
        fadeInTime: 0.4,
        fadeOutStart: 1.73,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 60.6,
        duration: 19.5,
        infoStartTime: undefined,
        infoTime: undefined,
        fadeInTime: undefined,
        fadeOutStart: undefined,
        fadeOutTime: undefined,
        fadeTimePerLine: undefined
      },
      {
        startTime: 93.5,
        duration: 24.5,
        infoStartTime: 1.9,
        infoTime: 3.85,
        fadeInTime: 0.4,
        fadeOutStart: 2.42,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      }
    ],
    it: []
  },
  240: {
    default: [
      {
        startTime: 3.5,
        duration: 25.9,
        infoStartTime: 2.4,
        infoTime: 3.92,
        fadeInTime: 0.4,
        fadeOutStart: 2.42,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 70.1,
        duration: 20.0,
        infoStartTime: undefined,
        infoTime: undefined,
        fadeInTime: undefined,
        fadeOutStart: undefined,
        fadeOutTime: undefined,
        fadeTimePerLine: undefined
      },
      {
        startTime: 93.5,
        duration: 25.3,
        infoStartTime: 2.2,
        infoTime: 3.93,
        fadeInTime: 0.4,
        fadeOutStart: 2.5,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 144.35,
        duration: 33.9,
        infoStartTime: 3.0,
        infoTime: 5.28,
        fadeInTime: 0.5,
        fadeOutStart: 3.28,
        fadeOutTime: 0.4,
        fadeTimePerLine: 0.2
      }
    ],
    bonus: [
      {},
      {}, // 44.0 },
      {}, // general bar fade in/out
      {
        startTime: 153.5,
        duration: 25.3,
        infoStartTime: 2.05,
        infoTime: 3.96,
        fadeInTime: 0.25,
        fadeOutStart: 2.32,
        fadeOutTime: 0.25,
        fadeTimePerLine: 0.08
      }
    ],
    it: [
      {
        startTime: 11.5,
        duration: 18.3,
        infoStartTime: 5.03,
        infoTime: 2.08,
        fadeInTime: 0.4,
        fadeOutStart: 1.45,
        fadeOutTime: 0.3,
        fadeTimePerLine: undefined
      },
      {},
      {
        startTime: 93.5,
        duration: 26.3,
        infoStartTime: 6.5,
        infoTime: 3.15,
        fadeInTime: 0.4,
        fadeOutStart: 2.0,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 144.35,
        duration: 33.9,
        infoStartTime: 8.7,
        infoTime: 4.2,
        fadeInTime: 0.5,
        fadeOutStart: 2.78,
        fadeOutTime: 0.4,
        fadeTimePerLine: 0.2
      }
    ]
  },
  300: {
    default: [
      {
        startTime: 4.5,
        duration: 29.5,
        infoStartTime: 2.35,
        infoTime: 4.63,
        fadeInTime: 0.6,
        fadeOutStart: 2.93,
        fadeOutTime: 0.6,
        fadeTimePerLine: undefined
      },
      { startTime: 80.6, duration: 19.5 }, // 44.0 },
      {
        startTime: 103.7,
        duration: 25.3,
        infoStartTime: 2.15,
        infoTime: 3.98,
        fadeInTime: 0.4,
        fadeOutStart: 2.5,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 159.7,
        duration: 32.9,
        infoStartTime: 2.7,
        infoTime: 5.18,
        fadeInTime: 0.7,
        fadeOutStart: 3.0,
        fadeOutTime: 0.68,
        fadeTimePerLine: 0.1
      }
    ],
    bonus: [
      {
        startTime: 3.5,
        duration: 25.9,
        infoStartTime: 2.4,
        infoTime: 3.96,
        fadeInTime: 0.4,
        fadeOutStart: 2.42,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      { startTime: 70.1, duration: 20.0 },
      {
        startTime: 93.5,
        duration: 25.3,
        infoStartTime: 2.2,
        infoTime: 4.0,
        fadeInTime: 0.4,
        fadeOutStart: 2.5,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 160.0,
        duration: 32.9,
        infoStartTime: 2.6,
        infoTime: 5.18,
        fadeInTime: 0.6,
        fadeOutStart: 2.9,
        fadeOutTime: 0.6,
        fadeTimePerLine: 0.08
      }
    ],
    it: [
      {
        startTime: 12.5,
        duration: 22.75,
        infoStartTime: 5.75,
        infoTime: 2.62,
        fadeInTime: 0.6,
        fadeOutStart: 1.9,
        fadeOutTime: 0.3,
        fadeTimePerLine: undefined
      },
      {},
      {
        startTime: 103.7,
        duration: 26.3,
        infoStartTime: 6.4,
        infoTime: 3.12,
        fadeInTime: 0.4,
        fadeOutStart: 2.1,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 159.7,
        duration: 34.5,
        infoStartTime: 8.5,
        infoTime: 4.13,
        fadeInTime: 0.7,
        fadeOutStart: 2.5,
        fadeOutTime: 0.68,
        fadeTimePerLine: 0.1
      }
    ]
  },
  getAnims(gameLength: 120 | 180 | 240 | 300, withBonus: boolean, it: boolean): BottomBarItemDogAnim[] {
    if (withBonus || it) {
      const key = withBonus ? "bonus" : "it";
      return this[gameLength].default
        .map((item, index) => {
          const bonusItem = this[gameLength][key] && this[gameLength][key][index];
          return bonusItem && Object.keys(bonusItem).length > 0 ? bonusItem : item;
        })
        .filter((item) => item.startTime !== undefined && item.duration !== undefined) as BottomBarItemDogAnim[];
    } else {
      return this[gameLength].default;
    }
  }
};

const dog8BottomBarTimings = {
  120: {
    default: [
      {
        startTime: 2.05,
        duration: 12.1,
        infoStartTime: 1.0,
        infoTime: 1.335,
        fadeInTime: 0.1,
        fadeOutStart: 0.85,
        fadeOutTime: 0.1,
        fadeTimePerLine: 0.06
      },
      {
        startTime: 31.0,
        duration: 27.7,
        infoStartTime: 3.1,
        infoTime: 2.94,
        fadeInTime: 0.4,
        fadeOutStart: 1.65,
        fadeOutTime: 0.25,
        fadeTimePerLine: undefined
      }
    ],
    bonus: [
      {
        startTime: 2.05,
        duration: 12.1,
        infoStartTime: 1.0,
        infoTime: 1.345,
        fadeInTime: 0.1,
        fadeOutStart: 0.85,
        fadeOutTime: 0.1,
        fadeTimePerLine: 0.06
      },
      {
        startTime: 35.8,
        duration: 22.7,
        infoStartTime: 2.79,
        infoTime: 2.36,
        fadeInTime: 0.4,
        fadeOutStart: 1.37,
        fadeOutTime: 0.2,
        fadeTimePerLine: 0.08
      }
    ],
    it: []
  },
  180: {
    default: [
      {
        startTime: 2.8,
        duration: 21.8,
        infoStartTime: 1.5,
        infoTime: 2.41,
        fadeInTime: 0.4,
        fadeOutStart: 1.7,
        fadeOutTime: 0.25,
        fadeTimePerLine: undefined
      },
      {
        startTime: 70.2,
        duration: 20.0,
        infoStartTime: undefined,
        infoTime: undefined,
        fadeInTime: undefined,
        fadeOutStart: undefined,
        fadeOutTime: undefined,
        fadeTimePerLine: undefined
      },
      {
        startTime: 91.8,
        duration: 26.7,
        infoStartTime: 3.3,
        infoTime: 2.79,
        fadeInTime: 0.4,
        fadeOutStart: 1.5,
        fadeOutTime: 0.25,
        fadeTimePerLine: undefined
      }
    ],
    bonus: [
      {
        startTime: 2.8,
        duration: 16.8,
        infoStartTime: 0.7,
        infoTime: 1.92,
        fadeInTime: 0.4,
        fadeOutStart: 1.35,
        fadeOutTime: 0.25,
        fadeTimePerLine: undefined
      },
      {
        startTime: 60.2,
        duration: 20.0,
        infoStartTime: undefined,
        infoTime: undefined,
        fadeInTime: undefined,
        fadeOutStart: undefined,
        fadeOutTime: undefined,
        fadeTimePerLine: undefined
      },
      {}
    ],
    it: []
  },
  240: {
    default: [
      {
        startTime: 3.0,
        duration: 26.7,
        infoStartTime: 2.15,
        infoTime: 2.9,
        fadeInTime: 0.4,
        fadeOutStart: 1.8,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 70.1,
        duration: 30.0,
        infoStartTime: undefined,
        infoTime: undefined,
        fadeInTime: undefined,
        fadeOutStart: undefined,
        fadeOutTime: undefined,
        fadeTimePerLine: undefined
      },
      {
        startTime: 101.0,
        duration: 23.7,
        infoStartTime: 3.3,
        infoTime: 2.43,
        fadeInTime: 0.4,
        fadeOutStart: 1.4,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 146.5,
        duration: 31.3,
        infoStartTime: 4.4,
        infoTime: 3.3,
        fadeInTime: 0.3,
        fadeOutStart: 1.5,
        fadeOutTime: 0.3,
        fadeTimePerLine: 0.08
      }
    ],
    bonus: [
      {},
      {},
      {},
      {
        startTime: 156.0,
        duration: 22.3,
        infoStartTime: 3.1,
        infoTime: 2.28,
        fadeInTime: 0.25,
        fadeOutStart: 1.28,
        fadeOutTime: 0.25,
        fadeTimePerLine: 0.08
      }
    ],
    it: [
      {
        startTime: 11.4,
        duration: 18.9,
        infoStartTime: 4.2,
        infoTime: 1.68,
        fadeInTime: 0.4,
        fadeOutStart: 1.35,
        fadeOutTime: 0.25,
        fadeTimePerLine: undefined
      },
      {},
      {
        startTime: 101.0,
        duration: 24.2,
        infoStartTime: 6.1,
        infoTime: 2.1,
        fadeInTime: 0.4,
        fadeOutStart: 1.5,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 146.5,
        duration: 31.3,
        infoStartTime: 8.26,
        infoTime: 2.83,
        fadeInTime: 0.3,
        fadeOutStart: 1.6,
        fadeOutTime: 0.3,
        fadeTimePerLine: 0.08
      }
    ]
  },
  300: {
    default: [
      {
        startTime: 3.2,
        duration: 30.7,
        infoStartTime: 2.65,
        infoTime: 3.41,
        fadeInTime: 0.4,
        fadeOutStart: 2.2,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      { startTime: 80.1, duration: 30.3 },
      {
        startTime: 111.0,
        duration: 23.7,
        infoStartTime: 3.3,
        infoTime: 2.43,
        fadeInTime: 0.4,
        fadeOutStart: 1.4,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 161.7,
        duration: 31.8,
        infoStartTime: 4.35,
        infoTime: 3.32,
        fadeInTime: 0.25,
        fadeOutStart: 1.6,
        fadeOutTime: 0.4,
        fadeTimePerLine: 0.08
      }
    ],
    bonus: [
      {
        startTime: 3.0,
        duration: 26.7,
        infoStartTime: 2.15,
        infoTime: 2.9,
        fadeInTime: 0.4,
        fadeOutStart: 1.8,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      { startTime: 70.1, duration: 30.0 }, // 44.0 },
      {
        startTime: 101.0,
        duration: 23.7,
        infoStartTime: 3.3,
        infoTime: 2.43,
        fadeInTime: 0.4,
        fadeOutStart: 1.4,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 161.7,
        duration: 31.8,
        infoStartTime: 4.35,
        infoTime: 3.3,
        fadeInTime: 0.25,
        fadeOutStart: 1.75,
        fadeOutTime: 0.4,
        fadeTimePerLine: 0.08
      }
    ],
    it: [
      {
        startTime: 11.6,
        duration: 23.4,
        infoStartTime: 5.45,
        infoTime: 2.115,
        fadeInTime: 0.4,
        fadeOutStart: 1.4,
        fadeOutTime: 0.3,
        fadeTimePerLine: undefined
      }, // general bar fade in/out
      {}, // 44.0 },
      {
        startTime: 111.0,
        duration: 24.2,
        infoStartTime: 6.0,
        infoTime: 2.11,
        fadeInTime: 0.4,
        fadeOutStart: 1.5,
        fadeOutTime: 0.4,
        fadeTimePerLine: undefined
      },
      {
        startTime: 161.7,
        duration: 31.8,
        infoStartTime: 8.25,
        infoTime: 2.865,
        fadeInTime: 0.25,
        fadeOutStart: 1.7,
        fadeOutTime: 0.4,
        fadeTimePerLine: 0.08
      }
    ]
  },
  getAnims(gameLength: 120 | 180 | 240 | 300, withBonus: boolean, it: boolean): BottomBarItemDogAnim[] {
    if (withBonus || it) {
      const key = withBonus ? "bonus" : "it";
      return this[gameLength].default
        .map((item, index) => {
          const bonusItem = this[gameLength][key] && this[gameLength][key][index];
          return bonusItem && Object.keys(bonusItem).length > 0 ? bonusItem : item;
        })
        .filter((item) => item.startTime !== undefined && item.duration !== undefined) as BottomBarItemDogAnim[];
    } else {
      return this[gameLength].default;
    }
  }
};

export const bottomBarSettings = {
  dog6: {
    lineHeight: 27,
    lineHeightNumber: 36,
    lineWidthNumber: 30,
    lineHeightName: 22,
    lineHeightColor: 12,
    seperatorLine: 0.5,
    margin: 2,
    offsetData: -4,
    lineWidth: 166
  },
  dog8: {
    // TODO define values
    lineHeight: 22,
    lineHeightNumber: 30,
    lineWidthNumber: 30,
    lineHeightName: 18,
    lineHeightColor: 10,
    seperatorLine: 0.5,
    margin: 2,
    offsetData: -4,
    lineWidth: 136
  },
  dog63: {
    // TODO define values
    lineHeight: 27,
    lineHeightNumber: 50,
    lineWidthNumber: 36,
    lineHeightName: 32,
    lineHeightColor: 16,
    seperatorLine: 0.75,
    margin: 2,
    offsetData: -4,
    lineWidth: 160
  },
  horse: {
    // TODO define values
    lineHeight: 27,
    lineHeightNumber: 50,
    lineWidthNumber: 36,
    lineHeightName: 32,
    lineHeightColor: 16,
    seperatorLine: 0.75,
    margin: 2,
    offsetData: -4,
    lineWidth: 160
  },
  sulky: {
    // TODO define values
    lineHeight: 27,
    lineHeightNumber: 50,
    lineWidthNumber: 36,
    lineHeightName: 32,
    lineHeightColor: 16,
    seperatorLine: 0.75,
    margin: 2,
    offsetData: -4,
    lineWidth: 160
  }
};

export const BottomBarTimings = {
  horse: horseBottomBarTimings,
  dog6: dog6BottomBarTimings,
  dog8: dog8BottomBarTimings
};
