-- =============================================================================
-- DATOS SEMILLA PARA DESARROLLO
-- Crea una organización demo con empleados, ubicaciones, turnos
-- =============================================================================

-- Organización demo
insert into organizations (id, name, legal_name, tax_id, country, timezone)
values (
  '00000000-0000-0000-0000-000000000001',
  'Empresa Demo',
  'Empresa Demo SpA',
  '76.123.456-7',
  'CL',
  'America/Santiago'
);

-- Departamentos
insert into departments (id, organization_id, name) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Operaciones'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Ventas'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Administración'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Tecnología');

-- Cargos
insert into positions (id, organization_id, department_id, title, base_salary) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Operario', 650000),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Supervisor de operaciones', 1200000),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Vendedor de terreno', 800000),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Asistente RRHH', 900000),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Desarrollador', 1800000);

-- Ubicaciones de trabajo (coordenadas: Los Andes, Chile y Santiago)
insert into work_locations (id, organization_id, name, type, address, center, radius_meters) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
    'Oficina central', 'office', 'Av. Libertador 100, Los Andes',
    st_geogfromtext('POINT(-70.5973 -32.8347)'), 100),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
    'Bodega Norte', 'site', 'Camino Industrial 45, Los Andes',
    st_geogfromtext('POINT(-70.6010 -32.8400)'), 150),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
    'Sucursal Santiago', 'office', 'Providencia 1500, Santiago',
    st_geogfromtext('POINT(-70.6175 -33.4250)'), 80);

-- Turnos
insert into shifts (id, organization_id, name, start_time, end_time, weekdays, late_tolerance_minutes) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
    'Turno diurno', '09:00', '18:00', '{1,2,3,4,5}', 10),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
    'Turno mañana', '07:00', '15:00', '{1,2,3,4,5,6}', 5),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
    'Turno tarde', '14:00', '22:00', '{1,2,3,4,5,6}', 5);

-- Saldo de vacaciones para el año actual (se creará automáticamente para usuarios reales)
-- Los profiles requieren primero crear usuarios en auth.users vía Supabase Auth
