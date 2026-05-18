/**
 * Pantalla principal del empleado: estado de jornada, accesos rápidos.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, RefreshControl,
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useConnectivity } from '../hooks/useConnectivity';
import { useTheme } from '../theme';
import { formatTime, getInitials, timeAgo } from '@siracontrol/shared';

interface TodayStatus {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInAt?: string;
  pendingTasks: number;
  unreadNotifications: number;
}

export function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { profile, organization } = useAuth();
  const { isOnline } = useConnectivity();
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    if (!profile) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ data: checks }, { count: tasksCount }, { count: notifCount }] = await Promise.all([
      supabase
        .from('attendance_records')
        .select('type, occurred_at')
        .eq('profile_id', profile.id)
        .gte('occurred_at', today.toISOString())
        .order('occurred_at', { ascending: true }),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', profile.id)
        .in('status', ['pending', 'in_progress']),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profile.id)
        .is('read_at', null),
    ]);

    const checkIn = checks?.find((c: any) => c.type === 'check_in');
    const checkOut = checks?.find((c: any) => c.type === 'check_out');

    setStatus({
      hasCheckedIn: !!checkIn,
      hasCheckedOut: !!checkOut,
      checkInAt: checkIn?.occurred_at,
      pendingTasks: tasksCount ?? 0,
      unreadNotifications: notifCount ?? 0,
    });
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const greeting = getGreeting();
  const initials = profile ? getInitials(profile.firstName, profile.lastName) : '';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{profile?.firstName}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      {!isOnline && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Modo offline activo</Text>
        </View>
      )}

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Estado de hoy</Text>
        {!status?.hasCheckedIn ? (
          <Pressable
            style={styles.primaryAction}
            onPress={() => navigation.navigate('CheckIn')}
          >
            <Text style={styles.primaryActionText}>Marcar entrada</Text>
          </Pressable>
        ) : !status.hasCheckedOut ? (
          <>
            <Text style={styles.statusText}>
              Entraste a las {formatTime(status.checkInAt!)}
            </Text>
            <Pressable
              style={styles.primaryAction}
              onPress={() => navigation.navigate('CheckOut')}
            >
              <Text style={styles.primaryActionText}>Marcar salida</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.statusText}>Jornada completada ✓</Text>
        )}
      </View>

      <View style={styles.grid}>
        <ActionCard
          theme={theme}
          icon="📋"
          label="Mis tareas"
          badge={status?.pendingTasks}
          onPress={() => navigation.navigate('Tasks')}
        />
        <ActionCard
          theme={theme}
          icon="🏖️"
          label="Vacaciones"
          onPress={() => navigation.navigate('Leaves')}
        />
        <ActionCard
          theme={theme}
          icon="💰"
          label="Mis recibos"
          onPress={() => navigation.navigate('Payroll')}
        />
        <ActionCard
          theme={theme}
          icon="📅"
          label="Mi historial"
          onPress={() => navigation.navigate('History')}
        />
        <ActionCard
          theme={theme}
          icon="🔔"
          label="Notificaciones"
          badge={status?.unreadNotifications}
          onPress={() => navigation.navigate('Notifications')}
        />
        <ActionCard
          theme={theme}
          icon="⚙️"
          label="Ajustes"
          onPress={() => navigation.navigate('Settings')}
        />
      </View>
    </ScrollView>
  );
}

function ActionCard({ theme, icon, label, badge, onPress }: any) {
  const styles = createStyles(theme);
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { padding: 20, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      marginTop: 8,
    },
    greeting: { fontSize: 16, color: theme.colors.textSecondary },
    name: { ...theme.typography.title, color: theme.colors.textPrimary },
    avatar: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: theme.colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    banner: {
      backgroundColor: theme.colors.warningBg,
      padding: 10, borderRadius: theme.radius.sm, marginBottom: 16,
    },
    bannerText: { color: theme.colors.warningText, fontSize: 13, textAlign: 'center' },
    statusCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg, padding: 20, marginBottom: 20,
    },
    statusLabel: { ...theme.typography.overline, color: theme.colors.textTertiary, marginBottom: 12 },
    statusText: { ...theme.typography.body, color: theme.colors.textPrimary, marginBottom: 12 },
    primaryAction: {
      backgroundColor: theme.colors.primary,
      padding: 16, borderRadius: theme.radius.md, alignItems: 'center', marginTop: 8,
    },
    primaryActionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    grid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    },
    actionCard: {
      flexBasis: '48%',
      backgroundColor: theme.colors.surface,
      padding: 18, borderRadius: theme.radius.md,
      position: 'relative',
    },
    actionIcon: { fontSize: 28, marginBottom: 8 },
    actionLabel: { ...theme.typography.body, color: theme.colors.textPrimary, fontWeight: '500' },
    badge: {
      position: 'absolute', top: 12, right: 12,
      backgroundColor: theme.colors.danger,
      minWidth: 22, height: 22, borderRadius: 11,
      paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center',
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  });
}
