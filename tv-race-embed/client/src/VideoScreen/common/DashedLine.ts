import * as PIXI from "pixi.js";

export class DashedLineHelper {
  constructor() {}

  public static drawDashedLine = (track: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number, startOffset: number, dashLength: number, patternLength: number): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    let offsetInPattern = startOffset;
    let drawn = 0;

    track.moveTo(x1, y1);

    while (drawn < distance) {
      const phaseRemaining = offsetInPattern < dashLength ? dashLength - offsetInPattern : patternLength - offsetInPattern;
      const segLen = Math.min(phaseRemaining, distance - drawn);
      drawn += segLen;

      const t = drawn / distance;
      const nx = x1 + dx * t;
      const ny = y1 + dy * t;

      if (offsetInPattern < dashLength) {
        track.lineTo(nx, ny);
      } else {
        track.moveTo(nx, ny);
      }
      offsetInPattern = (offsetInPattern + segLen) % patternLength;
    }
    return offsetInPattern;
  };

  public static drawDashedArc = (
    track: PIXI.Graphics,
    arcCX: number,
    arcCY: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    startOffset: number,
    dashLength: number,
    patternLength: number
  ): number => {
    const totalAngle = endAngle - startAngle;
    const arcLength = Math.abs(totalAngle * radius);
    let offsetInPattern = startOffset;
    let drawn = 0;
    const angleDir = Math.sign(totalAngle) || 1;

    track.moveTo(arcCX + radius * Math.cos(startAngle), arcCY + radius * Math.sin(startAngle));

    while (drawn < arcLength) {
      const phaseRemaining = offsetInPattern < dashLength ? dashLength - offsetInPattern : patternLength - offsetInPattern;
      const segLen = Math.min(phaseRemaining, arcLength - drawn);
      drawn += segLen;

      const currentAngle = startAngle + angleDir * (drawn / radius);
      const nx = arcCX + radius * Math.cos(currentAngle);
      const ny = arcCY + radius * Math.sin(currentAngle);

      if (offsetInPattern < dashLength) {
        track.lineTo(nx, ny);
      } else {
        track.moveTo(nx, ny);
      }
      offsetInPattern = (offsetInPattern + segLen) % patternLength;
    }
    return offsetInPattern;
  };
}
