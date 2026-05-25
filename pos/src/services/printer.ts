// =============================================================================
// Printer Service — supports two modes:
//   "vendor" = WebPosPrinter.exe (port 8085, XML over form-urlencoded)
//   "node"   = print-server-dogs (port 4053, JSON protocol)
// Mode is set at runtime from discovery API (printerMode field on DeviceConfig)
// =============================================================================

const VENDOR_URL = 'http://localhost:8085/printer/'
const NODE_URL = 'http://localhost:4053'

let currentMode: 'vendor' | 'node' = 'vendor'

export function setPrinterMode(mode: string): void {
  currentMode = mode === 'node' ? 'node' : 'vendor'
  console.log(`[Printer] Mode set to: ${currentMode}`)
}

export function getPrinterMode(): 'vendor' | 'node' {
  return currentMode
}

export const PRINTER_DOWNLOAD_INFO = {
  vendor: {
    name: 'WebPosPrinter Version 1.1.1049',
    url: 'https://update.racingdogs.eu/files/WebPosPrinter1049.zip'
  },
  node: {
    name: 'VirtualesPosPrinter',
    url: '#'
  }
}

function canReachLocalPrintServer(): boolean {
  const h = window.location.hostname
  if (h === 'localhost' || h === '127.0.0.1') return true
  if (navigator.userAgent.includes('Electron')) return true
  if (window.location.protocol === 'https:') return true
  return false
}

// =============================================================================
// Shared Interfaces
// =============================================================================

export interface PrintTicketBet {
  num: number
  jugada: string
  cuota: string
  monto: string
}

export interface PrintTicketData {
  ticketId: string
  date: string
  time: string
  gameId: string
  sitio: string
  terminalId: string
  operadorId: string
  juego: string
  bets: PrintTicketBet[]
  total: string
  maxBenefit: string
  jackpot?: string
}

export interface PrintCancelData {
  ticketId: string
  date: string
  time: string
  gameId: string
  sitio: string
  terminalId: string
  operadorId: string
  juego?: string
  bets: PrintTicketBet[]
  importeCancelacion: string
}

export interface PrintBalanceData {
  operadorId: string
  sesionId: string
  iniciar: string
  fin: string
  posiciones: string
  tickets: string
  cancelacionTickets: string
  apuesta: string
  ganancias: string
  balance: string
}

export interface PrintPayData {
  ticketId: string
  date: string
  time: string
  gameId: string
  sitio: string
  terminalId: string
  operadorId: string
  juego?: string
  bets: PrintTicketBet[]
  ganancia: string
  bonoWon: boolean
  bonoAmount?: string
  isAutopay?: boolean
}

// "*** Ganancia adicional ***" — separate receipt printed when a ticket wins
// the DogBonus jackpot. Vendor structure: no barcode, no Operador, no Juego;
// only Sitio / Terminal ID / ID de juego / Ticket / Fecha de imprenta in the
// header. See pos/docs/ORIGINAL_POS_PRINTER_PROTOCOL.md §850-907.
export interface PrintBonusWinData {
  ticketId: string
  date: string
  time: string
  gameId: string
  sitio: string
  terminalId: string
  dogBonusAmount: string
}

// =============================================================================
// XML Builders (vendor WebPosPrinter protocol)
// =============================================================================

const SEP = '----------------------------------------------------------------'
const DOUBLE_SEP = '=============================================================='

function xmlHeader(
  ticketId: string,
  sitio: string,
  terminalId: string,
  operadorId: string,
  dateTime: string,
  juego: string,
  gameId: string,
  title: string
): string {
  return `<Page>
<Font>Arial;18</Font>
<LineSpacing>90</LineSpacing>
<Barcode128 ShowHeader="false" ShowFooter="true" HeightMm="20">
<Content>${ticketId}</Content>
</Barcode128>
<Image>
<Content>VG</Content>
</Image>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TextLine>
<Alignment>center</Alignment>
<FontStyle>bold</FontStyle>
<Content>${title}</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Sitio:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${sitio}</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>left</Alignment>
<Content>Terminal ID:</Content>
</TextLine>
<TextLine>
<Alignment>right</Alignment>
<Content>${terminalId}</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Operador ID:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${operadorId}</Content>
</Column>
</TableRow>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Ticket:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${ticketId}</Content>
</Column>
</TableRow>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Fecha de imprenta:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${dateTime}</Content>
</Column>
</TableRow>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Juego:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${juego}</Content>
</Column>
</TableRow>
<TableRow>
<LineSpacing>60</LineSpacing>
<Column Width="0.5" Alignment="left" >
<Content>ID de juego:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${gameId}</Content>
</Column>
</TableRow>`
}

function xmlBetsTable(bets: PrintTicketBet[]): string {
  let xml = `
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TableRow>
<LineSpacing>60</LineSpacing>
<Column Width="0.10" Alignment="right" >
<Content>Nu.</Content>
</Column>
<Column Width="0.05" Alignment="right" >
<Content></Content>
</Column>
<Column Width="0.35" Alignment="center" >
<Content>Jugada</Content>
</Column>
<Column Width="0.25" Alignment="right" >
<Content>Cuotas</Content>
</Column>
<Column Width="0.25" Alignment="right" >
<Content>Monto</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>`

  for (const bet of bets) {
    xml += `
<TableRow>
<LineSpacing>90</LineSpacing>
<Column Width="0.10" Alignment="right" >
<Content>${bet.num}</Content>
</Column>
<Column Width="0.05" Alignment="right" >
<Content></Content>
</Column>
<Column Width="0.35" Alignment="center" >
<Content>${bet.jugada}</Content>
</Column>
<Column Width="0.25" Alignment="right" >
<Content>${bet.cuota}</Content>
</Column>
<Column Width="0.25" Alignment="right" >
<Content>${bet.monto}</Content>
</Column>
</TableRow>`
  }

  return xml
}

function xmlFooter(): string {
  return `
<TextLine>
<Alignment>center</Alignment>
<Content>${DOUBLE_SEP}</Content>
</TextLine>
</Page>
`
}

function buildTicketXml(data: PrintTicketData, options: { isCopia?: boolean } = {}): string {
  const dateTime = `${data.date} ${data.time}`
  const title = options.isCopia ? '*** COPIA ***' : '*** Ticket ***'
  let xml = xmlHeader(data.ticketId, data.sitio, data.terminalId, data.operadorId, dateTime, data.juego, data.gameId, title)
  xml += xmlBetsTable(data.bets)
  xml += `
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TableRow>
<LineSpacing>60</LineSpacing>
<Column Width="0.5" Alignment="left" >
<FontStyle>bold</FontStyle>
<Content>Depositar:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<FontStyle>bold</FontStyle>
<Content>${data.total}</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TableRow>
<LineSpacing>60</LineSpacing>
<Column Width="0.5" Alignment="left" >
<Content>Máximo beneficio posible:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.maxBenefit}</Content>
</Column>
</TableRow>`
  const hasCombinedBet = data.bets.some(b => b.jugada.includes('-'))
  if (hasCombinedBet && data.jackpot && data.jackpot !== '0' && data.jackpot !== '0.00' && data.jackpot !== '0,00') {
    xml += `
<TextLine>
<Alignment>center</Alignment>
<Content>${DOUBLE_SEP}</Content>
</TextLine>
<TextLine>
<Alignment>center</Alignment>
<Content>Con su apuesta de entrada tiene la oportunidad de</Content>
</TextLine>
<TextLine>
<Alignment>center</Alignment>
<Content>ganar:</Content>
</TextLine>
<TextLine>
<Alignment>center</Alignment>
<FontStyle>bold</FontStyle>
<Content>${data.jackpot}</Content>
</TextLine>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>`
  }
  xml += xmlFooter()
  return xml
}

function buildCancelXml(data: PrintCancelData): string {
  const dateTime = `${data.date} ${data.time}`
  let xml = xmlHeader(data.ticketId, data.sitio, data.terminalId, data.operadorId, dateTime, data.juego || '', data.gameId, '*** TICKET DE CANCELACIÓN ***')
  xml += xmlBetsTable(data.bets)
  xml += `
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<FontStyle>bold</FontStyle>
<Content>Importe de cancelación:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<FontStyle>bold</FontStyle>
<Content>${data.importeCancelacion}</Content>
</Column>
</TableRow>`
  xml += xmlFooter()
  return xml
}

function buildPayXml(data: PrintPayData): string {
  const dateTime = `${data.date} ${data.time}`
  const title = data.isAutopay ? '*** Ticket de autopago ***' : '*** Ticket de pago ***'
  let xml = xmlHeader(data.ticketId, data.sitio, data.terminalId, data.operadorId, dateTime, data.juego || '', data.gameId, title)
  xml += xmlBetsTable(data.bets)
  xml += `
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<FontStyle>bold</FontStyle>
<Content>Ganancia:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<FontStyle>bold</FontStyle>
<Content>${data.ganancia}</Content>
</Column>
</TableRow>`
  if (data.bonoWon && data.bonoAmount) {
    xml += `
<TextBlock>
<Alignment>center</Alignment>
<Font>Arial;15</Font>
<Content>¡Ha ganado el DogBono! ${data.bonoAmount}</Content>
</TextBlock>`
  } else {
    xml += `
<TextBlock>
<Alignment>center</Alignment>
<Font>Arial;15</Font>
<Content>¡Desgraciadamente no ha ganado el DogBono!</Content>
</TextBlock>`
  }
  xml += xmlFooter()
  return xml
}

// "*** Ganancia adicional ***" receipt — separate from "Ticket de pago".
// Filler lines after the amount push the cut down so the slip is easy to tear.
export function buildBonusWinXml(data: PrintBonusWinData): string {
  const dateTime = `${data.date} ${data.time}`
  let xml = `<Page>
<Font>Arial;18</Font>
<LineSpacing>90</LineSpacing>
<Image>
<Content>VG</Content>
</Image>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TextLine>
<Alignment>center</Alignment>
<FontStyle>bold</FontStyle>
<Content>*** Ganancia adicional ***</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Sitio:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.sitio}</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>left</Alignment>
<Content>Terminal ID:</Content>
</TextLine>
<TextLine>
<Alignment>right</Alignment>
<Content>${data.terminalId}</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>ID de juego:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.gameId}</Content>
</Column>
</TableRow>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Ticket:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.ticketId}</Content>
</Column>
</TableRow>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Fecha de imprenta:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${dateTime}</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<FontStyle>bold</FontStyle>
<Content>Dogbono ganancia:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<FontStyle>bold</FontStyle>
<Content>${data.dogBonusAmount}</Content>
</Column>
</TableRow>`
  // Filler lines — vendor prints several === rows to push the cut down so the
  // bonus slip is easy to tear and doesn't share the cut line with the next print.
  for (let i = 0; i < 6; i++) {
    xml += `
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${DOUBLE_SEP}</Content>
</TextLine>`
  }
  xml += xmlFooter()
  return xml
}

function buildBalanceXml(data: PrintBalanceData): string {
  return `<Page>
<Font>Arial;18</Font>
<LineSpacing>90</LineSpacing>
<Image>
<Content>VG</Content>
</Image>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TextLine>
<Alignment>center</Alignment>
<FontStyle>bold</FontStyle>
<Content>*** Balance ***</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Operador ID:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.operadorId}</Content>
</Column>
</TableRow>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Sesión ID:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.sesionId}</Content>
</Column>
</TableRow>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Iniciar:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.iniciar}</Content>
</Column>
</TableRow>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Fin:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.fin}</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>center</Alignment>
<Content>******</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Posiciones:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.posiciones}</Content>
</Column>
</TableRow>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Tickets:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.tickets}</Content>
</Column>
</TableRow>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Cancelación Tickets:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.cancelacionTickets}</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>center</Alignment>
<Content>******</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Apuesta:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.apuesta}</Content>
</Column>
</TableRow>
<TableRow>
<LineSpacing>60</LineSpacing>
<Column Width="0.5" Alignment="left" >
<Content>Ganancias:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.ganancias}</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<FontStyle>bold</FontStyle>
<Content>Balance:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<FontStyle>bold</FontStyle>
<Content>${data.balance}</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>center</Alignment>
<Content>${DOUBLE_SEP}</Content>
</TextLine>
</Page>
`
}

// =============================================================================
// Vendor Printer Client (WebPosPrinter.exe — XML over form-urlencoded)
// =============================================================================

async function vendorCheckStatus(): Promise<{ serverRunning: boolean; printerConnected: boolean; printerName?: string }> {
  if (!canReachLocalPrintServer()) return { serverRunning: false, printerConnected: false }
  try {
    const res = await fetch(VENDOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'printerstatus=',
      signal: AbortSignal.timeout(2000),
    })
    const text = await res.text()
    const online = text.includes('<PrinterStatus>online</PrinterStatus>')
    return { serverRunning: true, printerConnected: online, printerName: 'WebPosPrinter' }
  } catch {
    return { serverRunning: false, printerConnected: false }
  }
}

// Results XML — matches original POS format captured via Playwright
// `bonus` column (width 0.08, right) shows "x2"/"x3" when the race had a bonus
// multiplier, blank otherwise. Mirrors roundBonusType rendering in vendor's
// posgame.bundle.
function buildResultsXml(data: { juego: string; fechaDeImprenta: string; carreras: Array<{ id: string; iniciar: string; resultado: string; bonus?: string }> }): string {
  let xml = `<Page>
<Font>Arial;18</Font>
<Image>
<Content>VG</Content>
</Image>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TextLine>
<Alignment>center</Alignment>
<FontStyle>bold</FontStyle>
<Content>*** RESULTADOS ***</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Juego:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.juego}</Content>
</Column>
</TableRow>
<TableRow>
<LineSpacing>60</LineSpacing>
<Column Width="0.5" Alignment="left" >
<Content>Fecha de imprenta:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.fechaDeImprenta}</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TableRow>
<LineSpacing>60</LineSpacing>
<Column Width="0.18" Alignment="left" >
<Content>Carreras</Content>
</Column>
<Column Width="0.51" Alignment="center" >
<Content>Iniciar</Content>
</Column>
<Column Width="0.23" Alignment="center" >
<Content>Resultado</Content>
</Column>
<Column Width="0.08" Alignment="right" >
<Content></Content>
</Column>
</TableRow>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>`

  for (const race of data.carreras) {
    xml += `
<TableRow>
<LineSpacing>90</LineSpacing>
<Column Width="0.18" Alignment="left" >
<Content>${race.id}</Content>
</Column>
<Column Width="0.51" Alignment="center" >
<Content>${race.iniciar}</Content>
</Column>
<Column Width="0.23" Alignment="center" >
<Content>${race.resultado}</Content>
</Column>
<Column Width="0.08" Alignment="right" >
<Content>${race.bonus ?? ''}</Content>
</Column>
</TableRow>`
  }

  xml += `
<TextLine>
<Alignment>center</Alignment>
<Content>${DOUBLE_SEP}</Content>
</TextLine>
</Page>`
  return xml
}

// Cuotas XML — matches original POS format captured via Playwright
function buildCuotasXml(data: { juego: string; fechaDeImprenta: string; juegos: Array<{ id: string; cuotas: string[][] }> }): string {
  let xml = `<Page>
<Font>Arial;18</Font>
<Image>
<Content>VG</Content>
</Image>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>
<TextLine>
<Alignment>center</Alignment>
<FontStyle>bold</FontStyle>
<Content>*** CUOTAS ***</Content>
</TextLine>
<TableRow>
<Column Width="0.5" Alignment="left" >
<Content>Juego:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.juego}</Content>
</Column>
</TableRow>
<TableRow>
<LineSpacing>60</LineSpacing>
<Column Width="0.5" Alignment="left" >
<Content>Fecha de imprenta:</Content>
</Column>
<Column Width="0.5" Alignment="right" >
<Content>${data.fechaDeImprenta}</Content>
</Column>
</TableRow>
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>`

  for (const race of data.juegos) {
    const runners = race.cuotas.length
    const colWidth = (0.84 / runners).toFixed(2)

    xml += `
<TableRow>
<Column Width="0.60" Alignment="left" >
<Content>ID de juego:</Content>
</Column>
<Column Width="0.40" Alignment="right" >
<Content>${race.id}</Content>
</Column>
</TableRow>`

    xml += `
<TableRow><Font>Arial; 15</Font>
<Column Width="0.16" Alignment="left" >
<Content></Content>
</Column>`
    for (let i = 1; i <= runners; i++) {
      xml += `
<Column Width="${colWidth}" Alignment="center" >
<Content>${i}</Content>
</Column>`
    }
    xml += `
</TableRow>`

    for (let row = 0; row < runners; row++) {
      xml += `
<TableRow><Font>Arial; 15</Font>
<Column Width="0.16" Alignment="left" >
<Content>${row + 1}</Content>
</Column>`
      for (let col = 0; col < runners; col++) {
        xml += `
<Column Width="${colWidth}" Alignment="center" >
<Content>${race.cuotas[row][col]}</Content>
</Column>`
      }
      xml += `
</TableRow>`
    }

    xml += `
<TextLine>
<Alignment>center</Alignment>
<LineSpacing>60</LineSpacing><Content>${SEP}</Content>
</TextLine>`
  }

  xml += `
<TextLine>
<Alignment>center</Alignment>
<Content>${DOUBLE_SEP}</Content>
</TextLine>
</Page>`
  return xml
}

async function vendorSendXml(xml: string): Promise<{ success: boolean; error?: string }> {
  if (!canReachLocalPrintServer()) return { success: false, error: 'Print server only available locally' }
  try {
    const res = await fetch(VENDOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'xml=' + encodeURIComponent(xml),
    })
    const text = await res.text()
    if (text.includes('<Success>YES</Success>')) {
      return { success: true }
    }
    const errorMatch = text.match(/<ErrorMessage>(.*?)<\/ErrorMessage>/)
    return { success: false, error: errorMatch ? errorMatch[1] : 'Print failed' }
  } catch {
    return { success: false, error: 'WebPosPrinter not available' }
  }
}

// =============================================================================
// Node Printer Client (print-server-dogs — JSON)
// =============================================================================

async function nodeCheckStatus(): Promise<{ serverRunning: boolean; printerConnected: boolean; printerName?: string }> {
  if (!canReachLocalPrintServer()) return { serverRunning: false, printerConnected: false }
  try {
    const healthRes = await fetch(`${NODE_URL}/health`, { signal: AbortSignal.timeout(500) })
    if (!healthRes.ok) return { serverRunning: false, printerConnected: false }
  } catch {
    return { serverRunning: false, printerConnected: false }
  }
  try {
    const statusRes = await fetch(`${NODE_URL}/printer/status`, { signal: AbortSignal.timeout(500) })
    if (!statusRes.ok) return { serverRunning: true, printerConnected: false }
    const data = await statusRes.json()
    return { serverRunning: true, printerConnected: data.connected === true, printerName: data.printer }
  } catch {
    return { serverRunning: true, printerConnected: false }
  }
}

async function nodeSendJson(endpoint: string, data: unknown): Promise<{ success: boolean; error?: string }> {
  if (!canReachLocalPrintServer()) return { success: false, error: 'Print server only available locally' }
  try {
    const res = await fetch(`${NODE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch {
    return { success: false, error: 'Print server not available' }
  }
}

// =============================================================================
// PrinterService — unified API, delegates to vendor or node at runtime
// =============================================================================

export class PrinterService {
  static async checkStatus(): Promise<{ serverRunning: boolean; printerConnected: boolean; printerName?: string }> {
    return currentMode === 'vendor' ? vendorCheckStatus() : nodeCheckStatus()
  }

  static async isAvailable(): Promise<boolean> {
    const status = await PrinterService.checkStatus()
    return status.serverRunning && status.printerConnected
  }

  static async printTicket(data: PrintTicketData): Promise<{ success: boolean; error?: string }> {
    if (currentMode === 'vendor') return vendorSendXml(buildTicketXml(data))
    return nodeSendJson('/print', data)
  }

  static async printTicketCopia(data: PrintTicketData): Promise<{ success: boolean; error?: string }> {
    if (currentMode === 'vendor') return vendorSendXml(buildTicketXml(data, { isCopia: true }))
    return nodeSendJson('/copia', data)
  }

  static async printBalance(data: PrintBalanceData): Promise<{ success: boolean; error?: string }> {
    if (currentMode === 'vendor') return vendorSendXml(buildBalanceXml(data))
    return nodeSendJson('/balance', data)
  }

  static async printPayTicket(data: PrintPayData): Promise<{ success: boolean; error?: string }> {
    if (currentMode === 'vendor') return vendorSendXml(buildPayXml(data))
    return nodeSendJson('/pago', data)
  }

  static async printBonusWinTicket(data: PrintBonusWinData): Promise<{ success: boolean; error?: string }> {
    if (currentMode === 'vendor') return vendorSendXml(buildBonusWinXml(data))
    return nodeSendJson('/bonus', data)
  }

  static async printCancelTicket(data: PrintCancelData): Promise<{ success: boolean; error?: string }> {
    if (currentMode === 'vendor') return vendorSendXml(buildCancelXml(data))
    return nodeSendJson('/cancelacion', data)
  }

  static async printResults(data: { juego: string; fechaDeImprenta: string; carreras: Array<{ id: string; iniciar: string; resultado: string; bonus?: string }> }): Promise<{ success: boolean; error?: string }> {
    if (currentMode === 'vendor') return vendorSendXml(buildResultsXml(data))
    return nodeSendJson('/resultados', data)
  }

  static async printCuotas(data: { juego: string; fechaDeImprenta: string; juegos: Array<{ id: string; cuotas: string[][] }> }): Promise<{ success: boolean; error?: string }> {
    if (currentMode === 'vendor') return vendorSendXml(buildCuotasXml(data))
    return nodeSendJson('/cuotas', data)
  }
}
