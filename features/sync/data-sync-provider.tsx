"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const realtimeTables = ["topics", "tags", "score_templates", "reviews"] as const;

type DataSyncContextValue = {
  syncVersion: number;
};

const DataSyncContext = createContext<DataSyncContextValue>({ syncVersion: 0 });

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`current-user-data-sync:${user.id}`);

    realtimeTables.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setSyncVersion((currentVersion) => currentVersion + 1);
        }
      );
    });

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Supabase Realtime data sync is unavailable:", status);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value = useMemo(() => ({ syncVersion }), [syncVersion]);

  return (
    <DataSyncContext.Provider value={value}>{children}</DataSyncContext.Provider>
  );
}

export function useDataSyncVersion() {
  return useContext(DataSyncContext).syncVersion;
}
