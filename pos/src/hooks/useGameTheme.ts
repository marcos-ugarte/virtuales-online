/**
 * Game Theme Hook
 * Provides color palettes and assets based on the active game
 */

export type GameType = 'dos' | 'doe' | 'hoc' | 'dot'

export interface GameTheme {
  // Game identifier
  id: GameType
  name: string

  // Primary colors (gradients for coins/buttons)
  primaryGradient: {
    start: string  // Top color
    end: string    // Bottom color
  }

  // Text colors
  textPrimary: string      // Main text (menu items, labels)
  textSecondary: string    // Secondary text
  textAccent: string       // Accent/highlight color

  // Background colors
  panelBackground: string  // Panel backgrounds
  buttonBackground: string // Button backgrounds

  // Number of runners in the game
  runnerCount: 6 | 8 | 7
}

// DOS - Dog 6 (Blue theme)
const dosTheme: GameTheme = {
  id: 'dos',
  name: '6 Galgos',
  primaryGradient: {
    start: '#05215c',
    end: '#021138',
  },
  textPrimary: '#029ad0',      // Cyan/blue
  textSecondary: '#c2def8',    // Light blue
  textAccent: '#feed01',       // Yellow (active)
  panelBackground: '#0C1F46',  // Dark blue
  buttonBackground: '#05215c', // Blue
  runnerCount: 6,
}

// DOE - Dog 8 (Olive green theme)
const doeTheme: GameTheme = {
  id: 'doe',
  name: '8 Galgos',
  primaryGradient: {
    start: '#0e432d',
    end: '#0a241b',
  },
  textPrimary: '#a39941',      // Olive green (from original POS)
  textSecondary: '#c5c18a',    // Light olive
  textAccent: '#feed01',       // Yellow (active)
  panelBackground: '#0C2F23',  // Dark green
  buttonBackground: '#0e432d', // Green
  runnerCount: 8,
}

// HOC - Horses (Brown theme)
const hocTheme: GameTheme = {
  id: 'hoc',
  name: 'Caballos',
  primaryGradient: {
    start: '#4a3529',
    end: '#2e1f18',
  },
  textPrimary: '#7e5d4d',      // Brown (from original POS)
  textSecondary: '#a38979',    // Light brown
  textAccent: '#feed01',       // Yellow (active)
  panelBackground: '#3a2a20',  // Dark brown
  buttonBackground: '#4a3529', // Brown
  runnerCount: 7,
}

// DOT - placeholder (same as DOS for now)
// TODO (pending option B): replace hardcoded `name` with GameTypes.GameName from the
// backend so admins can rename games via DB without a POS redeploy. See Dashboard.tsx
// usages of `gameTheme.name` for ticket printing (juego field).
const dotTheme: GameTheme = {
  ...dosTheme,
  id: 'dot',
  name: 'Dog6 Pro',
}

const themes: Record<GameType, GameTheme> = {
  dos: dosTheme,
  doe: doeTheme,
  hoc: hocTheme,
  dot: dotTheme,
}

/**
 * Web skin color palette (matches web-lobby corporate identity: charcoal
 * surfaces + gold accent). Applied UNIFORMLY across all game types when the
 * 'web' skin is active — the per-game color variations (blue/green/brown) are
 * intentionally dropped, only the color fields are overridden. Non-color fields
 * (id, name, runnerCount) are kept from the real game theme.
 */
const WEB_SKIN_COLORS: Omit<GameTheme, 'id' | 'name' | 'runnerCount'> = {
  primaryGradient: {
    start: '#f5a623',  // gold
    end: '#d18d12',
  },
  textPrimary: '#f5a623',    // gold accent
  textSecondary: '#e2e2e2',  // light gray
  textAccent: '#f5a623',     // gold (active)
  panelBackground: '#4a4a4a',
  buttonBackground: '#585858',
}

/** Overlay the web palette on a game theme, preserving runnerCount/id/name. */
function applyWebSkin(theme: GameTheme): GameTheme {
  return { ...theme, ...WEB_SKIN_COLORS }
}

/**
 * Get theme for a specific game
 */
export function getGameTheme(gameType: GameType): GameTheme {
  return themes[gameType] || dosTheme
}

/**
 * Get the game theme adjusted for the active skin. 'classic' returns the
 * per-game palette; 'web' returns the unified corporate palette but keeps the
 * game's runnerCount/id/name.
 */
export function getGameThemeForSkin(gameType: GameType, skin: 'classic' | 'web'): GameTheme {
  const base = getGameTheme(gameType)
  return skin === 'web' ? applyWebSkin(base) : base
}

/**
 * Hook to get the current game theme
 */
export function useGameTheme(gameType: GameType): GameTheme {
  return getGameTheme(gameType)
}

/**
 * CSS custom properties for the theme
 * Can be applied to a container element
 */
export function getThemeCSSVariables(theme: GameTheme): Record<string, string> {
  return {
    '--game-primary-start': theme.primaryGradient.start,
    '--game-primary-end': theme.primaryGradient.end,
    '--game-text-primary': theme.textPrimary,
    '--game-text-secondary': theme.textSecondary,
    '--game-text-accent': theme.textAccent,
    '--game-panel-bg': theme.panelBackground,
    '--game-button-bg': theme.buttonBackground,
  }
}

export default useGameTheme
