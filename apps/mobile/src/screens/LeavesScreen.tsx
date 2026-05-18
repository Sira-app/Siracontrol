import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert,
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme';
import {
  formatDate, leaveTypeLabel, statusLabel,
  type LeaveType, type LeaveStatus, type LeaveRequest, type LeaveBalance,
} from '@siracontrol/shared';

export function LeavesScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { profile } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    if (!profile) return;
    const year = new Date().getFullYear();
    const [reqResult, balResult] = await Promise.all([
      supabase
        .from('leave_requests')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('leave_balances')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('year', year)
        .maybeSingle(),
    ]);

    setRequests((reqResult.data ?? []).map(mapLeave));
    if (balResult.data) setBalance(mapBalance(balResult.data));
  }

  if (showForm) {
    return <LeaveRequestForm onClose={() => { setShowForm(false); void load(); }} />;
  }

  const available = balance
    ? balance.vacationDaysTotal - balance.vacationDaysUsed - balance.vacationDaysPending
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Días disponibles</Text>
        <Text style={styles.balanceValue}>{available}</Text>
        <View style={styles.balanceDetail}>
          <Text style={styles.balanceMeta}>
            Total {balance?.vacationDaysTotal ?? 0} · Usados {balance?.vacationDaysUsed ?? 0} ·
            Pendientes {balance?.vacationDaysPending ?? 0}
          </Text>
        </View>
      </View>

      <Pressable style={styles.button} onPress={() => setShowForm(true)}>
        <Text style={styles.buttonText}>Solicitar permiso</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Mis solicitudes</Text>
      {requests.length === 0 ? (
        <Text style={styles.empty}>Sin solicitudes registradas</Text>
      ) : (
        requests.map((r) => (
          <View key={r.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestType}>{leaveTypeLabel(r.type)}</Text>
              <StatusPill status={r.status} theme={theme} />
            </View>
            <Text style={styles.requestDates}>
              {formatDate(r.startDate)} → {formatDate(r.endDate)}
            </Text>
            <Text style={styles.requestDays}>{r.daysCount} días</Text>
            {r.reason && <Text style={styles.requestReason}>{r.reason}</Text>}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function LeaveRequestForm({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { profile } = useAuth();
  const [type, setType] = useState<LeaveType>('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!profile || !startDate || !endDate) {
      Alert.alert('Faltan datos', 'Completa las fechas');
      return;
    }
    setSubmitting(true);
    const days = calculateBusinessDays(startDate, endDate);
    const { error } = await supabase.from('leave_requests').insert({
      profile_id: profile.id,
      organization_id: profile.organizationId,
      type,
      start_date: startDate,
      end_date: endDate,
      days_count: days,
      reason: reason || null,
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    Alert.alert('Solicitud enviada', 'Recibirás notificación al ser revisada.', [
      { text: 'OK', onPress: onClose },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Nueva solicitud</Text>

      <Text style={styles.label}>Tipo</Text>
      <View style={styles.typeGrid}>
        {(['vacation', 'sick', 'personal', 'other'] as LeaveType[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.typeChip, type === t && styles.typeChipActive]}
            onPress={() => setType(t)}
          >
            <Text style={type === t ? styles.typeChipActiveText : styles.typeChipText}>
              {leaveTypeLabel(t)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Fecha inicio (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={startDate}
        onChangeText={setStartDate}
        placeholder="2026-06-15"
        placeholderTextColor={theme.colors.textTertiary}
      />

      <Text style={styles.label}>Fecha fin (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={endDate}
        onChangeText={setEndDate}
        placeholder="2026-06-22"
        placeholderTextColor={theme.colors.textTertiary}
      />

      <Text style={styles.label}>Motivo (opcional)</Text>
      <TextInput
        style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
        value={reason}
        onChangeText={setReason}
        multiline
        placeholder="Describe brevemente..."
        placeholderTextColor={theme.colors.textTertiary}
      />

      <Pressable style={styles.button} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>
          {submitting ? 'Enviando...' : 'Enviar solicitud'}
        </Text>
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatusPill({ status, theme }: { status: LeaveStatus; theme: ReturnType<typeof useTheme> }) {
  const colors = {
    pending: { bg: theme.colors.warningBg, fg: theme.colors.warningText },
    approved: { bg: theme.colors.successBg, fg: theme.colors.successText },
    rejected: { bg: theme.colors.dangerBg, fg: theme.colors.dangerText },
    cancelled: { bg: theme.colors.surfaceVariant, fg: theme.colors.textTertiary },
  }[status];
  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
      <Text style={{ color: colors.fg, fontSize: 12, fontWeight: '500' }}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

function calculateBusinessDays(start: string, end: string): number {
  const startD = new Date(start);
  const endD = new Date(end);
  let count = 0;
  const cur = new Date(startD);
  while (cur <= endD) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function mapLeave(d: any): LeaveRequest {
  return {
    id: d.id,
    profileId: d.profile_id,
    type: d.type,
    status: d.status,
    startDate: d.start_date,
    endDate: d.end_date,
    daysCount: d.days_count,
    reason: d.reason,
    attachmentUrl: d.attachment_url,
    reviewNotes: d.review_notes,
    createdAt: d.created_at,
  };
}

function mapBalance(d: any): LeaveBalance {
  return {
    id: d.id,
    profileId: d.profile_id,
    year: d.year,
    vacationDaysTotal: d.vacation_days_total,
    vacationDaysUsed: d.vacation_days_used,
    vacationDaysPending: d.vacation_days_pending ?? 0,
    sickDaysUsed: d.sick_days_used,
    personalDaysUsed: d.personal_days_used,
  };
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20 },
    balanceCard: {
      backgroundColor: theme.colors.surface,
      padding: 24, borderRadius: theme.radius.lg, marginBottom: 20,
      alignItems: 'center',
    },
    balanceLabel: { ...theme.typography.overline, color: theme.colors.textTertiary },
    balanceValue: {
      fontSize: 48, fontWeight: '600', color: theme.colors.primary, marginVertical: 8,
    },
    balanceDetail: { marginTop: 8 },
    balanceMeta: { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center' },
    button: {
      backgroundColor: theme.colors.primary,
      padding: 16, borderRadius: theme.radius.md, alignItems: 'center', marginVertical: 8,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    cancelButton: { padding: 16, alignItems: 'center', marginTop: 4 },
    cancelText: { color: theme.colors.textSecondary, fontSize: 15 },
    sectionTitle: { ...theme.typography.subtitle, color: theme.colors.textPrimary, marginVertical: 16 },
    empty: { color: theme.colors.textTertiary, textAlign: 'center', padding: 40 },
    requestCard: {
      backgroundColor: theme.colors.surface,
      padding: 16, borderRadius: theme.radius.md, marginBottom: 12,
    },
    requestHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    requestType: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
    requestDates: { color: theme.colors.textSecondary, fontSize: 14 },
    requestDays: { color: theme.colors.textTertiary, fontSize: 13, marginTop: 4 },
    requestReason: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 8, fontStyle: 'italic' },
    label: { ...theme.typography.overline, color: theme.colors.textTertiary, marginTop: 12, marginBottom: 6 },
    input: {
      backgroundColor: theme.colors.surface,
      padding: 14, borderRadius: theme.radius.md,
      color: theme.colors.textPrimary, fontSize: 15,
    },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
    },
    typeChipActive: { backgroundColor: theme.colors.primary },
    typeChipText: { color: theme.colors.textSecondary },
    typeChipActiveText: { color: '#fff' },
  });
}
