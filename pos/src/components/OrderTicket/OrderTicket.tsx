import { useState, useCallback } from 'react'
import styles from './OrderTicket.module.css'
import panelBg from '@/assets/svg/ordenar-ticket/extTiBig.svg'
import trashSvg from '@/assets/svg/ordenar-ticket/trash.svg'
import printSvg from '@/assets/svg/ordenar-ticket/print.svg'

export interface PrepTicket {
  game: string
  ticketId: string
  positions: string
  amount: number
  ticketNumber: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  startTime: string
}

interface OrderTicketProps {
  visible: boolean
  onClose: () => void
  tickets: PrepTicket[]
  serverTime: string
  pendingCount?: number
  onAcceptTicket?: (ticketId: string) => void
  onRejectTicket?: (ticketId: string) => void
  onPrint?: () => void
  onDelete?: () => void
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  expired: 'Expirado',
}

const COLUMNS = [
  { key: 'game', label: 'Juego' },
  { key: 'ticketId', label: 'ID del ticket' },
  { key: 'positions', label: 'Posiciones' },
  { key: 'amount', label: 'Monto' },
  { key: 'ticketNumber', label: 'Núm. de Ticket' },
  { key: 'status', label: 'Estado' },
  { key: 'startTime', label: 'Inicio / Tiempo agotado' },
] as const

type SortKey = typeof COLUMNS[number]['key']

export default function OrderTicket({
  visible,
  onClose,
  tickets,
  serverTime,
  pendingCount = 0,
  onPrint,
  onDelete,
}: OrderTicketProps) {
  const [sortKey, setSortKey] = useState<SortKey>('ticketId')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }, [sortKey])

  const sortedTickets = [...tickets].sort((a, b) => {
    const valA = a[sortKey]
    const valB = b[sortKey]
    const cmp = typeof valA === 'number' && typeof valB === 'number'
      ? valA - valB
      : String(valA).localeCompare(String(valB))
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (!visible) return null

  const hasPending = pendingCount > 0

  return (
    <div className={styles.screen}>
      {/* DS Logo + Title */}
      <div className={styles.headerLeft}>
        <span className={styles.dsLogo}>DS</span>
        <span className={styles.headerTitle}>SISTEMA DE ORDENAR TICKET</span>
      </div>

      {/* Close / ORDENAR TICKET button (center top) */}
      <button
        className={`${styles.closeButton} ${hasPending ? styles.closeButtonPending : ''}`}
        onClick={onClose}
      >
        <span className={styles.closeButtonText}>ORDENAR TICKET</span>
        <div className={`${styles.pendingInfo} ${hasPending ? '' : styles.pendingHidden}`}>
          <span className={styles.pendingNumber}>{pendingCount}</span>
          <span className={styles.pendingLabel}>Tickets Pendientes</span>
        </div>
      </button>

      {/* Time section (right) */}
      <div className={styles.timeSection}>
        <span className={styles.timeLabel}>TIEMPO ACTUAL</span>
        <span className={styles.timeValue}>{serverTime}</span>
      </div>

      {/* Background panel SVG */}
      <div className={styles.panelWrapper}>
        <img src={panelBg} alt="" className={styles.panelBg} />

        {/* Table header row */}
        <div className={styles.tableHeaderBar}>
          <div className={styles.tableColumns}>
            {COLUMNS.map(col => (
              <button
                key={col.key}
                className={`${styles.colHeader} ${sortKey === col.key ? styles.colHeaderActive : ''}`}
                onClick={() => handleSort(col.key)}
              >
                <span
                  className={`${styles.sortArrow} ${sortKey === col.key ? styles.sortArrowVisible : ''}`}
                  data-dir={sortDir}
                />
                {col.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table body (scrollable) */}
        <div className={styles.tableBody}>
          {sortedTickets.map((ticket) => (
            <div key={ticket.ticketId} className={styles.tableRow}>
              <span className={styles.cell}>{ticket.game}</span>
              <span className={styles.cell}>{ticket.ticketId}</span>
              <span className={styles.cell}>{ticket.positions}</span>
              <span className={styles.cell}>{ticket.amount.toFixed(2)}</span>
              <span className={styles.cell}>{ticket.ticketNumber}</span>
              <span className={`${styles.cell} ${styles[`status_${ticket.status}`] || ''}`}>
                {STATUS_LABELS[ticket.status] || ticket.status}
              </span>
              <span className={styles.cell}>{ticket.startTime}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom buttons: trash + print */}
      <button className={styles.trashButton} onClick={onDelete}>
        <img src={trashSvg} alt="Borrar" className={styles.trashImg} />
      </button>
      <button className={styles.printButton} onClick={onPrint}>
        <img src={printSvg} alt="Imprimir" className={styles.printImg} />
      </button>
    </div>
  )
}
