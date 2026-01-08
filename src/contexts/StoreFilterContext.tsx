import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

type FilterMode = "all" | "selected" | "single";

export type StoreRow = {
  id: string;
  code: string;
  name: string;
  region: string | null;
};

interface StoreFilterContextType {
  selectedStoreIds: string[];
  setSelectedStoreIds: (ids: string[]) => void;
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;

  allStores: StoreRow[];
  filteredStores: StoreRow[];

  selectAllStores: () => void;
  clearSelection: () => void;
  toggleStore: (storeId: string) => void;

  loadingStores: boolean;
  refreshStores: () => Promise<void>;
}

const StoreFilterContext = createContext<StoreFilterContextType | undefined>(undefined);

export function StoreFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [allStores, setAllStores] = useState<StoreRow[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  async function refreshStores() {
    setLoadingStores(true);

    try {
      // 1) Logged-in auth user
      const { data: authData, error: authErr } = await sb.auth.getUser();
      if (authErr) throw authErr;

      const authUserId = authData?.user?.id;
      if (!authUserId) {
        setAllStores([]);
        setSelectedStoreIds([]);
        setFilterMode("all");
        return;
      }

      // 2) App user row
      const { data: appUser, error: appUserErr } = await sb
        .from("users")
        .select("id, role")
        .eq("auth_user_id", authUserId)
        .single();

      if (appUserErr) throw appUserErr;

      let stores: StoreRow[] = [];

      // 3) HQ ADMIN => ALL STORES
      if (appUser.role === "hq_admin") {
        const { data: storeRows, error: storesErr } = await sb
          .from("stores")
          .select("id, code, name, region");

        if (storesErr) throw storesErr;

        stores = (storeRows ?? []) as StoreRow[];
      } else {
        // 4) Store manager => mapped stores only
        const { data: accessRows, error: accessErr } = await sb
          .from("user_store_access")
          .select("store:stores(id, code, name, region)")
          .eq("user_id", appUser.id);

        if (accessErr) throw accessErr;

        stores = (accessRows ?? [])
          .map((r: any) => r.store)
          .filter(Boolean) as StoreRow[];
      }

      // Sort nicely
      stores.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setAllStores(stores);

      // Selection rules:
      // - If no stores, clear
      // - If mode = all, select all ids
      // - If mode = selected, keep only valid ids; if none valid, fall back to all
      if (stores.length === 0) {
        setSelectedStoreIds([]);
        setFilterMode("all");
        return;
      }

      const allIds = stores.map((s) => s.id);
      const idSet = new Set(allIds);

      if (filterMode === "all") {
        setSelectedStoreIds(allIds);
      } else {
        setSelectedStoreIds((prev) => {
          const cleaned = prev.filter((id) => idSet.has(id));
          if (cleaned.length === 0) {
            // fall back to all
            setFilterMode("all");
            return allIds;
          }
          return cleaned;
        });
      }
    } finally {
      setLoadingStores(false);
    }
  }

  useEffect(() => {
    refreshStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStores = useMemo(() => {
    if (filterMode === "all") return allStores;
    const set = new Set(selectedStoreIds);
    return allStores.filter((s) => set.has(s.id));
  }, [filterMode, selectedStoreIds, allStores]);

  function selectAllStores() {
    setSelectedStoreIds(allStores.map((s) => s.id));
    setFilterMode("all");
  }

  function clearSelection() {
    setSelectedStoreIds([]);
    setFilterMode("all");
  }

  function toggleStore(storeId: string) {
    setSelectedStoreIds((prev) => {
      const exists = prev.includes(storeId);
      const next = exists ? prev.filter((id) => id !== storeId) : [...prev, storeId];
      return next;
    });
    setFilterMode("selected");
  }

  const value: StoreFilterContextType = {
    selectedStoreIds,
    setSelectedStoreIds,
    filterMode,
    setFilterMode,
    allStores,
    filteredStores,
    selectAllStores,
    clearSelection,
    toggleStore,
    loadingStores,
    refreshStores,
  };

  return <StoreFilterContext.Provider value={value}>{children}</StoreFilterContext.Provider>;
}

export function useStoreFilter() {
  const ctx = useContext(StoreFilterContext);
  if (!ctx) throw new Error("useStoreFilter must be used within a StoreFilterProvider");
  return ctx;
}
