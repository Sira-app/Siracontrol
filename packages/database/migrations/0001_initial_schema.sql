-- =============================================================================
-- SIRACONTROL APP — Esquema de base de datos COMPLETO
-- PostgreSQL 15 + PostGIS
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "postgis";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- =============================================================================
-- TIPOS ENUMERADOS
-- =============================================================================

create type user_role as enum ('admin', 'hr', 'supervisor', 'employee');
create type location_type as enum ('office', 'site', 'route', 'client');
create type check_method as enum ('selfie_gps', 'face_recognition', 'fingerprint', 'qr_code', 'manual');
create type check_type as enum ('check_in', 'check_out', 'break_start', 'break_end');
create type check_status as enum ('valid', 'pending_review', 'rejected', 'outside_zone', 'spoofed');
create type leave_type as enum ('vacation', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other');
create type leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type task_status as enum ('pending', 'in_progress', 'completed', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type notification_type as enum ('attendance', 'leave', 'task', 'payroll', 'announcement', 'alert');
create type document_type as enum ('contract', 'id_card', 'cv', 'certification', 'medical', 'other');

-- =============================================================================
-- ORGANIZACIONES
-- =============================================================================

create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  legal_name text,
  tax_id text unique,
  logo_url text,
  primary_color text default '#F59E0B',
  timezone text default 'America/Santiago',
  country text default 'CL',
  currency text default 'CLP',
  locale text default 'es-CL',
  -- Configuración global
  settings jsonb default '{
    "allow_check_in_methods": ["selfie_gps", "face_recognition", "fingerprint"],
    "default_check_method": "selfie_gps",
    "require_face_match": false,
    "min_face_match_score": 0.85,
    "max_gps_accuracy_meters": 100,
    "ping_interval_seconds": 60,
    "auto_clock_out_hours": 12,
    "weekly_hours": 45,
    "overtime_multiplier": 1.5
  }'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================================================
-- USUARIOS Y PERFILES
-- =============================================================================

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  organization_id uuid references organizations on delete cascade not null,
  employee_code text not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  national_id text,
  birth_date date,
  gender text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  role user_role not null default 'employee',
  avatar_url text,
  face_embedding vector(128),
  is_active boolean default true,
  hired_at date,
  terminated_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, employee_code)
);

create index idx_profiles_org on profiles(organization_id);
create index idx_profiles_role on profiles(role);
create index idx_profiles_active on profiles(organization_id, is_active);

-- =============================================================================
-- ESTRUCTURA ORGANIZACIONAL
-- =============================================================================

create table departments (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations on delete cascade not null,
  name text not null,
  description text,
  parent_id uuid references departments,
  manager_id uuid references profiles,
  created_at timestamptz default now()
);

create table positions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations on delete cascade not null,
  department_id uuid references departments,
  title text not null,
  description text,
  base_salary numeric(12,2),
  created_at timestamptz default now()
);

create table employee_assignments (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  position_id uuid references positions not null,
  department_id uuid references departments not null,
  supervisor_id uuid references profiles,
  start_date date not null,
  end_date date,
  is_current boolean default true,
  created_at timestamptz default now()
);

create index idx_assignments_profile on employee_assignments(profile_id, is_current);
create index idx_assignments_supervisor on employee_assignments(supervisor_id, is_current);

-- =============================================================================
-- UBICACIONES Y GEOCERCAS
-- =============================================================================

create table work_locations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations on delete cascade not null,
  name text not null,
  type location_type not null default 'office',
  address text,
  center geography(point, 4326) not null,
  radius_meters integer default 100,
  geofence geography(polygon, 4326),
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_work_locations_center on work_locations using gist(center);
create index idx_work_locations_geofence on work_locations using gist(geofence);

create table employee_locations (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  work_location_id uuid references work_locations on delete cascade not null,
  is_primary boolean default false,
  created_at timestamptz default now(),
  unique(profile_id, work_location_id)
);

-- =============================================================================
-- TURNOS Y HORARIOS
-- =============================================================================

create table shifts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations on delete cascade not null,
  name text not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer default 60,
  weekdays integer[] not null,
  late_tolerance_minutes integer default 10,
  early_check_in_minutes integer default 30,
  is_overnight boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table employee_shifts (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  shift_id uuid references shifts on delete cascade not null,
  start_date date not null,
  end_date date,
  is_current boolean default true,
  created_at timestamptz default now()
);

create index idx_emp_shifts on employee_shifts(profile_id, is_current);

-- =============================================================================
-- FICHAJES
-- =============================================================================

create table attendance_records (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  organization_id uuid references organizations on delete cascade not null,
  type check_type not null,
  method check_method not null,
  status check_status not null default 'valid',
  location geography(point, 4326),
  accuracy_meters numeric(8,2),
  altitude_meters numeric(8,2),
  speed_mps numeric(6,2),
  is_mock_location boolean default false,
  device_id text,
  device_model text,
  ip_address inet,
  work_location_id uuid references work_locations,
  distance_to_location_meters numeric(10,2),
  is_inside_geofence boolean,
  selfie_url text,
  face_match_score numeric(5,4),
  occurred_at timestamptz not null default now(),
  synced_at timestamptz default now(),
  client_id text unique,
  notes text,
  reviewed_by uuid references profiles,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index idx_attendance_profile_date on attendance_records(profile_id, occurred_at desc);
create index idx_attendance_org_date on attendance_records(organization_id, occurred_at desc);
create index idx_attendance_status on attendance_records(status) where status != 'valid';
create index idx_attendance_location on attendance_records using gist(location);
create index idx_attendance_today on attendance_records(organization_id, type, occurred_at);

-- =============================================================================
-- TRACKING GPS EN TIEMPO REAL
-- =============================================================================

create table location_pings (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  organization_id uuid references organizations on delete cascade not null,
  location geography(point, 4326) not null,
  accuracy_meters numeric(8,2),
  speed_mps numeric(6,2),
  heading_degrees numeric(5,2),
  battery_level integer,
  is_mock_location boolean default false,
  recorded_at timestamptz not null,
  synced_at timestamptz default now()
);

create index idx_pings_profile_time on location_pings(profile_id, recorded_at desc);
create index idx_pings_org_recent on location_pings(organization_id, recorded_at desc);
create index idx_pings_location on location_pings using gist(location);

-- =============================================================================
-- VACACIONES Y AUSENCIAS
-- =============================================================================

create table leave_balances (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  year integer not null,
  vacation_days_total numeric(5,2) default 15,
  vacation_days_used numeric(5,2) default 0,
  vacation_days_pending numeric(5,2) default 0,
  sick_days_used numeric(5,2) default 0,
  personal_days_used numeric(5,2) default 0,
  unique(profile_id, year)
);

create table leave_requests (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  organization_id uuid references organizations on delete cascade not null,
  type leave_type not null,
  status leave_status default 'pending',
  start_date date not null,
  end_date date not null,
  days_count numeric(5,2) not null,
  reason text,
  attachment_url text,
  reviewed_by uuid references profiles,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz default now()
);

create index idx_leave_profile on leave_requests(profile_id, created_at desc);
create index idx_leave_pending on leave_requests(organization_id, status) where status = 'pending';
create index idx_leave_dates on leave_requests(start_date, end_date) where status = 'approved';

-- =============================================================================
-- TAREAS
-- =============================================================================

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations on delete cascade not null,
  assigned_to uuid references profiles on delete cascade not null,
  assigned_by uuid references profiles not null,
  title text not null,
  description text,
  status task_status default 'pending',
  priority task_priority default 'medium',
  location geography(point, 4326),
  location_name text,
  estimated_minutes integer,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  completion_notes text,
  evidence_urls text[],
  created_at timestamptz default now()
);

create index idx_tasks_assigned on tasks(assigned_to, status);
create index idx_tasks_due on tasks(due_at) where status in ('pending', 'in_progress');
create index idx_tasks_org on tasks(organization_id, created_at desc);

-- =============================================================================
-- NÓMINA
-- =============================================================================

create table payroll_periods (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations on delete cascade not null,
  start_date date not null,
  end_date date not null,
  status text default 'open',
  closed_at timestamptz,
  closed_by uuid references profiles,
  created_at timestamptz default now()
);

create table payroll_records (
  id uuid primary key default uuid_generate_v4(),
  period_id uuid references payroll_periods on delete cascade not null,
  profile_id uuid references profiles on delete cascade not null,
  base_salary numeric(12,2) not null,
  hours_regular numeric(7,2) default 0,
  hours_overtime numeric(7,2) default 0,
  overtime_amount numeric(12,2) default 0,
  bonuses numeric(12,2) default 0,
  deductions numeric(12,2) default 0,
  late_minutes integer default 0,
  late_deduction numeric(12,2) default 0,
  absent_days numeric(5,2) default 0,
  absent_deduction numeric(12,2) default 0,
  total_gross numeric(12,2),
  total_net numeric(12,2),
  payslip_url text,
  notes text,
  created_at timestamptz default now()
);

create index idx_payroll_period on payroll_records(period_id);
create index idx_payroll_profile on payroll_records(profile_id);

-- =============================================================================
-- DOCUMENTOS DEL EMPLEADO
-- =============================================================================

create table employee_documents (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  organization_id uuid references organizations on delete cascade not null,
  type document_type not null,
  name text not null,
  file_url text not null,
  file_size_bytes bigint,
  expires_at date,
  uploaded_by uuid references profiles,
  created_at timestamptz default now()
);

create index idx_docs_profile on employee_documents(profile_id);

-- =============================================================================
-- NOTIFICACIONES
-- =============================================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  type notification_type not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index idx_notifications_unread on notifications(profile_id, created_at desc) where read_at is null;

-- =============================================================================
-- AUDITORÍA
-- =============================================================================

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations,
  actor_id uuid references profiles,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

create index idx_audit_org_date on audit_logs(organization_id, created_at desc);
create index idx_audit_entity on audit_logs(entity_type, entity_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_organizations_updated_at
  before update on organizations
  for each row execute function update_updated_at();

-- Validación de fichaje en geocerca + anti-spoofing
create or replace function validate_attendance_geofence()
returns trigger as $$
declare
  v_location work_locations%rowtype;
  v_distance numeric;
  v_is_inside boolean;
begin
  if new.location is null then
    new.status = 'pending_review';
    return new;
  end if;

  if new.is_mock_location = true then
    new.status = 'spoofed';
    return new;
  end if;

  select wl.* into v_location
  from work_locations wl
  join employee_locations el on el.work_location_id = wl.id
  where el.profile_id = new.profile_id
    and wl.is_active = true
  order by wl.center <-> new.location
  limit 1;

  if v_location.id is not null then
    new.work_location_id = v_location.id;
    v_distance = st_distance(new.location, v_location.center);
    new.distance_to_location_meters = v_distance;

    if v_location.geofence is not null then
      v_is_inside = st_within(new.location::geometry, v_location.geofence::geometry);
    else
      v_is_inside = v_distance <= v_location.radius_meters;
    end if;

    new.is_inside_geofence = v_is_inside;

    if not v_is_inside and new.status = 'valid' then
      new.status = 'outside_zone';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_attendance
  before insert on attendance_records
  for each row execute function validate_attendance_geofence();

-- Actualizar saldo de vacaciones automáticamente al aprobar
create or replace function update_leave_balance()
returns trigger as $$
begin
  if new.status = 'approved' and (old.status is null or old.status != 'approved') then
    if new.type = 'vacation' then
      update leave_balances
      set vacation_days_used = vacation_days_used + new.days_count,
          vacation_days_pending = greatest(0, vacation_days_pending - new.days_count)
      where profile_id = new.profile_id
        and year = extract(year from new.start_date);
    elsif new.type = 'sick' then
      update leave_balances
      set sick_days_used = sick_days_used + new.days_count
      where profile_id = new.profile_id
        and year = extract(year from new.start_date);
    elsif new.type = 'personal' then
      update leave_balances
      set personal_days_used = personal_days_used + new.days_count
      where profile_id = new.profile_id
        and year = extract(year from new.start_date);
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_update_leave_balance
  after insert or update on leave_requests
  for each row execute function update_leave_balance();
