"use client";

import { useState } from "react";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";

export function AuthPage() {
  const { errorMessage, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignIn = mode === "sign-in";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      if (isSignIn) {
        await signIn({ username, password, rememberLogin });
      } else {
        await signUp({ username, password, confirmPassword, rememberLogin });
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setLocalError(null);
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LockKeyhole aria-hidden="true" className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">creator-topic-library v1.1</p>
            <h1 className="mt-1 text-2xl font-semibold">自媒体选题库与评分工具</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              请先登录或注册账号。登录后，你的数据会按用户隔离保存。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 rounded-lg border border-border bg-muted p-1">
          <button
            className={cn(
              "h-10 rounded-md text-sm font-medium transition",
              isSignIn ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
            onClick={() => switchMode("sign-in")}
            type="button"
          >
            登录
          </button>
          <button
            className={cn(
              "h-10 rounded-md text-sm font-medium transition",
              !isSignIn ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
            onClick={() => switchMode("sign-up")}
            type="button"
          >
            注册
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2 text-sm font-medium">
            <span>昵称</span>
            <input
              autoComplete="username"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入昵称"
              value={username}
            />
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>密码</span>
            <input
              autoComplete={isSignIn ? "current-password" : "new-password"}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              maxLength={20}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="6 到 20 位密码"
              type="password"
              value={password}
            />
          </label>

          {!isSignIn ? (
            <label className="space-y-2 text-sm font-medium">
              <span>确认密码</span>
              <input
                autoComplete="new-password"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                maxLength={20}
                minLength={6}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="请再次输入密码"
                type="password"
                value={confirmPassword}
              />
            </label>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={rememberLogin}
              className="size-4 accent-primary"
              onChange={(event) => setRememberLogin(event.target.checked)}
              type="checkbox"
            />
            记住密码 / 记住登录（不保存明文密码）
          </label>

          {localError || errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {localError ?? errorMessage}
            </div>
          ) : null}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSignIn ? (
              <LogIn aria-hidden="true" className="size-4" />
            ) : (
              <UserPlus aria-hidden="true" className="size-4" />
            )}
            {isSubmitting ? "处理中..." : isSignIn ? "登录" : "注册"}
          </Button>
        </form>
      </section>
    </main>
  );
}
