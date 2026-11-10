import { useState, useEffect } from 'react';
import { pokerNetwork } from '../network/pokerNetworkRelay';

export interface NetworkStats {
  totalPlayers: number;
  activeTablesCount: number;
  totalVolume: number;
  isLive: boolean;
}

export function useNetworkStats(): NetworkStats {
  const [stats, setStats] = useState<NetworkStats>({
    totalPlayers: 0,
    activeTablesCount: 0,
    totalVolume: 0,
    isLive: false,
  });

  useEffect(() => {
    pokerNetwork.connect();
    pokerNetwork.requestActiveTables();

    // Listen to real-time table sync and active tables updates
    const unsubTables = pokerNetwork.on('ACTIVE_TABLES_UPDATE', (data: unknown) => {
      const update = data as Record<string, { count: number; status: string; avgPot: number }>;
      if (update && typeof update === 'object') {
        const tables = Object.values(update);
        const seatedPlayers = tables.reduce((acc, t) => acc + (t.count || 0), 0);
        const activeTables = tables.filter((t) => (t.count || 0) > 0).length;
        const volumeSum = tables.reduce((acc, t) => acc + (t.avgPot || 0), 0);

        setStats({
          totalPlayers: seatedPlayers,
          activeTablesCount: activeTables,
          totalVolume: volumeSum,
          isLive: true,
        });
      }
    });

    const unsubState = pokerNetwork.on('TABLE_STATE_SYNC', (data: unknown) => {
      const sync = data as { pot?: number; players?: unknown[] };
      if (sync) {
        setStats((prev) => {
          const seated = Array.isArray(sync.players) ? sync.players.filter(Boolean).length : prev.totalPlayers;
          return {
            ...prev,
            totalPlayers: Math.max(seated, prev.totalPlayers),
            totalVolume: sync.pot && sync.pot > 0 ? Math.max(prev.totalVolume, sync.pot) : prev.totalVolume,
            isLive: true,
          };
        });
      }
    });

    const unsubJoin = pokerNetwork.on('PLAYER_JOINED', () => {
      setStats((prev) => ({
        ...prev,
        totalPlayers: prev.totalPlayers + 1,
        activeTablesCount: Math.max(1, prev.activeTablesCount),
        isLive: true,
      }));
    });

    const unsubLeft = pokerNetwork.on('PLAYER_LEFT', () => {
      setStats((prev) => {
        const nextPlayers = Math.max(0, prev.totalPlayers - 1);
        return {
          ...prev,
          totalPlayers: nextPlayers,
          activeTablesCount: nextPlayers === 0 ? 0 : Math.max(0, prev.activeTablesCount - (nextPlayers === 0 ? 1 : 0)),
          isLive: true,
        };
      });
    });

    const unsubConn = pokerNetwork.on('relay:connected', () => {
      setStats((prev) => ({ ...prev, isLive: true }));
    });

    return () => {
      unsubTables();
      unsubState();
      unsubJoin();
      unsubLeft();
      unsubConn();
    };
  }, []);

  return stats;
}
