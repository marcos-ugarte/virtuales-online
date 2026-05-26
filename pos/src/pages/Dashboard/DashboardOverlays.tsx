import NoBetsModal from '@/components/NoBetsModal'
import RaceActiveOverlay from '@/components/RaceActiveOverlay'
import ConnectionLostOverlay from '@/components/ConnectionLostOverlay'
import TicketActionModal from '@/components/TicketActionModal'
import BaseModal from '@/components/BaseModal'
import type { GamePrefix } from '@/hooks/useRaceData'
import type { GetTicketSuccess } from '@/types/websocket'
import acceptButtonBg from '@/assets/svg/img_2_accept_button_background.svg'
import styles from './Dashboard.module.css'

export interface DashboardOverlaysProps {
  // Ticket notification
  ticketNotification: { show: boolean; ticketId: string; total: number } | null
  // Race overlay
  showOverlay: boolean
  isJugadaTab: boolean
  raceState: string
  isOverlayExiting: boolean
  activeGame: GamePrefix
  // Connection overlays
  isConnectionLost: boolean
  isReconnecting: boolean
  isRelayStale: boolean
  // Ticket action modal
  searchedTicket: GetTicketSuccess | null
  setSearchedTicket: (ticket: GetTicketSuccess | null) => void
  isCancelling: boolean
  isPaying: boolean
  handleTicketPay: (ticketId: string) => void
  handleTicketCancel: (ticketId: string) => void
  handleRebet: (ticket: GetTicketSuccess) => void
}

export default function DashboardOverlays({
  ticketNotification,
  showOverlay,
  isJugadaTab,
  raceState,
  isOverlayExiting,
  activeGame,
  isConnectionLost,
  isReconnecting,
  isRelayStale,
  searchedTicket,
  setSearchedTicket,
  isCancelling,
  isPaying,
  handleTicketPay,
  handleTicketCancel,
  handleRebet
}: DashboardOverlaysProps) {
  return (
    <>
      {/* Ticket Created / Error Notification — always in DOM, CSS visibility */}
      {(() => {
        const tid = ticketNotification?.ticketId
        // A real ticket ID is either a 16-char hex string (backend) or starts with DEV- (dev-mode mock).
        const isRealTicket = !!tid && (/^[a-f0-9]{16}$/i.test(tid) || tid.startsWith('DEV-'))
        const isError = !!tid && (
          tid === 'ERROR' ||
          tid.startsWith('ERROR:') ||
          tid.startsWith('ERROR_') ||
          tid.startsWith('AVISO_') ||
          tid === 'SESIÓN EXPIRADA' ||
          tid === 'LIMITE_DIARIO_EXCEDIDO' ||
          (!isRealTicket && tid !== 'BALANCE_PRINTED')
        )
        return (
      <div className={`${styles.ticketNotification} ${isError ? styles.ticketNotificationError : ''} ${!ticketNotification ? styles.ticketNotificationHidden : ''}`}>
        <div className={styles.ticketNotificationContent}>
          <div className={styles.ticketNotificationIcon}>
            {isError ? '✕' : '✓'}
          </div>
          <div className={styles.ticketNotificationText}>
            {tid === 'ERROR_STALE_DATA' ? (
              <>
                <span className={styles.ticketNotificationTitle}>ERROR DE DATOS</span>
                <span className={styles.ticketNotificationId}>Datos desactualizados</span>
                <span className={styles.ticketNotificationTotal}>Espere sincronización</span>
              </>
            ) : tid === 'ERROR_PRINTER_DISCONNECTED' ? (
              <>
                <span className={styles.ticketNotificationTitle}>SIN IMPRESORA</span>
                <span className={styles.ticketNotificationId}>Impresora no conectada</span>
                <span className={styles.ticketNotificationTotal}>Verifique la conexión</span>
              </>
            ) : tid === 'BALANCE_PRINTED' ? (
              <>
                <span className={styles.ticketNotificationTitle}>BALANCE IMPRESO</span>
                <span className={styles.ticketNotificationId}>Balance enviado a impresora</span>
                <span className={styles.ticketNotificationTotal}></span>
              </>
            ) : tid === 'ERROR' ? (
              <>
                <span className={styles.ticketNotificationTitle}>ERROR</span>
                <span className={styles.ticketNotificationId}>Falló la creación</span>
                <span className={styles.ticketNotificationTotal}>Intente de nuevo</span>
              </>
            ) : tid === 'ERROR: NOT_AUTHENTICATED' ? (
              <>
                <span className={styles.ticketNotificationTitle}>SESIÓN EXPIRADA</span>
                <span className={styles.ticketNotificationId}>Vuelva a iniciar sesión</span>
                <span className={styles.ticketNotificationTotal}>Pulse Aceptar para continuar</span>
              </>
            ) : tid === 'SESIÓN EXPIRADA' ? (
              <>
                <span className={styles.ticketNotificationTitle}>SESIÓN EXPIRADA</span>
                <span className={styles.ticketNotificationId}>Tiempo de inactividad excedido</span>
                <span className={styles.ticketNotificationTotal}>Vuelva a iniciar sesión</span>
              </>
            ) : tid === 'LIMITE_DIARIO_EXCEDIDO' ? (
              <>
                <span className={styles.ticketNotificationTitle}>LÍMITE DIARIO</span>
                <span className={styles.ticketNotificationId}>Excedido el límite de ventas</span>
                <span className={styles.ticketNotificationTotal}>No se puede crear el ticket</span>
              </>
            ) : tid === 'AVISO_LIMITE_VENTAS' ? (
              <>
                <span className={styles.ticketNotificationTitle}>AVISO</span>
                <span className={styles.ticketNotificationId}>Cerca del límite de ventas</span>
                <span className={styles.ticketNotificationTotal}></span>
              </>
            ) : tid === 'AVISO_LIMITE_PAGOS' ? (
              <>
                <span className={styles.ticketNotificationTitle}>AVISO</span>
                <span className={styles.ticketNotificationId}>Cerca del límite de pagos</span>
                <span className={styles.ticketNotificationTotal}></span>
              </>
            ) : tid?.startsWith('ERROR:') ? (
              <>
                <span className={styles.ticketNotificationTitle}>ERROR</span>
                <span className={styles.ticketNotificationId}>{tid.replace('ERROR:', '').trim()}</span>
                <span className={styles.ticketNotificationTotal}>Intente de nuevo</span>
              </>
            ) : isRealTicket ? (
              <>
                <span className={styles.ticketNotificationTitle}>TICKET CREADO</span>
                <span className={styles.ticketNotificationId}>ID: {tid}</span>
                <span className={styles.ticketNotificationTotal}>Total: ${ticketNotification?.total.toFixed(2)}</span>
              </>
            ) : (
              <>
                <span className={styles.ticketNotificationTitle}>ERROR</span>
                <span className={styles.ticketNotificationId}>{tid}</span>
                <span className={styles.ticketNotificationTotal}>Intente de nuevo</span>
              </>
            )}
          </div>
        </div>
      </div>
        )
      })()}

      {/* Race State Overlays */}
      {/* Overlay appears at 5 seconds (closing) and stays during race (running) */}
      {/* Fades out smoothly when race ends */}
      {showOverlay && isJugadaTab && (
        <div className={styles.raceOverlayContainer}>
          <RaceActiveOverlay
            showTitle={raceState === 'running'}
            isExiting={isOverlayExiting}
            game={activeGame}
          />
        </div>
      )}

      {/* NoBetsModal - always in DOM, visible when closing (avoids mount/unmount flash) */}
      <NoBetsModal scale={0.75} visible={raceState === 'closing'} />

      {/* Connection Lost Overlay - blocks all betting when connection is lost */}
      {/* Priority: SignalR (main operations) > Relay (race data) */}
      {(isConnectionLost || isReconnecting) && (
        <ConnectionLostOverlay
          visible={true}
          isReconnecting={isReconnecting}
          service="signalr"
        />
      )}
      {/* Relay stale data overlay — shown when race data stops flowing */}
      {isRelayStale && !isConnectionLost && !isReconnecting && (
        <ConnectionLostOverlay
          visible={true}
          isReconnecting={true}
          service="relay"
        />
      )}

      {/* Ticket Active Modal - race is running */}
      {searchedTicket && searchedTicket.status === '_active' && (
        <BaseModal title="TICKET ACTUAL" scale={0.75} height={280}>
          <p style={{ fontFamily: 'var(--font-family-din), Helvetica, sans-serif', fontSize: 'calc(35.2px * 0.75)', fontStyle: 'italic', color: '#000', margin: 0, textAlign: 'center', width: '100%', paddingTop: 'calc(20px * 0.75)' }}>
            Este es un ticket activo!
          </p>
          <div style={{ position: 'absolute', bottom: 'calc(-6px * 0.75)', right: 'calc(-11px * 0.75)', transform: 'skewX(10deg)' }}>
            <button
              onClick={() => setSearchedTicket(null)}
              style={{ position: 'relative', width: 'calc(220px * 0.75)', height: 'calc(97px * 0.75)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <img src={acceptButtonBg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
              <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-family-din), Helvetica, sans-serif', fontSize: 'calc(35.2px * 0.75)', fontWeight: 700, color: '#000', zIndex: 2 }}>OK</span>
            </button>
          </div>
        </BaseModal>
      )}

      {/* Ticket Action Modal - shown when a ticket is found via scan/search */}
      {searchedTicket && searchedTicket.status !== '_active' && (
        <TicketActionModal
          ticket={searchedTicket}
          scale={0.75}
          loading={isCancelling || isPaying}
          onClose={() => setSearchedTicket(null)}
          onPay={handleTicketPay}
          onCancel={handleTicketCancel}
          onRebet={handleRebet}
        />
      )}
    </>
  )
}
