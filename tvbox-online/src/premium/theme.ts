/**
 * Gold Luxe — visual tokens for the premium inter-race intro.
 *
 * Charcoal base + gold accents, elegant/luxury broadcast feel (Royal Ascot
 * premium). Colors are PIXI 0xRRGGBB numbers. Coherent with the POS
 * web-corporate skin (charcoal + gold).
 */
export const COLORS = {
  // base
  charcoal:      0x14140f, // page background (warm near-black)
  charcoalUp:    0x21201a, // panel fill top
  charcoalDown:  0x0d0d0a, // panel fill bottom / vignette
  ink:           0x0a0a08,

  // gold family
  gold:          0xd4af37, // primary accent (hairlines, headings)
  goldBright:    0xf3d877, // highlight / glints
  goldDeep:      0x9c7c25, // shadowed gold
  goldText:      0xe8d59a, // legible gold on charcoal

  // neutrals / text
  cream:         0xf4efe2, // primary text
  smoke:         0x9b958a, // secondary text
  hairline:      0x4a4334, // subtle dividers

  // status
  win:           0xf3d877,
  hot:           0xe7b84b,

  // odds matrix colouring (vendor formula): lowest in group = green, highest = red
  oddsGreen:     0x46d17f,
  oddsRed:       0xff5c5c,
} as const;

/** Greyhound/horse trap jacket colors — universal, same as the overlays.
 *  Index by 1-based trap number. 6 = black/white checkered (rendered as a
 *  light grey chip with a check hint), 7/8 extend for dog8. */
export const TRAP_COLORS: Record<number, number> = {
  1: 0xd83a3a, // red
  2: 0x2b6fd8, // blue
  3: 0xf4efe2, // white
  4: 0x1a1a1a, // black
  5: 0xe79b2b, // orange
  6: 0xb8b8b8, // checkered (chip base)
  7: 0x2f9e4f, // green/red stripe (dog8)
  8: 0xe7d12b, // black/yellow stripe (dog8)
} as const;

export const TRAP_IS_CHECKERED: Record<number, boolean> = { 6: true, 8: true };

/** DIN faces vendored in tvkit/fonts.css — broadcast typography. */
export const FONTS = {
  display: 'DIN-Bold',
  displayItalic: 'DIN-BoldItalic',
  medium: 'DIN-Medium',
  regular: 'DIN-Regular',
  light: 'DIN-LightItalic',
} as const;

/** Fonts to await before the first text draw (avoid fallback flash). */
export const PREMIUM_FONTS = [
  '700 40px "DIN-Bold"',
  '700 40px "DIN-BoldItalic"',
  '500 40px "DIN-Medium"',
  '400 40px "DIN-Regular"',
  '300 40px "DIN-LightItalic"',
];

/** Design space — 16:9, matches the overlay convention. CSS-stretched to fill. */
export const DESIGN_W = 1280;
export const DESIGN_H = 720;

export function hex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}
