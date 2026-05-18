/**
 * Sincronización con Supabase. Procesa la cola pendiente cuando hay conexión.
 */

import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import {
  getPendingChecks,
  getPendingPings,
  markCheckSynced,
  markCheckFailed,
  deletePing,
} from './queue';
import type { AttendanceCheckPayload } from '@siracontrol/shared';

export interface SyncResult {
  attendanceSynced: number;
  attendanceFailed: number;
  pingsSynced: number;
}

export async function syncAll(): Promise<SyncResult> {
  const result: SyncResult = {
    attendanceSynced: 0,
    attendanceFailed: 0,
    pingsSynced: 0,
  };

  // Sincronizar fichajes (críticos, uno a uno con manejo de error)
  const checks = await getPendingChecks();
  for (const record of checks) {
    const payload = JSON.parse((record as any).payload) as AttendanceCheckPayload;
    try {
      await uploadCheck(payload);
      await markCheckSynced(payload.clientId);
      result.attendanceSynced++;
    } catch (e: any) {
      await markCheckFailed(payload.clientId, e.message ?? String(e));
      result.attendanceFailed++;
      if (isNetworkError(e)) break;
    }
  }

  // Sincronizar pings (en lote, no críticos)
  const pings = await getPendingPings();
  if (pings.length > 0) {
    try {
      const batch = pings.slice(0, 100).map((p: any) => JSON.parse(p.payload));
      const { error } = await supabase.from('location_pings').insert(batch);
      if (!error) {
        for (const p of pings.slice(0, 100)) {
          await deletePing((p as any).id);
        }
        result.pingsSynced = batch.length;
      }
    } catch (e) {
      console.warn('Error sincronizando pings:', e);
    }
  }

  return result;
}

async function uploadCheck(payload: AttendanceCheckPayload): Promise<void> {
  let selfieUrl: string | undefined;
  if (payload.selfieBase64) {
    selfieUrl = await uploadSelfie(payload.selfieBase64, payload.clientId);
  }

  const { error } = await supabase.from('attendance_records').insert({
    type: payload.type,
    method: payload.method,
    location: `POINT(${payload.location.longitude} ${payload.location.latitude})`,
    accuracy_meters: payload.accuracyMeters,
    is_mock_location: payload.isMockLocation,
    device_id: payload.deviceId,
    device_model: payload.deviceModel,
    selfie_url: selfieUrl,
    occurred_at: payload.occurredAt,
    client_id: payload.clientId,
  });

  // Idempotencia: si el clientId ya existe, no es error
  if (error && error.code === '23505') return;
  if (error) throw error;
}

async function uploadSelfie(base64: string, clientId: string): Promise<string> {
  const path = `selfies/${clientId}.jpg`;
  const { error } = await supabase.storage
    .from('attendance-selfies')
    .upload(path, decode(base64), {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('attendance-selfies')
    .getPublicUrl(path);
  return data.publicUrl;
}

function isNetworkError(error: any): boolean {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout')
  );
}
