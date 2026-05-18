/**
 * Utilidades de formato adaptadas a locales latinoamericanos.
 */

export function formatCurrency(
  amount: number,
  currency = 'CLP',
  locale = 'es-CL'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(amount);
}

export function formatNumber(value: number, locale = 'es-CL'): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(
  date: string | Date,
  locale = 'es-CL',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatTime(date: string | Date, locale = 'es-CL'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateTime(date: string | Date, locale = 'es-CL'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function timeAgo(date: string | Date, locale = 'es-CL'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  const intervals = [
    { label: 'año', labelPlural: 'años', seconds: 31_536_000 },
    { label: 'mes', labelPlural: 'meses', seconds: 2_592_000 },
    { label: 'día', labelPlural: 'días', seconds: 86_400 },
    { label: 'hora', labelPlural: 'horas', seconds: 3_600 },
    { label: 'minuto', labelPlural: 'minutos', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      const label = count === 1 ? interval.label : interval.labelPlural;
      return `hace ${count} ${label}`;
    }
  }
  return 'hace un momento';
}

export function getInitials(firstName: string, lastName: string): string {
  return ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase();
}

export function fullName(profile: { firstName: string; lastName: string }): string {
  return `${profile.firstName} ${profile.lastName}`;
}

export function leaveTypeLabel(type: string): string {
  const map: Record<string, string> = {
    vacation: 'Vacaciones',
    sick: 'Licencia médica',
    personal: 'Día personal',
    maternity: 'Maternidad',
    paternity: 'Paternidad',
    bereavement: 'Duelo',
    unpaid: 'Sin goce',
    other: 'Otro',
  };
  return map[type] ?? type;
}

export function checkTypeLabel(type: string): string {
  const map: Record<string, string> = {
    check_in: 'Entrada',
    check_out: 'Salida',
    break_start: 'Inicio colación',
    break_end: 'Fin colación',
  };
  return map[type] ?? type;
}

export function checkMethodLabel(method: string): string {
  const map: Record<string, string> = {
    selfie_gps: 'Selfie + GPS',
    face_recognition: 'Reconocimiento facial',
    fingerprint: 'Huella digital',
    qr_code: 'Código QR',
    manual: 'Manual',
  };
  return map[method] ?? method;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    valid: 'Válido',
    pending_review: 'Pendiente revisión',
    rejected: 'Rechazado',
    outside_zone: 'Fuera de zona',
    spoofed: 'Ubicación falsa',
    pending: 'Pendiente',
    approved: 'Aprobado',
    cancelled: 'Cancelado',
    in_progress: 'En proceso',
    completed: 'Completada',
  };
  return map[status] ?? status;
}

export function priorityLabel(priority: string): string {
  const map: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
  };
  return map[priority] ?? priority;
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrador',
    hr: 'Recursos humanos',
    supervisor: 'Supervisor',
    employee: 'Empleado',
  };
  return map[role] ?? role;
}
