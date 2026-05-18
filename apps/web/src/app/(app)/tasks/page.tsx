import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single();

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id, title, status, priority, due_at, location_name,
      assignee:profiles!tasks_assigned_to_fkey(first_name, last_name)
    `)
    .eq('organization_id', profile!.organization_id)
    .order('priority', { ascending: false })
    .order('due_at', { ascending: true })
    .limit(100);

  const list = tasks ?? [];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Tareas</h1>
          <p className="text-sm text-neutral-500 mt-1">{list.length} tareas activas</p>
        </div>
        <Link href="/tasks/new" className="btn-primary">
          <Plus size={16} className="mr-2" />
          Nueva tarea
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((t: any) => (
          <Link
            key={t.id}
            href={`/tasks/${t.id}`}
            className="card p-5 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-2">
              <PriorityChip priority={t.priority} />
              <StatusChip status={t.status} />
            </div>
            <h3 className="font-medium mb-2">{t.title}</h3>
            <div className="text-xs text-neutral-500 space-y-1 mt-3">
              <p>👤 {t.assignee.first_name} {t.assignee.last_name}</p>
              {t.location_name && <p>📍 {t.location_name}</p>}
              {t.due_at && (
                <p>⏰ {new Date(t.due_at).toLocaleString('es-CL', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PriorityChip({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: 'bg-danger-50 text-danger-800',
    high: 'bg-warning-50 text-warning-800',
    medium: 'bg-neutral-100 text-neutral-700',
    low: 'bg-neutral-100 text-neutral-500',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium uppercase ${map[priority]}`}>
      {priority}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendiente', cls: 'text-neutral-500' },
    in_progress: { label: 'En proceso', cls: 'text-primary-600' },
    completed: { label: 'Completada', cls: 'text-success-800' },
    cancelled: { label: 'Cancelada', cls: 'text-neutral-400' },
  };
  const item = map[status] ?? { label: status, cls: 'text-neutral-500' };
  return <span className={`text-xs ${item.cls}`}>{item.label}</span>;
}
