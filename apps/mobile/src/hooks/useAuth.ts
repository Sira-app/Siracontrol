import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Profile, Organization } from '@siracontrol/shared';

interface AuthState {
  profile: Profile | null;
  organization: Organization | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth(): AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    profile: null,
    organization: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    void loadProfile();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void loadProfile();
      else setState({ profile: null, organization: null, isLoading: false, error: null });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function loadProfile() {
    setState((s) => ({ ...s, isLoading: true }));
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setState({ profile: null, organization: null, isLoading: false, error: null });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*, organization:organizations(*)')
      .eq('id', user.id)
      .single();

    if (error) {
      setState({ profile: null, organization: null, isLoading: false, error: error.message });
      return;
    }

    setState({
      profile: mapProfile(data),
      organization: mapOrganization(data.organization),
      isLoading: false,
      error: null,
    });
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { ...state, signIn, signOut };
}

function mapProfile(data: any): Profile {
  return {
    id: data.id,
    organizationId: data.organization_id,
    employeeCode: data.employee_code,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    nationalId: data.national_id,
    birthDate: data.birth_date,
    role: data.role,
    avatarUrl: data.avatar_url,
    isActive: data.is_active,
    hiredAt: data.hired_at,
  };
}

function mapOrganization(data: any): Organization {
  return {
    id: data.id,
    name: data.name,
    legalName: data.legal_name,
    taxId: data.tax_id,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    timezone: data.timezone,
    country: data.country,
    currency: data.currency,
    locale: data.locale,
    settings: data.settings,
  };
}
