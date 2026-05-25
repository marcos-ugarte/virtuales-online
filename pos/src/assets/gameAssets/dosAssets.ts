/**
 * DOS Game Assets - Blue Theme (6 runners)
 * Lazy-loaded module for Dog 6 game
 */

// Background
import background from '@/assets/svg/bg_214_backgroundImage_dos_backgroundImage_stdText.jpeg'

// Selection number buttons - Row 1
import selNumber1Row1 from '@/assets/svg/bg_227_dos_selNumber_dos_number1.svg'
import selNumber2Row1 from '@/assets/svg/bg_228_dos_selNumber_dos_number2.svg'
import selNumber3Row1 from '@/assets/svg/bg_229_dos_selNumber_dos_number3.svg'
import selNumber4Row1 from '@/assets/svg/bg_230_dos_selNumber_dos_number4.svg'
import selNumber5Row1 from '@/assets/svg/bg_231_dos_selNumber_dos_number5.svg'
import selNumber6Row1 from '@/assets/svg/bg_232_dos_selNumber_dos_number6.svg'

// Selection number buttons - Row 2
import selNumber1Row2 from '@/assets/svg/bg_239_dos_selNumber_dos_number1.svg'
import selNumber2Row2 from '@/assets/svg/bg_240_dos_selNumber_dos_number2.svg'
import selNumber3Row2 from '@/assets/svg/bg_241_dos_selNumber_dos_number3.svg'
import selNumber4Row2 from '@/assets/svg/bg_242_dos_selNumber_dos_number4.svg'
import selNumber5Row2 from '@/assets/svg/bg_243_dos_selNumber_dos_number5.svg'
import selNumber6Row2 from '@/assets/svg/bg_244_dos_selNumber_dos_number6.svg'

// Function button background
import funcButtonBg from '@/assets/svg/img_43_funcbutt.svg'

// Info panel backgrounds
import infoPanelBgShadow from '@/assets/svg/img_35_timer2_stdBoxShadow.svg'
import infoPanelBgHighlight from '@/assets/svg/img_36_timer2Over.svg'
import infoPanelBg from '@/assets/svg/img_37_lasche_ro.svg'

// Coins
import coin25 from '@/assets/svg/bg_256_coin0_coin_stdShadow_dos_coin.svg'
import coin50 from '@/assets/svg/bg_258_coin0_coin_stdShadow_dos_coin.svg'
import coin100 from '@/assets/svg/bg_260_coin0_coin_stdShadow_dos_coin.svg'
import coin200 from '@/assets/svg/bg_262_coin0_coin_stdShadow_dos_coin.svg'

// Game icons
import gameIcon from '@/assets/svg/bg_218_gameIconHead_dos_gameIconHead.svg'
import gameIconBg from '@/assets/svg/bg_217_gameIconHeadBa_dos_gameIconHeadBa.svg'

export const dosAssets = {
  background,
  selection: {
    row1: [selNumber1Row1, selNumber2Row1, selNumber3Row1, selNumber4Row1, selNumber5Row1, selNumber6Row1],
    row2: [selNumber1Row2, selNumber2Row2, selNumber3Row2, selNumber4Row2, selNumber5Row2, selNumber6Row2]
  },
  funcButtonBg,
  infoPanel: {
    shadow: infoPanelBgShadow,
    highlight: infoPanelBgHighlight,
    bg: infoPanelBg
  },
  coins: {
    coin25,
    coin50,
    coin100,
    coin200
  },
  gameIcon,
  gameIconBg,
  runnerCount: 6
}

export type GameAssetBundle = typeof dosAssets
