"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, ChartNoAxesColumn, RotateCcw, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "选题库", icon: BookOpenText },
  { href: "/score", label: "评分", icon: ChartNoAxesColumn },
  { href: "/review", label: "复盘", icon: RotateCcw },
  { href: "/me", label: "我的", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-3xl grid-cols-4 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors",
                isActive && "text-primary"
              )}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="size-5" strokeWidth={2.1} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
