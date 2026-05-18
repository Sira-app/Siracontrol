import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl,
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme';
import {
  formatDateTime, priorityLabel, statusLabel,
  type Task, type TaskStatus, type TaskPriority,
} from '@siracontrol/shared';

export function TasksScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  useEffect(() => {
    void load();
  }, [filter]);

  async function load() {
    if (!profile) return;
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', profile.id)
      .order('priority', { ascending: false })
      .order('due_at', { ascending: true });

    if (filter === 'active') {
      query = query.in('status', ['pending', 'in_progress']);
    }

    const { data } = await query;
    setTasks((data ?? []).map(mapTask));
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, filter === 'active' && styles.tabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={filter === 'active' ? styles.tabActiveText : styles.tabText}>
            Activas
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={filter === 'all' ? styles.tabActiveText : styles.tabText}>
            Todas
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin tareas {filter === 'active' ? 'activas' : ''}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.taskCard}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
          >
            <View style={styles.taskHeader}>
              <PriorityBadge priority={item.priority} theme={theme} />
              <StatusBadge status={item.status} theme={theme} />
            </View>
            <Text style={styles.taskTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
            )}
            <View style={styles.taskFooter}>
              {item.locationName && (
                <Text style={styles.taskMeta}>📍 {item.locationName}</Text>
              )}
              {item.dueAt && (
                <Text style={styles.taskMeta}>⏰ {formatDateTime(item.dueAt)}</Text>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function PriorityBadge({ priority, theme }: { priority: TaskPriority; theme: ReturnType<typeof useTheme> }) {
  const colors = {
    urgent: { bg: theme.colors.dangerBg, fg: theme.colors.dangerText },
    high: { bg: theme.colors.warningBg, fg: theme.colors.warningText },
    medium: { bg: theme.colors.surfaceVariant, fg: theme.colors.textSecondary },
    low: { bg: theme.colors.surfaceVariant, fg: theme.colors.textTertiary },
  }[priority];
  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
      <Text style={{ color: colors.fg, fontSize: 11, fontWeight: '600' }}>
        {priorityLabel(priority).toUpperCase()}
      </Text>
    </View>
  );
}

function StatusBadge({ status, theme }: { status: TaskStatus; theme: ReturnType<typeof useTheme> }) {
  const colors = {
    pending: theme.colors.textTertiary,
    in_progress: theme.colors.primary,
    completed: theme.colors.success,
    cancelled: theme.colors.danger,
  }[status];
  return (
    <Text style={{ color: colors, fontSize: 12, fontWeight: '500' }}>
      {statusLabel(status)}
    </Text>
  );
}

function mapTask(data: any): Task {
  return {
    id: data.id,
    organizationId: data.organization_id,
    assignedTo: data.assigned_to,
    assignedBy: data.assigned_by,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    locationName: data.location_name,
    estimatedMinutes: data.estimated_minutes,
    dueAt: data.due_at,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    evidenceUrls: data.evidence_urls,
  };
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    tabs: { flexDirection: 'row', padding: 16, gap: 8 },
    tab: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
    },
    tabActive: { backgroundColor: theme.colors.primary },
    tabText: { color: theme.colors.textSecondary, fontWeight: '500' },
    tabActiveText: { color: '#fff', fontWeight: '500' },
    list: { padding: 16, gap: 12 },
    empty: { padding: 60, alignItems: 'center' },
    emptyText: { color: theme.colors.textTertiary, fontSize: 16 },
    taskCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 16,
      marginBottom: 12,
    },
    taskHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    taskTitle: { ...theme.typography.body, color: theme.colors.textPrimary, fontWeight: '600', marginBottom: 4 },
    taskDesc: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 12 },
    taskFooter: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    taskMeta: { color: theme.colors.textTertiary, fontSize: 12 },
  });
}
