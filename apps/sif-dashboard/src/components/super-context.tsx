"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  createFallbackViewModel,
  loadPlatformViewModel,
  type PlatformViewModel,
} from "../lib/platform";

type ProvisionInput = {
  name: string;
  email: string;
};

type ProvisionResult = {
  client_id: string;
  api_key: string;
  subdomain: string;
  dashboard_url: string;
  status: string;
  access_status: string;
  access_warning: string | null;
};

type SuperDataContextValue = {
  data: PlatformViewModel;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  provisionClient: (input: ProvisionInput) => Promise<ProvisionResult>;
};

const SuperDataContext = createContext<SuperDataContextValue | null>(null);

export function SuperDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PlatformViewModel>(createFallbackViewModel(null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const nextData = await loadPlatformViewModel();
      startTransition(() => {
        setData(nextData);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      startTransition(() => {
        setData(createFallbackViewModel(message));
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function provisionClient(input: ProvisionInput) {
    const url = new URL("/api/sif/clients/provision", window.location.origin);
    url.searchParams.set("name", input.name);
    url.searchParams.set("email", input.email);

    const response = await fetch(url.toString(), {
      method: "POST",
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `${response.status} ${response.statusText}`);
    }
    const result = (await response.json()) as ProvisionResult;
    await refresh();
    return result;
  }

  useEffect(() => {
    let active = true;

    async function load() {
      if (!active) {
        return;
      }
      await refresh();
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <SuperDataContext.Provider value={{ data, loading, refreshing, refresh, provisionClient }}>
      {children}
    </SuperDataContext.Provider>
  );
}

export function useSuperData() {
  const context = useContext(SuperDataContext);
  if (!context) {
    throw new Error("useSuperData must be used within SuperDataProvider");
  }
  return context;
}
