import type { AttendanceRecord, Shift } from './types';

export interface DayWorkSummary {
  date: string;
  checkInAt?: string;
  checkOutAt?: string;
  totalMinutes: number;
  breakMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  isComplete: boolean;
  hasIncidents: boolean;
}

interface DaySummaryOptions {
  shiftStart: string;
  shiftEnd: string;
  lateToleranceMinutes: number;
  defaultBreakMinutes: number;
}

export function summarizeDayAttendance(
  records: AttendanceRecord[],
  options: DaySummaryOptions
): DayWorkSummary {
  const sorted = [...records].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );

  const checkIn = sorted.find((r) => r.type === 'check_in');
  const checkOut = [...sorted].reverse().find((r) => r.type === 'check_out');

  if (!checkIn) {
    return {
      date: '',
      totalMinutes: 0,
      breakMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      lateMinutes: 0,
      isComplete: false,
      hasIncidents: records.length > 0,
    };
  }

  const dateStr = checkIn.occurredAt.slice(0, 10);
  const checkInTime = new Date(checkIn.occurredAt);
  const checkOutTime = checkOut ? new Date(checkOut.occurredAt) : null;

  const breakMinutes = calculateBreakMinutes(records);
  const effectiveBreak = breakMinutes || options.defaultBreakMinutes;

  const totalMinutes = checkOutTime
    ? Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000)
    : 0;

  const workedMinutes = Math.max(0, totalMinutes - effectiveBreak);

  const scheduledStart = parseTimeIntoDate(options.shiftStart, checkInTime);
  const lateRawMinutes = Math.round(
    (checkInTime.getTime() - scheduledStart.getTime()) / 60000
  );
  const lateMinutes = Math.max(0, lateRawMinutes - options.lateToleranceMinutes);

  const scheduledEnd = parseTimeIntoDate(options.shiftEnd, checkInTime);
  const scheduledMinutes =
    Math.round((scheduledEnd.getTime() - scheduledStart.getTime()) / 60000) -
    options.defaultBreakMinutes;
  const overtimeMinutes = checkOutTime
    ? Math.max(0, workedMinutes - scheduledMinutes)
    : 0;

  return {
    date: dateStr,
    checkInAt: checkIn.occurredAt,
    checkOutAt: checkOut?.occurredAt,
    totalMinutes,
    breakMinutes: effectiveBreak,
    workedMinutes,
    overtimeMinutes,
    lateMinutes,
    isComplete: !!checkOut,
    hasIncidents: records.some((r) => r.status !== 'valid'),
  };
}

function calculateBreakMinutes(records: AttendanceRecord[]): number {
  const breaks = records.filter(
    (r) => r.type === 'break_start' || r.type === 'break_end'
  );
  let total = 0;
  let breakStart: Date | null = null;
  for (const record of breaks) {
    if (record.type === 'break_start') {
      breakStart = new Date(record.occurredAt);
    } else if (record.type === 'break_end' && breakStart) {
      total += Math.round(
        (new Date(record.occurredAt).getTime() - breakStart.getTime()) / 60000
      );
      breakStart = null;
    }
  }
  return total;
}

function parseTimeIntoDate(timeStr: string, referenceDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(referenceDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Cálculo de nómina mensual a partir de los resúmenes diarios.
 */
export interface PayrollCalculation {
  hoursRegular: number;
  hoursOvertime: number;
  overtimeAmount: number;
  lateMinutes: number;
  lateDeduction: number;
  absentDays: number;
  absentDeduction: number;
  totalGross: number;
}

export function calculatePayroll(input: {
  baseSalary: number;
  workedDays: DayWorkSummary[];
  expectedWorkDays: number;
  overtimeMultiplier: number;
}): PayrollCalculation {
  const { baseSalary, workedDays, expectedWorkDays, overtimeMultiplier } = input;

  const totalRegularMinutes = workedDays.reduce(
    (sum, d) => sum + Math.min(d.workedMinutes, d.workedMinutes - d.overtimeMinutes),
    0
  );
  const totalOvertimeMinutes = workedDays.reduce(
    (sum, d) => sum + d.overtimeMinutes,
    0
  );
  const totalLateMinutes = workedDays.reduce((sum, d) => sum + d.lateMinutes, 0);

  const hoursRegular = totalRegularMinutes / 60;
  const hoursOvertime = totalOvertimeMinutes / 60;

  // Tarifa por hora (asumiendo 180 horas mensuales para jornada completa en Chile)
  const hourlyRate = baseSalary / 180;
  const overtimeAmount = hoursOvertime * hourlyRate * overtimeMultiplier;

  // Descuento por atrasos
  const lateDeduction = (totalLateMinutes / 60) * hourlyRate;

  // Días ausentes
  const absentDays = Math.max(0, expectedWorkDays - workedDays.length);
  const dailyRate = baseSalary / 30;
  const absentDeduction = absentDays * dailyRate;

  const totalGross =
    baseSalary + overtimeAmount - lateDeduction - absentDeduction;

  return {
    hoursRegular: Math.round(hoursRegular * 100) / 100,
    hoursOvertime: Math.round(hoursOvertime * 100) / 100,
    overtimeAmount: Math.round(overtimeAmount),
    lateMinutes: totalLateMinutes,
    lateDeduction: Math.round(lateDeduction),
    absentDays,
    absentDeduction: Math.round(absentDeduction),
    totalGross: Math.round(totalGross),
  };
}
