import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/SignOutButton';
import {
  Home, Users, Clock, Calendar, ListTodo, MapPin,
  BarChart3, Settings, Bell,
} from 'lucide-react';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'hr', 'supervisor'].includes(profile.role)) {
    redirect('/');
  }

  const navItems = [
    { href: '/dashboard', label: 'Inicio', icon: Home },
    { href: '/employees', label: 'Empleados', icon: Users },
    { href: '/attendance', label: 'Asistencia', icon: Clock },
    { href: '/leaves', label: 'Vacaciones', icon: Calendar },
    { href: '/tasks', label: 'Tareas', icon: ListTodo },
    { href: '/locations', label: 'Ubicaciones', icon: MapPin },
    { href: '/reports', label: 'Reportes', icon: BarChart3 },
    { href: '/settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="w-60 bg-white border-r border-neutral-200 flex flex-col">
        <div className="p-6 border-b border-neutral-200">
          <h1 className="text-xl font-bold text-primary-500">SiraControl</h1>
          <p className="text-xs text-neutral-500 mt-1">{profile.organization.name}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 rounded-md hover:bg-neutral-100"
            >
              <item.icon size={18} className="text-neutral-400" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-neutral-200">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-medium">
              {profile.first_name[0]}{profile.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs text-neutral-500 capitalize">{profile.role}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
