/**
 * Tracking de ubicación en background para empleados de campo.
 * Captura la posición cada N segundos según la configuración de la org.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import { queuePing } from './queue';
import { supabase } from './supabase';

const TRACKING_TASK = 'siracontrol-location-tracking';

TaskManager.defineTask(TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Error en tracking task:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;

    const batteryLevel = await Battery.getBatteryLevelAsync().catch(() => 1);

    for (const loc of locations) {
      await queuePing({
        profile_id: session.user.id,
        location: `POINT(${loc.coords.longitude} ${loc.coords.latitude})`,
        accuracy_meters: loc.coords.accuracy ?? null,
        speed_mps: loc.coords.speed ?? null,
        heading_degrees: loc.coords.heading ?? null,
        battery_level: Math.round(batteryLevel * 100),
        is_mock_location: loc.mocked ?? false,
        recorded_at: new Date(loc.timestamp).toISOString(),
      });
    }
  }
});

export async function startTracking(intervalSeconds = 60): Promise<void> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') throw new Error('Permiso de ubicación denegado');

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    console.warn('Sin permiso de ubicación en background — solo funciona con app abierta');
  }

  const isRunning = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK);
  if (isRunning) return;

  await Location.startLocationUpdatesAsync(TRACKING_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: intervalSeconds * 1000,
    distanceInterval: 30,
    foregroundService: {
      notificationTitle: 'SiraControl activo',
      notificationBody: 'Tu jornada está siendo registrada',
      notificationColor: '#F59E0B',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

export async function stopTracking(): Promise<void> {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(TRACKING_TASK);
  }
}

export async function isTrackingActive(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TRACKING_TASK);
}
