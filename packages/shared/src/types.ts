/**
 * Tipos del dominio de negocio compartidos entre web y móvil.
 */

export type UserRole = 'admin' | 'hr' | 'supervisor' | 'employee';
export type LocationType = 'office' | 'site' | 'route' | 'client';
export type CheckMethod = 'selfie_gps' | 'face_recognition' | 'fingerprint' | 'qr_code' | 'manual';
export type CheckType = 'check_in' | 'check_out' | 'break_start' | 'break_end';
export type CheckStatus = 'valid' | 'pending_review' | 'rejected' | 'outside_zone' | 'spoofed';
export type LeaveType = 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationType = 'attendance' | 'leave' | 'task' | 'payroll' | 'announcement' | 'alert';
export type DocumentType = 'contract' | 'id_card' | 'cv' | 'certification' | 'medical' | 'other';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  logoUrl?: string;
  primaryColor: string;
  timezone: string;
  country: string;
  currency: string;
  locale: string;
  settings: OrganizationSettings;
}

export interface OrganizationSettings {
  allowCheckInMethods: CheckMethod[];
  defaultCheckMethod: CheckMethod;
  requireFaceMatch: boolean;
  minFaceMatchScore: number;
  maxGpsAccuracyMeters: number;
  pingIntervalSeconds: number;
  autoClockOutHours: number;
  weeklyHours: number;
  overtimeMultiplier: number;
}

export interface Profile {
  id: string;
  organizationId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  nationalId?: string;
  birthDate?: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  hiredAt?: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  parentId?: string;
  managerId?: string;
}

export interface Position {
  id: string;
  organizationId: string;
  departmentId?: string;
  title: string;
  description?: string;
  baseSalary?: number;
}

export interface WorkLocation {
  id: string;
  organizationId: string;
  name: string;
  type: LocationType;
  address?: string;
  center: GeoPoint;
  radiusMeters: number;
  isActive: boolean;
}

export interface Shift {
  id: string;
  organizationId: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  weekdays: number[];
  lateToleranceMinutes: number;
  earlyCheckInMinutes: number;
  isOvernight: boolean;
}

export interface AttendanceRecord {
  id: string;
  profileId: string;
  type: CheckType;
  method: CheckMethod;
  status: CheckStatus;
  location?: GeoPoint;
  accuracyMeters?: number;
  isMockLocation: boolean;
  workLocationId?: string;
  distanceToLocationMeters?: number;
  isInsideGeofence?: boolean;
  selfieUrl?: string;
  faceMatchScore?: number;
  occurredAt: string;
  syncedAt: string;
  clientId?: string;
  notes?: string;
}

export interface LeaveBalance {
  id: string;
  profileId: string;
  year: number;
  vacationDaysTotal: number;
  vacationDaysUsed: number;
  vacationDaysPending: number;
  sickDaysUsed: number;
  personalDaysUsed: number;
}

export interface LeaveRequest {
  id: string;
  profileId: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
  attachmentUrl?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  organizationId: string;
  assignedTo: string;
  assignedBy: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  location?: GeoPoint;
  locationName?: string;
  estimatedMinutes?: number;
  dueAt?: string;
  startedAt?: string;
  completedAt?: string;
  evidenceUrls?: string[];
}

export interface PayrollRecord {
  id: string;
  periodId: string;
  profileId: string;
  baseSalary: number;
  hoursRegular: number;
  hoursOvertime: number;
  overtimeAmount: number;
  bonuses: number;
  deductions: number;
  lateMinutes: number;
  absentDays: number;
  totalGross?: number;
  totalNet?: number;
  payslipUrl?: string;
}

export interface Notification {
  id: string;
  profileId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export interface AttendanceCheckPayload {
  type: CheckType;
  method: CheckMethod;
  location: GeoPoint;
  accuracyMeters: number;
  isMockLocation: boolean;
  selfieBase64?: string;
  faceEmbedding?: number[];
  deviceId: string;
  deviceModel?: string;
  occurredAt: string;
  clientId: string;
}
