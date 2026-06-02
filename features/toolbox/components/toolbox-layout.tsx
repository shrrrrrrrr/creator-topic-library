"use client";

import { Wrench } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToolboxPanel } from "@/features/toolbox/components/toolbox-panel";

export function ToolboxLayout({ children }: { children: React.ReactNode }) {
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);

  return (
    <div
      className={cn(
        "space-y-4",
        isToolboxOpen &&
          "relative left-1/2 w-[min(calc(100vw-2rem),72rem)] -translate-x-1/2"
      )}
    >
      <div className="flex justify-end">
        <Button
          aria-expanded={isToolboxOpen}
          onClick={() => setIsToolboxOpen((currentValue) => !currentValue)}
          type="button"
          variant={isToolboxOpen ? "secondary" : "default"}
        >
          <Wrench aria-hidden="true" className="size-4" />
          工具箱
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-5",
          isToolboxOpen ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1"
        )}
      >
        <div className="min-w-0">{children}</div>
        {isToolboxOpen ? <ToolboxPanel /> : null}
      </div>
    </div>
  );
}
