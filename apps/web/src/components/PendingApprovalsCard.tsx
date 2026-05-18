import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

export async function PendingApprovalsCard({ organizationId }: { organizationId: string }) {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('leave_requests')
    .select('id, type, days_count, start_date, profile:profiles(first_name, last_name)')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  const requests = data ?? [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Aprobaciones pendientes
        </h3>
        <Link href="/leaves" className="text-xs text-primary-500 hover:text-primary-600">
          Ver todo
        </Link>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-neutral-400 py-8 text-center">Sin solicitudes pendientes</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r: any) => (
            <li key={r.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-neutral-900">
                  {r.profile.first_name} {r.profile.last_name}
                </p>
                <p className="text-xs text-neutral-500">
                  {translateLeaveType(r.type)} · {r.days_count} días
                </p>
              </div>
              <Link
                href={`/leaves#${r.id}`}
                className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded"
              >
                Revisar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function translateLeaveType(type: string): string {
  const map: Record<string, string> = {
    vacation: 'Vacaciones',
    sick: 'Licencia médica',
    personal: 'Día personal',
    other: 'Otro',
  };
  return map[type] ?? type;
}
