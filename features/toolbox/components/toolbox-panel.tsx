"use client";

import { ExternalLink, Plus, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ErrorState } from "@/components/app-shell/error-state";
import { LoadingState } from "@/components/app-shell/loading-state";
import { Button } from "@/components/ui/button";
import {
  createToolboxIcon,
  deleteToolboxIcon,
  getToolboxIcons,
  getUserSettings,
  updateToolboxIcon,
  updateUserSettings,
} from "@/lib/data/repository";
import { uploadToolboxImage } from "@/lib/supabase/storage";
import type { ToolboxIcon } from "@/types/toolbox";

const coverColors = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const iconSize = {
  width: 76,
  height: 88,
};

const grid = {
  columns: 4,
  rows: 4,
  startX: 8,
  startY: 8,
  gapX: 82,
  gapY: 92,
};

const gridSlots = Array.from({ length: grid.columns * grid.rows }, (_, index) => ({
  x: grid.startX + (index % grid.columns) * grid.gapX,
  y: grid.startY + Math.floor(index / grid.columns) * grid.gapY,
}));

type ContextMenuState =
  | {
      type: "desktop";
      x: number;
      y: number;
    }
  | {
      type: "icon";
      x: number;
      y: number;
      icon: ToolboxIcon;
    }
  | null;

type DragState = {
  iconId: string;
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startIconX: number;
  startIconY: number;
  hasMoved: boolean;
};

function pickRandomCoverColor() {
  return coverColors[Math.floor(Math.random() * coverColors.length)];
}

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  return /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isValidGridIndex(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < gridSlots.length
  );
}

function getGridIndexFromOptionalFields(icon: ToolboxIcon) {
  if (isValidGridIndex(icon.gridIndex)) {
    return icon.gridIndex;
  }

  if (
    typeof icon.gridRow === "number" &&
    typeof icon.gridCol === "number" &&
    Number.isInteger(icon.gridRow) &&
    Number.isInteger(icon.gridCol) &&
    icon.gridRow >= 0 &&
    icon.gridRow < grid.rows &&
    icon.gridCol >= 0 &&
    icon.gridCol < grid.columns
  ) {
    return icon.gridRow * grid.columns + icon.gridCol;
  }

  return null;
}

function getNearestSlotIndex(position: Pick<ToolboxIcon, "x" | "y">) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  gridSlots.forEach((slot, index) => {
    const distance = Math.hypot(position.x - slot.x, position.y - slot.y);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function findAvailableSlotIndex(preferredIndex: number, occupiedSlots: Set<number>) {
  if (!occupiedSlots.has(preferredIndex)) {
    return preferredIndex;
  }

  const preferredSlot = gridSlots[preferredIndex];
  let nearestOpenIndex = -1;
  let nearestOpenDistance = Number.POSITIVE_INFINITY;

  gridSlots.forEach((slot, index) => {
    if (occupiedSlots.has(index)) {
      return;
    }

    const distance = Math.hypot(slot.x - preferredSlot.x, slot.y - preferredSlot.y);

    if (distance < nearestOpenDistance) {
      nearestOpenDistance = distance;
      nearestOpenIndex = index;
    }
  });

  return nearestOpenIndex === -1 ? preferredIndex : nearestOpenIndex;
}

function withGridPosition(icon: ToolboxIcon, slotIndex: number) {
  const slot = gridSlots[slotIndex] ?? gridSlots[0];

  return {
    ...icon,
    x: slot.x,
    y: slot.y,
    gridIndex: slotIndex,
    gridRow: Math.floor(slotIndex / grid.columns),
    gridCol: slotIndex % grid.columns,
  };
}

function normalizeIconsToGrid(nextIcons: ToolboxIcon[]) {
  const occupiedSlots = new Set<number>();

  return nextIcons.map((icon, index) => {
    const explicitGridIndex = getGridIndexFromOptionalFields(icon);
    const preferredIndex =
      explicitGridIndex ??
      (icon.x !== 0 || icon.y !== 0
        ? getNearestSlotIndex(icon)
        : index % gridSlots.length);
    const slotIndex = findAvailableSlotIndex(preferredIndex, occupiedSlots);

    occupiedSlots.add(slotIndex);

    return withGridPosition(icon, slotIndex);
  });
}

function getNextOpenSlotIndex(currentIcons: ToolboxIcon[]) {
  const occupiedSlots = new Set(currentIcons.map((icon) => getNearestSlotIndex(icon)));
  const openSlotIndex = gridSlots.findIndex((_, index) => !occupiedSlots.has(index));

  return openSlotIndex === -1 ? currentIcons.length % gridSlots.length : openSlotIndex;
}

export function ToolboxPanel() {
  const desktopRef = useRef<HTMLDivElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [icons, setIcons] = useState<ToolboxIcon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIcon, setEditingIcon] = useState<ToolboxIcon | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [coverType, setCoverType] = useState<ToolboxIcon["coverType"]>("color");
  const [coverColor, setCoverColor] = useState(pickRandomCoverColor());
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [wallpaperUrl, setWallpaperUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [nextIcons, settings] = await Promise.all([
          getToolboxIcons(),
          getUserSettings(),
        ]);

        if (isMounted) {
          setIcons(normalizeIconsToGrid(nextIcons));
          setWallpaperUrl(settings.toolboxWallpaperUrl ?? "");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "工具箱加载失败。");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  function resetDialog() {
    setName("");
    setUrl("");
    setEditingIcon(null);
    setCoverType("color");
    setCoverColor(pickRandomCoverColor());
    setCoverImageUrl("");
    setIsDialogOpen(false);
  }

  function openCreateDialog() {
    if (icons.length >= gridSlots.length) {
      setContextMenu(null);
      setErrorMessage("程序太多了~");
      return;
    }

    setContextMenu(null);
    setEditingIcon(null);
    setName("");
    setUrl("");
    setCoverType("color");
    setCoverColor(pickRandomCoverColor());
    setCoverImageUrl("");
    setIsDialogOpen(true);
  }

  function openEditDialog(icon: ToolboxIcon) {
    setContextMenu(null);
    setEditingIcon(icon);
    setName(icon.name);
    setUrl(icon.url);
    setCoverType(icon.coverType);
    setCoverColor(icon.coverColor ?? pickRandomCoverColor());
    setCoverImageUrl(icon.coverImageUrl ?? "");
    setIsDialogOpen(true);
  }

  function openDesktopMenu(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    setContextMenu({
      type: "desktop",
      x: event.clientX,
      y: event.clientY,
    });
  }

  function openIconMenu(event: React.MouseEvent<HTMLButtonElement>, icon: ToolboxIcon) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      type: "icon",
      x: event.clientX,
      y: event.clientY,
      icon,
    });
  }

  function getClampedPosition(x: number, y: number) {
    const desktopRect = desktopRef.current?.getBoundingClientRect();

    if (!desktopRect) {
      return { x, y };
    }

    return {
      x: Math.round(clamp(x, 0, Math.max(0, desktopRect.width - iconSize.width))),
      y: Math.round(clamp(y, 0, Math.max(0, desktopRect.height - iconSize.height))),
    };
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    icon: ToolboxIcon
  ) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setContextMenu(null);
    dragStateRef.current = {
      iconId: icon.id,
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startIconX: icon.x,
      startIconY: icon.y,
      hasMoved: false,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;

    if (!dragState) {
      return;
    }

    const deltaX = event.clientX - dragState.startPointerX;
    const deltaY = event.clientY - dragState.startPointerY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragState.hasMoved = true;
    }

    const nextPosition = getClampedPosition(
      dragState.startIconX + deltaX,
      dragState.startIconY + deltaY
    );

    setIcons((currentIcons) =>
      currentIcons.map((icon) =>
        icon.id === dragState.iconId ? { ...icon, ...nextPosition } : icon
      )
    );
  }

  async function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;

    if (!dragState) {
      return;
    }

    event.currentTarget.releasePointerCapture(dragState.pointerId);
    dragStateRef.current = null;

    const movedIcon = icons.find((icon) => icon.id === dragState.iconId);

    if (!movedIcon) {
      return;
    }

    if (!dragState.hasMoved) {
      openIcon(movedIcon);
      return;
    }

    const finalPosition = getClampedPosition(
      dragState.startIconX + event.clientX - dragState.startPointerX,
      dragState.startIconY + event.clientY - dragState.startPointerY
    );
    const targetSlotIndex = getNearestSlotIndex(finalPosition);
    const targetSlot = gridSlots[targetSlotIndex] ?? gridSlots[0];
    const originalSlotIndex = getNearestSlotIndex({
      x: dragState.startIconX,
      y: dragState.startIconY,
    });
    const originalSlot = gridSlots[originalSlotIndex] ?? gridSlots[0];
    const targetIcon = icons.find(
      (icon) =>
        icon.id !== dragState.iconId && getNearestSlotIndex(icon) === targetSlotIndex
    );
    const updates = [
      {
        id: movedIcon.id,
        x: targetSlot.x,
        y: targetSlot.y,
      },
    ];

    if (targetIcon) {
      updates.push({
        id: targetIcon.id,
        x: originalSlot.x,
        y: originalSlot.y,
      });
    }

    setIcons((currentIcons) =>
      currentIcons.map((icon) => {
        if (icon.id === dragState.iconId) {
          return withGridPosition(icon, targetSlotIndex);
        }

        if (targetIcon && icon.id === targetIcon.id) {
          return withGridPosition(icon, originalSlotIndex);
        }

        return icon;
      })
    );

    try {
      await Promise.all(
        updates.map((update) =>
          updateToolboxIcon(update.id, {
            x: update.x,
            y: update.y,
          })
        )
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "工具箱位置保存失败。");
    }
  }

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploadingCover(true);

    try {
      const uploadedUrl = await uploadToolboxImage(file, "covers");
      setCoverType("image");
      setCoverImageUrl(uploadedUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "图片上传失败，请稍后重试。"
      );
    } finally {
      setIsUploadingCover(false);
      event.target.value = "";
    }
  }

  async function handleWallpaperUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || isUploadingWallpaper) {
      return;
    }

    setContextMenu(null);
    setErrorMessage(null);
    setIsUploadingWallpaper(true);

    try {
      const uploadedUrl = await uploadToolboxImage(file, "wallpapers");
      await updateUserSettings({ toolboxWallpaperUrl: uploadedUrl });
      setWallpaperUrl(uploadedUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "图片上传失败，请稍后重试。"
      );
    } finally {
      setIsUploadingWallpaper(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedName = name.trim();
    const normalizedUrl = normalizeUrl(url);

    if (!normalizedName || !normalizedUrl) {
      setErrorMessage("网址和名称不能为空。");
      return;
    }

    if (!editingIcon && icons.length >= gridSlots.length) {
      setErrorMessage("程序太多了~");
      return;
    }

    const createSlotIndex = getNextOpenSlotIndex(icons);
    const createSlot = gridSlots[createSlotIndex] ?? gridSlots[0];
    const input = {
      name: normalizedName,
      url: normalizedUrl,
      coverType,
      coverColor: coverType === "color" ? coverColor : "",
      coverImageUrl: coverType === "image" ? coverImageUrl : "",
      x: editingIcon?.x ?? createSlot.x,
      y: editingIcon?.y ?? createSlot.y,
    };

    setIsSaving(true);

    try {
      if (editingIcon) {
        const updatedIcon = await updateToolboxIcon(editingIcon.id, input);

        setIcons((currentIcons) =>
          currentIcons.map((icon) => (icon.id === updatedIcon.id ? updatedIcon : icon))
        );
      } else {
        const createdIcon = await createToolboxIcon(input);

        setIcons((currentIcons) => normalizeIconsToGrid([createdIcon, ...currentIcons]));
      }

      resetDialog();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "工具箱图标保存失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(icon: ToolboxIcon) {
    setContextMenu(null);

    const shouldDelete = window.confirm(`确定删除「${icon.name}」吗？`);

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteToolboxIcon(icon.id);
      setIcons((currentIcons) =>
        currentIcons.filter((currentIcon) => currentIcon.id !== icon.id)
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "工具箱图标删除失败。");
    }
  }

  function openIcon(icon: ToolboxIcon) {
    const nextUrl = normalizeUrl(icon.url);

    if (!nextUrl) {
      return;
    }

    window.open(nextUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <aside
      className="min-h-[28rem] rounded-lg border border-primary/20 bg-primary/10 p-4 shadow-sm"
      onClick={() => setContextMenu(null)}
    >
      <input
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleWallpaperUpload}
        ref={wallpaperInputRef}
        type="file"
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">工具箱</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            保存常用网址，支持桌面端拖拽摆放。
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" type="button">
          <Plus aria-hidden="true" className="size-4" />
          新建图标
        </Button>
      </div>

      <div
        className="relative mt-4 min-h-96 overflow-hidden rounded-lg border border-primary/10 bg-background/80 bg-cover bg-center p-3"
        onContextMenu={openDesktopMenu}
        ref={desktopRef}
        style={
          wallpaperUrl
            ? {
                backgroundImage: `url(${wallpaperUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : undefined
        }
      >
        {isLoading ? <LoadingState /> : null}
        {isUploadingWallpaper ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            图片正在压缩，请稍等……
          </div>
        ) : null}
        {errorMessage ? <ErrorState message={errorMessage} /> : null}

        {!isLoading && icons.length === 0 ? (
          <div className="flex min-h-80 items-center justify-center rounded-md border border-dashed border-border bg-background/70 text-sm text-muted-foreground">
            暂无工具箱图标
          </div>
        ) : null}

        {icons.map((icon) => (
          <button
            className="absolute flex cursor-grab select-none flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-card/95 p-2 text-center shadow-sm transition hover:border-primary active:cursor-grabbing"
            key={icon.id}
            onContextMenu={(event) => openIconMenu(event, icon)}
            onPointerDown={(event) => handlePointerDown(event, icon)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              height: iconSize.height,
              left: icon.x,
              top: icon.y,
              width: iconSize.width,
            }}
            title={icon.url}
            type="button"
          >
            {icon.coverType === "image" && icon.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="size-10 rounded-lg border border-border object-cover object-center shadow-sm"
                src={icon.coverImageUrl}
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-lg text-primary-foreground shadow-sm"
                style={{ backgroundColor: icon.coverColor ?? "#06b6d4" }}
              >
                <ExternalLink className="size-5 opacity-90" />
              </span>
            )}
            <span className="line-clamp-2 text-xs font-medium leading-4">
              {icon.name}
            </span>
          </button>
        ))}
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-36 overflow-hidden rounded-lg border border-border bg-card py-1 text-sm shadow-lg"
          onClick={(event) => event.stopPropagation()}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === "desktop" ? (
            <>
              <button
                className="block w-full px-3 py-2 text-left hover:bg-muted"
                onClick={openCreateDialog}
                type="button"
              >
                新建图标
              </button>
              <button
                className="block w-full px-3 py-2 text-left hover:bg-muted"
                disabled={isUploadingWallpaper}
                onClick={() => {
                  setContextMenu(null);
                  wallpaperInputRef.current?.click();
                }}
                type="button"
              >
                修改壁纸
              </button>
            </>
          ) : (
            <>
              <button
                className="block w-full px-3 py-2 text-left hover:bg-muted"
                onClick={() => openEditDialog(contextMenu.icon)}
                type="button"
              >
                编辑
              </button>
              <button
                className="block w-full px-3 py-2 text-left text-destructive hover:bg-muted"
                onClick={() => handleDelete(contextMenu.icon)}
                type="button"
              >
                删除
              </button>
            </>
          )}
        </div>
      ) : null}

      {isDialogOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          role="dialog"
        >
          <form
            className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-4 shadow-lg"
            onSubmit={handleSubmit}
          >
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleCoverUpload}
              ref={coverInputRef}
              type="file"
            />

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">
                  {editingIcon ? "编辑图标" : "新建图标"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  封面支持随机纯色或上传图片。
                </p>
              </div>
              <Button
                aria-label="关闭图标弹窗"
                onClick={resetDialog}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <label className="space-y-2 text-sm font-medium">
              <span>网址</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                value={url}
              />
            </label>

            <label className="space-y-2 text-sm font-medium">
              <span>名称</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setName(event.target.value)}
                placeholder="输入图标名称"
                value={name}
              />
            </label>

            <div className="space-y-2 text-sm font-medium">
              <span>封面</span>
              <div className="space-y-3 rounded-md border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {coverType === "image" && coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="size-10 rounded-lg border border-border object-cover object-center"
                        src={coverImageUrl}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="size-10 rounded-lg"
                        style={{ backgroundColor: coverColor }}
                      />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {coverType === "image" ? "图片封面" : "随机纯色"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setCoverType("color");
                      setCoverImageUrl("");
                      setCoverColor(pickRandomCoverColor());
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    随机纯色
                  </Button>
                  <Button
                    disabled={isUploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <Upload aria-hidden="true" className="size-4" />
                    {isUploadingCover ? "图片正在压缩，请稍等……" : "上传图片"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={resetDialog} type="button" variant="secondary">
                取消
              </Button>
              <Button disabled={isSaving || isUploadingCover} type="submit">
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </aside>
  );
}
