"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpenCheck,
  ChevronRight,
  ClipboardCheck,
  Image as ImageIcon,
  Laptop,
  Library,
  LogOut,
  NotebookPen,
  Palette,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Trophy,
  Upload,
  Wrench,
  UserRound,
  X,
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
import { uploadToolboxImage } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import type { ThemeColor, UserSettings } from "@/types/settings";

const defaultSettings: UserSettings = {
  nickname: "创作者",
  avatarUrl: "",
  themeColor: "cyan",
};

const guideItems = [
  {
    title: "登录和退出登录",
    description:
      "首次访问先登录或注册；勾选记住登录后，同一设备下次可直接进入。需要切换账号时，在我的页面底部退出登录。",
    icon: UserRound,
  },
  {
    title: "建立选题",
    description:
      "在选题库中新建选题，记录标题、描述、标签、参考链接和素材链接，让零散灵感沉淀为可管理的选题资产。",
    icon: Library,
  },
  {
    title: "使用标签",
    description:
      "在评分页进入标签管理，创建颜色和说明。新建或编辑选题时选择已有标签，状态和标签分开管理。",
    icon: Tags,
  },
  {
    title: "使用评分模板",
    description:
      "在评分页维护评分标准和权重，权重总和为 1。可以添加额外加分项，形成自己的选题判断逻辑。",
    icon: ClipboardCheck,
  },
  {
    title: "给选题评分",
    description:
      "在评分页搜索并选择选题，套用评分模板，为每条标准打分。系统会计算总分并更新 S、A、B、C 等级。",
    icon: Trophy,
  },
  {
    title: "查看不同评分等级",
    description:
      "选题库按等级展示文件夹。点击 S、A、B、C 或已完成分组，可以查看对应选题列表。",
    icon: Search,
  },
  {
    title: "复盘 Markdown 编辑器",
    description:
      "发布后进入复盘，用 Markdown 写正文。支持标题、分隔线、加粗、斜体、高亮、链接、图片和任务勾选。",
    icon: NotebookPen,
  },
  {
    title: "使用工具箱",
    description:
      "在选题库、评分、复盘右上角打开工具箱，保存常用网址。图标可编辑、删除、上传封面，并按桌面网格摆放。",
    icon: Wrench,
  },
  {
    title: "修改主题和个人信息",
    description:
      "在我的页面切换主题色会自动保存。点击创作者卡片，可以设置昵称、头像，并管理当前账号的关联设备。",
    icon: Palette,
  },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function summarizeUserAgent(userAgent: string) {
  if (!userAgent) {
    return "未知设备";
  }

  const browser = userAgent.includes("Edg")
    ? "Edge"
    : userAgent.includes("Chrome")
      ? "Chrome"
      : userAgent.includes("Firefox")
        ? "Firefox"
        : userAgent.includes("Safari")
          ? "Safari"
          : "浏览器";
  const system = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Mac OS")
      ? "macOS"
      : userAgent.includes("Android")
        ? "Android"
        : userAgent.includes("iPhone") || userAgent.includes("iPad")
          ? "iOS"
          : "未知系统";

  return `${browser} · ${system}`;
}

export function SettingsPanel() {
  const { applyTheme, currentThemeColor, themes } = useTheme();
  const { profile, refreshProfile, signOut, user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const skipAutoSaveRef = useRef(true);

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
        skipAutoSaveRef.current = true;
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

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const nextNickname = settings.nickname.trim() || defaultSettings.nickname;
        const nextAvatarUrl = settings.avatarUrl?.trim() ?? "";
        const nextSettings = await updateUserSettings({
          nickname: nextNickname,
          avatarUrl: nextAvatarUrl,
          themeColor: settings.themeColor,
        });

        if (profile && isSupabaseConfigured()) {
          const supabaseClient = getSupabaseClient();
          const { data: isAvailable, error: availabilityError } =
            await supabaseClient.rpc("is_nickname_available", {
              nickname_input: nextNickname,
              current_user_id: profile.user_id,
            });

          if (
            availabilityError &&
            !/function .* does not exist/i.test(availabilityError.message)
          ) {
            throw availabilityError;
          }

          if (isAvailable === false) {
            throw new Error("昵称已存在，换一个试试吧~");
          }

          const { error } = await supabaseClient
            .from("profiles")
            .update({
              nickname: nextNickname,
              avatar_url: nextAvatarUrl || null,
            })
            .eq("user_id", profile.user_id);

          if (error) {
            throw error;
          }

          await refreshProfile();
        }

        setSettings((previousSettings) => ({
          ...previousSettings,
          nickname: nextSettings.nickname,
          avatarUrl: nextSettings.avatarUrl,
        }));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "设置自动保存失败。");
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [
    isLoading,
    profile,
    refreshProfile,
    settings.avatarUrl,
    settings.nickname,
    settings.themeColor,
  ]);

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

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploadingAvatar(true);

    try {
      const uploadedUrl = await uploadToolboxImage(file, "avatars");
      const nextSettings = await updateUserSettings({ avatarUrl: uploadedUrl });

      if (profile && isSupabaseConfigured()) {
        const supabaseClient = getSupabaseClient();
        const { error } = await supabaseClient
          .from("profiles")
          .update({ avatar_url: uploadedUrl })
          .eq("user_id", profile.user_id);

        if (error) {
          throw error;
        }

        await refreshProfile();
      }

      setSettings((previousSettings) => ({
        ...previousSettings,
        avatarUrl: nextSettings.avatarUrl,
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "头像上传失败。");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  }

  async function handleRemoveDevice(device: ActiveDevice) {
    const isCurrentDevice = device.device_id === getCurrentDeviceId();
    const shouldRemove = window.confirm(`确定将设备「${device.device_name}」下线吗？`);

    if (!shouldRemove) {
      return;
    }

    try {
      if (isCurrentDevice) {
        await signOut();
        return;
      }

      await removeActiveDevice(device.id);
      await loadDevices();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "设备下线失败。");
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
        description="管理账号入口、基础主题色、版本信息和使用指引。"
      />

      {isLoading ? <LoadingState /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading ? (
        <div className="space-y-5">
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarUpload}
            ref={avatarInputRef}
            type="file"
          />

          <button
            className="w-full rounded-lg border border-primary/20 bg-card p-4 text-left shadow-sm transition hover:border-primary"
            onClick={() => setIsCreatorOpen(true)}
            type="button"
          >
            <div className="flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {settings.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="头像预览"
                    className="size-full object-cover object-center"
                    src={settings.avatarUrl}
                  />
                ) : (
                  <UserRound
                    aria-hidden="true"
                    className="size-9 text-muted-foreground"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold">
                  {settings.nickname || "创作者"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  昵称：{profile?.nickname ?? settings.nickname ?? "本地模式"}
                </p>
              </div>
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
            </div>
          </button>

          <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div>
              <h2 className="text-base font-semibold">主题色</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                影响主要按钮、底部导航高亮和卡片强调色，点击后自动保存。
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

          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <button
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setIsGuideOpen(true)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <BookOpenCheck aria-hidden="true" className="size-4 text-primary" />
                <span className="text-base font-semibold">新手指引</span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
            </button>
          </section>

          <Button
            className="w-full"
            disabled={isSigningOut || !isSupabaseConfigured()}
            onClick={handleSignOut}
            type="button"
            variant="secondary"
          >
            <LogOut aria-hidden="true" className="size-4" />
            {isSigningOut ? "退出中..." : "退出登录"}
          </Button>
        </div>
      ) : null}

      {isCreatorOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          role="dialog"
        >
          <div className="max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">创作者</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  设置昵称、头像，并管理当前账号的关联设备。
                </p>
              </div>
              <Button
                aria-label="关闭创作者弹窗"
                onClick={() => setIsCreatorOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="space-y-2 text-sm font-medium">
                <span>昵称</span>
                <input
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => updateField("nickname", event.target.value)}
                  placeholder="输入昵称"
                  value={settings.nickname}
                />
              </label>
              <div className="space-y-2 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <ImageIcon aria-hidden="true" className="size-4" />
                  头像
                </span>
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-3">
                  <Button
                    disabled={isUploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                    type="button"
                    variant="secondary"
                  >
                    <Upload aria-hidden="true" className="size-4" />
                    {isUploadingAvatar ? "上传中..." : "上传头像"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    支持 JPG、PNG、WebP、GIF，旧头像链接仍会正常显示。
                  </span>
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">关联设备</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
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

                {isLoadingDevices ? <LoadingState /> : null}

                {isSupabaseConfigured() && devices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无设备记录。</p>
                ) : null}

                {devices.length > 0 ? (
                  <div className="space-y-2">
                    {devices.map((device) => {
                      const isCurrentDevice =
                        device.device_id === getCurrentDeviceId();

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
                              {summarizeUserAgent(device.user_agent)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              最近活动：{formatDateTime(device.last_seen_at)}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleRemoveDevice(device)}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                            <span className="sr-only">下线设备</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isGuideOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          role="dialog"
        >
          <div className="max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">新手指引</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  按照“选题 → 评分 → 创作 → 复盘”的顺序使用即可。
                </p>
              </div>
              <Button
                aria-label="关闭新手指引弹窗"
                onClick={() => setIsGuideOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <div className="mt-4 grid gap-3">
              {guideItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="flex gap-3 rounded-lg border border-border bg-background p-3"
                    key={item.title}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                  <div>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
