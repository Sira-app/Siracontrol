import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, organization:organizations(*)')
    .eq('id', user!.id)
    .single();

  const org = profile!.organization as any;

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-neutral-500 mt-1">Configuración de la organización</p>
      </header>

      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="text-lg font-medium mb-4">Información general</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" value={org.name} />
            <Field label="RUT" value={org.tax_id ?? '—'} />
            <Field label="Razón social" value={org.legal_name ?? '—'} />
            <Field label="País" value={org.country} />
            <Field label="Zona horaria" value={org.timezone} />
            <Field label="Moneda" value={org.currency} />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-medium mb-4">Configuración de fichaje</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Métodos permitidos"
              value={(org.settings.allow_check_in_methods ?? []).map(translateMethod).join(', ')}
            />
            <Field
              label="Método por defecto"
              value={translateMethod(org.settings.default_check_method)}
            />
            <Field
              label="Precisión GPS máxima"
              value={`${org.settings.max_gps_accuracy_meters ?? 100} m`}
            />
            <Field
              label="Intervalo de tracking"
              value={`${org.settings.ping_interval_seconds ?? 60} s`}
            />
            <Field
              label="Horas semanales"
              value={`${org.settings.weekly_hours ?? 45} h`}
            />
            <Field
              label="Multiplicador horas extra"
              value={`x${org.settings.overtime_multiplier ?? 1.5}`}
            />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-medium mb-4">Tu cuenta</h2>
          <Field label="Email" value={user!.email ?? ''} />
          <Field label="Rol" value={translateRole(profile!.role)} />
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-1">
        {label}
      </p>
      <p className="text-sm text-neutral-900">{value}</p>
    </div>
  );
}

function translateMethod(m: string): string {
  return {
    selfie_gps: 'Selfie + GPS',
    face_recognition: 'Reconocimiento facial',
    fingerprint: 'Huella digital',
    qr_code: 'Código QR',
    manual: 'Manual',
  }[m] ?? m;
}

function translateRole(r: string): string {
  return { admin: 'Administrador', hr: 'Recursos humanos', supervisor: 'Supervisor', employee: 'Empleado' }[r] ?? r;
}
