'use client';

import { useEffect, useState, useRef } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import { createBrowserClient } from '@/lib/supabase/client';
import 'mapbox-gl/dist/mapbox-gl.css';

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

export function LiveMap({ organizationId }: { organizationId: string }) {
  const supabase = createBrowserClient();
  const [employees, setEmployees] = useState<Map<string, EmployeeLocation>>(new Map());
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    void load();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [organizationId]);

  async function load() {
    // Geocercas
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

    // Últimas posiciones
    const { data: pings } = await supabase.rpc('get_latest_employee_locations', {
      org_id: organizationId,
    });

    if (pings) {
      const map = new Map<string, EmployeeLocation>();
      for (const p of pings as any[]) {
        map.set(p.profile_id, {
          profileId: p.profile_id,
          firstName: p.first_name,
          lastName: p.last_name,
          longitude: p.longitude,
          latitude: p.latitude,
          recordedAt: p.recorded_at,
          insideGeofence: p.inside_geofence,
          batteryLevel: p.battery_level,
        });
      }
      setEmployees(map);
    }

    // Realtime
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
      const next = new Map(prev);
      const existing = next.get(ping.profile_id);
      if (existing) {
        next.set(ping.profile_id, {
          ...existing,
          longitude: ping.location.coordinates[0],
          latitude: ping.location.coordinates[1],
          recordedAt: ping.recorded_at,
          batteryLevel: ping.battery_level,
        });
      }
      return next;
    });
  }

  const initialCenter = geofences[0]
    ? { longitude: geofences[0].longitude, latitude: geofences[0].latitude }
    : { longitude: -70.6483, latitude: -33.4569 };

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div className="h-96 flex items-center justify-center bg-neutral-100 text-neutral-500">
        <div className="text-center">
          <p className="font-medium">Mapa no disponible</p>
          <p className="text-sm mt-1">Configura NEXT_PUBLIC_MAPBOX_TOKEN en .env.local</p>
        </div>
      </div>
    );
  }

  return (
    <Map
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={{ ...initialCenter, zoom: 11 }}
      style={{ width: '100%', height: 500 }}
      mapStyle="mapbox://styles/mapbox/light-v11"
    >
      {geofences.map((g) => (
        <Source
          key={g.id}
          id={`geofence-${g.id}`}
          type="geojson"
          data={makeCircle(g.longitude, g.latitude, g.radiusMeters)}
        >
          <Layer
            id={`geofence-fill-${g.id}`}
            type="fill"
            paint={{ 'fill-color': '#F59E0B', 'fill-opacity': 0.12 }}
          />
          <Layer
            id={`geofence-line-${g.id}`}
            type="line"
            paint={{ 'line-color': '#F59E0B', 'line-width': 2 }}
          />
        </Source>
      ))}

      {Array.from(employees.values()).map((emp) => (
        <Marker
          key={emp.profileId}
          longitude={emp.longitude}
          latitude={emp.latitude}
          anchor="bottom"
        >
          <EmployeeMarker employee={emp} />
        </Marker>
      ))}
    </Map>
  );
}

function EmployeeMarker({ employee }: { employee: EmployeeLocation }) {
  const initials = employee.firstName[0] + (employee.lastName[0] ?? '');
  const minutesAgo = Math.round((Date.now() - new Date(employee.recordedAt).getTime()) / 60000);
  const isStale = minutesAgo > 5;

  return (
    <div className="relative group">
      <div
        className={`w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm font-medium text-white ${
          isStale ? 'bg-neutral-400' : 'bg-primary-500'
        }`}
      >
        {initials}
      </div>
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white shadow-md rounded-md px-3 py-2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
        <p className="font-medium">{employee.firstName} {employee.lastName}</p>
        <p className="text-neutral-500">
          {isStale ? `Sin señal hace ${minutesAgo} min` : `Hace ${minutesAgo} min`}
          {employee.batteryLevel !== undefined && ` · 🔋 ${employee.batteryLevel}%`}
        </p>
      </div>
    </div>
  );
}

function makeCircle(lng: number, lat: number, radiusMeters: number) {
  const points = 64;
  const coords: number[][] = [];
  const earthRadius = 6_371_000;

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusMeters / earthRadius) * (180 / Math.PI);
    const dy = dx / Math.cos((lat * Math.PI) / 180);
    coords.push([lng + dy * Math.cos(angle), lat + dx * Math.sin(angle)]);
  }

  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}
