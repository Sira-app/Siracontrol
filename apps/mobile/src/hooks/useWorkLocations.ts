import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { WorkLocation } from '@siracontrol/shared';

export function useWorkLocations() {
  const [locations, setLocations] = useState<WorkLocation[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLocations([]);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('employee_locations')
      .select('work_location:work_locations(*)')
      .eq('profile_id', user.id);

    const mapped = (data ?? [])
      .map((r: any) => r.work_location)
      .filter((wl: any) => wl?.is_active)
      .map(mapLocation);

    setLocations(mapped);
    setIsLoading(false);
  }

  return { locations, isLoading, reload: load };
}

function mapLocation(data: any): WorkLocation {
  // PostGIS devuelve geography como WKB hex o GeoJSON según el cliente
  let center = { latitude: 0, longitude: 0 };
  if (data.center?.coordinates) {
    center = {
      longitude: data.center.coordinates[0],
      latitude: data.center.coordinates[1],
    };
  }
  return {
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    type: data.type,
    address: data.address,
    center,
    radiusMeters: data.radius_meters,
    isActive: data.is_active,
  };
}
