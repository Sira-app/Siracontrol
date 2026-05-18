-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table departments enable row level security;
alter table positions enable row level security;
alter table employee_assignments enable row level security;
alter table work_locations enable row level security;
alter table employee_locations enable row level security;
alter table shifts enable row level security;
alter table employee_shifts enable row level security;
alter table attendance_records enable row level security;
alter table location_pings enable row level security;
alter table leave_requests enable row level security;
alter table leave_balances enable row level security;
alter table tasks enable row level security;
alter table payroll_periods enable row level security;
alter table payroll_records enable row level security;
alter table employee_documents enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- =============================================================================
-- HELPERS
-- =============================================================================

create or replace function public.organization_id()
returns uuid language sql stable security definer as $$
  select organization_id from profiles where id = auth.uid()
$$;

create or replace function public.user_role()
returns user_role language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_admin_or_hr()
returns boolean language sql stable security definer as $$
  select role in ('admin', 'hr') from profiles where id = auth.uid()
$$;

create or replace function public.is_supervisor_of(target_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from employee_assignments
    where supervisor_id = auth.uid()
      and profile_id = target_id
      and is_current = true
  )
$$;

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================

create policy "Members read own org" on organizations
  for select using (id = public.organization_id());

create policy "Admin updates org" on organizations
  for update using (id = public.organization_id() and public.user_role() = 'admin');

-- =============================================================================
-- PROFILES
-- =============================================================================

create policy "Read own profile" on profiles for select using (id = auth.uid());

create policy "Admin/HR see org profiles" on profiles for select
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

create policy "Supervisors see team" on profiles for select
  using (
    organization_id = public.organization_id()
    and public.user_role() = 'supervisor'
    and public.is_supervisor_of(id)
  );

create policy "Update own profile basic" on profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid())
    and organization_id = (select organization_id from profiles where id = auth.uid())
  );

create policy "Admin/HR manage profiles" on profiles for all
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

-- =============================================================================
-- DEPARTMENTS, POSITIONS, ASSIGNMENTS
-- =============================================================================

create policy "Org reads departments" on departments for select
  using (organization_id = public.organization_id());

create policy "Admin/HR manages departments" on departments for all
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

create policy "Org reads positions" on positions for select
  using (organization_id = public.organization_id());

create policy "Admin/HR manages positions" on positions for all
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

create policy "Read own assignments" on employee_assignments for select
  using (profile_id = auth.uid());

create policy "Admin/HR/supervisor read assignments" on employee_assignments for select
  using (
    public.is_admin_or_hr()
    or supervisor_id = auth.uid()
  );

create policy "Admin/HR manages assignments" on employee_assignments for all
  using (public.is_admin_or_hr());

-- =============================================================================
-- WORK LOCATIONS, SHIFTS
-- =============================================================================

create policy "Org reads work locations" on work_locations for select
  using (organization_id = public.organization_id());

create policy "Admin manages work locations" on work_locations for all
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

create policy "Read own employee locations" on employee_locations for select
  using (profile_id = auth.uid() or public.is_admin_or_hr());

create policy "Admin manages employee locations" on employee_locations for all
  using (public.is_admin_or_hr());

create policy "Org reads shifts" on shifts for select
  using (organization_id = public.organization_id());

create policy "Admin manages shifts" on shifts for all
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

create policy "Read own employee shifts" on employee_shifts for select
  using (profile_id = auth.uid() or public.is_admin_or_hr());

create policy "Admin manages employee shifts" on employee_shifts for all
  using (public.is_admin_or_hr());

-- =============================================================================
-- ATTENDANCE
-- =============================================================================

create policy "Read own attendance" on attendance_records for select
  using (profile_id = auth.uid());

create policy "Insert own attendance" on attendance_records for insert
  with check (profile_id = auth.uid());

create policy "Admin/HR see all attendance" on attendance_records for select
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

create policy "Supervisors see team attendance" on attendance_records for select
  using (
    organization_id = public.organization_id()
    and public.user_role() = 'supervisor'
    and public.is_supervisor_of(profile_id)
  );

create policy "Admin/HR review attendance" on attendance_records for update
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

-- =============================================================================
-- LOCATION PINGS
-- =============================================================================

create policy "Insert own pings" on location_pings for insert
  with check (profile_id = auth.uid());

create policy "Read own pings" on location_pings for select
  using (profile_id = auth.uid());

create policy "Admin/HR see all pings" on location_pings for select
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

create policy "Supervisors see team pings" on location_pings for select
  using (
    organization_id = public.organization_id()
    and public.user_role() = 'supervisor'
    and public.is_supervisor_of(profile_id)
  );

-- =============================================================================
-- LEAVES
-- =============================================================================

create policy "Read own leave requests" on leave_requests for select
  using (profile_id = auth.uid());

create policy "Create own leave requests" on leave_requests for insert
  with check (profile_id = auth.uid() and status = 'pending');

create policy "Cancel own pending requests" on leave_requests for update
  using (profile_id = auth.uid() and status = 'pending');

create policy "Admin/HR see all leaves" on leave_requests for select
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

create policy "Admin/HR review leaves" on leave_requests for update
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

create policy "Supervisors see team leaves" on leave_requests for select
  using (
    organization_id = public.organization_id()
    and public.user_role() = 'supervisor'
    and public.is_supervisor_of(profile_id)
  );

create policy "Read own balance" on leave_balances for select
  using (profile_id = auth.uid());

create policy "Admin/HR manage balances" on leave_balances for all
  using (public.is_admin_or_hr());

-- =============================================================================
-- TASKS
-- =============================================================================

create policy "Read assigned tasks" on tasks for select
  using (assigned_to = auth.uid());

create policy "Update own tasks status" on tasks for update
  using (assigned_to = auth.uid());

create policy "Admin/HR/supervisor manage tasks" on tasks for all
  using (
    organization_id = public.organization_id()
    and public.user_role() in ('admin', 'hr', 'supervisor')
  );

-- =============================================================================
-- PAYROLL
-- =============================================================================

create policy "Read own payroll" on payroll_records for select
  using (profile_id = auth.uid());

create policy "Admin/HR manage payroll" on payroll_records for all
  using (public.is_admin_or_hr());

create policy "Admin/HR manage periods" on payroll_periods for all
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

-- =============================================================================
-- DOCUMENTS
-- =============================================================================

create policy "Read own documents" on employee_documents for select
  using (profile_id = auth.uid());

create policy "Admin/HR manage documents" on employee_documents for all
  using (organization_id = public.organization_id() and public.is_admin_or_hr());

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

create policy "Read own notifications" on notifications for select
  using (profile_id = auth.uid());

create policy "Update own notifications" on notifications for update
  using (profile_id = auth.uid());

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================

create policy "Admin reads audit logs" on audit_logs for select
  using (organization_id = public.organization_id() and public.user_role() = 'admin');
