import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, AppUser, Store } from "@/types";

/**
 * TEMP escape hatch until Supabase types are regenerated
 */
const sb = supabase as any;

interface AuthContextType {
  user: User | null;
  session: Session | null;

  appUser: AppUser | null; // row from public.users
  role: AppRole | null;

  stores: Store[];         // HQ always gets all stores
  isLoading: boolean;

  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => hydrateContext(session.user.id), 0);
        } else {
          resetState();
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        hydrateContext(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function resetState() {
    setAppUser(null);
    setRole(null);
    setStores([]);
  }

  async function hydrateContext(authUserId: string) {
    setIsLoading(true);

    try {
      /**
       * 1) Load public.users row
       */
      const { data: userRow, error: userErr } = await sb
        .from("users")
        .select("id, auth_user_id, name, role")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (userErr) throw userErr;
      if (!userRow) {
        resetState();
        return;
      }

      const u = userRow as AppUser;
      setAppUser(u);
      setRole(u.role);

      /**
       * 2) HARD ROLE GATE — HQ app only
       */
      if (u.role !== "hq_admin") {
        await supabase.auth.signOut();
        resetState();
        return;
      }

      /**
       * 3) HQ admin → load ALL stores
       */
      const { data: storeRows, error: storeErr } = await sb
        .from("stores")
        .select("id, code, name, region");

      if (storeErr) throw storeErr;

      setStores((storeRows || []) as Store[]);
    } catch (err) {
      console.error("Auth hydrateContext error:", err);
      resetState();
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    resetState();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        appUser,
        role,
        stores,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}