/**
 * RechargeModal — cashier "Cargar saldo" (recarga) flow.
 *
 * The player gives their cell number; the cashier enters phone + amount, the
 * modal looks up the account (webWalletLookup) to CONFIRM who/how-much, then
 * applies the deposit (webDeposit). Idempotent: the same idempotencyKey is
 * reused across retries of one confirmed deposit so it can't double-apply.
 *
 * Backend contract: pos/docs/POS_WALLET_RECARGA_INTEGRATION.md.
 */
import { useCallback, useMemo, useState } from 'react'
import { getPOSConnection, type WalletInfoResult } from '@/services/posConnection'
import styles from './RechargeModal.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

type Phase = 'form' | 'confirm' | 'result'

const ERR_MSG: Record<string, string> = {
  PLAYER_NOT_FOUND: 'No existe un jugador con ese teléfono.',
  PLAYER_NOT_ACTIVE: 'La cuenta del jugador no está activa.',
  NOT_AUTHENTICATED: 'Sesión del operador no activa. Vuelva a iniciar sesión.',
  NOT_LOGGED_IN: 'Sesión del operador no activa. Vuelva a iniciar sesión.',
  INVALID_AMOUNT: 'Monto inválido.',
  WALLET_CONFLICT: 'Conflicto temporal, intente de nuevo.',
  INTERNAL_ERROR: 'Error de conexión, intente de nuevo.',
  WALLET_ERROR: 'No se pudo completar la operación.',
}
const errText = (code?: string, fallback?: string) =>
  (code && ERR_MSG[code]) || fallback || 'No se pudo completar la operación.'

const onlyDigits = (s: string) => s.replace(/\D/g, '')

export function RechargeModal({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('form')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [info, setInfo] = useState<WalletInfoResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<WalletInfoResult | null>(null)
  // One idempotency key per confirmed deposit (reused on retry).
  const [idemKey, setIdemKey] = useState('')

  const amountNum = useMemo(() => Number(amount), [amount])
  const phoneValid = phone.length === 10
  const amountValid = Number.isFinite(amountNum) && amountNum > 0
  const fmt = (n?: number) =>
    (n ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const reset = useCallback(() => {
    setPhase('form'); setPhone(''); setAmount(''); setInfo(null)
    setLoading(false); setError(null); setResult(null); setIdemKey('')
  }, [])

  const close = useCallback(() => { reset(); onClose() }, [reset, onClose])

  // Form → lookup → confirm
  const onContinue = useCallback(async () => {
    if (!phoneValid || !amountValid || loading) return
    setLoading(true); setError(null)
    const res = await getPOSConnection().webWalletLookup(phone)
    setLoading(false)
    if (!res.success) { setError(errText(res.errorCode, res.errorMessage)); return }
    setInfo(res)
    setIdemKey(`pos-dep-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
    setPhase('confirm')
  }, [phone, phoneValid, amountValid, loading])

  // Confirm → deposit → result
  const onConfirm = useCallback(async () => {
    if (loading) return
    setLoading(true); setError(null)
    const res = await getPOSConnection().webDeposit(phone, amountNum, idemKey)
    setLoading(false)
    if (!res.success) { setError(errText(res.errorCode, res.errorMessage)); return }
    setResult(res)
    setPhase('result')
  }, [phone, amountNum, idemKey, loading])

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Cargar saldo</span>
          <button className={styles.close} onClick={close} aria-label="Cerrar">×</button>
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
            <label className={styles.label}>Monto a recargar</label>
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
              Recargar <b>${fmt(amountNum)} {info.currency}</b> a:
            </div>
            <div className={styles.account}>
              <div className={styles.acctName}>{info.username}</div>
              <div className={styles.acctMeta}>Tel: {phone} · Saldo actual: ${fmt(info.balance)} {info.currency}</div>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.row}>
              <button className={styles.secondary} disabled={loading} onClick={() => { setError(null); setPhase('form') }}>Atrás</button>
              <button className={styles.primary} disabled={loading} onClick={onConfirm}>
                {loading ? 'Recargando…' : 'Confirmar recarga'}
              </button>
            </div>
          </div>
        )}

        {phase === 'result' && result && (
          <div className={styles.body}>
            <div className={styles.ok}>✓ Recarga exitosa</div>
            <div className={styles.account}>
              <div className={styles.acctName}>{result.username}</div>
              <div className={styles.acctMeta}>Nuevo saldo: <b>${fmt(result.balance)} {result.currency}</b></div>
            </div>
            <div className={styles.row}>
              <button className={styles.secondary} onClick={reset}>Otra recarga</button>
              <button className={styles.primary} onClick={close}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RechargeModal
