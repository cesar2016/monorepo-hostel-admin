import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import type { UserProfile } from '../../types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  selectedAreaId: string | null;
  setSelectedAreaId: (id: string | null) => void;
  effectiveAreaId: string | null;
  isEncargado: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canManageUsers: boolean;
  canEditArea: boolean;
  login: (email: string, password: string) => Promise<{ user: UserProfile }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SELECTED_AREA_STORAGE_KEY = 'hotel_selected_area_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAreaId, setSelectedAreaIdState] = useState<string | null>(() => {
    return localStorage.getItem(SELECTED_AREA_STORAGE_KEY) || null;
  });

  const setSelectedAreaId = useCallback((id: string | null) => {
    setSelectedAreaIdState(id);
    if (id) {
      localStorage.setItem(SELECTED_AREA_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_AREA_STORAGE_KEY);
    }
  }, []);

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const data = await api.get<UserProfile>('/auth/me');
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error al cargar perfil de usuario:', error);
      setProfile(null);
      return null;
    }
  }, []);

  // Inicializar estado de autenticación
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session) {
          const loadedProfile = await fetchProfile();
          if (!loadedProfile && mounted) {
            await supabase.auth.signOut().catch(() => {});
            setSession(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error inicializando sesión:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Escuchar cambios de sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession) {
        const loadedProfile = await fetchProfile();
        if (!loadedProfile && mounted) {
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUser(null);
        }
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Usar Supabase Auth directo en el cliente
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : error.message);
      }

      setSession(data.session);
      setUser(data.user);

      // Obtener el perfil inmediatamente desde nuestra API
      const loadedProfile = await fetchProfile();
      if (!loadedProfile) {
        await supabase.auth.signOut();
        throw new Error('No se pudo cargar el perfil de usuario');
      }

      if (!loadedProfile.activo) {
        await supabase.auth.signOut();
        throw new Error('Tu cuenta se encuentra inactiva. Contactá al administrador.');
      }

      // Si es encargado, fijar su área por defecto
      if (loadedProfile.rol === 'encargado' && loadedProfile.area_id) {
        setSelectedAreaId(loadedProfile.area_id);
      }

      return { user: loadedProfile };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error al cerrar sesión en Supabase:', e);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setSelectedAreaId(null);
    }
  };

  const isEncargado = profile?.rol === 'encargado';
  const isAdmin = profile?.rol === 'admin';
  const isSuperAdmin = profile?.rol === 'super_admin';
  const canManageUsers = isSuperAdmin;
  const canEditArea = isEncargado || isSuperAdmin;

  // Para el encargado, siempre es su área. Para admin/superadmin, es la seleccionada.
  const effectiveAreaId = useMemo(() => {
    if (isEncargado) {
      return profile?.area_id || null;
    }
    return selectedAreaId;
  }, [isEncargado, profile?.area_id, selectedAreaId]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      isLoading,
      selectedAreaId,
      setSelectedAreaId,
      effectiveAreaId,
      isEncargado,
      isAdmin,
      isSuperAdmin,
      canManageUsers,
      canEditArea,
      login,
      logout,
      refreshProfile: fetchProfile,
    }),
    [
      user,
      session,
      profile,
      isLoading,
      selectedAreaId,
      setSelectedAreaId,
      effectiveAreaId,
      isEncargado,
      isAdmin,
      isSuperAdmin,
      canManageUsers,
      canEditArea,
      fetchProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
