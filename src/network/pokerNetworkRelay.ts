import { io, Socket } from 'socket.io-client';
import type { ActionPayload, Card, WinnerResult } from '../engine/types';

export interface NetworkPlayer {
  id: string;
  name: string;
  nametag?: string;
  walletAddress?: string;
  chips: number;
  balance?: number;
  currentBet: number;
  seatIndex: number;
  isActive?: boolean;
  isFolded?: boolean;
  hasFolded?: boolean;
  isAllIn?: boolean;
  isConnected?: boolean;
  cards?: Card[];
  holeCards?: Card[];
}

export interface NetworkTableSync {
  tableId: string;
  tableName: string;
  pot: number;
  lastPot?: number;
  currentBet: number;
  minRaise: number;
  communityCards: Card[];
  turnIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  gamePhase: 'LOBBY' | 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
  stage: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  players: (NetworkPlayer | null)[];
  winners?: WinnerResult[];
}

export type NetworkEventCallback = (data: unknown) => void;

class PokerNetworkRelay {
  private socket: Socket | null = null;
  private currentTableId: string | null = null;
  private listeners: Map<string, Set<NetworkEventCallback>> = new Map();
  private relayUrl: string;

  constructor() {
    this.relayUrl =
      import.meta.env.VITE_POKER_RELAY_URL ||
      (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001');
  }

  public connect(url?: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const targetUrl = url || this.relayUrl;

    this.socket = io(targetUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.info('[PokerNetworkRelay] Connected to live poker relay:', this.socket?.id);
      this.emitInternal('relay:connected', { id: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[PokerNetworkRelay] Disconnected from relay:', reason);
      this.emitInternal('relay:disconnected', { reason });
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[PokerNetworkRelay] Connection error to remote relay:', err.message);
      this.emitInternal('relay:error', { error: err.message });
    });

    // Core table events from remote multiplayer server
    const networkEvents = [
      'TABLE_STATE_SYNC',
      'PLAYER_JOINED',
      'PLAYER_LEFT',
      'TURN_CHANGED',
      'ACTION_SUBMITTED',
      'COMMUNITY_CARDS_DEALT',
      'HAND_COMPLETED',
      'ACTIVE_TABLES_UPDATE',
    ];

    for (const ev of networkEvents) {
      this.socket.on(ev, (data) => {
        this.emitInternal(ev, data);
      });
    }

    return this.socket;
  }

  public joinTable(tableId: string, player: { id: string; name: string; walletAddress: string; chips: number; nametag?: string }): void {
    this.currentTableId = tableId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('JOIN_TABLE', { tableId, player });
    } else {
      this.connect();
      this.socket?.emit('JOIN_TABLE', { tableId, player });
    }
  }

  public leaveTable(tableId?: string): void {
    const tid = tableId || this.currentTableId;
    if (tid && this.socket && this.socket.connected) {
      // Auto-fold in flight so other players continue instantly without waiting
      this.socket.emit('PLAYER_ACTION', { tableId: tid, action: { type: 'fold' } });
      this.socket.emit('LEAVE_TABLE', { tableId: tid });
    }
    this.currentTableId = null;
  }

  public sendAction(action: ActionPayload, stateChannelSignature?: string): void {
    if (!this.currentTableId) return;
    if (this.socket && this.socket.connected) {
      this.socket.emit('PLAYER_ACTION', {
        tableId: this.currentTableId,
        action,
        signature: stateChannelSignature,
        timestamp: Date.now(),
      });
    }
  }

  public requestActiveTables(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('GET_ACTIVE_TABLES');
    }
  }

  public on(event: string, callback: NetworkEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emitInternal(event: string, data: unknown): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        try {
          cb(data);
        } catch (e) {
          console.error(`[PokerNetworkRelay] Listener error on ${event}:`, e);
        }
      }
    }
  }

  public get isRelayConnected(): boolean {
    return Boolean(this.socket && this.socket.connected);
  }
}

export const pokerNetwork = new PokerNetworkRelay();
