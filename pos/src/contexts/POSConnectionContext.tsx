/**
 * POS Connection Context
 * Provides shared POS WebSocket connection state across the app
 */

import { createContext, useContext, type ReactNode } from 'react'
import usePOSConnection, {
  type POSConnectionHook,
  type POSConnectionHookState
} from '@/hooks/usePOSConnection'

// Create context with undefined default (must be used within provider)
const POSConnectionContext = createContext<POSConnectionHook | undefined>(undefined)

// Provider component
interface POSConnectionProviderProps {
  children: ReactNode
}

export function POSConnectionProvider({ children }: POSConnectionProviderProps) {
  const posConnection = usePOSConnection()

  return (
    <POSConnectionContext.Provider value={posConnection}>
      {children}
    </POSConnectionContext.Provider>
  )
}

// Hook to use the context
export function usePOSConnectionContext(): POSConnectionHook {
  const context = useContext(POSConnectionContext)
  if (!context) {
    throw new Error('usePOSConnectionContext must be used within a POSConnectionProvider')
  }
  return context
}

// Hook to get just the connection state (for components that only need to read)
export function usePOSConnectionState(): POSConnectionHookState {
  const context = usePOSConnectionContext()
  return {
    connectionState: context.connectionState,
    isInitializing: context.isInitializing,
    isLoggingIn: context.isLoggingIn,
    deviceId: context.deviceId,
    locationName: context.locationName,
    connectionInfo: context.connectionInfo,
    session: context.session,
    settings: context.settings,
    limits: context.limits,
    deviceError: context.deviceError,
    activeSessionDetails: context.activeSessionDetails,
    loginError: context.loginError,
    errorMessage: context.errorMessage,
    wasForceDisconnected: context.wasForceDisconnected,
    forceDisconnectMessage: context.forceDisconnectMessage,
    serverTime: context.serverTime,
    deviceLocked: context.deviceLocked,
    deviceLockReason: context.deviceLockReason,
    deviceLockedBy: context.deviceLockedBy
  }
}

export default POSConnectionContext
