/**
 * RechargeModal — cashier "Recarga / Cobro" of a web player's wallet by phone.
 *
 * Two modes (tabs): Recargar (deposit) and Cobrar (cash-out). The player gives
 * their cell number; the cashier enters phone + amount, the modal looks up the
 * account (webWalletLookup) to CONFIRM who/how-much/balance, then applies the
 * deposit (webDeposit) or debit (webCashout). Cash-out is phone-only — the
 * cashier must confirm the player's identity in person. Idempotent: the same
 * key is reused across retries of one confirmed op so it can't double-apply.
 *
 * Backend contract: pos/docs/POS_WALLET_RECARGA_INTEGRATION.md.
 */
import { useCallback, useMemo, useState } from 'react'
import { getPOSConnection, type WalletInfoResult } from '@/services/posConnection'
import styles from './RechargeModal.module.css'

interface Props {
  open: boolean
  onClose: () => void
  /** Fired after a successful recarga/cobro so the host can log it in Ventas. */
  onSuccess?: (kind: 'recarga' | 'cobro', amount: number, phone: string) => void
}

type Mode = 'recarga' | 'cobro'
type Phase = 'form' | 'confirm' | 'result'

const ERR_MSG: Record<string, string> = {
  PLAYER_NOT_FOUND: 'No existe un jugador con ese teléfono.',
  PLAYER_NOT_ACTIVE: 'La cuenta del jugador no está activa.',
  NOT_AUTHENTICATED: 'Sesión del operador no activa. Vuelva a iniciar sesión.',
  NOT_LOGGED_IN: 'Sesión del operador no activa. Vuelva a iniciar sesión.',
  INVALID_AMOUNT: 'Monto inválido.',
  INSUFFICIENT_FUNDS: 'Saldo insuficiente para el cobro.',
  WALLET_CONFLICT: 'Conflicto temporal, intente de nuevo.',
  INTERNAL_ERROR: 'Error de conexión, intente de nuevo.',
  WALLET_ERROR: 'No se pudo completar la operación.',
}
const errText = (code?: string, fallback?: string) =>
  (code && ERR_MSG[code]) || fallback || 'No se pudo completar la operación.'

const onlyDigits = (s: string) => s.replace(/\D/g, '')

export function RechargeModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('recarga')
  const [phase, setPhase] = useState<Phase>('form')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [info, setInfo] = useState<WalletInfoResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<WalletInfoResult | null>(null)
  const [idemKey, setIdemKey] = useState('')

  const isCobro = mode === 'cobro'
  const verb = isCobro ? 'Cobrar' : 'Recargar'
  const amountNum = useMemo(() => Number(amount), [amount])
  const phoneValid = phone.length === 10
  const amountValid = Number.isFinite(amountNum) && amountNum > 0
  const fmt = (n?: number) =>
    (n ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  // In cobro, the requested amount can't exceed the available balance.
  const exceedsBalance = isCobro && info != null && amountNum > (info.available ?? 0)

  const reset = useCallback(() => {
    setPhase('form'); setPhone(''); setAmount(''); setInfo(null)
    setLoading(false); setError(null); setResult(null); setIdemKey('')
  }, [])
  const close = useCallback(() => { reset(); onClose() }, [reset, onClose])

  const switchMode = useCallback((m: Mode) => {
    setMode(m); setPhase('form'); setInfo(null); setError(null); setResult(null)
  }, [])

  // Form → lookup → confirm
  const onContinue = useCallback(async () => {
    if (!phoneValid || !amountValid || loading) return
    setLoading(true); setError(null)
    const res = await getPOSConnection().webWalletLookup(phone)
    setLoading(false)
    if (!res.success) { setError(errText(res.errorCode, res.errorMessage)); return }
    setInfo(res)
    setIdemKey(`pos-${isCobro ? 'cob' : 'dep'}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
    setPhase('confirm')
  }, [phone, phoneValid, amountValid, loading, isCobro])

  // Confirm → deposit/cashout → result
  const onConfirm = useCallback(async () => {
    if (loading || exceedsBalance) return
    setLoading(true); setError(null)
    const conn = getPOSConnection()
    const res = isCobro
      ? await conn.webCashout(phone, amountNum, idemKey)
      : await conn.webDeposit(phone, amountNum, idemKey)
    setLoading(false)
    if (!res.success) { setError(errText(res.errorCode, res.errorMessage)); return }
    onSuccess?.(mode, amountNum, phone)
    setResult(res)
    setPhase('result')
  }, [phone, amountNum, idemKey, loading, isCobro, exceedsBalance, mode, onSuccess])

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Saldo del jugador</span>
          <button className={styles.close} onClick={close} aria-label="Cerrar">×</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${!isCobro ? styles.tabActive : ''}`}
            onClick={() => switchMode('recarga')}
          >RECARGAR</button>
          <button
            className={`${styles.tab} ${isCobro ? styles.tabActive : ''}`}
            onClick={() => switchMode('cobro')}
          >COBRAR</button>
        </div>

        {phase === 'form' && (
          <div className={styles.body}>
            <label className={styles.label}>Teléfono del jugador</label>
            <input
              className={styles.input}
              inputMode="numeric"
              placeholder="8092944120"
              value={phone}
              maxLength={10}
              autoFocus
              onChange={(e) => setPhone(onlyDigits(e.target.value).slice(0, 10))}
            />
            <label className={styles.label}>{isCobro ? 'Monto a cobrar' : 'Monto a recargar'}</label>
            <input
              className={styles.input}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') onContinue() }}
            />
            {error && <div className={styles.error}>{error}</div>}
            <button
              className={styles.primary}
              disabled={!phoneValid || !amountValid || loading}
              onClick={onContinue}
            >
              {loading ? 'Buscando…' : 'Continuar'}
            </button>
          </div>
        )}

        {phase === 'confirm' && info && (
          <div className={styles.body}>
            <div className={styles.confirmText}>
              {verb} <b>${fmt(amountNum)} {info.currency}</b> {isCobro ? 'de' : 'a'}:
            </div>
            <div className={styles.account}>
              <div className={styles.acctName}>{info.username}</div>
              <div className={styles.acctMeta}>
                Tel: {phone} · Saldo {isCobro ? 'disponible' : 'actual'}: ${fmt(info.available ?? info.balance)} {info.currency}
              </div>
            </div>
            {isCobro && (
              <div className={styles.hint}>Confirme la identidad del jugador antes de pagar.</div>
            )}
            {exceedsBalance && <div className={styles.error}>El monto supera el saldo disponible.</div>}
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.row}>
              <button className={styles.secondary} disabled={loading} onClick={() => { setError(null); setPhase('form') }}>Atrás</button>
              <button className={styles.primary} disabled={loading || exceedsBalance} onClick={onConfirm}>
                {loading ? (isCobro ? 'Pagando…' : 'Recargando…') : `Confirmar ${isCobro ? 'cobro' : 'recarga'}`}
              </button>
            </div>
          </div>
        )}

        {phase === 'result' && result && (
          <div className={styles.body}>
            <div className={styles.ok}>✓ {isCobro ? 'Cobro' : 'Recarga'} exitoso{isCobro ? '' : 'a'}</div>
            <div className={styles.account}>
              <div className={styles.acctName}>{result.username}</div>
              <div className={styles.acctMeta}>Nuevo saldo: <b>${fmt(result.balance)} {result.currency}</b></div>
            </div>
            <div className={styles.row}>
              <button className={styles.secondary} onClick={() => { setPhase('form'); setPhone(''); setAmount(''); setInfo(null); setResult(null); setError(null); setIdemKey('') }}>
                Otra operación
              </button>
              <button className={styles.primary} onClick={close}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RechargeModal
