import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface SearchParams {
  date?: string;
  status?: string;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single();

  const date = searchParams.date ?? new Date().toISOString().slice(0, 10);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  let query = supabase
    .from('attendance_records')
    .select(`
      id, type, method, status, occurred_at,
      distance_to_location_meters, is_inside_geofence,
      profile:profiles(first_name, last_name, employee_code),
      work_location:work_locations(name)
    `)
    .eq('organization_id', profile!.organization_id)
    .gte('occurred_at', dayStart.toISOString())
    .lte('occurred_at', dayEnd.toISOString())
    .order('occurred_at', { ascending: false });

  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  const { data: records } = await query;
  const list = records ?? [];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Asistencia</h1>
        <p className="text-sm text-neutral-500 mt-1">{list.length} registros</p>
      </header>

      <div className="card p-4 mb-4 flex gap-4 items-end">
        <form method="GET" className="flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Fecha
            </label>
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Estado
            </label>
            <select name="status" defaultValue={searchParams.status ?? ''} className="input">
              <option value="">Todos</option>
              <option value="valid">Válidos</option>
              <option value="pending_review">Pendientes</option>
              <option value="outside_zone">Fuera de zona</option>
              <option value="spoofed">GPS falso</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Filtrar</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">Hora</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">Empleado</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">Tipo</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">Método</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">Ubicación</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {list.map((r: any) => (
              <tr key={r.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3 text-sm font-mono">
                  {new Date(r.occurred_at).toLocaleTimeString('es-CL', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </td>
                <td className="px-5 py-3 text-sm">
                  {r.profile.first_name} {r.profile.last_name}
                  <span className="text-xs text-neutral-400 ml-2">{r.profile.employee_code}</span>
                </td>
                <td className="px-5 py-3 text-sm">{translateType(r.type)}</td>
                <td className="px-5 py-3 text-sm">{translateMethod(r.method)}</td>
                <td className="px-5 py-3 text-sm">
                  {r.work_location?.name ?? '—'}
                  {r.distance_to_location_meters !== null && (
                    <span className="text-xs text-neutral-400 ml-2">
                      ({Math.round(r.distance_to_location_meters)}m)
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    valid: { label: 'OK', cls: 'bg-success-50 text-success-800' },
    pending_review: { label: 'Pendiente', cls: 'bg-warning-50 text-warning-800' },
    outside_zone: { label: 'Fuera zona', cls: 'bg-warning-50 text-warning-800' },
    spoofed: { label: 'GPS falso', cls: 'bg-danger-50 text-danger-800' },
    rejected: { label: 'Rechazado', cls: 'bg-danger-50 text-danger-800' },
  };
  const item = map[status] ?? { label: status, cls: 'bg-neutral-100 text-neutral-700' };
  return (
    <span className={`inline-block text-xs px-2 py-1 rounded ${item.cls}`}>
      {item.label}
    </span>
  );
}

function translateType(t: string): string {
  return { check_in: 'Entrada', check_out: 'Salida', break_start: 'Inicio col.', break_end: 'Fin col.' }[t] ?? t;
}
function translateMethod(m: string): string {
  return {
    selfie_gps: 'Selfie + GPS',
    face_recognition: 'Reconocimiento',
    fingerprint: 'Huella',
    qr_code: 'QR',
    manual: 'Manual',
  }[m] ?? m;
}
