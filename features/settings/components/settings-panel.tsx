"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Save, Sparkles, UserRound } from "lucide-react";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTheme } from "@/components/app-shell/theme-provider";
import { Button } from "@/components/ui/button";
import { getUserSettings, updateUserSettings } from "@/lib/storage/app-storage";
import { cn } from "@/lib/utils";
import type { ThemeColor, UserSettings } from "@/types/settings";

const defaultSettings: UserSettings = {
  nickname: "创作者",
  avatarUrl: "",
  themeColor: "cyan",
};

export function SettingsPanel() {
  const { applyTheme, currentThemeColor, themes } = useTheme();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedSettings = getUserSettings();
      setSettings(storedSettings);
      applyTheme(storedSettings.themeColor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "设置加载失败。");
    } finally {
      setIsLoading(false);
    }
  }, [applyTheme]);

  function updateField<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((previousSettings) => ({
      ...previousSettings,
      [key]: value,
    }));
  }

  function handleThemeChange(themeColor: ThemeColor) {
    updateField("themeColor", themeColor);
    applyTheme(themeColor);
    setSuccessMessage(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nextSettings = updateUserSettings({
        nickname: settings.nickname.trim() || defaultSettings.nickname,
        avatarUrl: settings.avatarUrl?.trim() ?? "",
        themeColor: settings.themeColor,
      });

      setSettings(nextSettings);
      applyTheme(nextSettings.themeColor);
      setSuccessMessage("设置已保存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "设置保存失败。");
    }
  }

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="我的"
        description="设置本地昵称、头像和基础主题色。"
      />

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <section className="rounded-lg border border-primary/20 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {settings.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="头像预览"
                    className="size-full object-cover"
                    src={settings.avatarUrl}
                  />
                ) : (
                  <UserRound aria-hidden="true" className="size-9 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">
                  {settings.nickname || "创作者"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  本地个人设置，不涉及登录和云端同步。
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="text-base font-semibold">个人信息</h2>
            <label className="space-y-2 text-sm font-medium">
              <span>昵称</span>
              <input
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("nickname", event.target.value)}
                placeholder="输入昵称"
                value={settings.nickname}
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span className="flex items-center gap-2">
                <ImageIcon aria-hidden="true" className="size-4" />
                头像链接
              </span>
              <input
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => updateField("avatarUrl", event.target.value)}
                placeholder="粘贴图片链接，第一版不做云上传"
                value={settings.avatarUrl ?? ""}
              />
            </label>
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div>
              <h2 className="text-base font-semibold">主题色</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                影响主要按钮、底部导航高亮和卡片强调色。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {(Object.keys(themes) as ThemeColor[]).map((themeColor) => {
                const theme = themes[themeColor];
                const isSelected = settings.themeColor === themeColor;

                return (
                  <button
                    className={cn(
                      "flex h-20 flex-col items-center justify-center gap-2 rounded-lg border bg-background text-sm transition hover:border-primary",
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                    )}
                    key={themeColor}
                    onClick={() => handleThemeChange(themeColor)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="size-6 rounded-full border border-black/10"
                      style={{ backgroundColor: `hsl(${theme.primary})` }}
                    />
                    <span>{theme.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              当前主题：{themes[currentThemeColor].label}
            </p>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              <h2 className="text-base font-semibold">未来扩展</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              第一版只保留基础主题色。完整主题包、桌宠外观和互动设置会在后续版本进入这里。
            </p>
          </section>

          {successMessage ? (
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
              {successMessage}
            </div>
          ) : null}

          <div className="sticky bottom-20 z-10 flex justify-end rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
            <Button type="submit">
              <Save aria-hidden="true" className="size-4" />
              保存设置
            </Button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
