# Documento técnico — SiraControl App

## Visión general

SiraControl es un sistema integral de gestión y control de empleados diseñado para empresas de 50-500 colaboradores con personal mixto (oficina + campo). El sistema funciona en web y dispositivos móviles (iOS/Android) con sincronización completa offline.

## Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Web       │    │  App Móvil      │    │  Edge Functions │
│   Next.js 14    │    │  RN + Expo      │    │  Supabase       │
│   TypeScript    │    │  TypeScript     │    │  Deno           │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                  ┌─────────────▼─────────────┐
                  │      Supabase API         │
                  │  (PostgREST + Realtime)   │
                  └─────────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐    ┌─────────▼────────┐    ┌────────▼────────┐
│  PostgreSQL    │    │     Storage      │    │      Auth       │
│  + PostGIS     │    │  (selfies, docs) │    │  (JWT, OAuth)   │
└────────────────┘    └──────────────────┘    └─────────────────┘
```

## Decisiones técnicas clave

### React Native + Expo (vs Flutter)
- Reutilización de lógica con Next.js (validaciones, tipos, formatters)
- Ecosistema Supabase más maduro en JS/TS
- WatermelonDB exclusivo para offline-first
- Expo simplifica permisos nativos, OTA updates, push notifications

### Supabase (vs backend custom)
- PostgreSQL gestionado con PostGIS incluido
- Auth con biometría/OAuth listo
- Realtime via WebSockets sin configurar
- Row Level Security para aislamiento multi-tenant
- Storage para selfies/documentos
- Edge Functions para lógica server-side

### Offline-first con WatermelonDB
1. Cada acción se guarda primero en SQLite local con `clientId` único (UUID)
2. Cuando hay internet, un servicio de sincronización envía al servidor
3. El servidor usa el `clientId` para garantizar idempotencia (evita duplicados)
4. Conflictos resueltos con "last-write-wins" o revisión manual para casos críticos

## Modelo de datos

### Tablas principales (16 tablas)
- **Organizaciones:** organizations (multi-tenant)
- **Usuarios:** profiles (extiende auth.users)
- **Estructura:** departments, positions, employee_assignments
- **Ubicaciones:** work_locations (PostGIS), employee_locations
- **Turnos:** shifts, employee_shifts
- **Asistencia:** attendance_records, location_pings
- **Vacaciones:** leave_balances, leave_requests
- **Tareas:** tasks
- **Nómina:** payroll_periods, payroll_records
- **Documentos:** employee_documents
- **Notificaciones:** notifications
- **Auditoría:** audit_logs

### Funciones RPC custom
- `get_latest_employee_locations(org_id)` — últimas ubicaciones para mapa
- `get_today_attendance_summary(org_id)` — KPIs del día
- `get_monthly_attendance(profile_id, year, month)` — historial mensual
- `business_days_between(start, end)` — días hábiles
- `create_notification(...)` — crear notificación

### Triggers automáticos
- `validate_attendance_geofence()` — valida geocerca al insertar fichaje
- `update_leave_balance()` — actualiza saldo al aprobar vacaciones
- `notify_leave_request()` — notifica al supervisor
- `notify_leave_decision()` — notifica al empleado

## Seguridad

### Autenticación
- Supabase Auth con email/password, magic links u OAuth
- Biometría obligatoria configurable en móvil (huella o Face ID)
- 2FA opcional para roles admin/RRHH
- JWT con refresh tokens, sesiones de 1 hora

### Autorización (Row Level Security)
- Cada query filtrada automáticamente por `organization_id`
- Empleados solo ven sus propios datos
- Supervisores ven a su equipo directo
- Admin/RRHH ven todo dentro de su organización
- **Imposible que un empleado vea datos de otra empresa**

### Anti-fraude en fichajes
1. **Detección de mock locations:** rechazo automático cliente y servidor
2. **Validación de precisión GPS:** mínimo 100m configurable
3. **Validación de geocerca en servidor:** trigger PostgreSQL recalcula distancia
4. **Reconocimiento facial opcional:** compara contra embedding del empleado
5. **Detección de velocidades imposibles:** flag automático si >300 km/h
6. **Idempotencia con clientId:** evita doble registro al sincronizar

### Protección de datos
- Selfies y biométricos en Storage privado con políticas
- Embeddings faciales como vectores de 128 dimensiones (no la imagen)
- Logs de auditoría inmutables
- Cumplimiento Ley 19.628 (Chile) y GDPR

## Performance y escalabilidad

### Índices clave
- `idx_attendance_profile_date` — consultas por empleado/fecha
- `idx_attendance_org_date` — dashboard organizacional
- `idx_pings_org_recent` — mapa en tiempo real
- `idx_work_locations_center` (gist) — búsqueda geo-espacial
- `idx_attendance_status` — filtros de incidencias (parcial)

### Particionamiento (futuro)
- `location_pings` debería particionarse por mes en producción para mantener performance con millones de registros

### Caché
- Lectura de ubicaciones cacheada en cliente móvil (WatermelonDB)
- Server Components con `revalidate` selectivo
- Realtime solo para datos críticos (mapa, notificaciones)

## Capacidad estimada
| Empleados | Storage | DB | Costo USD/mes |
|-----------|---------|-----|---------------|
| 50 | 5 GB | 1 GB | ~50 |
| 500 | 50 GB | 10 GB | ~125 |
| 2,000 | 200 GB | 40 GB | ~400 |
| 5,000 | 500 GB | 100 GB | ~900 |

## Roadmap técnico futuro

- [ ] Reconocimiento facial on-device con TensorFlow Lite
- [ ] Edge Functions para cálculo de nómina automático
- [ ] Webhook integraciones con Buk, Talana, Defontana
- [ ] Mobile NFC para fichaje con tarjeta corporativa
- [ ] BI dashboard con Metabase embebido
- [ ] App de escritorio Electron para enrollment biométrico
- [ ] API pública para integraciones de terceros
