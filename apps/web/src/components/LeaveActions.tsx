'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Check, X } from 'lucide-react';

export function LeaveActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(false);

  async function decide(status: 'approved' | 'rejected') {
    const notes = status === 'rejected' ? prompt('Motivo del rechazo (opcional):') : null;
    setLoading(true);

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    setLoading(false);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => decide('approved')}
        disabled={loading}
        className="btn bg-success-50 text-success-800 hover:bg-success-100 disabled:opacity-50"
      >
        <Check size={16} className="mr-1" /> Aprobar
      </button>
      <button
        onClick={() => decide('rejected')}
        disabled={loading}
        className="btn bg-danger-50 text-danger-800 hover:bg-danger-100 disabled:opacity-50"
      >
        <X size={16} className="mr-1" /> Rechazar
      </button>
    </div>
  );
}
