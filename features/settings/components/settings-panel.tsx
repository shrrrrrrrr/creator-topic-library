"use client";

import { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  Laptop,
  LogOut,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTheme } from "@/components/app-shell/theme-provider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { AboutSection } from "@/features/settings/components/about-section";
import {
  type ActiveDevice,
  getActiveDevices,
  getCurrentDeviceId,
  removeActiveDevice,
} from "@/lib/auth/devices";
import { getUserSettings, updateUserSettings } from "@/lib/data/repository";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { ThemeColor, UserSettings } from "@/types/settings";

const defaultSettings: UserSettings = {
  nickname: "创作者",
  avatarUrl: "",
  themeColor: "cyan",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SettingsPanel() {
  const { applyTheme, currentThemeColor, themes } = useTheme();
  const { profile, refreshProfile, signOut, user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadDevices() {
    if (!user || !isSupabaseConfigured()) {
      setDevices([]);
      return;
    }

    setIsLoadingDevices(true);

    try {
      setDevices(await getActiveDevices(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "设备列表加载失败。");
    } finally {
      setIsLoadingDevices(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const storedSettings = await getUserSettings();
        const nextSettings = {
          ...storedSettings,
          nickname: profile?.nickname ?? storedSettings.nickname,
          avatarUrl: profile?.avatar_url ?? storedSettings.avatarUrl,
        };

        if (!isMounted) {
          return;
        }

        setSettings(nextSettings);
        applyTheme(nextSettings.themeColor);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "设置加载失败。");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [applyTheme, profile]);

  useEffect(() => {
    loadDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function updateField<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) {
    setSettings((previousSettings) => ({
      ...previousSettings,
      [key]: value,
    }));
  }

  async function handleThemeChange(themeColor: ThemeColor) {
    updateField("themeColor", themeColor);
    applyTheme(themeColor);
    setSuccessMessage(null);

    try {
      const nextSettings = await updateUserSettings({ themeColor });
      setSettings((previousSettings) => ({
        ...previousSettings,
        themeColor: nextSettings.themeColor,
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "主题色保存失败。");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const nextSettings = await updateUserSettings({
        nickname: settings.nickname.trim() || defaultSettings.nickname,
        avatarUrl: settings.avatarUrl?.trim() ?? "",
        themeColor: settings.themeColor,
      });

      if (profile && isSupabaseConfigured()) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
          .from("profiles")
          .update({
            nickname: nextSettings.nickname,
            avatar_url: nextSettings.avatarUrl ?? null,
          })
          .eq("user_id", profile.user_id);

        if (error) {
          throw error;
        }

        await refreshProfile();
      }

      setSettings(nextSettings);
      applyTheme(nextSettings.themeColor);
      setSuccessMessage("设置已保存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "设置保存失败。");
    }
  }

  async function handleRemoveDevice(device: ActiveDevice) {
    if (device.device_id === getCurrentDeviceId()) {
      setErrorMessage("不能在这里移除当前设备，请使用退出登录。");
      return;
    }

    const shouldRemove = window.confirm(`确定移除设备「${device.device_name}」吗？`);

    if (!shouldRemove) {
      return;
    }

    try {
      await removeActiveDevice(device.id);
      await loadDevices();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "设备移除失败。");
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      await signOut();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "退出登录失败。");
      setIsSigningOut(false);
    }
  }

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="我的"
        description="管理当前账号信息、在线设备、头像和基础主题色。"
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
                  <UserRound
                    aria-hidden="true"
                    className="size-9 text-muted-foreground"
                  />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">
                  {settings.nickname || "创作者"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  用户名：{profile?.username ?? "本地模式"}
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
                placeholder="粘贴图片链接，第一版不做文件上传"
                value={settings.avatarUrl ?? ""}
              />
            </label>
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">在线设备</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  同一账号最多保留 5 台有效设备，30 天无活动会自动过期。
                </p>
              </div>
              <Button
                disabled={isLoadingDevices || !isSupabaseConfigured()}
                onClick={loadDevices}
                size="sm"
                type="button"
                variant="secondary"
              >
                刷新
              </Button>
            </div>

            {!isSupabaseConfigured() ? (
              <p className="text-sm text-muted-foreground">
                当前为本地模式，未启用设备限制。
              </p>
            ) : null}

            {isSupabaseConfigured() && devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                暂无设备记录，刷新后会显示当前设备。
              </p>
            ) : null}

            {devices.length > 0 ? (
              <div className="space-y-2">
                {devices.map((device) => {
                  const isCurrentDevice = device.device_id === getCurrentDeviceId();

                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                      key={device.id}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <Laptop aria-hidden="true" className="size-4" />
                          <span className="truncate">{device.device_name}</span>
                          {isCurrentDevice ? (
                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              当前设备
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          最近活动：{formatDateTime(device.last_seen_at)}
                        </p>
                      </div>
                      <Button
                        disabled={isCurrentDevice}
                        onClick={() => handleRemoveDevice(device)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        <span className="sr-only">移除设备</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : null}
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
                      isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border"
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

          <AboutSection />

          {successMessage ? (
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
              {successMessage}
            </div>
          ) : null}

          <div className="sticky bottom-20 z-10 flex gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
            <Button className="flex-1" type="submit">
              <Save aria-hidden="true" className="size-4" />
              保存设置
            </Button>
            <Button
              className="flex-1"
              disabled={isSigningOut || !isSupabaseConfigured()}
              onClick={handleSignOut}
              type="button"
              variant="secondary"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {isSigningOut ? "退出中..." : "退出登录"}
            </Button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
