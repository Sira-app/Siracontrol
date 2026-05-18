# SiraControl — Sistema de gestión y control de empleados

Aplicación profesional para control de asistencia, GPS, nómina, vacaciones y productividad. Funciona en web (Next.js), iOS y Android (React Native + Expo), con soporte completo offline.

## Características principales

- **Control de asistencia** con múltiples métodos: selfie + GPS, reconocimiento facial, huella digital, QR
- **Geocercas inteligentes** con detección de ubicación falsa y validación servidor-side
- **Tracking GPS en tiempo real** para empleados de campo con visualización en mapa
- **Funcionamiento 100% offline** mediante WatermelonDB y cola de sincronización idempotente
- **Vacaciones y permisos** con flujo de aprobación supervisor → RRHH y notificaciones
- **Tareas y productividad** con ubicación, prioridad y evidencia fotográfica
- **Nómina mensual** con cálculo automático de horas, atrasos y horas extra
- **Reportes exportables** a Excel y PDF
- **Multi-tenant** con Row Level Security: cada organización aislada
- **Cumplimiento legal Chile**: jornada de 45 hrs semanales, recargos de horas extra

## Stack tecnológico

- **Backend:** Supabase (PostgreSQL 15 + PostGIS + Realtime + Auth + Storage)
- **Web:** Next.js 14 App Router + TypeScript + TailwindCSS + Mapbox GL
- **Móvil:** React Native + Expo SDK 51 + WatermelonDB + react-navigation
- **Tipos compartidos:** Monorepo con Turborepo + paquete @siracontrol/shared
- **Validaciones:** Zod en cliente y servidor
- **Mapas:** Mapbox GL con Realtime para tracking en vivo
- **Push:** Expo Notifications + OneSignal

## Estructura del monorepo

```
siracontrol-app/
├── apps/
│   ├── web/              → Dashboard administrativo (Next.js)
│   └── mobile/           → App empleados (React Native + Expo)
├── packages/
│   ├── database/         → Migraciones SQL + seeds
│   └── shared/           → Lógica compartida: tipos, validaciones, geo, formatters
├── docs/                 → Documentación técnica
├── package.json          → Workspace root
├── turbo.json            → Pipeline de Turborepo
└── .env.example          → Variables requeridas
```

## Setup inicial

### 1. Requisitos previos
- Node.js 20+
- npm 10+
- Supabase CLI (`npm install -g supabase`)
- Expo CLI (`npm install -g expo`)

### 2. Crear proyecto Supabase
1. Crea cuenta en https://supabase.com
2. Crea un proyecto nuevo (región más cercana: São Paulo para Chile)
3. Copia URL y anon key

### 3. Variables de entorno
```bash
cp .env.example .env.local
# Edita .env.local con tus claves
```

### 4. Instalar dependencias
```bash
npm install
```

### 5. Aplicar migraciones
```bash
supabase link --project-ref <tu-ref>
npm run db:push
psql $DATABASE_URL -f packages/database/seed/demo_data.sql
```

### 6. Configurar Storage Buckets en Supabase
Crea estos buckets en el panel de Supabase Storage:
- `attendance-selfies` (privado)
- `employee-documents` (privado)
- `payslips` (privado)

### 7. Levantar la web
```bash
npm run dev:web
```
Abre http://localhost:3000

### 8. Levantar la app móvil
```bash
npm run dev:mobile
```
Escanea el QR con la app Expo Go.

## Despliegue a producción

Para poner SiraControl en producción —base de datos en Supabase, web en Vercel
y app móvil compilada con EAS, reutilizando tu dominio de Banahosting— sigue la
guía paso a paso en **`docs/despliegue.md`**. Cubre la configuración de DNS,
variables de entorno y verificación final.

## Roadmap de implementación

### Fase 1 — Asistencia y GPS (semanas 1-4)
✅ Esquema de base de datos completo
✅ Autenticación multi-rol (admin/hr/supervisor/employee)
✅ App móvil con fichaje y validación GPS
✅ Cola offline con sincronización idempotente
✅ Dashboard administrativo

### Fase 2 — Vacaciones y aprobaciones (semanas 5-6)
✅ Solicitud de vacaciones desde móvil
✅ Flujo de aprobación con notificaciones
✅ Cálculo automático de saldos

### Fase 3 — Tareas y productividad (semanas 7-8)
✅ Asignación de tareas con ubicación
✅ Estados, prioridades y evidencia
✅ Vista de tareas en móvil y web

### Fase 4 — Nómina y reportes (semanas 9-10)
✅ Cálculo de horas trabajadas y extras (lógica Chile)
✅ Página de reportes con exportación
✅ Periodos de nómina

### Fase 5 — Reconocimiento facial (semanas 11-12)
🔄 On-device con TensorFlow Lite
🔄 Embeddings vector(128) en Supabase

### Fase 6 — Pulido y producción (semana 13+)
🔄 Notificaciones push
🔄 Builds nativos con EAS
🔄 Tests E2E

## Costos estimados

Para 500 empleados activos: **~125 USD/mes**

| Servicio | Plan | USD/mes |
|----------|------|---------|
| Supabase | Pro | 25 |
| Mapbox | 50K cargas | 50 |
| Vercel | Pro | 20 |
| EAS Build | Production | 19 |
| Storage extra | 50 GB | 10 |

## Soporte

Para detalles de arquitectura, consulta `docs/technical-overview.md`.
Para desplegar a producción, consulta `docs/despliegue.md`.
