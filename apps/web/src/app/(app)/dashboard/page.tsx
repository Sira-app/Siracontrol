import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { MetricCard } from '@/components/MetricCard';
import { LiveLocationsCard } from '@/components/LiveLocationsCard';
import { PendingApprovalsCard } from '@/components/PendingApprovalsCard';
import { TodayAttendanceCard } from '@/components/TodayAttendanceCard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single();

  const orgId = profile!.organization_id;
  const stats = await loadStats(supabase, orgId);

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Panel general</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {new Date().toLocaleDateString('es-CL', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total empleados" value={stats.totalActive} tone="default" />
        <MetricCard label="Presentes hoy" value={stats.present} tone="success" />
        <MetricCard label="Atrasados" value={stats.late} tone="warning" />
        <MetricCard label="Ausentes" value={stats.absent} tone="danger" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<CardSkeleton />}>
            <TodayAttendanceCard organizationId={orgId} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<CardSkeleton />}>
            <PendingApprovalsCard organizationId={orgId} />
          </Suspense>
        </div>
      </section>

      <section>
        <Suspense fallback={<CardSkeleton />}>
          <LiveLocationsCard organizationId={orgId} />
        </Suspense>
      </section>
    </div>
  );
}

async function loadStats(supabase: any, orgId: string) {
  const { data } = await supabase.rpc('get_today_attendance_summary', { org_id: orgId });
  return data?.[0] ?? { total_active: 0, present: 0, late: 0, absent: 0, on_leave: 0 };
}

function CardSkeleton() {
  return <div className="card p-6 h-48 animate-pulse" />;
}
