'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { createBrowserClient } from '@/lib/supabase/client';
import 'leaflet/dist/leaflet.css';

interface EmployeeLocation {
  profileId: string;
  firstName: string;
  lastName: string;
  longitude: number;
  latitude: number;
  recordedAt: string;
  insideGeofence: boolean;
  batteryLevel?: number;
}

interface Geofence {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  radiusMeters: number;
}

// Diccionario de empleados indexado por profileId.
type EmployeeMap = Record<string, EmployeeLocation>;

// Marcador personalizado con iniciales del empleado.
function buildEmployeeIcon(emp: EmployeeLocation): L.DivIcon {
  const initials = (emp.firstName?.[0] ?? '') + (emp.lastName?.[0] ?? '');
  const minutesAgo = Math.round(
    (Date.now() - new Date(emp.recordedAt).getTime()) / 60000
  );
  const isStale = minutesAgo > 5;
  const bg = isStale ? '#a3a3a3' : '#F59E0B';

  return L.divIcon({
    className: 'siracontrol-emp-marker',
    html: `<div style="
      width:40px;height:40px;border-radius:9999px;
      background:${bg};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:13px;font-weight:600;
      font-family:system-ui,sans-serif;">${initials}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

// Recentra el mapa cuando se cargan las geocercas.
function Recenter({ center }: { center: [number, number] }) {
  const leafletMap = useMap();
  useEffect(() => {
    leafletMap.setView(center, leafletMap.getZoom());
  }, [center[0], center[1]]);
  return null;
}

export function LiveMap({ organizationId }: { organizationId: string }) {
  const supabase = createBrowserClient();
  const [employees, setEmployees] = useState<EmployeeMap>({});
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    void load();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [organizationId]);

  async function load() {
    // Geocercas (ubicaciones de trabajo activas)
    const { data: locations } = await supabase
      .from('work_locations')
      .select('id, name, center, radius_meters')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (locations) {
      setGeofences(
        locations.map((l: any) => ({
          id: l.id,
          name: l.name,
          longitude: l.center?.coordinates?.[0] ?? 0,
          latitude: l.center?.coordinates?.[1] ?? 0,
          radiusMeters: l.radius_meters,
        }))
      );
    }

    // Ultimas posiciones de los empleados
    const { data: pings } = await supabase.rpc('get_latest_employee_locations', {
      org_id: organizationId,
    });

    if (pings) {
      const next: EmployeeMap = {};
      for (const p of pings as any[]) {
        next[p.profile_id] = {
          profileId: p.profile_id,
          firstName: p.first_name,
          lastName: p.last_name,
          longitude: p.longitude,
          latitude: p.latitude,
          recordedAt: p.recorded_at,
          insideGeofence: p.inside_geofence,
          batteryLevel: p.battery_level,
        };
      }
      setEmployees(next);
    }

    // Actualizaciones en tiempo real via Supabase Realtime
    channelRef.current = supabase
      .channel(`org-${organizationId}-pings`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_pings',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => handleNewPing(payload.new)
      )
      .subscribe();
  }

  function handleNewPing(ping: any) {
    setEmployees((prev) => {
      const existing = prev[ping.profile_id];
      if (!existing) return prev;
      return {
        ...prev,
        [ping.profile_id]: {
          ...existing,
          longitude: ping.location.coordinates[0],
          latitude: ping.location.coordinates[1],
          recordedAt: ping.recorded_at,
          batteryLevel: ping.battery_level,
        },
      };
    });
  }

  // Centro inicial: primera geocerca, o Santiago como respaldo.
  const center: [number, number] = geofences[0]
    ? [geofences[0].latitude, geofences[0].longitude]
    : [-33.4569, -70.6483];

  const employeeList = Object.values(employees);

  return (
    <MapContainer
      center={center}
      zoom={11}
      style={{ width: '100%', height: 500 }}
      scrollWheelZoom
    >
      {/* Capa base gratuita de OpenStreetMap */}
      <TileLayer
        attribution='&copy; colaboradores de OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Recenter center={center} />

      {/* Geocercas como circulos amber */}
      {geofences.map((g) => (
        <Circle
          key={g.id}
          center={[g.latitude, g.longitude]}
          radius={g.radiusMeters}
          pathOptions={{
            color: '#F59E0B',
            weight: 2,
            fillColor: '#F59E0B',
            fillOpacity: 0.12,
          }}
        >
          <Popup>{g.name}</Popup>
        </Circle>
      ))}

      {/* Empleados como marcadores con iniciales */}
      {employeeList.map((emp) => {
        const minutesAgo = Math.round(
          (Date.now() - new Date(emp.recordedAt).getTime()) / 60000
        );
        const isStale = minutesAgo > 5;
        return (
          <Marker
            key={emp.profileId}
            position={[emp.latitude, emp.longitude]}
            icon={buildEmployeeIcon(emp)}
          >
            <Popup>
              <strong>
                {emp.firstName} {emp.lastName}
              </strong>
              <br />
              {isStale
                ? `Sin senal hace ${minutesAgo} min`
                : `Hace ${minutesAgo} min`}
              {emp.batteryLevel !== undefined &&
                ` - Bateria ${emp.batteryLevel}%`}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
