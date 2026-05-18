/**
 * Cliente Supabase configurado para React Native.
 * Persistencia de sesión en SecureStore para mayor seguridad.
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const url = Constants.expoConfig?.extra?.supabaseUrl ?? '';
const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey ?? '';

if (!url || !anonKey) {
  console.warn(
    'Supabase no está configurado. Define supabaseUrl y supabaseAnonKey en app.config.ts'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
