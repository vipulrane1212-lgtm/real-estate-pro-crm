'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserRole, Profile, Employee } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  employee: Employee | null;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  employee: null,
  role: 'employee',
  isAdmin: false,
  isSuperAdmin: false,
  isLoading: true,
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        setProfile(data.profile || null);
        setEmployee(data.employee || null);
      } else {
        setUser(null);
        setProfile(null);
        setEmployee(null);
      }
    } catch (err) {
      console.error('Error loading session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuth();

    // Listen to Supabase auth state changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        fetchAuth();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setEmployee(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAuth]);

  const role: UserRole = profile?.role || 'employee';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        employee,
        role,
        isAdmin,
        isSuperAdmin,
        isLoading,
        refreshAuth: fetchAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
