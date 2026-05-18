import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme';

export function LoginScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Faltan datos', 'Ingresa tu email y contraseña');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>SiraControl</Text>
        <Text style={styles.tagline}>Ingresa con tu cuenta</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="tu@empresa.com"
          placeholderTextColor={theme.colors.textTertiary}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
          placeholderTextColor={theme.colors.textTertiary}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Text>
        </Pressable>

        <Text style={styles.help}>
          ¿Problemas para acceder? Contacta a tu administrador.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, padding: 32, justifyContent: 'center' },
    logo: {
      fontSize: 36, fontWeight: '700', color: theme.colors.primary, textAlign: 'center',
    },
    tagline: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center', marginBottom: 48, marginTop: 8,
    },
    label: { ...theme.typography.overline, color: theme.colors.textTertiary, marginBottom: 6, marginTop: 16 },
    input: {
      backgroundColor: theme.colors.surface,
      padding: 14,
      borderRadius: theme.radius.md,
      color: theme.colors.textPrimary,
      fontSize: 16,
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      marginTop: 32,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    help: {
      color: theme.colors.textTertiary,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 24,
    },
  });
}
