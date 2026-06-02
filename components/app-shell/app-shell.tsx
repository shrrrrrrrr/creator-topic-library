"use client";

import { useEffect } from "react";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { LoadingState } from "@/components/app-shell/loading-state";
import { useTheme } from "@/components/app-shell/theme-provider";
import { AuthPage } from "@/features/auth/components/auth-page";
import { useAuth } from "@/features/auth/auth-provider";
import { LocalDataMigrationPrompt } from "@/features/migration/components/local-data-migration-prompt";
import { DataSyncProvider } from "@/features/sync/data-sync-provider";
import { getUserSettings } from "@/lib/data/repository";
import { isSupabaseConfigured } from "@/lib/supabase";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, profile, user } = useAuth();
  const { applyTheme } = useTheme();
  const supabaseEnabled = isSupabaseConfigured();

  useEffect(() => {
    if (supabaseEnabled && !profile) {
      return;
    }

    async function loadTheme() {
      try {
        const settings = await getUserSettings();
        applyTheme(settings.themeColor);
      } catch {
        // Theme loading should not block the authenticated app shell.
      }
    }

    loadTheme();
  }, [applyTheme, profile, supabaseEnabled]);

  if (supabaseEnabled && isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5">
        <LoadingState />
      </div>
    );
  }

  if (supabaseEnabled && !user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <DataSyncProvider>
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
          <div className="flex-1 px-5 pb-28 pt-6 sm:px-8">{children}</div>
          <BottomNav />
          <LocalDataMigrationPrompt />
        </div>
      </DataSyncProvider>
    </div>
  );
}
