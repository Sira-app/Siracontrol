import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Plus, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single();

  const { data: locations } = await supabase
    .from('work_locations')
    .select('id, name, type, address, radius_meters, is_active, center')
    .eq('organization_id', profile!.organization_id)
    .order('name');

  const list = locations ?? [];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Ubicaciones de trabajo</h1>
          <p className="text-sm text-neutral-500 mt-1">{list.length} ubicaciones</p>
        </div>
        {['admin', 'hr'].includes(profile!.role) && (
          <Link href="/locations/new" className="btn-primary">
            <Plus size={16} className="mr-2" />
            Nueva ubicación
          </Link>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((l: any) => (
          <div key={l.id} className="card p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-primary-50 text-primary-600 flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{l.name}</h3>
                <p className="text-xs text-neutral-500 capitalize">{translateType(l.type)}</p>
              </div>
            </div>

            {l.address && (
              <p className="text-sm text-neutral-600 mb-3">{l.address}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span>Radio: {l.radius_meters}m</span>
              <span>{l.is_active ? '🟢 Activa' : '⚫ Inactiva'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function translateType(t: string): string {
  return { office: 'Oficina', site: 'Bodega/Sitio', route: 'Ruta', client: 'Cliente' }[t] ?? t;
}
