"use client";

import { ChevronRight, Info, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type VersionNote = {
  version: string;
  title: string;
  items: string[];
};

const versionNotes: VersionNote[] = [
  {
    version: "v1.13",
    title: "v1.13 图片上传优化",
    items: [
      "新增图片上传前自动压缩",
      "头像、工具箱图标封面、工具箱桌面背景图都会在上传前压缩",
      "降低存储和流量占用",
      "提升多人使用时的加载稳定性",
      "保留已有图片和已有用户数据，不做破坏性迁移",
    ],
  },
  {
    version: "v1.12",
    title: "v1.12 体验优化",
    items: [
      "新增选题、评分标准、标签、复盘的删除确认",
      "优化数据保存逻辑，保护已有用户数据",
      "工具箱桌面从 9 个位置扩展到 16 个位置",
      "修复工具箱图标点击打开网址",
      "支持本地上传头像",
      "统一头像、工具箱封面和壁纸的图片裁切显示效果",
    ],
  },
  {
    version: "v1.11",
    title: "v1.11 修复与体验优化",
    items: [
      "修复复盘 Markdown 编辑器",
      "优化登录和退出登录",
      "我的页面设置改为自动保存",
      "工具箱图标改为桌面网格布局",
      "创作者信息和设备管理合并到弹窗",
      "新增新手指引",
    ],
  },
  {
    version: "v1.1",
    title: "v1.1 主要更新",
    items: [
      "新增用户登录注册",
      "支持用户数据云端保存",
      "支持多设备同步",
      "新增关于我们和版本更新",
      "修复主题色切换问题",
      "新增工具箱基础功能",
    ],
  },
  {
    version: "v1.0",
    title: "v1.0 版本记录",
    items: ["选题库", "自定义评分模板", "选题评分", "复盘", "我的与主题设置"],
  },
];

export function AboutSection() {
  const [selectedVersion, setSelectedVersion] = useState<VersionNote | null>(null);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Info aria-hidden="true" className="size-4 text-primary" />
        <h2 className="text-base font-semibold">关于我们</h2>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">
        本工具面向个人自媒体创作者，帮助你把零散灵感沉淀为可管理的选题资产。你可以建立选题库，自定义评分模板，根据自己的创作逻辑判断选题优先级，并在发布后进行复盘，让每一次创作都反过来优化下一次选题判断。
      </p>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">我们的优势</h3>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          <li>比普通表格更聚焦创作者选题。</li>
          <li>比通用笔记工具更强调评分决策。</li>
          <li>比数据平台更轻量，适合个人创作者长期使用。</li>
          <li>
            通过“选题 → 评分 → 创作 → 复盘”的闭环，帮助你形成自己的创作方法论。
          </li>
        </ul>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-medium">版本更新</h3>
        <div className="space-y-2">
          {versionNotes.map((note) => (
            <button
              className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-3 text-left text-sm transition hover:border-primary hover:text-primary"
              key={note.version}
              onClick={() => setSelectedVersion(note)}
              type="button"
            >
              <span>
                <span className="font-medium">{note.version}</span>
                <span className="ml-2 text-muted-foreground">{note.title}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {selectedVersion ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Version
                </p>
                <h3 className="mt-1 text-lg font-semibold">{selectedVersion.title}</h3>
              </div>
              <Button
                aria-label="关闭版本更新弹窗"
                onClick={() => setSelectedVersion(null)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
              {selectedVersion.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
