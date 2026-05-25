import { useState, useEffect, useCallback, useRef } from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

// Types
interface SessionInfo {
  sessionId: string;
  deviceId: string;
  locationId: string;
  locationName?: string;
  operatorId: string;
  operatorName?: string;
  shiftId?: number;
  shiftNumber?: string;
  balance: number;
}

interface PosSettings {
  currency: string;
  currencySymbol: string;
  coins: number[];
  maxBetPerTip: number;
  decimalPlaces: number;
  language: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
  errorMessage?: string;
  session?: SessionInfo;
  settings?: PosSettings;
}

interface TipRequest {
  betTypeId: number;
  selection1: number;
  selection2?: number;
  selection3?: number;
  selection4?: number;
  amount: number;
  odds: number;
}

interface CreateTicketRequest {
  gameTypeId: number;
  gameRoundId: number;
  currencyCode: string;
  tips: TipRequest[];
}

interface TicketInfo {
  ticketId: number;
  ticketUuid: string;
  ticketNumber: string;
  betAmount: number;
  possibleWin: number;
  tipsCount: number;
  status: string;
  createdAt: string;
}

interface TicketResult {
  success: boolean;
  error?: string;
  errorMessage?: string;
  ticket?: TicketInfo;
}

interface BalanceInfo {
  operatorId: string;
  shiftId?: number;
  currentBalance: number;
  totalSales: number;
  totalPayouts: number;
  ticketCount: number;
}

interface BalanceResult {
  success: boolean;
  error?: string;
  balance?: BalanceInfo;
}

interface DiscoveryResponse {
  url: string;
  deviceType: string;
  serverTime: number;
  msgType: string;
}

interface ConnectionState {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

interface BusinessOperations {
  // Connection state
  connectionState: ConnectionState;
  session: SessionInfo | null;
  settings: PosSettings | null;

  // Methods
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  login: (operatorId: string, pin: string, deviceId?: string) => Promise<LoginResult>;
  logout: () => Promise<boolean>;
  createTicket: (request: CreateTicketRequest) => Promise<TicketResult>;
  getBalance: () => Promise<BalanceResult>;
}

// Configuration
const DISCOVERY_URL = import.meta.env.VITE_WS_DISCOVERY_URL || 'http://localhost:4500/api/ws/discover';

export function useBusinessOperations(): BusinessOperations {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    isConnected: false,
    error: null,
  });
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [settings, setSettings] = useState<PosSettings | null>(null);

  const connectionRef = useRef<HubConnection | null>(null);
  const wsUrlRef = useRef<string | null>(null);

  // Discover WebSocket URL
  const discoverWebSocket = useCallback(async (): Promise<string | null> => {
    try {
      console.log('[BusinessOps] Discovering WebSocket URL from:', DISCOVERY_URL);
      const response = await fetch(DISCOVERY_URL);

      if (!response.ok) {
        throw new Error(`Discovery failed: ${response.status}`);
      }

      const data: DiscoveryResponse = await response.json();
      console.log('[BusinessOps] Discovery response:', data);

      // Convert ws:// to http:// for SignalR (it handles the upgrade)
      let hubUrl = data.url;
      if (hubUrl.startsWith('ws://')) {
        hubUrl = hubUrl.replace('ws://', 'http://');
      } else if (hubUrl.startsWith('wss://')) {
        hubUrl = hubUrl.replace('wss://', 'https://');
      }

      return hubUrl;
    } catch (error) {
      console.error('[BusinessOps] Discovery error:', error);
      return null;
    }
  }, []);

  // Connect to SignalR Hub
  const connect = useCallback(async (): Promise<boolean> => {
    if (connectionRef.current?.state === HubConnectionState.Connected) {
      console.log('[BusinessOps] Already connected');
      return true;
    }

    setConnectionState({ isConnecting: true, isConnected: false, error: null });

    try {
      // Step 1: Discover WebSocket URL
      const hubUrl = await discoverWebSocket();
      if (!hubUrl) {
        throw new Error('Could not discover WebSocket URL');
      }
      wsUrlRef.current = hubUrl;

      // Step 2: Build SignalR connection
      console.log('[BusinessOps] Connecting to:', hubUrl);
      const connection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Information)
        .build();

      // Event handlers
      connection.on('Connected', (data) => {
        console.log('[BusinessOps] Server Connected event:', data);
      });

      connection.on('TicketConfirmed', (ticket: TicketResult) => {
        console.log('[BusinessOps] Ticket confirmed:', ticket);
      });

      connection.on('BalanceUpdated', (balance: BalanceInfo) => {
        console.log('[BusinessOps] Balance updated:', balance);
      });

      connection.on('SessionExpired', () => {
        console.log('[BusinessOps] Session expired');
        setSession(null);
      });

      connection.onclose((error) => {
        console.log('[BusinessOps] Connection closed:', error?.message);
        setConnectionState({ isConnecting: false, isConnected: false, error: error?.message || null });
      });

      connection.onreconnecting((error) => {
        console.log('[BusinessOps] Reconnecting:', error?.message);
        setConnectionState((prev) => ({ ...prev, isConnecting: true, isConnected: false }));
      });

      connection.onreconnected((connectionId) => {
        console.log('[BusinessOps] Reconnected:', connectionId);
        setConnectionState({ isConnecting: false, isConnected: true, error: null });
      });

      // Step 3: Start connection
      await connection.start();
      connectionRef.current = connection;

      console.log('[BusinessOps] Connected! ConnectionId:', connection.connectionId);
      setConnectionState({ isConnecting: false, isConnected: true, error: null });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      console.error('[BusinessOps] Connection error:', errorMessage);
      setConnectionState({ isConnecting: false, isConnected: false, error: errorMessage });
      return false;
    }
  }, [discoverWebSocket]);

  // Disconnect
  const disconnect = useCallback(async (): Promise<void> => {
    if (connectionRef.current) {
      await connectionRef.current.stop();
      connectionRef.current = null;
      setSession(null);
      setConnectionState({ isConnecting: false, isConnected: false, error: null });
    }
  }, []);

  // Login
  const login = useCallback(
    async (operatorId: string, pin: string, deviceId = 'dev-device'): Promise<LoginResult> => {
      if (!connectionRef.current || connectionRef.current.state !== HubConnectionState.Connected) {
        return { success: false, error: 'NOT_CONNECTED', errorMessage: 'Not connected to server' };
      }

      try {
        console.log('[BusinessOps] Login:', { operatorId, deviceId });
        const result = await connectionRef.current.invoke<LoginResult>('Login', deviceId, operatorId, pin);

        console.log('[BusinessOps] Login result:', result);

        if (result.success && result.session) {
          setSession(result.session);
          if (result.settings) {
            setSettings(result.settings);
          }
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Login failed';
        console.error('[BusinessOps] Login error:', errorMessage);
        return { success: false, error: 'LOGIN_ERROR', errorMessage };
      }
    },
    []
  );

  // Logout
  const logout = useCallback(async (): Promise<boolean> => {
    if (!connectionRef.current || connectionRef.current.state !== HubConnectionState.Connected) {
      return false;
    }

    try {
      const result = await connectionRef.current.invoke<boolean>('Logout');
      if (result) {
        setSession(null);
      }
      return result;
    } catch (error) {
      console.error('[BusinessOps] Logout error:', error);
      return false;
    }
  }, []);

  // Create Ticket
  const createTicket = useCallback(async (request: CreateTicketRequest): Promise<TicketResult> => {
    if (!connectionRef.current || connectionRef.current.state !== HubConnectionState.Connected) {
      return { success: false, error: 'NOT_CONNECTED', errorMessage: 'Not connected to server' };
    }

    if (!session) {
      return { success: false, error: 'NOT_AUTHENTICATED', errorMessage: 'Please login first' };
    }

    try {
      console.log('[BusinessOps] Creating ticket:', request);
      const result = await connectionRef.current.invoke<TicketResult>('CreateTicket', request);
      console.log('[BusinessOps] Ticket result:', result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create ticket';
      console.error('[BusinessOps] CreateTicket error:', errorMessage);
      return { success: false, error: 'CREATE_ERROR', errorMessage };
    }
  }, [session]);

  // Get Balance
  const getBalance = useCallback(async (): Promise<BalanceResult> => {
    if (!connectionRef.current || connectionRef.current.state !== HubConnectionState.Connected) {
      return { success: false, error: 'NOT_CONNECTED' };
    }

    if (!session) {
      return { success: false, error: 'NOT_AUTHENTICATED' };
    }

    try {
      const result = await connectionRef.current.invoke<BalanceResult>('GetBalance');
      return result;
    } catch (error) {
      console.error('[BusinessOps] GetBalance error:', error);
      return { success: false, error: 'BALANCE_ERROR' };
    }
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  return {
    connectionState,
    session,
    settings,
    connect,
    disconnect,
    login,
    logout,
    createTicket,
    getBalance,
  };
}

export type {
  SessionInfo,
  PosSettings,
  LoginResult,
  CreateTicketRequest,
  TipRequest,
  TicketResult,
  TicketInfo,
  BalanceResult,
  BalanceInfo,
  ConnectionState
};
