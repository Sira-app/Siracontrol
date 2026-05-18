'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const supabase = createBrowserClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 rounded-md hover:bg-neutral-100"
    >
      <LogOut size={16} />
      Cerrar sesión
    </button>
  );
}
