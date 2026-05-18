import { z } from 'zod';

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const checkMethodSchema = z.enum([
  'selfie_gps',
  'face_recognition',
  'fingerprint',
  'qr_code',
  'manual',
]);

export const checkTypeSchema = z.enum([
  'check_in',
  'check_out',
  'break_start',
  'break_end',
]);

export const attendanceCheckSchema = z.object({
  type: checkTypeSchema,
  method: checkMethodSchema,
  location: geoPointSchema,
  accuracyMeters: z.number().min(0),
  isMockLocation: z.boolean(),
  selfieBase64: z.string().optional(),
  faceEmbedding: z.array(z.number()).length(128).optional(),
  deviceId: z.string().min(1),
  deviceModel: z.string().optional(),
  occurredAt: z.string().datetime(),
  clientId: z.string().uuid(),
});

export const leaveRequestSchema = z
  .object({
    type: z.enum([
      'vacation', 'sick', 'personal', 'maternity',
      'paternity', 'bereavement', 'unpaid', 'other',
    ]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().max(500).optional(),
    attachmentUrl: z.string().url().optional(),
  })
  .refine((d) => new Date(d.startDate) <= new Date(d.endDate), {
    message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin',
    path: ['endDate'],
  });

export const taskCreateSchema = z.object({
  assignedTo: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  location: geoPointSchema.optional(),
  locationName: z.string().max(200).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  dueAt: z.string().datetime().optional(),
});

export const employeeCreateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  employeeCode: z.string().min(1).max(50),
  phone: z.string().optional(),
  nationalId: z.string().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  role: z.enum(['admin', 'hr', 'supervisor', 'employee']).default('employee'),
  positionId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional(),
  shiftId: z.string().uuid().optional(),
  workLocationIds: z.array(z.string().uuid()).optional(),
  hiredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const workLocationSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['office', 'site', 'route', 'client']),
  address: z.string().optional(),
  center: geoPointSchema,
  radiusMeters: z.number().int().min(20).max(5000).default(100),
});

export const shiftSchema = z.object({
  name: z.string().min(1).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakMinutes: z.number().int().min(0).max(240).default(60),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1),
  lateToleranceMinutes: z.number().int().min(0).max(60).default(10),
  earlyCheckInMinutes: z.number().int().min(0).max(120).default(30),
  isOvernight: z.boolean().default(false),
});

export type AttendanceCheckInput = z.infer<typeof attendanceCheckSchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type WorkLocationInput = z.infer<typeof workLocationSchema>;
export type ShiftInput = z.infer<typeof shiftSchema>;
