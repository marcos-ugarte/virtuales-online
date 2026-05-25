/**
 * HOC Game Assets - Brown Theme (7 runners)
 * Lazy-loaded module for Horses game
 */

// Background
import background from '@/assets/svg/bg_307_hoc_backgroundImage_backgroundImage_stdText.jpeg'

// Selection number buttons - Row 1
import selNumber1Row1 from '@/assets/svg/bg_320_hoc_selNumber_hoc_number1.svg'
import selNumber2Row1 from '@/assets/svg/bg_321_hoc_selNumber_hoc_number2.svg'
import selNumber3Row1 from '@/assets/svg/bg_322_hoc_selNumber_hoc_number3.svg'
import selNumber4Row1 from '@/assets/svg/bg_323_hoc_selNumber_hoc_number4.svg'
import selNumber5Row1 from '@/assets/svg/bg_324_hoc_selNumber_hoc_number5.svg'
import selNumber6Row1 from '@/assets/svg/bg_325_hoc_selNumber_hoc_number6.svg'
import selNumber7Row1 from '@/assets/svg/bg_326_hoc_selNumber_hoc_number7.svg'

// Selection number buttons - Row 2
import selNumber1Row2 from '@/assets/svg/bg_334_hoc_selNumber_hoc_number1.svg'
import selNumber2Row2 from '@/assets/svg/bg_335_hoc_selNumber_hoc_number2.svg'
import selNumber3Row2 from '@/assets/svg/bg_336_hoc_selNumber_hoc_number3.svg'
import selNumber4Row2 from '@/assets/svg/bg_337_hoc_selNumber_hoc_number4.svg'
import selNumber5Row2 from '@/assets/svg/bg_338_hoc_selNumber_hoc_number5.svg'
import selNumber6Row2 from '@/assets/svg/bg_339_hoc_selNumber_hoc_number6.svg'
import selNumber7Row2 from '@/assets/svg/bg_340_hoc_selNumber_hoc_number7.svg'

// Function button background
import funcButtonBg from '@/assets/svg/img_71_funcbutt.svg'

// Info panel backgrounds
import infoPanelBgShadow from '@/assets/svg/img_63_timer2_stdBoxShadow.svg'
import infoPanelBgHighlight from '@/assets/svg/img_64_timer2Over.svg'
import infoPanelBg from '@/assets/svg/img_65_lasche_ro.svg'

// Coins - HOC uses DOS coins as placeholder (same as useGameAssets.ts)
import coin25 from '@/assets/svg/bg_256_coin0_coin_stdShadow_dos_coin.svg'
import coin50 from '@/assets/svg/bg_258_coin0_coin_stdShadow_dos_coin.svg'
import coin100 from '@/assets/svg/bg_260_coin0_coin_stdShadow_dos_coin.svg'
import coin200 from '@/assets/svg/bg_262_coin0_coin_stdShadow_dos_coin.svg'

// Game icons - HOC uses DOS icons as placeholder (same as useGameAssets.ts)
import gameIcon from '@/assets/svg/bg_218_gameIconHead_dos_gameIconHead.svg'
import gameIconBg from '@/assets/svg/bg_217_gameIconHeadBa_dos_gameIconHeadBa.svg'

export const hocAssets = {
  background,
  selection: {
    row1: [selNumber1Row1, selNumber2Row1, selNumber3Row1, selNumber4Row1, selNumber5Row1, selNumber6Row1, selNumber7Row1],
    row2: [selNumber1Row2, selNumber2Row2, selNumber3Row2, selNumber4Row2, selNumber5Row2, selNumber6Row2, selNumber7Row2]
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
  runnerCount: 7
}
