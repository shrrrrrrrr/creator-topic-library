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
  width: 92,
  height: 104,
};

const grid = {
  padding: 12,
  columnGap: 12,
  rowGap: 12,
};

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

type GridCell = {
  column: number;
  row: number;
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

function getInitialPosition(index: number) {
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    x: grid.padding + column * (iconSize.width + grid.columnGap),
    y: grid.padding + row * (iconSize.height + grid.rowGap),
  };
}

function getCellKey(cell: GridCell) {
  return `${cell.column}:${cell.row}`;
}

export function ToolboxPanel() {
  const desktopRef = useRef<HTMLDivElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressOpenRef = useRef<string | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function getGridMetrics() {
    const desktopRect = desktopRef.current?.getBoundingClientRect();

    if (!desktopRect) {
      return {
        maxColumn: 2,
        maxRow: Number.MAX_SAFE_INTEGER,
      };
    }

    const maxColumn = Math.max(
      0,
      Math.floor(
        (desktopRect.width - grid.padding * 2 - iconSize.width) /
          (iconSize.width + grid.columnGap)
      )
    );
    const maxRow = Math.max(
      0,
      Math.floor(
        (desktopRect.height - grid.padding * 2 - iconSize.height) /
          (iconSize.height + grid.rowGap)
      )
    );

    return { maxColumn, maxRow };
  }

  function getGridCell(x: number, y: number): GridCell {
    const { maxColumn, maxRow } = getGridMetrics();

    return {
      column: clamp(
        Math.round((x - grid.padding) / (iconSize.width + grid.columnGap)),
        0,
        maxColumn
      ),
      row: clamp(
        Math.round((y - grid.padding) / (iconSize.height + grid.rowGap)),
        0,
        maxRow
      ),
    };
  }

  function getGridPosition(cell: GridCell) {
    const { maxColumn, maxRow } = getGridMetrics();

    return {
      x:
        grid.padding +
        clamp(cell.column, 0, maxColumn) * (iconSize.width + grid.columnGap),
      y:
        grid.padding + clamp(cell.row, 0, maxRow) * (iconSize.height + grid.rowGap),
    };
  }

  function getClampedPosition(x: number, y: number) {
    const desktopRect = desktopRef.current?.getBoundingClientRect();

    if (!desktopRect) {
      return { x, y };
    }

    return {
      x: Math.round(
        clamp(x, grid.padding, Math.max(grid.padding, desktopRect.width - iconSize.width - grid.padding))
      ),
      y: Math.round(
        clamp(y, grid.padding, Math.max(grid.padding, desktopRect.height - iconSize.height - grid.padding))
      ),
    };
  }

  function findNearestAvailableCell(targetCell: GridCell, occupiedCells: Set<string>) {
    const { maxColumn, maxRow } = getGridMetrics();
    const finiteMaxRow =
      maxRow === Number.MAX_SAFE_INTEGER
        ? targetCell.row + occupiedCells.size + 6
        : maxRow;
    let nearestCell: GridCell | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let row = 0; row <= finiteMaxRow; row += 1) {
      for (let column = 0; column <= maxColumn; column += 1) {
        const cell = { column, row };

        if (occupiedCells.has(getCellKey(cell))) {
          continue;
        }

        const distance =
          Math.abs(cell.column - targetCell.column) +
          Math.abs(cell.row - targetCell.row);

        if (distance < nearestDistance) {
          nearestCell = cell;
          nearestDistance = distance;
        }
      }
    }

    return nearestCell ?? targetCell;
  }

  function normalizeIconsToGrid(nextIcons: ToolboxIcon[]) {
    const occupiedCells = new Set<string>();

    return nextIcons.map((icon, index) => {
      const fallbackPosition = getInitialPosition(index);
      const targetCell =
        icon.x !== 0 || icon.y !== 0
          ? getGridCell(icon.x, icon.y)
          : getGridCell(fallbackPosition.x, fallbackPosition.y);
      const availableCell = occupiedCells.has(getCellKey(targetCell))
        ? findNearestAvailableCell(targetCell, occupiedCells)
        : targetCell;

      occupiedCells.add(getCellKey(availableCell));

      return {
        ...icon,
        ...getGridPosition(availableCell),
      };
    });
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
      suppressOpenRef.current = dragState.iconId;
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

    if (!dragState.hasMoved) {
      return;
    }

    const targetCell = getGridCell(
      dragState.startIconX + event.clientX - dragState.startPointerX,
      dragState.startIconY + event.clientY - dragState.startPointerY
    );
    const movedIcon = icons.find((icon) => icon.id === dragState.iconId);

    if (!movedIcon) {
      return;
    }

    const originalCell = getGridCell(dragState.startIconX, dragState.startIconY);
    const occupiedIcon = icons.find((icon) => {
      if (icon.id === movedIcon.id) {
        return false;
      }

      return getCellKey(getGridCell(icon.x, icon.y)) === getCellKey(targetCell);
    });
    const finalPosition = getGridPosition(targetCell);
    const swappedPosition = getGridPosition(originalCell);
    const nextIcons = icons.map((icon) => {
      if (icon.id === movedIcon.id) {
        return { ...icon, ...finalPosition };
      }

      if (occupiedIcon && icon.id === occupiedIcon.id) {
        return { ...icon, ...swappedPosition };
      }

      return icon;
    });

    setIcons(nextIcons);

    try {
      await updateToolboxIcon(movedIcon.id, finalPosition);

      if (occupiedIcon) {
        await updateToolboxIcon(occupiedIcon.id, swappedPosition);
      }
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
      setErrorMessage(error instanceof Error ? error.message : "封面上传失败。");
    } finally {
      setIsUploadingCover(false);
      event.target.value = "";
    }
  }

  async function handleWallpaperUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
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
      setErrorMessage(error instanceof Error ? error.message : "壁纸上传失败。");
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

    const occupiedCells = new Set(
      icons
        .filter((icon) => icon.id !== editingIcon?.id)
        .map((icon) => getCellKey(getGridCell(icon.x, icon.y)))
    );
    const targetCell = editingIcon
      ? getGridCell(editingIcon.x, editingIcon.y)
      : findNearestAvailableCell(
          getGridCell(
            getInitialPosition(icons.length).x,
            getInitialPosition(icons.length).y
          ),
          occupiedCells
        );
    const targetPosition = getGridPosition(targetCell);
    const input = {
      name: normalizedName,
      url: normalizedUrl,
      coverType,
      coverColor: coverType === "color" ? coverColor : "",
      coverImageUrl: coverType === "image" ? coverImageUrl : "",
      x: targetPosition.x,
      y: targetPosition.y,
    };

    setIsSaving(true);

    try {
      if (editingIcon) {
        const updatedIcon = await updateToolboxIcon(editingIcon.id, input);

        setIcons((currentIcons) => normalizeIconsToGrid(
          currentIcons.map((icon) =>
            icon.id === updatedIcon.id ? updatedIcon : icon
          )
        ));
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
    if (suppressOpenRef.current === icon.id) {
      suppressOpenRef.current = null;
      return;
    }

    window.open(icon.url, "_blank", "noopener,noreferrer");
  }

  return (
    <aside
      className="min-h-[28rem] rounded-lg border border-primary/20 bg-primary/10 p-4 shadow-sm"
      onClick={() => setContextMenu(null)}
    >
      <input
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
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
            ? { backgroundImage: `url(${wallpaperUrl})` }
            : undefined
        }
      >
        {isLoading || isUploadingWallpaper ? <LoadingState /> : null}
        {errorMessage ? <ErrorState message={errorMessage} /> : null}

        {!isLoading && icons.length === 0 ? (
          <div className="flex min-h-80 items-center justify-center rounded-md border border-dashed border-border bg-background/70 text-sm text-muted-foreground">
            暂无工具箱图标
          </div>
        ) : null}

        {icons.map((icon) => (
          <button
            className="absolute flex cursor-grab select-none flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card/95 p-3 text-center shadow-sm transition hover:border-primary active:cursor-grabbing"
            key={icon.id}
            onClick={() => openIcon(icon)}
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
                className="size-11 rounded-lg border border-border object-cover shadow-sm"
                src={icon.coverImageUrl}
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-lg text-primary-foreground shadow-sm"
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
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
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
                        className="size-10 rounded-lg border border-border object-cover"
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
                    {isUploadingCover ? "上传中..." : "上传图片"}
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
