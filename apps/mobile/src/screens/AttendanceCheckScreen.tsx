/**
 * Pantalla principal de fichaje del empleado.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Device from 'expo-device';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import {
  validateLocationReading, distanceBetween, formatDistance,
  checkTypeLabel, checkMethodLabel,
  type CheckType, type CheckMethod, type AttendanceCheckPayload,
} from '@siracontrol/shared';

import { useAuth } from '../hooks/useAuth';
import { useConnectivity } from '../hooks/useConnectivity';
import { useWorkLocations } from '../hooks/useWorkLocations';
import { queueAttendanceCheck } from '../services/queue';
import { syncAll } from '../services/sync';
import { useTheme } from '../theme';

type Status = 'idle' | 'requesting_location' | 'authenticating' | 'submitting' | 'success' | 'error';

interface Props {
  checkType: CheckType;
  preferredMethod: CheckMethod;
  onDone?: () => void;
}

export function AttendanceCheckScreen({ checkType, preferredMethod, onDone }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { profile, organization } = useAuth();
  const { locations, isLoading: loadingLocations } = useWorkLocations();
  const { isOnline } = useConnectivity();

  const [status, setStatus] = useState<Status>('idle');
  const [locationReading, setLocationReading] = useState<Location.LocationObject | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const captureLocation = useCallback(async () => {
    setStatus('requesting_location');
    setErrorMessage(null);

    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== 'granted') {
      setErrorMessage('Permisos de ubicación denegados. Habilítalos en ajustes.');
      setStatus('error');
      return null;
    }

    try {
      const reading = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const validation = validateLocationReading({
        location: { latitude: reading.coords.latitude, longitude: reading.coords.longitude },
        accuracyMeters: reading.coords.accuracy ?? undefined,
        isMockLocation: reading.mocked ?? false,
        speedMps: reading.coords.speed ?? undefined,
        maxAccuracyMeters: organization?.settings.maxGpsAccuracyMeters,
      });

      if (!validation.isValid) {
        setErrorMessage(validation.warnings.join(' '));
        setStatus('error');
        return null;
      }

      setLocationReading(reading);
      return reading;
    } catch (e: any) {
      setErrorMessage('No se pudo obtener la ubicación: ' + e.message);
      setStatus('error');
      return null;
    }
  }, [organization]);

  const findNearestLocation = useCallback((point: { latitude: number; longitude: number }) => {
    if (!locations || locations.length === 0) return null;
    let closest = locations[0];
    let minDistance = distanceBetween(point, closest.center);
    for (const loc of locations.slice(1)) {
      const d = distanceBetween(point, loc.center);
      if (d < minDistance) {
        minDistance = d;
        closest = loc;
      }
    }
    return {
      location: closest,
      distance: minDistance,
      isInside: minDistance <= closest.radiusMeters,
    };
  }, [locations]);

  const authenticateBiometric = useCallback(async () => {
    setStatus('authenticating');
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) return true;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirma tu identidad para fichar',
      fallbackLabel: 'Usar contraseña',
      cancelLabel: 'Cancelar',
    });
    if (!result.success) {
      setErrorMessage('Autenticación cancelada');
      setStatus('error');
      return false;
    }
    return true;
  }, []);

  const submitCheck = useCallback(async (selfieBase64?: string) => {
    if (!locationReading || !profile) return;
    setStatus('submitting');

    const payload: AttendanceCheckPayload = {
      type: checkType,
      method: preferredMethod,
      location: {
        latitude: locationReading.coords.latitude,
        longitude: locationReading.coords.longitude,
      },
      accuracyMeters: locationReading.coords.accuracy ?? 0,
      isMockLocation: locationReading.mocked ?? false,
      selfieBase64,
      deviceId: Device.osInternalBuildId ?? 'unknown',
      deviceModel: Device.modelName ?? undefined,
      occurredAt: new Date(locationReading.timestamp).toISOString(),
      clientId: uuidv4(),
    };

    try {
      await queueAttendanceCheck(payload);
      if (isOnline) await syncAll();
      setStatus('success');
      setTimeout(() => onDone?.(), 1500);
    } catch (e: any) {
      setErrorMessage('Error al guardar: ' + e.message);
      setStatus('error');
    }
  }, [locationReading, profile, checkType, preferredMethod, isOnline, onDone]);

  const handleCheck = useCallback(async () => {
    const reading = await captureLocation();
    if (!reading) return;

    const point = { latitude: reading.coords.latitude, longitude: reading.coords.longitude };
    const nearest = findNearestLocation(point);

    if (nearest && !nearest.isInside) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Fuera de zona de trabajo',
          `Estás a ${formatDistance(nearest.distance)} de "${nearest.location.name}". El fichaje quedará pendiente de revisión. ¿Continuar?`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Continuar', onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) {
        setStatus('idle');
        return;
      }
    }

    if (preferredMethod === 'fingerprint') {
      const ok = await authenticateBiometric();
      if (!ok) return;
      await submitCheck();
    } else {
      // Para selfie/face_recognition se llamaría a la cámara
      await submitCheck();
    }
  }, [captureLocation, findNearestLocation, preferredMethod, authenticateBiometric, submitCheck]);

  if (loadingLocations) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{checkTypeLabel(checkType)}</Text>
        <Text style={styles.subtitle}>
          {profile?.firstName} {profile?.lastName}
        </Text>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Sin conexión · El fichaje se guardará y enviará al recuperar internet
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Método</Text>
        <Text style={styles.cardValue}>{checkMethodLabel(preferredMethod)}</Text>
      </View>

      {locationReading && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Precisión GPS</Text>
          <Text style={styles.cardValue}>
            ±{Math.round(locationReading.coords.accuracy ?? 0)} m
          </Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {status === 'success' ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✓ Fichaje registrado</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            (status === 'submitting' || status === 'requesting_location') && styles.buttonDisabled,
          ]}
          disabled={status === 'submitting' || status === 'requesting_location'}
          onPress={handleCheck}
        >
          {status === 'submitting' || status === 'requesting_location' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {checkType === 'check_in' ? 'Marcar entrada' : 'Marcar salida'}
            </Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { padding: 24, backgroundColor: theme.colors.background, flexGrow: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { marginBottom: 32 },
    title: { ...theme.typography.title, color: theme.colors.textPrimary },
    subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: 4 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 16,
      marginBottom: 12,
    },
    cardLabel: { ...theme.typography.overline, color: theme.colors.textTertiary },
    cardValue: { ...theme.typography.body, color: theme.colors.textPrimary, marginTop: 4, fontWeight: '500' },
    offlineBanner: {
      backgroundColor: theme.colors.warningBg,
      padding: 12,
      borderRadius: theme.radius.sm,
      marginBottom: 16,
    },
    offlineText: { color: theme.colors.warningText, fontSize: 13, textAlign: 'center' },
    errorBanner: {
      backgroundColor: theme.colors.dangerBg,
      padding: 12,
      borderRadius: theme.radius.sm,
      marginVertical: 12,
    },
    errorText: { color: theme.colors.dangerText, fontSize: 14 },
    successBanner: {
      backgroundColor: theme.colors.successBg,
      padding: 16,
      borderRadius: theme.radius.sm,
      marginTop: 24,
    },
    successText: {
      color: theme.colors.successText,
      fontSize: 16,
      fontWeight: '500',
      textAlign: 'center',
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: 18,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: 24,
    },
    buttonPressed: { opacity: 0.85 },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  });
}
