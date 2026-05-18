import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'SiraControl',
  slug: 'siracontrol-app',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#F59E0B',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.empresa.siracontrol',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Usamos tu ubicación para verificar tus fichajes en zona de trabajo.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Para empleados de campo, registramos la ubicación durante la jornada.',
      NSLocationAlwaysUsageDescription:
        'Tracking GPS durante la jornada laboral.',
      NSCameraUsageDescription:
        'La cámara se usa para tomar selfies de verificación al fichar.',
      NSFaceIDUsageDescription:
        'Face ID se usa para autenticarte rápidamente al fichar.',
      UIBackgroundModes: ['location', 'fetch'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F59E0B',
    },
    package: 'com.empresa.siracontrol',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'CAMERA',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
    ],
  },
  plugins: [
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Usamos tu ubicación para verificar fichajes y registrar tu jornada.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'La cámara se usa para tomar selfies al fichar.',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Face ID para autenticarte al fichar.',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: { projectId: 'YOUR_EAS_PROJECT_ID' },
  },
};

export default config;
