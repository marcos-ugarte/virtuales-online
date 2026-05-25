/**
 * Game Assets Hook
 * Provides game-specific SVG assets (coins, logos, etc.)
 */

import type { GameType } from './useGameTheme'

// DOS Coins (Blue)
import dosCoin25 from '@/assets/svg/bg_256_coin0_coin_stdShadow_dos_coin.svg'
import dosCoin50 from '@/assets/svg/bg_258_coin0_coin_stdShadow_dos_coin.svg'
import dosCoin100 from '@/assets/svg/bg_260_coin0_coin_stdShadow_dos_coin.svg'
import dosCoin200 from '@/assets/svg/bg_262_coin0_coin_stdShadow_dos_coin.svg'

// DOE Coins (Green)
import doeCoin25 from '@/assets/svg/bg_161_coin0_coin_stdShadow_doe_coin.svg'
import doeCoin50 from '@/assets/svg/bg_163_coin0_coin_stdShadow_doe_coin.svg'
import doeCoin100 from '@/assets/svg/bg_165_coin0_coin_stdShadow_doe_coin.svg'
import doeCoin200 from '@/assets/svg/bg_167_coin0_coin_stdShadow_doe_coin.svg'

// HOC Coins (Gray)
import hocCoin25 from '@/assets/svg/bg_353_coin0_coin_stdShadow_hoc_coin.svg'
import hocCoin50 from '@/assets/svg/bg_355_coin0_coin_stdShadow_hoc_coin.svg'
import hocCoin100 from '@/assets/svg/bg_357_coin0_coin_stdShadow_hoc_coin.svg'
import hocCoin200 from '@/assets/svg/bg_359_coin0_coin_stdShadow_hoc_coin.svg'

// Game Icons/Logos
import gameIconDos from '@/assets/svg/bg_218_gameIconHead_dos_gameIconHead.svg'
import gameIconDot from '@/assets/svg/bg_409_gameIconHead_dot_gameIconHead.svg'
import gameIconDoe from '@/assets/svg/bg_115_gameIconHead_doe_gameIconHead.svg'
import gameIconHoc from '@/assets/svg/bg_311_gameIconHead_hoc_gameIconHead.svg'

// Game Icon Backgrounds
import gameIconBgDos from '@/assets/svg/bg_217_gameIconHeadBa_dos_gameIconHeadBa.svg'
import gameIconBgDot from '@/assets/svg/bg_408_gameIconHeadBa_dot_gameIconHeadBa.svg'
import gameIconBgDoe from '@/assets/svg/bg_114_gameIconHeadBa_doe_gameIconHeadBa.svg'
import gameIconBgHoc from '@/assets/svg/bg_310_gameIconHeadBa_hoc_gameIconHeadBa.svg'

export interface GameAssets {
  coins: {
    coin25: string
    coin50: string
    coin100: string
    coin200: string
  }
  gameIcon: string
  gameIconBg: string
}

const dosAssets: GameAssets = {
  coins: {
    coin25: dosCoin25,
    coin50: dosCoin50,
    coin100: dosCoin100,
    coin200: dosCoin200,
  },
  gameIcon: gameIconDos,
  gameIconBg: gameIconBgDos,
}

const doeAssets: GameAssets = {
  coins: {
    coin25: doeCoin25,
    coin50: doeCoin50,
    coin100: doeCoin100,
    coin200: doeCoin200,
  },
  gameIcon: gameIconDoe,
  gameIconBg: gameIconBgDoe,
}

// HOC has its own gray coins, logo and background
const hocAssets: GameAssets = {
  coins: {
    coin25: hocCoin25,
    coin50: hocCoin50,
    coin100: hocCoin100,
    coin200: hocCoin200,
  },
  gameIcon: gameIconHoc,
  gameIconBg: gameIconBgHoc,
}

// DOT has its own logo with "PRO" badge (uses DOS coins for now)
const dotAssets: GameAssets = {
  coins: dosAssets.coins,
  gameIcon: gameIconDot,
  gameIconBg: gameIconBgDot,
}

const gameAssets: Record<GameType, GameAssets> = {
  dos: dosAssets,
  doe: doeAssets,
  hoc: hocAssets,
  dot: dotAssets,
}

/**
 * Get assets for a specific game
 */
export function getGameAssets(gameType: GameType): GameAssets {
  return gameAssets[gameType] || dosAssets
}

/**
 * Hook to get game-specific assets
 */
export function useGameAssets(gameType: GameType): GameAssets {
  return getGameAssets(gameType)
}

export default useGameAssets
