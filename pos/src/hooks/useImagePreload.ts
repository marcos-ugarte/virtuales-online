/**
 * Image Preload Hook
 * Preloads all game-specific images in the background for instant switching
 */

import { useEffect, useRef } from 'react'

// Import all game-specific images that change on game switch

// Backgrounds
import backgroundDos from '@/assets/svg/bg_214_backgroundImage_dos_backgroundImage_stdText.jpeg'
import backgroundDoe from '@/assets/svg/bg_111_doe_backgroundImage_backgroundImage_stdText_gameSe.jpeg'
import backgroundHoc from '@/assets/svg/bg_307_hoc_backgroundImage_backgroundImage_stdText.jpeg'

// Selection buttons - DOS
import dosSelNumber1Row1 from '@/assets/svg/bg_227_dos_selNumber_dos_number1.svg'
import dosSelNumber2Row1 from '@/assets/svg/bg_228_dos_selNumber_dos_number2.svg'
import dosSelNumber3Row1 from '@/assets/svg/bg_229_dos_selNumber_dos_number3.svg'
import dosSelNumber4Row1 from '@/assets/svg/bg_230_dos_selNumber_dos_number4.svg'
import dosSelNumber5Row1 from '@/assets/svg/bg_231_dos_selNumber_dos_number5.svg'
import dosSelNumber6Row1 from '@/assets/svg/bg_232_dos_selNumber_dos_number6.svg'
import dosSelNumber1Row2 from '@/assets/svg/bg_239_dos_selNumber_dos_number1.svg'
import dosSelNumber2Row2 from '@/assets/svg/bg_240_dos_selNumber_dos_number2.svg'
import dosSelNumber3Row2 from '@/assets/svg/bg_241_dos_selNumber_dos_number3.svg'
import dosSelNumber4Row2 from '@/assets/svg/bg_242_dos_selNumber_dos_number4.svg'
import dosSelNumber5Row2 from '@/assets/svg/bg_243_dos_selNumber_dos_number5.svg'
import dosSelNumber6Row2 from '@/assets/svg/bg_244_dos_selNumber_dos_number6.svg'

// Selection buttons - DOE
import doeSelNumber1Row1 from '@/assets/svg/bg_124_doe_selNumber_doe_number1.svg'
import doeSelNumber2Row1 from '@/assets/svg/bg_125_doe_selNumber_doe_number2.svg'
import doeSelNumber3Row1 from '@/assets/svg/bg_126_doe_selNumber_doe_number3.svg'
import doeSelNumber4Row1 from '@/assets/svg/bg_127_doe_selNumber_doe_number4.svg'
import doeSelNumber5Row1 from '@/assets/svg/bg_128_doe_selNumber_doe_number5.svg'
import doeSelNumber6Row1 from '@/assets/svg/bg_129_doe_selNumber_doe_number6.svg'
import doeSelNumber7Row1 from '@/assets/svg/bg_130_doe_selNumber_doe_number7.svg'
import doeSelNumber8Row1 from '@/assets/svg/bg_131_doe_selNumber_doe_number8.svg'
import doeSelNumber1Row2 from '@/assets/svg/bg_140_doe_selNumber_doe_number1.svg'
import doeSelNumber2Row2 from '@/assets/svg/bg_141_doe_selNumber_doe_number2.svg'
import doeSelNumber3Row2 from '@/assets/svg/bg_142_doe_selNumber_doe_number3.svg'
import doeSelNumber4Row2 from '@/assets/svg/bg_143_doe_selNumber_doe_number4.svg'
import doeSelNumber5Row2 from '@/assets/svg/bg_144_doe_selNumber_doe_number5.svg'
import doeSelNumber6Row2 from '@/assets/svg/bg_145_doe_selNumber_doe_number6.svg'
import doeSelNumber7Row2 from '@/assets/svg/bg_146_doe_selNumber_doe_number7.svg'
import doeSelNumber8Row2 from '@/assets/svg/bg_147_doe_selNumber_doe_number8.svg'

// Selection buttons - HOC
import hocSelNumber1Row1 from '@/assets/svg/bg_320_hoc_selNumber_hoc_number1.svg'
import hocSelNumber2Row1 from '@/assets/svg/bg_321_hoc_selNumber_hoc_number2.svg'
import hocSelNumber3Row1 from '@/assets/svg/bg_322_hoc_selNumber_hoc_number3.svg'
import hocSelNumber4Row1 from '@/assets/svg/bg_323_hoc_selNumber_hoc_number4.svg'
import hocSelNumber5Row1 from '@/assets/svg/bg_324_hoc_selNumber_hoc_number5.svg'
import hocSelNumber6Row1 from '@/assets/svg/bg_325_hoc_selNumber_hoc_number6.svg'
import hocSelNumber7Row1 from '@/assets/svg/bg_326_hoc_selNumber_hoc_number7.svg'
import hocSelNumber1Row2 from '@/assets/svg/bg_334_hoc_selNumber_hoc_number1.svg'
import hocSelNumber2Row2 from '@/assets/svg/bg_335_hoc_selNumber_hoc_number2.svg'
import hocSelNumber3Row2 from '@/assets/svg/bg_336_hoc_selNumber_hoc_number3.svg'
import hocSelNumber4Row2 from '@/assets/svg/bg_337_hoc_selNumber_hoc_number4.svg'
import hocSelNumber5Row2 from '@/assets/svg/bg_338_hoc_selNumber_hoc_number5.svg'
import hocSelNumber6Row2 from '@/assets/svg/bg_339_hoc_selNumber_hoc_number6.svg'
import hocSelNumber7Row2 from '@/assets/svg/bg_340_hoc_selNumber_hoc_number7.svg'

// Function button backgrounds
import funcButtonBgDos from '@/assets/svg/img_43_funcbutt.svg'
import funcButtonBgDoe from '@/assets/svg/img_15_funcbutt.svg'
import funcButtonBgHoc from '@/assets/svg/img_71_funcbutt.svg'

// Info panel backgrounds
import infoPanelBgShadowDos from '@/assets/svg/img_35_timer2_stdBoxShadow.svg'
import infoPanelBgHighlightDos from '@/assets/svg/img_36_timer2Over.svg'
import infoPanelBgDos from '@/assets/svg/img_37_lasche_ro.svg'
import infoPanelBgShadowDoe from '@/assets/svg/img_7_timer2_stdBoxShadow.svg'
import infoPanelBgHighlightDoe from '@/assets/svg/img_8_timer2Over.svg'
import infoPanelBgDoe from '@/assets/svg/img_9_lasche_ro.svg'
import infoPanelBgShadowHoc from '@/assets/svg/img_63_timer2_stdBoxShadow.svg'
import infoPanelBgHighlightHoc from '@/assets/svg/img_64_timer2Over.svg'
import infoPanelBgHoc from '@/assets/svg/img_65_lasche_ro.svg'

// Coins
import dosCoin25 from '@/assets/svg/bg_256_coin0_coin_stdShadow_dos_coin.svg'
import dosCoin50 from '@/assets/svg/bg_258_coin0_coin_stdShadow_dos_coin.svg'
import dosCoin100 from '@/assets/svg/bg_260_coin0_coin_stdShadow_dos_coin.svg'
import dosCoin200 from '@/assets/svg/bg_262_coin0_coin_stdShadow_dos_coin.svg'
import doeCoin25 from '@/assets/svg/bg_161_coin0_coin_stdShadow_doe_coin.svg'
import doeCoin50 from '@/assets/svg/bg_163_coin0_coin_stdShadow_doe_coin.svg'
import doeCoin100 from '@/assets/svg/bg_165_coin0_coin_stdShadow_doe_coin.svg'
import doeCoin200 from '@/assets/svg/bg_167_coin0_coin_stdShadow_doe_coin.svg'

// HOC Coins (Gray)
import hocCoin25 from '@/assets/svg/bg_353_coin0_coin_stdShadow_hoc_coin.svg'
import hocCoin50 from '@/assets/svg/bg_355_coin0_coin_stdShadow_hoc_coin.svg'
import hocCoin100 from '@/assets/svg/bg_357_coin0_coin_stdShadow_hoc_coin.svg'
import hocCoin200 from '@/assets/svg/bg_359_coin0_coin_stdShadow_hoc_coin.svg'

// Game icons
import gameIconDos from '@/assets/svg/bg_218_gameIconHead_dos_gameIconHead.svg'
import gameIconDoe from '@/assets/svg/bg_115_gameIconHead_doe_gameIconHead.svg'
import gameIconHoc from '@/assets/svg/bg_311_gameIconHead_hoc_gameIconHead.svg'
import gameIconBgDos from '@/assets/svg/bg_217_gameIconHeadBa_dos_gameIconHeadBa.svg'
import gameIconBgDoe from '@/assets/svg/bg_114_gameIconHeadBa_doe_gameIconHeadBa.svg'
import gameIconBgHoc from '@/assets/svg/bg_310_gameIconHeadBa_hoc_gameIconHeadBa.svg'

// All images to preload
const ALL_GAME_IMAGES = [
  // Backgrounds
  backgroundDos, backgroundDoe, backgroundHoc,

  // DOS selection buttons
  dosSelNumber1Row1, dosSelNumber2Row1, dosSelNumber3Row1,
  dosSelNumber4Row1, dosSelNumber5Row1, dosSelNumber6Row1,
  dosSelNumber1Row2, dosSelNumber2Row2, dosSelNumber3Row2,
  dosSelNumber4Row2, dosSelNumber5Row2, dosSelNumber6Row2,

  // DOE selection buttons
  doeSelNumber1Row1, doeSelNumber2Row1, doeSelNumber3Row1,
  doeSelNumber4Row1, doeSelNumber5Row1, doeSelNumber6Row1,
  doeSelNumber7Row1, doeSelNumber8Row1,
  doeSelNumber1Row2, doeSelNumber2Row2, doeSelNumber3Row2,
  doeSelNumber4Row2, doeSelNumber5Row2, doeSelNumber6Row2,
  doeSelNumber7Row2, doeSelNumber8Row2,

  // HOC selection buttons
  hocSelNumber1Row1, hocSelNumber2Row1, hocSelNumber3Row1,
  hocSelNumber4Row1, hocSelNumber5Row1, hocSelNumber6Row1,
  hocSelNumber7Row1,
  hocSelNumber1Row2, hocSelNumber2Row2, hocSelNumber3Row2,
  hocSelNumber4Row2, hocSelNumber5Row2, hocSelNumber6Row2,
  hocSelNumber7Row2,

  // Function buttons
  funcButtonBgDos, funcButtonBgDoe, funcButtonBgHoc,

  // Info panels
  infoPanelBgShadowDos, infoPanelBgHighlightDos, infoPanelBgDos,
  infoPanelBgShadowDoe, infoPanelBgHighlightDoe, infoPanelBgDoe,
  infoPanelBgShadowHoc, infoPanelBgHighlightHoc, infoPanelBgHoc,

  // Coins
  dosCoin25, dosCoin50, dosCoin100, dosCoin200,
  doeCoin25, doeCoin50, doeCoin100, doeCoin200,
  hocCoin25, hocCoin50, hocCoin100, hocCoin200,

  // Game icons
  gameIconDos, gameIconDoe, gameIconHoc,
  gameIconBgDos, gameIconBgDoe, gameIconBgHoc,
]

/**
 * Preload a single image into browser cache
 */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve() // Don't fail on error, just continue
    img.src = src
  })
}

/**
 * Hook that preloads all game images in the background
 * Call this once at app startup for instant game switching
 */
export function useImagePreload(): void {
  const preloadedRef = useRef(false)

  useEffect(() => {
    // Only preload once
    if (preloadedRef.current) return
    preloadedRef.current = true

    // Preload images in batches to avoid overwhelming the browser
    const batchSize = 10
    let currentBatch = 0

    const preloadBatch = () => {
      const start = currentBatch * batchSize
      const end = Math.min(start + batchSize, ALL_GAME_IMAGES.length)

      if (start >= ALL_GAME_IMAGES.length) return

      const batch = ALL_GAME_IMAGES.slice(start, end)
      Promise.all(batch.map(preloadImage)).then(() => {
        currentBatch++
        // Use requestIdleCallback if available, otherwise setTimeout
        if ('requestIdleCallback' in window) {
          (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(preloadBatch)
        } else {
          setTimeout(preloadBatch, 50)
        }
      })
    }

    // Start preloading after a short delay to not block initial render
    setTimeout(preloadBatch, 100)
  }, [])
}

export default useImagePreload
