import { createServerClient } from '@/lib/supabase/server';
import { LeaveActions } from '@/components/LeaveActions';

export const dynamic = 'force-dynamic';

export default async function LeavesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single();

  const status = searchParams.status ?? 'pending';

  const { data: requests } = await supabase
    .from('leave_requests')
    .select(`
      id, type, status, start_date, end_date, days_count, reason,
      created_at, review_notes, reviewed_at,
      profile:profiles(id, first_name, last_name, employee_code)
    `)
    .eq('organization_id', profile!.organization_id)
    .eq('status', status)
    .order('created_at', { ascending: false });

  const list = requests ?? [];
  const canApprove = ['admin', 'hr'].includes(profile!.role);

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Solicitudes de permisos</h1>
        <p className="text-sm text-neutral-500 mt-1">{list.length} solicitudes</p>
      </header>

      <div className="flex gap-2 mb-4">
        {[
          { key: 'pending', label: 'Pendientes' },
          { key: 'approved', label: 'Aprobadas' },
          { key: 'rejected', label: 'Rechazadas' },
        ].map((tab) => (
          <a
            key={tab.key}
            href={`?status=${tab.key}`}
            className={`px-4 py-2 text-sm rounded-md ${
              status === tab.key
                ? 'bg-primary-500 text-white'
                : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-neutral-400">Sin solicitudes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r: any) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">
                      {r.profile.first_name} {r.profile.last_name}
                    </h3>
                    <span className="text-xs text-neutral-500">{r.profile.employee_code}</span>
                  </div>
                  <p className="text-sm text-neutral-700">
                    <span className="font-medium">{translateLeaveType(r.type)}</span> ·
                    {' '}{r.days_count} días
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">
                    {new Date(r.start_date).toLocaleDateString('es-CL')} →
                    {' '}{new Date(r.end_date).toLocaleDateString('es-CL')}
                  </p>
                  {r.reason && (
                    <p className="text-sm text-neutral-600 mt-2 italic">"{r.reason}"</p>
                  )}
                  {r.review_notes && (
                    <p className="text-sm text-neutral-500 mt-2 border-l-2 border-neutral-200 pl-3">
                      Nota: {r.review_notes}
                    </p>
                  )}
                </div>

                {canApprove && status === 'pending' && (
                  <LeaveActions requestId={r.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function translateLeaveType(t: string): string {
  return {
    vacation: 'Vacaciones', sick: 'Licencia médica', personal: 'Día personal',
    maternity: 'Maternidad', paternity: 'Paternidad', bereavement: 'Duelo',
    unpaid: 'Sin goce', other: 'Otro',
  }[t] ?? t;
}
