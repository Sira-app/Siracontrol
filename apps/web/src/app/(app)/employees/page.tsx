import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single();

  const { data: employees } = await supabase
    .from('v_employees_full')
    .select('*')
    .eq('organization_id', profile!.organization_id)
    .order('first_name');

  const list = employees ?? [];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Empleados</h1>
          <p className="text-sm text-neutral-500 mt-1">{list.length} en total</p>
        </div>
        {profile!.role === 'admin' || profile!.role === 'hr' ? (
          <Link href="/employees/new" className="btn-primary">
            <Plus size={16} className="mr-2" />
            Nuevo empleado
          </Link>
        ) : null}
      </header>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">
                Empleado
              </th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">
                Cargo
              </th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">
                Departamento
              </th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">
                Turno
              </th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500 px-5 py-3">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {list.map((emp: any) => (
              <tr key={emp.id} className="hover:bg-neutral-50">
                <td className="px-5 py-4">
                  <Link href={`/employees/${emp.id}`} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-medium">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{emp.full_name}</p>
                      <p className="text-xs text-neutral-500">{emp.employee_code}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-5 py-4 text-sm">{emp.position_title ?? '—'}</td>
                <td className="px-5 py-4 text-sm">{emp.department_name ?? '—'}</td>
                <td className="px-5 py-4 text-sm">{emp.shift_name ?? '—'}</td>
                <td className="px-5 py-4">
                  {emp.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                      Activo
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400">Inactivo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
