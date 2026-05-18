import { createServerClient } from '@/lib/supabase/server';
import { FileText, Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const { count: totalRecords } = await supabase
    .from('attendance_records')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', profile!.organization_id)
    .gte('occurred_at', monthStart.toISOString());

  const { count: incidents } = await supabase
    .from('attendance_records')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', profile!.organization_id)
    .gte('occurred_at', monthStart.toISOString())
    .neq('status', 'valid');

  const reports = [
    {
      title: 'Asistencia mensual',
      description: 'Reporte completo de fichajes del mes',
      icon: FileText,
      url: '/api/reports/attendance?format=xlsx',
    },
    {
      title: 'Atrasos y ausencias',
      description: 'Detalle por empleado de incidencias',
      icon: FileText,
      url: '/api/reports/incidents?format=xlsx',
    },
    {
      title: 'Horas trabajadas',
      description: 'Suma de horas regulares y extras',
      icon: FileText,
      url: '/api/reports/hours?format=xlsx',
    },
    {
      title: 'Permisos aprobados',
      description: 'Resumen de vacaciones del periodo',
      icon: FileText,
      url: '/api/reports/leaves?format=xlsx',
    },
  ];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="text-sm text-neutral-500 mt-1">Exportación de datos para análisis y nómina</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-neutral-500 font-medium">
            Mes en curso
          </p>
          <p className="text-3xl font-semibold mt-2">{totalRecords ?? 0}</p>
          <p className="text-xs text-neutral-500 mt-1">Registros totales</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-neutral-500 font-medium">
            Incidencias
          </p>
          <p className="text-3xl font-semibold mt-2 text-warning-800">{incidents ?? 0}</p>
          <p className="text-xs text-neutral-500 mt-1">Requieren revisión</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-neutral-500 font-medium">
            Tasa de cumplimiento
          </p>
          <p className="text-3xl font-semibold mt-2 text-success-800">
            {totalRecords && incidents !== null
              ? Math.round(((totalRecords - (incidents ?? 0)) / totalRecords) * 100)
              : 0}%
          </p>
          <p className="text-xs text-neutral-500 mt-1">Fichajes válidos</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Reportes disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reports.map((r) => (
            <a
              key={r.title}
              href={r.url}
              className="card p-5 flex items-center gap-4 hover:shadow-md transition"
            >
              <div className="w-12 h-12 rounded-md bg-primary-50 text-primary-600 flex items-center justify-center">
                <r.icon size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{r.title}</h3>
                <p className="text-sm text-neutral-500">{r.description}</p>
              </div>
              <Download size={18} className="text-neutral-400" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
