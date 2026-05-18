import { cn } from '@/lib/utils/cn';

type Tone = 'default' | 'success' | 'warning' | 'danger';

interface Props {
  label: string;
  value: number | string;
  tone?: Tone;
  hint?: string;
}

export function MetricCard({ label, value, tone = 'default', hint }: Props) {
  const toneClasses: Record<Tone, string> = {
    default: 'text-neutral-900',
    success: 'text-success-800',
    warning: 'text-warning-800',
    danger: 'text-danger-800',
  };

  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={cn('text-3xl font-semibold mt-2', toneClasses[tone])}>{value}</p>
      {hint && <p className="text-xs text-neutral-500 mt-2">{hint}</p>}
    </div>
  );
}
