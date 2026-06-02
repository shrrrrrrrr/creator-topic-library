"use client";

import { useEffect, useState } from "react";
import { Database, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import {
  hasLegacyLocalData,
  importLegacyLocalDataToCurrentUser,
  isLocalDataMigrationDone,
} from "@/lib/data/local-migration";
import { isSupabaseConfigured } from "@/lib/supabase";

export function LocalDataMigrationPrompt() {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setShouldShow(false);
      return;
    }

    setShouldShow(
      hasLegacyLocalData() && !isLocalDataMigrationDone(user.id)
    );
  }, [user]);

  async function handleImport() {
    if (!user) {
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);

    try {
      await importLegacyLocalDataToCurrentUser(user.id);
      setShouldShow(false);
      window.location.reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "本地数据导入失败。");
      setIsImporting(false);
    }
  }

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-xl rounded-lg border border-primary/25 bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Database aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-card-foreground">
                检测到本地旧数据
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                检测到本地旧数据，是否导入到当前账号？
              </p>
            </div>
            <button
              className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => setShouldShow(false)}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">关闭</span>
            </button>
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              disabled={isImporting}
              onClick={() => setShouldShow(false)}
              type="button"
              variant="secondary"
            >
              暂不导入
            </Button>
            <Button disabled={isImporting} onClick={handleImport} type="button">
              {isImporting ? "导入中..." : "导入"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
