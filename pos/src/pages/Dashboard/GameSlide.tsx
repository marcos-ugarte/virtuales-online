import Bets from '@/components/Bets'
import WebBetColumn from '@/components/Bets/WebBetColumn'
import Results from '@/components/Results'
import Cuotas from '@/components/Cuotas'
import Ventas from '@/components/Ventas'
import type { SalesRecord } from '@/components/Ventas'
import { DotNumpad } from '@/components/DotNumpad'
import { WinnerButtons } from '@/components/WinnerButtons'
import { BetModeButtons } from '@/components/BetModeButtons'
import { OrderModeButtons } from '@/components/OrderModeButtons'
import type { GamePrefix } from '@/hooks/useRaceData'
import type { GameAssets } from '@/hooks/useGameAssets'
import type { Bet } from '@/types/bet'
import { useTimer } from '@/hooks/useTimer'
import styles from './Dashboard.module.css'

// Header assets
import timerBar from '@/assets/svg/bg_215_timerbar.svg'
import timerBarLine from '@/assets/svg/bg_216_timerbarLine.svg'
import timerIcon from '@/assets/svg/img_6_img.svg'
import settingsGear from '@/assets/svg/settings-gear.svg'
import searchIcon from '@/assets/svg/search-icon.svg'
import ticketSelectIcon from '@/assets/svg/ticket-select.svg'
import ticketDeleteIcon from '@/assets/svg/ticket-delete.svg'
import spanishFlag from '@/assets/svg/img_11_flagImage.svg'

// Game selector icons
import gameIconDos from '@/assets/svg/bg_116_chGaButton_dos_chGaIcon.svg'
import gameIconDot from '@/assets/svg/bg_117_chGaButton_dot_chGaIcon.svg'
import gameIconDoe from '@/assets/svg/bg_118_chGaButton_doe_chGaIcon_selected.svg'
import gameIconHoc from '@/assets/svg/bg_119_chGaButton_hoc_chGaIcon.svg'

// Info panel backgrounds by game
import infoPanelBgShadowDos from '@/assets/svg/img_35_timer2_stdBoxShadow.svg'
import infoPanelBgHighlightDos from '@/assets/svg/img_36_timer2Over.svg'
import infoPanelBgDos from '@/assets/svg/img_37_lasche_ro.svg'
import infoPanelBgShadowDoe from '@/assets/svg/img_7_timer2_stdBoxShadow.svg'
import infoPanelBgHighlightDoe from '@/assets/svg/img_8_timer2Over.svg'
import infoPanelBgDoe from '@/assets/svg/img_9_lasche_ro.svg'
import infoPanelBgShadowHoc from '@/assets/svg/img_63_timer2_stdBoxShadow.svg'
import infoPanelBgHighlightHoc from '@/assets/svg/img_64_timer2Over.svg'
import infoPanelBgHoc from '@/assets/svg/img_65_lasche_ro.svg'

const GAME_PREFIXES: GamePrefix[] = ['dos', 'doe', 'dot', 'hoc']
const GAME_SELECTORS = [gameIconDos, gameIconDoe, gameIconDot, gameIconHoc] as const

const INFO_PANEL_ASSETS: Record<'dos' | 'doe' | 'hoc', { shadow: string, highlight: string, bg: string }> = {
  dos: { shadow: infoPanelBgShadowDos, highlight: infoPanelBgHighlightDos, bg: infoPanelBgDos },
  doe: { shadow: infoPanelBgShadowDoe, highlight: infoPanelBgHighlightDoe, bg: infoPanelBgDoe },
  hoc: { shadow: infoPanelBgShadowHoc, highlight: infoPanelBgHighlightHoc, bg: infoPanelBgHoc }
}

const GAME_DISPLAY_NAMES: Record<string, string> = {
  dos: 'CARRERA DE DOG 6',
  doe: 'CARRERA DE DOG 8',
  dot: 'DOG TRIFECTA',
  hoc: 'CABALLOS'
}

// Short labels for the web-skin game-selection cards (replace the brand logos).
const GAME_CARD_LABELS: Record<string, string> = {
  dos: 'DOG 6',
  doe: 'DOG 8',
  dot: 'TRÍO',
  hoc: 'CABALLOS'
}

// Import background images per game
import backgroundDos from '@/assets/svg/bg_214_backgroundImage_dos_backgroundImage_stdText.jpeg'
import backgroundDoe from '@/assets/svg/bg_111_doe_backgroundImage_backgroundImage_stdText_gameSe.jpeg'
import backgroundHoc from '@/assets/svg/bg_307_hoc_backgroundImage_backgroundImage_stdText.jpeg'

// Selection number buttons - DOS (6 runners)
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

// Selection number buttons - DOE (8 runners)
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

// Selection number buttons - HOC (7 runners)
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

// Function buttons - backgrounds (game-specific)
import funcButtonBgDos from '@/assets/svg/img_43_funcbutt.svg'
import funcButtonBgDoe from '@/assets/svg/img_15_funcbutt.svg'
import funcButtonBgHoc from '@/assets/svg/img_71_funcbutt.svg'

// Function buttons - icons
import funcIconUpDown from '@/assets/svg/img_16_functxt.svg'
import funcIconDiag from '@/assets/svg/img_18_functxt.svg'
import funcIconR from '@/assets/svg/img_20_functxt.svg'
import funcIconR2 from '@/assets/svg/img_22_functxt.svg'

// Delete and Print buttons
import trashButton from '@/assets/svg/img_26_trash.svg'
import printButton from '@/assets/svg/img_27_print.svg'

// Selection button active background
import selectionDotActive from '@/assets/svg/bg_425_dot_active.svg'

// Coins - DOS (blue)
import dosCoin25 from '@/assets/svg/bg_256_coin0_coin_stdShadow_dos_coin.svg'
import dosCoin50 from '@/assets/svg/bg_258_coin0_coin_stdShadow_dos_coin.svg'
import dosCoin100 from '@/assets/svg/bg_260_coin0_coin_stdShadow_dos_coin.svg'
import dosCoin200 from '@/assets/svg/bg_262_coin0_coin_stdShadow_dos_coin.svg'
// Coins - DOE (green)
import doeCoin25 from '@/assets/svg/bg_161_coin0_coin_stdShadow_doe_coin.svg'
import doeCoin50 from '@/assets/svg/bg_163_coin0_coin_stdShadow_doe_coin.svg'
import doeCoin100 from '@/assets/svg/bg_165_coin0_coin_stdShadow_doe_coin.svg'
import doeCoin200 from '@/assets/svg/bg_167_coin0_coin_stdShadow_doe_coin.svg'
// Coins - HOC (gray)
import hocCoin25 from '@/assets/svg/bg_353_coin0_coin_stdShadow_hoc_coin.svg'
import hocCoin50 from '@/assets/svg/bg_355_coin0_coin_stdShadow_hoc_coin.svg'
import hocCoin100 from '@/assets/svg/bg_357_coin0_coin_stdShadow_hoc_coin.svg'
import hocCoin200 from '@/assets/svg/bg_359_coin0_coin_stdShadow_hoc_coin.svg'

// Background images by game
const BACKGROUND_IMAGES: Record<'dos' | 'doe' | 'hoc', string> = {
  dos: backgroundDos,
  doe: backgroundDoe,
  hoc: backgroundHoc
}

// Coin assets by game
const COIN_ASSETS: Record<'dos' | 'doe' | 'hoc', { coin25: string, coin50: string, coin100: string, coin200: string }> = {
  dos: { coin25: dosCoin25, coin50: dosCoin50, coin100: dosCoin100, coin200: dosCoin200 },
  doe: { coin25: doeCoin25, coin50: doeCoin50, coin100: doeCoin100, coin200: doeCoin200 },
  hoc: { coin25: hocCoin25, coin50: hocCoin50, coin100: hocCoin100, coin200: hocCoin200 }
}

// Denomination values for coin buttons
const DENOMINATION_VALUES = [25, 50, 100, 200] as const

// Selection number assets by game (row3 uses row1 assets for DOT trifecta)
const SELECTION_ASSETS: Record<'dos' | 'doe' | 'hoc', { row1: string[], row2: string[], row3: string[] }> = {
  dos: {
    row1: [dosSelNumber1Row1, dosSelNumber2Row1, dosSelNumber3Row1, dosSelNumber4Row1, dosSelNumber5Row1, dosSelNumber6Row1],
    row2: [dosSelNumber1Row2, dosSelNumber2Row2, dosSelNumber3Row2, dosSelNumber4Row2, dosSelNumber5Row2, dosSelNumber6Row2],
    row3: [dosSelNumber1Row1, dosSelNumber2Row1, dosSelNumber3Row1, dosSelNumber4Row1, dosSelNumber5Row1, dosSelNumber6Row1]
  },
  doe: {
    row1: [doeSelNumber1Row1, doeSelNumber2Row1, doeSelNumber3Row1, doeSelNumber4Row1, doeSelNumber5Row1, doeSelNumber6Row1, doeSelNumber7Row1, doeSelNumber8Row1],
    row2: [doeSelNumber1Row2, doeSelNumber2Row2, doeSelNumber3Row2, doeSelNumber4Row2, doeSelNumber5Row2, doeSelNumber6Row2, doeSelNumber7Row2, doeSelNumber8Row2],
    row3: [doeSelNumber1Row1, doeSelNumber2Row1, doeSelNumber3Row1, doeSelNumber4Row1, doeSelNumber5Row1, doeSelNumber6Row1, doeSelNumber7Row1, doeSelNumber8Row1]
  },
  hoc: {
    row1: [hocSelNumber1Row1, hocSelNumber2Row1, hocSelNumber3Row1, hocSelNumber4Row1, hocSelNumber5Row1, hocSelNumber6Row1, hocSelNumber7Row1],
    row2: [hocSelNumber1Row2, hocSelNumber2Row2, hocSelNumber3Row2, hocSelNumber4Row2, hocSelNumber5Row2, hocSelNumber6Row2, hocSelNumber7Row2],
    row3: [hocSelNumber1Row1, hocSelNumber2Row1, hocSelNumber3Row1, hocSelNumber4Row1, hocSelNumber5Row1, hocSelNumber6Row1, hocSelNumber7Row1]
  }
}

const RUNNERS_BY_GAME: Record<GamePrefix, number> = {
  dos: 6,
  dot: 6,
  doe: 8,
  hoc: 7
}

// Static styles moved outside component
const SELECTION_DOT_STYLE = {
  backgroundImage: `url(${selectionDotActive})`,
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center'
} as const

const ACTIVE_SHADOW_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%) scale(1.35)',
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  filter: 'brightness(0) invert(1)',
  zIndex: 0,
  pointerEvents: 'none',
}

export interface GameSlideProps {
  prefix: GamePrefix
  activeGame: GamePrefix
  // Header — menu
  activeMenu: string
  setActiveMenu: (menu: string) => void
  // Header — race info (per-game)
  raceNumber: string
  raceStartTime: string
  serverTime: string
  raceState: string
  serverCountdown: number
  roundInterval: number
  // Header — game
  setActiveGame: (game: GamePrefix) => void
  enabledPrefixes: GamePrefix[]
  gameKey: 'dos' | 'doe' | 'hoc'
  gameAssets: GameAssets
  handleGameLogoClick: () => void
  // Header — operator
  operatorId: string
  sessionCode: string
  // Header — pending tickets / order ticket
  pendingTickets: number
  onOrderTicketClick?: () => void
  // Header — settings
  showSettingsMenu: boolean
  setShowSettingsMenu: (show: boolean) => void
  isClosingSettings: boolean
  setIsClosingSettings: (closing: boolean) => void
  autoChangeEnabled: boolean
  setAutoChangeEnabled: (enabled: boolean) => void
  // Header — ticket search
  showTicketIdInput: boolean
  setShowTicketIdInput: (show: boolean) => void
  ticketIdValue: string
  setTicketIdValue: (value: string) => void
  ticketSearchError: string | null
  isSearchingTicket: boolean
  handleTicketSearch: () => void
  // Header — next game info
  getGameData: (game: GamePrefix) => { countdown: number }
  // Tab state
  isJugadaTab: boolean
  isResultadosTab: boolean
  isCuotasTab: boolean
  isVentasTab: boolean
  // Tab content — Results
  resultsData: Array<{ raceNumber: string; first: number; second: number }>
  resultsPageSize: 5 | 10 | 15 | 20
  setResultsPageSize: (size: 5 | 10 | 15 | 20) => void
  handlePrintResults: (count: number) => Promise<void>
  printingResultsCount: number | null
  // Tab content — Cuotas
  oddsData: Array<{ raceNumber: string; odds: number[] }>
  cuotasPageSize: 5 | 10 | 15 | 20
  setCuotasPageSize: (size: 5 | 10 | 15 | 20) => void
  handlePrintCuotas: (count: number) => Promise<void>
  printingCuotasCount: number | null
  // Tab content — Ventas
  salesRecords: SalesRecord[]
  handleBalance: () => void
  isBalancing: boolean
  handleReprint: (index: number) => void
  reprintingIndex: number | null
  // Selections
  selectedFirst: number[]
  selectedSecond: number[]
  selectedThird: number[]
  handleSelectionMouseDown: (row: 'first' | 'second' | 'third', num: number) => void
  handleSelectionMouseEnter: (row: 'first' | 'second' | 'third', num: number) => void
  // DOT
  betMode: 'exacta' | 'trifecta'
  orderMode: 'exact' | 'any'
  setBetMode: (mode: 'exacta' | 'trifecta') => void
  setOrderMode: (mode: 'exact' | 'any') => void
  sumValue: string
  setSumValue: (value: string) => void
  // Function buttons
  handleGemela: () => void
  handleContra: () => void
  handleTrio: () => void
  toggleRueda: () => void
  toggleMediaRueda: () => void
  ruedaMode: null | 'rueda' | 'mediaRueda'
  // Denominations
  handleDenominationSelect: (value: number) => void
  // Actions
  handleDelete: () => void
  handlePrint: () => void
  isPrinting: boolean
  // Bets
  bets: Bet[]
  /** Remove a single bet line by id (web-skin bet column individual delete). */
  onRemoveBet: (id: number) => void
  betsExpanded: boolean
  setBetsExpanded: (expanded: boolean) => void
  betsStyle: React.CSSProperties
}

export default function GameSlide({
  prefix,
  activeGame,
  // Header props
  activeMenu,
  setActiveMenu,
  raceNumber,
  raceStartTime,
  serverTime,
  raceState,
  serverCountdown,
  roundInterval,
  setActiveGame,
  enabledPrefixes,
  gameKey,
  gameAssets,
  handleGameLogoClick,
  operatorId,
  sessionCode,
  pendingTickets,
  onOrderTicketClick,
  showSettingsMenu,
  setShowSettingsMenu,
  isClosingSettings,
  setIsClosingSettings,
  autoChangeEnabled,
  setAutoChangeEnabled,
  showTicketIdInput,
  setShowTicketIdInput,
  ticketIdValue,
  setTicketIdValue,
  ticketSearchError,
  isSearchingTicket,
  handleTicketSearch,
  getGameData,
  // Tab state
  isJugadaTab,
  isResultadosTab,
  isCuotasTab,
  isVentasTab,
  // Tab content
  resultsData,
  resultsPageSize,
  setResultsPageSize,
  handlePrintResults,
  printingResultsCount,
  oddsData,
  cuotasPageSize,
  setCuotasPageSize,
  handlePrintCuotas,
  printingCuotasCount,
  salesRecords,
  handleBalance,
  isBalancing,
  handleReprint,
  reprintingIndex,
  // Selection props
  selectedFirst,
  selectedSecond,
  selectedThird,
  handleSelectionMouseDown,
  handleSelectionMouseEnter,
  betMode,
  orderMode,
  setBetMode,
  setOrderMode,
  sumValue,
  setSumValue,
  handleGemela,
  handleContra,
  handleTrio,
  toggleRueda,
  toggleMediaRueda,
  ruedaMode,
  handleDenominationSelect,
  handleDelete,
  handlePrint,
  isPrinting,
  bets,
  onRemoveBet,
  betsExpanded,
  setBetsExpanded,
  betsStyle
}: GameSlideProps) {
  // Per-slide timer
  const { localCountdown: timerSeconds, timerProgress } = useTimer({
    serverCountdown,
    roundInterval
  })

  // DOT uses DOS assets; others map directly
  const slideGameKey = (prefix === 'dot' ? 'dos' : prefix) as 'dos' | 'doe' | 'hoc'
  const assets = SELECTION_ASSETS[slideGameKey]
  const runners = RUNNERS_BY_GAME[prefix]
  const isActive = activeGame === prefix
  const isThisDot = prefix === 'dot'
  const layoutClass = runners === 8 ? styles.selectionButtons8 : runners === 7 ? styles.selectionButtons7 : isThisDot ? styles.selectionButtonsDot : ''
  const buttonClass = runners === 8 ? styles.selectionButton8 : runners === 7 ? styles.selectionButton7 : isThisDot ? styles.selectionButtonDot : ''
  const slideFuncBg = slideGameKey === 'dos' ? funcButtonBgDos : slideGameKey === 'doe' ? funcButtonBgDoe : funcButtonBgHoc
  const slideCoins = COIN_ASSETS[slideGameKey]

  return (
    <div className={`${styles.gameLayer} ${isThisDot ? styles.gameLayerDot : ''}`} data-testid={isActive ? 'active-game-slide' : undefined} data-game={prefix}>
      {/* Per-game background image */}
      <img
        src={BACKGROUND_IMAGES[slideGameKey]}
        alt=""
        className={styles.gameLayerBackground}
        draggable={false}
      />

      {/* ===== HEADER — moves with the slide ===== */}
      <header className={styles.header}>
        {/* Menu Buttons */}
        <nav className={styles.menuButtons}>
          {['JUGADA', 'RESULTADOS', 'CUOTAS', 'VENTAS'].map((menu) => {
            return (
              <button
                key={menu}
                className={`${styles.menuButton} ${activeMenu === menu ? styles.menuButtonActive : ''}`}
                onClick={() => setActiveMenu(menu)}
              >
                <span className={styles.menuButtonText}>{menu}</span>
              </button>
            )
          })}
          {/* RECARGAS — web skin only (hidden in classic via CSS). Action TBD. */}
          <button
            className={`${styles.menuButton} ${styles.recargasButton} ${activeMenu === 'RECARGAS' ? styles.menuButtonActive : ''}`}
            onClick={() => setActiveMenu('RECARGAS')}
          >
            <span className={styles.menuButtonText}>RECARGAS</span>
          </button>
        </nav>

        {/* Order Ticket Button */}
        <button className={`${styles.orderTicketButton} ${pendingTickets > 0 ? styles.orderTicketHasPending : ''}`} onClick={onOrderTicketClick}>
          <span className={styles.orderTicketText}>ORDENAR TICKET</span>
          {pendingTickets > 0 && (
            <span className={styles.orderTicketPending}>
              <span className={styles.orderTicketCount}>{pendingTickets}</span>
              <span>Tickets Pendientes</span>
            </span>
          )}
        </button>

        {/* Race Number */}
        <div className={styles.raceNumber}>
          <span className={styles.raceNumberLabel}>CARRERA</span>
          <span className={styles.raceNumberText}>{raceNumber}</span>
        </div>

        {/* Race Start Time */}
        <div className={styles.raceStartTime}>
          <span className={styles.raceStartLabel}>EMPIEZA</span>
          <span className={styles.raceStartValue}>{raceStartTime}</span>
        </div>

        {/* Active Time */}
        <div className={styles.activeTime}>
          <span className={styles.activeTimeLabel}>ACTIVO</span>
          <span className={styles.activeTimeValue}>{serverTime}</span>
        </div>

        {/* Timer Bar */}
        <div className={styles.timerBarContainer}>
          <img src={timerBar} alt="" className={styles.timerBarBg} />
          <div className={styles.timerBarProgress} style={{ width: `${timerProgress}%` }}>
            <img src={timerBarLine} alt="" className={styles.timerBarLine} />
          </div>
        </div>

        {/* Timer Seconds Display */}
        <div className={styles.timerSecondsContainer}>
          <img src={timerIcon} alt="" className={styles.timerIconImg} />
          <div className={styles.timerSecondsText}>
            <span className={styles.timerSecondsLabel}>SEG</span>
            <span className={`${styles.timerSecondsValue} ${timerSeconds <= 10 ? styles.timerSecondsValueAlert : ''}`}>
              {timerSeconds <= 10 ? String(timerSeconds).padStart(2, '0') : timerSeconds}
            </span>
          </div>
        </div>

        {/* Game Icon - clickeable para cambiar de juego */}
        <button className={styles.gameIconContainer} onClick={handleGameLogoClick}>
          <img src={gameAssets.gameIconBg} alt="" className={styles.gameIconBg} />
          <img src={gameAssets.gameIcon} alt={gameAssets.gameIcon} className={styles.gameIcon} />
        </button>

        {/* Game Selectors */}
        <div
          className={styles.gameSelectorsContainer}
          style={{ '--game-count': enabledPrefixes.length } as React.CSSProperties}
        >
          {enabledPrefixes.map((gp) => {
            const index = GAME_PREFIXES.indexOf(gp)
            return (
              <button
                key={`gs-${gp}`}
                className={`${styles.gameSelectorBtn} ${activeGame === gp ? styles.gameSelectorActive : ''}`}
                data-game={gp}
                onClick={() => setActiveGame(gp)}
              >
                <img src={GAME_SELECTORS[index]} alt={gp} />
                <span className={styles.gameSelectorLabel}>{GAME_CARD_LABELS[gp] ?? gp}</span>
              </button>
            )
          })}
        </div>

        {/* Top Right Section - Operator Info & Settings */}
        <div className={styles.topRightSection}>
          <div className={styles.operatorInfoPanel}>
            {(['dos', 'doe', 'hoc'] as const).map((game) => (
              <div key={game} style={{ visibility: gameKey === game ? 'visible' : 'hidden', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                <img src={INFO_PANEL_ASSETS[game].shadow} alt="" className={styles.infoPanelBgShadow} />
                <img src={INFO_PANEL_ASSETS[game].highlight} alt="" className={styles.infoPanelBgHighlight} />
                <img src={INFO_PANEL_ASSETS[game].bg} alt="" className={styles.infoPanelBg} />
              </div>
            ))}
            <div className={styles.infoPanelContent}>
              <div className={styles.topInfoRow}>
                <button
                  className={styles.searchButton}
                  onClick={() => setShowTicketIdInput(!showTicketIdInput)}
                >
                  <img src={searchIcon} alt="Search" className={styles.searchIcon} />
                  <span className={styles.searchIdText}>ID</span>
                  <span className={styles.searchTicketLabel}>Buscar Ticket</span>
                </button>
                <div className={styles.textColumn}>
                  <span className={styles.operatorId}>{operatorId}</span>
                  <span className={styles.deviceId}>{sessionCode}</span>
                  <span className={styles.versionText}>2.60.05</span>
                </div>
              </div>
              <div className={styles.infoPanelIcons}>
                <button
                  className={styles.settingsButton}
                  onClick={() => {
                    if (showSettingsMenu) {
                      setIsClosingSettings(true)
                      setTimeout(() => {
                        setShowSettingsMenu(false)
                        setIsClosingSettings(false)
                      }, 600)
                    } else {
                      setShowSettingsMenu(true)
                    }
                  }}
                >
                  <img src={settingsGear} alt="Settings" className={styles.settingsIcon} />
                </button>
              </div>
              {/* Language/currency (web skin) — Dominican flag + DOP; future
                 language + currency switcher. */}
              <button className={styles.langCurrencyBtn} aria-label="Idioma y moneda">
                <svg style={{ width: '2.4cqi', height: '1.6cqi', borderRadius: '0.2cqi', display: 'block', flexShrink: 0 }} viewBox="0 0 30 20" aria-hidden="true">
                  <rect width="30" height="20" fill="#ffffff" />
                  <rect x="0" y="0" width="13" height="8" fill="#002d62" />
                  <rect x="17" y="0" width="13" height="8" fill="#ce1126" />
                  <rect x="0" y="12" width="13" height="8" fill="#ce1126" />
                  <rect x="17" y="12" width="13" height="8" fill="#002d62" />
                </svg>
                <span className={styles.currencyCode}>DOP</span>
              </button>
            </div>
            {/* Settings Menu */}
            {showSettingsMenu && (
              <div className={styles.settingsMenuWrapper}>
                <div className={`${styles.settingsMenuContainer} ${isClosingSettings ? styles.settingsMenuClosing : ''}`}>
                  <div className={styles.settingsMenuBg} />
                  <div className={styles.settingsMenuContent}>
                    <div className={`${styles.settingsRow} ${styles.languageRow}`}>
                      <img src={spanishFlag} alt="ES" className={styles.flagIcon} />
                      <span className={styles.languageText}>ESPAÑOL</span>
                    </div>
                    <div className={styles.settingsRow}>
                      <span className={styles.settingsLabel}>CAMBIO<br />AUTOMÁTICO</span>
                      <div className={styles.toggleContainer}>
                        <button
                          className={`${styles.toggleBtn} ${autoChangeEnabled ? styles.toggleActive : ''}`}
                          onClick={() => setAutoChangeEnabled(true)}
                        >
                          ENC.
                        </button>
                        <div
                          className={`${styles.toggleSlider} ${!autoChangeEnabled ? styles.toggleSliderActive : ''}`}
                          onClick={() => setAutoChangeEnabled(!autoChangeEnabled)}
                        >
                          <span className={styles.toggleKnob} />
                        </div>
                        <button
                          className={`${styles.toggleBtn} ${!autoChangeEnabled ? styles.toggleActive : ''}`}
                          onClick={() => setAutoChangeEnabled(false)}
                        >
                          APA.
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Ticket ID Input — only on the active slide. Rendering it on all
                slides made the last slide's <input autoFocus> hijack focus and
                trigger the browser's scrollIntoView on the overflow:hidden
                carousel, visually jumping the user to the horse (last) slide. */}
            {showTicketIdInput && isActive && (
              <div className={styles.ticketIdInputContainer}>
                <button
                  className={styles.ticketIdBtn}
                  onClick={handleTicketSearch}
                  disabled={isSearchingTicket}
                >
                  <img src={ticketSelectIcon} alt="" className={styles.ticketIdBtnIcon} />
                </button>
                <input
                  type="text"
                  className={`${styles.ticketIdInput} ${ticketSearchError ? styles.ticketIdInputError : ''}`}
                  placeholder={ticketSearchError || 'Introducir el ID de boleto'}
                  value={ticketIdValue}
                  onChange={(e) => setTicketIdValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTicketSearch()
                    }
                  }}
                  autoFocus
                />
                <button
                  className={styles.ticketIdBtn}
                  onClick={() => setTicketIdValue('')}
                >
                  <img src={ticketDeleteIcon} alt="" className={styles.ticketIdBtnIcon} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Next game countdown — hidden when ticket search is open */}
      {!showTicketIdInput && enabledPrefixes.length > 1 && (() => {
        const otherGame = enabledPrefixes.find(g => g !== activeGame) || enabledPrefixes[0]
        const otherData = getGameData(otherGame)
        return (
          <div className={styles.nextGameInfo}>
            <div className={styles.nextGameRow}>
              <img src={timerIcon} alt="" className={styles.nextGameTimerIcon} />
              <span className={styles.nextGameCountdown}>{otherData.countdown < 10 ? `0${otherData.countdown}` : otherData.countdown}</span>
              <span className={styles.nextGameName}>{GAME_DISPLAY_NAMES[otherGame] || otherGame.toUpperCase()}</span>
            </div>
          </div>
        )
      })()}

      {/* ===== GAME CONTENT — hidden when not on JUGADA tab ===== */}
      {/* data-webbets drives the WEB-SKIN board shift: when the active slide has
          pending bets the bet column opens and the runner board slides right. */}
      <div
        style={{ visibility: isJugadaTab ? 'visible' : 'hidden', pointerEvents: isJugadaTab ? 'auto' : 'none' }}
        data-webbets={isActive && bets.length > 0 ? 'true' : undefined}
      >

      {/* WEB SKIN ONLY — left bet column (hidden in classic via CSS) */}
      {isActive && <WebBetColumn bets={bets} onRemove={onRemoveBet} />}

      {/* DOT Left Panel - Bet Type Selection (only for DOT slides) */}
      {isThisDot && (
        <aside className={styles.dotLeftPanel} style={!isActive || betsExpanded ? { pointerEvents: 'none' as const, visibility: 'hidden' as const } : undefined}>
          <div className={styles.betModeSelector}>
            <BetModeButtons
              mode={betMode}
              onModeChange={setBetMode}
            />
          </div>
          <div className={styles.orderModeSelector}>
            <OrderModeButtons
              mode={orderMode}
              onModeChange={setOrderMode}
            />
          </div>
          <div className={styles.winnerSection}>
            <span className={styles.winnerLabel}>GANADOR</span>
            <WinnerButtons
              leftLabel="IMPAR"
              rightLabel="PAR"
              onLeftClick={() => console.log('IMPAR clicked')}
              onRightClick={() => console.log('PAR clicked')}
            />
            <WinnerButtons
              leftLabel="MENOS"
              rightLabel="MÁS"
              onLeftClick={() => console.log('MENOS clicked')}
              onRightClick={() => console.log('MÁS clicked')}
            />
          </div>
        </aside>
      )}

      {/* Selection Area - runner selection buttons */}
      <section className={styles.selectionArea} style={!isActive || betsExpanded ? { pointerEvents: 'none' as const, visibility: 'hidden' as const } : undefined}>
        {/* First Row (1st) */}
        <div className={styles.selectionRow}>
          <div className={styles.rowLabel}>
            <span className={styles.rowLabelText}>1<span className={styles.degreeSymbol}>°</span></span>
          </div>
          <div className={`${styles.selectionButtons} ${layoutClass}`}>
            {assets.row1.slice(0, runners).map((img, index) => (
              <button
                key={`first-${prefix}-${index}`}
                className={`${styles.selectionButton} ${buttonClass} ${isActive && selectedFirst.includes(index + 1) ? styles.selectionButtonActive : ''}`}
                data-testid={isActive ? `sel-first-${index + 1}` : undefined}
                onClick={(e) => e.preventDefault()}
                onMouseDown={() => isActive && handleSelectionMouseDown('first', index + 1)}
                onMouseEnter={() => isActive && handleSelectionMouseEnter('first', index + 1)}
                onDragStart={(e) => e.preventDefault()}
                draggable={false}
                tabIndex={isActive ? 0 : -1}
              >
                {isActive && selectedFirst.includes(index + 1) && (
                  <img src={img} alt="" style={ACTIVE_SHADOW_STYLE} draggable={false} />
                )}
                {isActive && selectedFirst.includes(index + 1) && (
                  <div className={styles.selectionDotBg} style={SELECTION_DOT_STYLE} />
                )}
                <img src={img} alt={`${index + 1}`} className={styles.selectionNumberImg} draggable={false} />
                <span className={styles.selNum}>{index + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Second Row (2nd) */}
        <div className={`${styles.selectionRow} ${styles.selectionRowSecond}`}>
          <div className={styles.rowLabel}>
            <span className={styles.rowLabelText}>2<span className={styles.degreeSymbol}>°</span></span>
          </div>
          <div className={`${styles.selectionButtons} ${layoutClass}`}>
            {assets.row2.slice(0, runners).map((img, index) => (
              <button
                key={`second-${prefix}-${index}`}
                className={`${styles.selectionButton} ${buttonClass} ${isActive && selectedSecond.includes(index + 1) ? styles.selectionButtonActive : ''}`}
                data-testid={isActive ? `sel-second-${index + 1}` : undefined}
                onClick={(e) => e.preventDefault()}
                onMouseDown={() => isActive && handleSelectionMouseDown('second', index + 1)}
                onMouseEnter={() => isActive && handleSelectionMouseEnter('second', index + 1)}
                onDragStart={(e) => e.preventDefault()}
                draggable={false}
                tabIndex={isActive ? 0 : -1}
              >
                {isActive && selectedSecond.includes(index + 1) && (
                  <img src={img} alt="" style={ACTIVE_SHADOW_STYLE} draggable={false} />
                )}
                {isActive && selectedSecond.includes(index + 1) && (
                  <div className={styles.selectionDotBg} style={SELECTION_DOT_STYLE} />
                )}
                <img src={img} alt={`${index + 1}`} className={styles.selectionNumberImg} draggable={false} />
                <span className={styles.selNum}>{index + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Third Row (3rd) - Only shown for DOT in trifecta mode */}
        {isThisDot && betMode === 'trifecta' && (
          <div className={`${styles.selectionRow} ${styles.selectionRowThird}`}>
            <div className={styles.rowLabel}>
              <span className={styles.rowLabelText}>3<span className={styles.degreeSymbol}>°</span></span>
            </div>
            <div className={`${styles.selectionButtons} ${layoutClass}`}>
              {assets.row3.slice(0, runners).map((img, index) => (
                <button
                  key={`third-${prefix}-${index}`}
                  className={`${styles.selectionButton} ${buttonClass} ${isActive && selectedThird.includes(index + 1) ? styles.selectionButtonActive : ''}`}
                  data-testid={isActive ? `sel-third-${index + 1}` : undefined}
                  onClick={(e) => e.preventDefault()}
                  onMouseDown={() => isActive && handleSelectionMouseDown('third', index + 1)}
                  onMouseEnter={() => isActive && handleSelectionMouseEnter('third', index + 1)}
                  onDragStart={(e) => e.preventDefault()}
                  draggable={false}
                  tabIndex={isActive ? 0 : -1}
                >
                  {isActive && selectedThird.includes(index + 1) && (
                    <img src={img} alt="" style={ACTIVE_SHADOW_STYLE} draggable={false} />
                  )}
                  {isActive && selectedThird.includes(index + 1) && (
                    <div className={styles.selectionDotBg} style={SELECTION_DOT_STYLE} />
                  )}
                  <img src={img} alt={`${index + 1}`} className={styles.selectionNumberImg} draggable={false} />
                <span className={styles.selNum}>{index + 1}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Function Buttons (arrows, R, R/2) - hidden for DOT */}
      {!isThisDot && (
        <section className={styles.functionButtons} style={!isActive || betsExpanded ? { pointerEvents: 'none' as const, visibility: 'hidden' as const } : undefined}>
          <div className={styles.funcButtonRow}>
            <button className={styles.funcButton} onClick={handleGemela} title="Gemela: Copia 1 a 2">
              <img src={slideFuncBg} alt="" className={styles.funcButtonBg} style={{ position: 'absolute' }} />
              <img src={funcIconUpDown} alt="Up/Down" className={styles.funcButtonIcon} />
            </button>
            <button className={styles.funcButton} onClick={handleContra} title="Contra: Selecciona todos menos 1">
              <img src={slideFuncBg} alt="" className={styles.funcButtonBg} style={{ position: 'absolute' }} />
              <img src={funcIconDiag} alt="Diagonal" className={styles.funcButtonIcon} />
            </button>
          </div>
          <div className={styles.funcButtonRow}>
            <button className={`${styles.funcButton} ${ruedaMode === 'rueda' ? styles.funcButtonActive : ''}`} onClick={toggleRueda} title="R: Rueda completa (ambas direcciones)">
              <img src={slideFuncBg} alt="" className={styles.funcButtonBg} style={{ position: 'absolute' }} />
              <img src={funcIconR} alt="R" className={styles.funcButtonIcon} />
            </button>
            <button className={`${styles.funcButton} ${ruedaMode === 'mediaRueda' ? styles.funcButtonActive : ''}`} onClick={toggleMediaRueda} title="R/2: Media rueda (ambas direcciones, mitad monto)">
              <img src={slideFuncBg} alt="" className={styles.funcButtonBg} style={{ position: 'absolute' }} />
              <img src={funcIconR2} alt="R/2" className={styles.funcButtonIcon} />
            </button>
          </div>
        </section>
      )}

      {/* DOT Right Panel - Full SUMA Numpad */}
      {isThisDot && (
        <aside className={styles.dotRightPanel} style={!isActive || betsExpanded ? { pointerEvents: 'none' as const, visibility: 'hidden' as const } : undefined}>
          <div className={styles.dotNumpadContainer}>
            <DotNumpad
              value={sumValue}
              onChange={setSumValue}
              maxLength={6}
              onGemela={handleGemela}
              onTrio={handleTrio}
            />
          </div>
        </aside>
      )}

      {/* Bottom Section - Coins + Delete/Print */}
      <section className={styles.bottomSection} style={!isActive || betsExpanded ? { pointerEvents: 'none' as const, visibility: 'hidden' as const } : undefined}>
        <div className={styles.denominationButtons}>
          {DENOMINATION_VALUES.map((value) => (
            <button
              key={value}
              className={styles.coinButton}
              data-testid={isActive ? `coin-${value}` : undefined}
              onClick={() => handleDenominationSelect(value)}
            >
              <img
                src={slideCoins[`coin${value}` as keyof typeof slideCoins]}
                alt={`$${value}`}
                className={styles.coinImage}
                style={{ position: 'absolute' }}
              />
              <span className={`${styles.coinValue} ${value >= 100 ? styles.coinValueSmall : ''}`}>{value}</span>
            </button>
          ))}
        </div>

        {/* Action Buttons (Delete + Print) */}
        <div className={styles.actionButtons}>
          <button className={styles.deleteButton} data-testid={isActive ? 'btn-delete' : undefined} onClick={handleDelete}>
            <img src={trashButton} alt="Borrar" className={styles.buttonIcon} />
            <svg className={styles.webActionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
            </svg>
          </button>
          <button className={styles.printButton} data-testid={isActive ? 'btn-print' : undefined} onClick={handlePrint} disabled={isPrinting}>
            <img src={printButton} alt="Imprimir" className={styles.buttonIcon} />
            <svg className={styles.webActionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" />
            </svg>
            {isPrinting && (
              <div className={styles.printingOverlay}>
                <div className={styles.printSpinner} />
              </div>
            )}
          </button>
        </div>
      </section>

      {/* APUESTA Panel - Inside each slide so it moves with the carousel.
          Classic-skin accordion; hidden in the web skin (the WebBetColumn
          above replaces it) via `.classicBetsPanel`. */}
      {isActive && (
        <div className={styles.classicBetsPanel}>
          <Bets
            bets={bets}
            ankerPosition="top-left"
            className="!absolute flex flex-col h-full"
            style={betsStyle}
            onExpandChange={setBetsExpanded}
            forceClose={raceState === 'running' || raceState === 'closing'}
          />
        </div>
      )}
      </div>{/* end game content wrapper */}

      {/* ===== TAB CONTENT — RESULTADOS / CUOTAS / VENTAS ===== */}
      <div style={{ visibility: isResultadosTab ? 'visible' : 'hidden', opacity: isResultadosTab ? 1 : 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15, overflow: 'hidden' }}>
        <Results
          gameType={prefix as 'dos' | 'dot' | 'doe' | 'hoc'}
          results={resultsData}
          pageSize={resultsPageSize}
          onPageSizeChange={setResultsPageSize}
          onPrint={handlePrintResults}
          printingCount={printingResultsCount}
        />
      </div>

      <div style={{ visibility: isCuotasTab ? 'visible' : 'hidden', opacity: isCuotasTab ? 1 : 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15, overflow: 'hidden' }}>
        <Cuotas
          gameType={prefix as 'dos' | 'dot' | 'doe' | 'hoc'}
          oddsData={oddsData}
          pageSize={cuotasPageSize}
          onPageSizeChange={setCuotasPageSize}
          onPrint={handlePrintCuotas}
          printingCount={printingCuotasCount}
        />
      </div>

      <div style={{ visibility: isVentasTab ? 'visible' : 'hidden', opacity: isVentasTab ? 1 : 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15, overflow: 'hidden' }}>
        <Ventas salesData={salesRecords.length > 0 ? salesRecords : undefined} onBalance={handleBalance} onReprint={handleReprint} reprintingIndex={reprintingIndex} isBalancing={isBalancing} />
      </div>
    </div>
  )
}
