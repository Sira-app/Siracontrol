import { createServerClient } from '@/lib/supabase/server';

export async function TodayAttendanceCard({ organizationId }: { organizationId: string }) {
  const supabase = createServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('attendance_records')
    .select(`
      id, type, occurred_at, status,
      profile:profiles(first_name, last_name, avatar_url)
    `)
    .eq('organization_id', organizationId)
    .gte('occurred_at', today.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(8);

  const records = data ?? [];

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-4">
        Movimientos recientes
      </h3>

      {records.length === 0 ? (
        <p className="text-sm text-neutral-400 py-8 text-center">Sin registros hoy</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {records.map((r: any) => (
            <li key={r.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium text-neutral-600">
                  {r.profile.first_name[0]}{r.profile.last_name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {r.profile.first_name} {r.profile.last_name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {r.type === 'check_in' ? 'Entrada' : r.type === 'check_out' ? 'Salida' : r.type}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-900">
                  {new Date(r.occurred_at).toLocaleTimeString('es-CL', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <StatusBadge status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    valid: { label: 'OK', cls: 'text-success-800' },
    pending_review: { label: 'Revisar', cls: 'text-warning-800' },
    outside_zone: { label: 'Fuera zona', cls: 'text-warning-800' },
    spoofed: { label: 'GPS falso', cls: 'text-danger-800' },
    rejected: { label: 'Rechazado', cls: 'text-danger-800' },
  };
  const item = map[status] ?? { label: status, cls: 'text-neutral-500' };
  return <p className={`text-xs ${item.cls}`}>{item.label}</p>;
}
