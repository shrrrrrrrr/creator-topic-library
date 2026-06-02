import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell/app-shell";
import { ThemeProvider } from "@/components/app-shell/theme-provider";
import { AuthProvider } from "@/features/auth/auth-provider";

export const metadata: Metadata = {
  title: "自媒体选题库与评分工具",
  description: "单人使用的自媒体选题库、评分与复盘工具。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
