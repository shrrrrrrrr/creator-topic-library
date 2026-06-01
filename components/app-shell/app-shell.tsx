import { BottomNav } from "@/components/app-shell/bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
        <div className="flex-1 px-5 pb-28 pt-6 sm:px-8">{children}</div>
        <BottomNav />
      </div>
    </div>
  );
}
