import { useState, useCallback, useEffect, useRef } from 'react'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Loading from '@/components/Loading'
import SessionErrorScreen from '@/components/SessionErrorScreen'
import { getPOSConnection, resetPOSConnection } from '@/services/posConnection'
import ForceDisconnectModal from '@/components/ForceDisconnectModal'
import BaseModal from '@/components/BaseModal'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useImagePreloader, DASHBOARD_IMAGES } from '@/hooks/useImagePreloader'
import { POSConnectionProvider, usePOSConnectionContext } from '@/contexts/POSConnectionContext'
import { posLogger, LogEvents } from '@/services/posLogger'
import DeviceLockOverlay from '@/components/DeviceLockOverlay'

type View = 'login' | 'connecting' | 'sessionError' | 'dashboard'

// Initialize POS Logger — posts batched events to backend /api/pos-logs/batch.
// The backend resolves device→location→provider and forwards to Elasticsearch.
const deviceId = (window as any).desktopApp?.config?.deviceId || import.meta.env.VITE_DEV_DEVICE_ID || 'unknown-device'
const apiBase = import.meta.env.VITE_API_URL || ''
posLogger.init(deviceId, apiBase)
posLogger.info(LogEvents.APP_STARTED, 'POS SPA loaded', {
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  url: typeof window !== 'undefined' ? window.location.href : undefined,
})

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('login')
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Get force disconnect state and connection state from context
  const { wasForceDisconnected, forceDisconnectMessage, clearForceDisconnect, connectionState, deviceLocked, deviceLockReason, deviceLockedBy } = usePOSConnectionContext()

  // Preloader for dashboard images
  const { startPreloading, isComplete, progress } = useImagePreloader(DASHBOARD_IMAGES)

  // Auto-logout when SignalR disconnects permanently or reconnecting for too long
  // Reconnect policy allows up to ~2.5min of retries, so we give 90s before force-logout.
  // 'disconnected' means SignalR exhausted ALL retry attempts — that's a permanent failure.
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tracks whether the operator was ever authenticated while on the dashboard.
  // Until this flips true, a `connectionState` of 'ready'/'userLogin' is just the
  // normal pre-login / login-in-progress state — NOT a "session lost" event.
  // This prevents the bounce-to-login race: when dashboard images are cached, the
  // dashboard can mount (preloader complete) before `login()` has pushed
  // 'authenticated' to React state, leaving connectionState briefly at 'ready'
  // (from the prior deviceLogin step). Without this guard the effect below would
  // read 'ready' on mount and immediately auto-logout.
  const hadAuthenticatedRef = useRef(false)

  useEffect(() => {
    if (currentView !== 'dashboard') return

    // Remember once we've seen a real authenticated session on the dashboard.
    if (connectionState === 'authenticated') {
      hadAuthenticatedRef.current = true
    }

    // Not yet authenticated on this dashboard mount → ignore transient states
    // ('ready' from deviceLogin, 'userLogin'/'connected' while login() finishes).
    // Real session-lost handling only applies AFTER we've been authenticated.
    if (!hadAuthenticatedRef.current && (connectionState === 'ready' || connectionState === 'userLogin' || connectionState === 'connected')) {
      return
    }

    if (connectionState === 'disconnected') {
      // SignalR exhausted all reconnect attempts — permanent disconnect, logout
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      console.warn('[App] SignalR disconnected (all retries exhausted) — auto logout')
      posLogger.info(LogEvents.SESSION_ENDED, 'Auto-logout: SignalR disconnected (retries exhausted)', { reason: 'signalr_disconnected' })
      posLogger.clearOperator()
      setShowLogoutModal(true)
      resetPOSConnection().then(() => {
        setTimeout(() => {
          setShowLogoutModal(false)
          setCurrentView('login')
        }, 1500)
      })
    } else if (connectionState === 'reconnecting') {
      // Stay on dashboard with the reconnecting overlay indefinitely until the
      // connection comes back. With 3s retry forever, SignalR will eventually
      // reconnect or the operator decides to F5 / reload. Auto-logout removed
      // by Jorge: la sesión del cajero NO debe perderse por internet flaky.
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    } else if (connectionState === 'ready') {
      // Operator session lost while on dashboard (handleSessionLost → onSessionExpired
      // → setConnectionState('ready')). The hub may still be alive but the operator
      // auth is gone. Same UX as balance: brief "Espere..." modal → login screen.
      // No print, no balance — just navigate.
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      console.warn('[App] Session lost from dashboard — auto logout to login')
      posLogger.info(LogEvents.SESSION_ENDED, 'Auto-logout: session lost (relogin failed or backend rejected)', { reason: 'session_lost' })
      posLogger.clearOperator()
      setShowLogoutModal(true)
      setTimeout(() => {
        setShowLogoutModal(false)
        setCurrentView('login')
      }, 1500)
    } else if (connectionState === 'connected' || connectionState === 'authenticated') {
      // Reconnected successfully — cancel timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }
  }, [connectionState, currentView])

  // When images are preloaded AND the operator is authenticated, show dashboard.
  // BOTH conditions are required: gating only on `isComplete` (preloader) caused a
  // race where, with cached images, the dashboard mounted before login() pushed
  // 'authenticated' to React state — the dashboard effect then saw the leftover
  // 'ready' (from deviceLogin) and bounced straight back to login. Waiting for
  // 'authenticated' guarantees the session is live before we mount the dashboard.
  useEffect(() => {
    if (isComplete && currentView === 'connecting' && connectionState === 'authenticated') {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setCurrentView('dashboard')
      }, 100)
    }
  }, [isComplete, currentView, connectionState])

  const handleLogin = useCallback((operatorId?: string) => {
    // Re-arm the "was authenticated on dashboard" guard for this fresh login.
    hadAuthenticatedRef.current = false
    setCurrentView('connecting')
    // Start preloading images immediately
    startPreloading()
    // Log login success
    if (operatorId) {
      posLogger.setOperator(operatorId)
      posLogger.info(LogEvents.LOGIN_SUCCESS, `Operator ${operatorId} logged in`, { operatorId })
    }
  }, [startPreloading])


  const handleLoginFailed = useCallback(() => {
    setCurrentView('login')
  }, [])

  const handleLogout = useCallback(async () => {
    posLogger.info(LogEvents.SESSION_ENDED, 'Operator logged out', { reason: 'manual' })
    posLogger.clearOperator()
    setShowLogoutModal(true)
    // Log out the operator but keep the SignalR connection alive — matches the
    // vendor POS behavior. On re-login, no handshake / DeviceLogin is needed,
    // only Init(operatorId, pin). If Logout fails for any reason, fall back to
    // a full reset so we don't leave the hub in an inconsistent state.
    try {
      const conn = getPOSConnection()
      const ok = await conn.logout()
      if (!ok) {
        await resetPOSConnection()
      }
    } catch {
      await resetPOSConnection()
    }
    // Brief delay so user sees the modal
    await new Promise(r => setTimeout(r, 1500))
    setShowLogoutModal(false)
    setCurrentView('login')
  }, [])

  // Handle force disconnect - show modal, then redirect to login
  const handleForceDisconnectClose = useCallback(() => {
    posLogger.warn(LogEvents.SESSION_ENDED, 'Session was forcefully closed by administrator', { reason: 'force_closed' })
    posLogger.clearOperator()
    clearForceDisconnect()
    setCurrentView('login')
  }, [clearForceDisconnect])

  // Session Error Screen - shows before dashboard with login background
  if (currentView === 'sessionError') {
    return <SessionErrorScreen deviceId="5fd76331325cc0c7b0ba3883ae3d491d" />
  }

  // Dashboard view
  if (currentView === 'dashboard') {
    return (
      <>
        <Dashboard onLogout={handleLogout} />
        {showLogoutModal && (
          <BaseModal title="Espere, por favor" height={500}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', paddingTop: '40px' }}>
              <div style={{
                width: '100px',
                height: '100px',
                border: '8px solid rgba(0, 0, 0, 0.15)',
                borderTop: '8px solid #000',
                borderRight: '8px solid #000',
                borderRadius: '50%',
                animation: 'logoutSpin 0.7s linear infinite'
              }} />
            </div>
          </BaseModal>
        )}
        {wasForceDisconnected && (
          <ForceDisconnectModal
            message={forceDisconnectMessage || 'Su sesión ha sido cerrada por el administrador'}
            onClose={handleForceDisconnectClose}
          />
        )}
        {/* Reconnecting overlay is rendered inside Dashboard → DashboardOverlays
           (uses the existing ConnectionLostOverlay with proper styling and
           "Servidor Principal / Servidor de Carreras" messaging). No duplicate
           modal here. */}
        <DeviceLockOverlay visible={deviceLocked} reason={deviceLockReason || undefined} lockedBy={deviceLockedBy || undefined} />
      </>
    )
  }

  // Show Login with optional Loading overlay when connecting
  // Images are preloaded via useImagePreloader hook
  return (
    <>
      <Login onLogin={handleLogin} onLoginFailed={handleLoginFailed} />
      {currentView === 'connecting' && (
        <Loading overlay text={`CONECTANDO... ${progress}%`} />
      )}
      <DeviceLockOverlay visible={deviceLocked} reason={deviceLockReason || undefined} lockedBy={deviceLockedBy || undefined} />
    </>
  )
}

// Wrap with POSConnectionProvider to share connection state
function App() {
  return (
    <ErrorBoundary>
      <POSConnectionProvider>
        <AppContent />
      </POSConnectionProvider>
    </ErrorBoundary>
  )
}

export default App
