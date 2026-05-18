-- =============================================================================
-- FUNCIONES RPC Y VISTAS
-- Lógica de negocio que se ejecuta en el servidor
-- =============================================================================

-- Obtener últimas ubicaciones de empleados activos
create or replace function get_latest_employee_locations(org_id uuid)
returns table (
  profile_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  longitude double precision,
  latitude double precision,
  recorded_at timestamptz,
  battery_level integer,
  inside_geofence boolean
) language sql stable security definer as $$
  with latest as (
    select distinct on (profile_id)
      profile_id, location, recorded_at, battery_level
    from location_pings
    where organization_id = org_id
      and recorded_at > now() - interval '4 hours'
    order by profile_id, recorded_at desc
  )
  select
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    st_x(l.location::geometry),
    st_y(l.location::geometry),
    l.recorded_at,
    l.battery_level,
    exists (
      select 1 from work_locations wl
      join employee_locations el on el.work_location_id = wl.id
      where el.profile_id = p.id
        and wl.is_active = true
        and st_dwithin(wl.center, l.location, wl.radius_meters)
    )
  from latest l
  join profiles p on p.id = l.profile_id
  where p.is_active = true;
$$;

-- Resumen de asistencia del día para el dashboard
create or replace function get_today_attendance_summary(org_id uuid)
returns table (
  total_active integer,
  present integer,
  late integer,
  absent integer,
  on_leave integer
) language sql stable security definer as $$
  with today_checkins as (
    select distinct on (profile_id) profile_id, occurred_at, status
    from attendance_records
    where organization_id = org_id
      and type = 'check_in'
      and occurred_at >= current_date
    order by profile_id, occurred_at asc
  ),
  on_leave_today as (
    select count(distinct profile_id) as count
    from leave_requests
    where organization_id = org_id
      and status = 'approved'
      and current_date between start_date and end_date
  ),
  active_count as (
    select count(*) as count
    from profiles
    where organization_id = org_id and is_active = true
  )
  select
    (select count from active_count)::integer,
    (select count(*) from today_checkins where status = 'valid')::integer,
    (select count(*) from today_checkins where status in ('pending_review', 'outside_zone'))::integer,
    ((select count from active_count) - (select count(*) from today_checkins) - (select count from on_leave_today))::integer,
    (select count from on_leave_today)::integer;
$$;

-- Resumen mensual de asistencia por empleado
create or replace function get_monthly_attendance(p_profile_id uuid, p_year integer, p_month integer)
returns table (
  work_date date,
  check_in_at timestamptz,
  check_out_at timestamptz,
  worked_minutes integer,
  late_minutes integer,
  is_complete boolean,
  status text
) language plpgsql stable security definer as $$
declare
  v_start_date date;
  v_end_date date;
begin
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month - 1 day')::date;

  return query
  with daily as (
    select
      occurred_at::date as d,
      min(occurred_at) filter (where type = 'check_in') as in_at,
      max(occurred_at) filter (where type = 'check_out') as out_at,
      bool_or(status != 'valid') as has_issues
    from attendance_records
    where profile_id = p_profile_id
      and occurred_at::date between v_start_date and v_end_date
    group by occurred_at::date
  )
  select
    d.d,
    d.in_at,
    d.out_at,
    case when d.out_at is not null then
      extract(epoch from (d.out_at - d.in_at))::integer / 60
    else 0 end,
    0,
    d.out_at is not null,
    case when d.has_issues then 'review' else 'ok' end
  from daily d
  order by d.d;
end;
$$;

-- Calcular días entre dos fechas excluyendo fines de semana
create or replace function business_days_between(start_d date, end_d date)
returns numeric language sql immutable as $$
  select count(*)::numeric
  from generate_series(start_d, end_d, '1 day'::interval) d
  where extract(dow from d) not in (0, 6);
$$;

-- Crear notificación
create or replace function create_notification(
  p_profile_id uuid,
  p_type notification_type,
  p_title text,
  p_body text default null,
  p_data jsonb default null
) returns uuid language sql security definer as $$
  insert into notifications (profile_id, type, title, body, data)
  values (p_profile_id, p_type, p_title, p_body, p_data)
  returning id;
$$;

-- Vista: empleados con info enriquecida
create or replace view v_employees_full as
select
  p.id,
  p.organization_id,
  p.employee_code,
  p.first_name,
  p.last_name,
  p.first_name || ' ' || p.last_name as full_name,
  p.email,
  p.phone,
  p.role,
  p.avatar_url,
  p.is_active,
  p.hired_at,
  ea.position_id,
  pos.title as position_title,
  ea.department_id,
  d.name as department_name,
  ea.supervisor_id,
  sup.first_name || ' ' || sup.last_name as supervisor_name,
  es.shift_id,
  s.name as shift_name,
  s.start_time as shift_start,
  s.end_time as shift_end
from profiles p
left join employee_assignments ea on ea.profile_id = p.id and ea.is_current = true
left join positions pos on pos.id = ea.position_id
left join departments d on d.id = ea.department_id
left join profiles sup on sup.id = ea.supervisor_id
left join employee_shifts es on es.profile_id = p.id and es.is_current = true
left join shifts s on s.id = es.shift_id;

-- Trigger para crear notificación al recibir solicitud de vacaciones
create or replace function notify_leave_request()
returns trigger as $$
declare
  v_supervisor_id uuid;
  v_employee_name text;
begin
  -- Buscar supervisor del solicitante
  select supervisor_id into v_supervisor_id
  from employee_assignments
  where profile_id = new.profile_id and is_current = true
  limit 1;

  select first_name || ' ' || last_name into v_employee_name
  from profiles where id = new.profile_id;

  -- Notificar al supervisor o a admin/hr
  if v_supervisor_id is not null then
    perform create_notification(
      v_supervisor_id,
      'leave',
      'Nueva solicitud de ' || new.type::text,
      v_employee_name || ' solicita ' || new.days_count || ' días',
      jsonb_build_object('leave_request_id', new.id)
    );
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_notify_leave
  after insert on leave_requests
  for each row execute function notify_leave_request();

-- Trigger para notificar al empleado cuando aprueban/rechazan
create or replace function notify_leave_decision()
returns trigger as $$
begin
  if new.status != old.status and new.status in ('approved', 'rejected') then
    perform create_notification(
      new.profile_id,
      'leave',
      case new.status
        when 'approved' then 'Solicitud aprobada'
        when 'rejected' then 'Solicitud rechazada'
      end,
      'Tu solicitud de ' || new.type::text || ' ha sido ' ||
      case new.status when 'approved' then 'aprobada' else 'rechazada' end,
      jsonb_build_object('leave_request_id', new.id)
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_notify_leave_decision
  after update on leave_requests
  for each row execute function notify_leave_decision();
