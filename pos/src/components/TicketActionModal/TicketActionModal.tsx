import BaseModal from '@/components/BaseModal'
import styles from './TicketActionModal.module.css'
import type { GetTicketSuccess } from '@/types/websocket'

// SVG imports
import greenButtonBg from '@/assets/svg/modal_button_green.svg'
import redButtonBg from '@/assets/svg/modal_button_red.svg'

type Variant = 'pay' | 'cancel' | 'rebet'

interface TicketActionModalProps {
  ticket: GetTicketSuccess
  visible?: boolean
  scale?: number
  loading?: boolean
  onClose: () => void
  onPay?: (ticketId: string) => void
  onCancel?: (ticketId: string) => void
  onRebet?: (ticket: GetTicketSuccess) => void
}

function getVariant(ticket: GetTicketSuccess): Variant {
  if (ticket.status === 'won' && !ticket.isPaid) return 'pay'
  if (ticket.status === 'pending') return 'cancel'
  return 'rebet'
}

const VARIANT_CONFIG: Record<Variant, { title: string; headerBg?: string; height?: number }> = {
  pay: { title: 'PAGAR', height: 310 },
  cancel: { title: 'CANCELAR TICKET' },
  rebet: { title: 'TIP DE NUEVO' },
}

export default function TicketActionModal({
  ticket,
  visible = true,
  scale = 1,
  loading = false,
  onClose,
  onPay,
  onCancel,
  onRebet,
}: TicketActionModalProps) {
  const variant = getVariant(ticket)
  const config = VARIANT_CONFIG[variant]

  return (
    <BaseModal
      title={config.title}
      scale={scale}
      visible={visible}
      headerBg={config.headerBg}
      height={config.height}
    >
      <div className={styles.body}>
        {variant === 'pay' && (
          <p className={styles.payText}>
            Pago {ticket.winAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}

        {variant === 'cancel' && (
          <>
            <p className={styles.contentText}>
              Está seguro de que quiere cancelar este ticket?
            </p>
            <p className={styles.ticketCode}>{ticket.ticketNumber}</p>
          </>
        )}

        {variant === 'rebet' && (
          <>
            <p className={styles.contentText}>
              Este no es un ticket ganador o ya ha sido pagado.
              <br />
              ¿Desea realizar la misma apuesta para la próxima ronda?
            </p>
            <p className={styles.ticketCode}>{ticket.ticketNumber}</p>
          </>
        )}
      </div>

      {/* NO / SÍ buttons — bottom left and right */}
      <div className={styles.buttonContainerLeft}>
        <button className={styles.actionButton} onClick={onClose}>
          <img src={redButtonBg} alt="" className={styles.buttonBg} />
          <span className={styles.buttonTextLight}>NO</span>
        </button>
      </div>
      <div className={styles.buttonContainerRight}>
        <button
          className={styles.actionButton}
          disabled={loading}
          onClick={() => {
            if (loading) return
            if (variant === 'pay' && onPay) onPay(ticket.ticketNumber)
            if (variant === 'cancel' && onCancel) onCancel(ticket.ticketNumber)
            if (variant === 'rebet' && onRebet) onRebet(ticket)
          }}
        >
          <img src={greenButtonBg} alt="" className={styles.buttonBg} />
          {loading ? (
            <div className={styles.buttonSpinner} />
          ) : (
            <span className={styles.buttonText}>SÍ</span>
          )}
        </button>
      </div>
    </BaseModal>
  )
}
