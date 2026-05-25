/**
 * DOE Game Assets - Olive Green Theme (8 runners)
 * Lazy-loaded module for Dog 8 game
 */

// Background
import background from '@/assets/svg/bg_111_doe_backgroundImage_backgroundImage_stdText_gameSe.jpeg'

// Selection number buttons - Row 1
import selNumber1Row1 from '@/assets/svg/bg_124_doe_selNumber_doe_number1.svg'
import selNumber2Row1 from '@/assets/svg/bg_125_doe_selNumber_doe_number2.svg'
import selNumber3Row1 from '@/assets/svg/bg_126_doe_selNumber_doe_number3.svg'
import selNumber4Row1 from '@/assets/svg/bg_127_doe_selNumber_doe_number4.svg'
import selNumber5Row1 from '@/assets/svg/bg_128_doe_selNumber_doe_number5.svg'
import selNumber6Row1 from '@/assets/svg/bg_129_doe_selNumber_doe_number6.svg'
import selNumber7Row1 from '@/assets/svg/bg_130_doe_selNumber_doe_number7.svg'
import selNumber8Row1 from '@/assets/svg/bg_131_doe_selNumber_doe_number8.svg'

// Selection number buttons - Row 2
import selNumber1Row2 from '@/assets/svg/bg_140_doe_selNumber_doe_number1.svg'
import selNumber2Row2 from '@/assets/svg/bg_141_doe_selNumber_doe_number2.svg'
import selNumber3Row2 from '@/assets/svg/bg_142_doe_selNumber_doe_number3.svg'
import selNumber4Row2 from '@/assets/svg/bg_143_doe_selNumber_doe_number4.svg'
import selNumber5Row2 from '@/assets/svg/bg_144_doe_selNumber_doe_number5.svg'
import selNumber6Row2 from '@/assets/svg/bg_145_doe_selNumber_doe_number6.svg'
import selNumber7Row2 from '@/assets/svg/bg_146_doe_selNumber_doe_number7.svg'
import selNumber8Row2 from '@/assets/svg/bg_147_doe_selNumber_doe_number8.svg'

// Function button background
import funcButtonBg from '@/assets/svg/img_15_funcbutt.svg'

// Info panel backgrounds
import infoPanelBgShadow from '@/assets/svg/img_7_timer2_stdBoxShadow.svg'
import infoPanelBgHighlight from '@/assets/svg/img_8_timer2Over.svg'
import infoPanelBg from '@/assets/svg/img_9_lasche_ro.svg'

// Coins
import coin25 from '@/assets/svg/bg_161_coin0_coin_stdShadow_doe_coin.svg'
import coin50 from '@/assets/svg/bg_163_coin0_coin_stdShadow_doe_coin.svg'
import coin100 from '@/assets/svg/bg_165_coin0_coin_stdShadow_doe_coin.svg'
import coin200 from '@/assets/svg/bg_167_coin0_coin_stdShadow_doe_coin.svg'

// Game icons
import gameIcon from '@/assets/svg/bg_115_gameIconHead_doe_gameIconHead.svg'
import gameIconBg from '@/assets/svg/bg_114_gameIconHeadBa_doe_gameIconHeadBa.svg'

export const doeAssets = {
  background,
  selection: {
    row1: [selNumber1Row1, selNumber2Row1, selNumber3Row1, selNumber4Row1, selNumber5Row1, selNumber6Row1, selNumber7Row1, selNumber8Row1],
    row2: [selNumber1Row2, selNumber2Row2, selNumber3Row2, selNumber4Row2, selNumber5Row2, selNumber6Row2, selNumber7Row2, selNumber8Row2]
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
  runnerCount: 8
}
