import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncAll } from '../services/sync';

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(async (state) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);
      if (online) {
        try {
          await syncAll();
          setLastSync(new Date());
        } catch (e) {
          console.warn('Error sincronizando:', e);
        }
      }
    });
    return unsub;
  }, []);

  return { isOnline, lastSync };
}
