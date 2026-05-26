import BaseModal from '@/components/BaseModal'
import type { GetTicketSuccess } from '@/types/websocket'
import acceptButtonBg from '@/assets/svg/img_2_accept_button_background.svg'
import styles from './TicketDetailModal.module.css'

interface TicketDetailModalProps {
  ticket: GetTicketSuccess
  scale?: number
  visible?: boolean
  onClose: () => void
  onPay?: (ticketId: string) => void
  onCancel?: (ticketId: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  won: 'Ganador',
  lost: 'Perdido',
  paid: 'Pagado',
  cancelled: 'Cancelado',
}

const TIP_STATUS_LABELS: Record<string, string> = {
  P: 'Pendiente',
  W: 'Ganador',
  L: 'Perdido',
  C: 'Cancelado',
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'won': return styles.statusWon
    case 'lost': return styles.statusLost
    case 'pending': return styles.statusPending
    case 'cancelled': return styles.statusCancelled
    case 'paid': return styles.statusPaid
    default: return ''
  }
}

function getTipStatusClass(status: string): string {
  switch (status) {
    case 'W': return styles.statusWon
    case 'L': return styles.statusLost
    case 'P': return styles.statusPending
    case 'C': return styles.statusCancelled
    default: return ''
  }
}

export default function TicketDetailModal({
  ticket,
  scale = 1,
  visible = true,
  onClose,
  onPay,
  onCancel,
}: TicketDetailModalProps) {
  const canPay = ticket.status === 'won' && !ticket.isPaid
  const canCancel = ticket.status === 'pending' && !ticket.isCancelled

  return (
    <BaseModal title="Detalle de Boleto" scale={scale} height={580} visible={visible}>
      <div className={styles.container}>
        {/* Header Info */}
        <div className={styles.ticketHeader}>
          <div className={styles.ticketNumber}>
            <span className={styles.label}>Boleto:</span>
            <span className={styles.value}>{ticket.ticketNumber}</span>
          </div>
          <div className={`${styles.statusBadge} ${getStatusClass(ticket.status)}`}>
            {STATUS_LABELS[ticket.status] || ticket.status}
          </div>
        </div>

        {/* Ticket Info Grid */}
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Juego:</span>
            <span className={styles.value}>{ticket.gameTypeName || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Ronda:</span>
            <span className={styles.value}>{ticket.roundCode || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Apostado:</span>
            <span className={styles.value}>{ticket.betAmount.toFixed(2)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Ganancia:</span>
            <span className={`${styles.value} ${ticket.winAmount > 0 ? styles.winAmount : ''}`}>
              {ticket.winAmount.toFixed(2)}
            </span>
          </div>
          {ticket.possibleWin > 0 && (
            <div className={styles.infoItem}>
              <span className={styles.label}>Posible:</span>
              <span className={styles.value}>{ticket.possibleWin.toFixed(2)}</span>
            </div>
          )}
          <div className={styles.infoItem}>
            <span className={styles.label}>Fecha:</span>
            <span className={styles.value}>
              {new Date(ticket.createdAt).toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Tips List */}
        {ticket.tips.length > 0 && (
          <div className={styles.tipsSection}>
            <div className={styles.tipsHeader}>
              <span>Jugada</span>
              <span>Tipo</span>
              <span>Sel.</span>
              <span>Cuota</span>
              <span>Monto</span>
              <span>Est.</span>
            </div>
            <div className={styles.tipsList}>
              {ticket.tips.map((tip) => (
                <div key={tip.lineNumber} className={styles.tipRow}>
                  <span>{tip.lineNumber}</span>
                  <span>{tip.betTypeName || '-'}</span>
                  <span>
                    {tip.selection2 != null
                      ? `${tip.selection1}-${tip.selection2}`
                      : `${tip.selection1}`}
                  </span>
                  <span>{tip.odds.toFixed(1)}</span>
                  <span>{tip.amount.toFixed(2)}</span>
                  <span className={getTipStatusClass(tip.status)}>
                    {TIP_STATUS_LABELS[tip.status] || tip.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.buttonRow}>
          {canPay && onPay && (
            <button
              className={styles.actionButton}
              onClick={() => onPay(ticket.ticketNumber)}
            >
              <img src={acceptButtonBg} alt="" className={styles.buttonBg} />
              <span className={styles.buttonText}>PAGAR</span>
            </button>
          )}
          {canCancel && onCancel && (
            <button
              className={`${styles.actionButton} ${styles.cancelAction}`}
              onClick={() => onCancel(ticket.ticketNumber)}
            >
              <img src={acceptButtonBg} alt="" className={styles.buttonBg} />
              <span className={styles.buttonText}>CANCELAR</span>
            </button>
          )}
          <button
            className={styles.actionButton}
            onClick={onClose}
          >
            <img src={acceptButtonBg} alt="" className={styles.buttonBg} />
            <span className={styles.buttonText}>CERRAR</span>
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
