"use client";

import {
  Bold,
  CheckSquare,
  Eye,
  Heading2,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  ListTodo,
  Minus,
  Pencil,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MarkdownReviewEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const placeholder = "在这里写复盘内容，支持 Markdown 格式。";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderHighlightSyntax(value: string) {
  return escapeHtml(value).replace(/==([^=\n][\s\S]*?[^=\n])==/g, "<mark>$1</mark>");
}

export function MarkdownReviewEditor({
  value,
  onChange,
}: MarkdownReviewEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const previewValue = useMemo(() => renderHighlightSyntax(value), [value]);

  function insertMarkdown(prefix: string, suffix = "", fallback = "") {
    const textarea = textareaRef.current;

    if (!textarea) {
      onChange(`${value}${prefix}${fallback}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);
    const insertedText = selectedText || fallback;
    const nextValue = `${value.slice(0, start)}${prefix}${insertedText}${suffix}${value.slice(end)}`;
    const nextCursor = start + prefix.length + insertedText.length;

    onChange(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function insertBlock(markdown: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const needsLeadingBreak = start > 0 && !value.slice(0, start).endsWith("\n");
    const prefix = needsLeadingBreak ? `\n${markdown}` : markdown;

    insertMarkdown(prefix, "", "");
  }

  const toolbarItems = [
    {
      label: "标题",
      icon: Heading2,
      action: () => insertBlock("## 标题"),
    },
    {
      label: "加粗",
      icon: Bold,
      action: () => insertMarkdown("**", "**", "加粗文字"),
    },
    {
      label: "斜体",
      icon: Italic,
      action: () => insertMarkdown("*", "*", "斜体文字"),
    },
    {
      label: "高亮",
      icon: Highlighter,
      action: () => insertMarkdown("==", "==", "高亮文字"),
    },
    {
      label: "链接",
      icon: Link2,
      action: () => insertMarkdown("[", "](https://example.com)", "链接文字"),
    },
    {
      label: "图片",
      icon: ImageIcon,
      action: () =>
        insertMarkdown("![", "](https://example.com/image.png)", "图片说明"),
    },
    {
      label: "分隔线",
      icon: Minus,
      action: () => insertBlock("---"),
    },
    {
      label: "待办",
      icon: ListTodo,
      action: () => insertBlock("- [ ] 待完成事项"),
    },
    {
      label: "已完成",
      icon: CheckSquare,
      action: () => insertBlock("- [x] 已完成事项"),
    },
  ];

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">复盘正文</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            支持标题、链接、图片 URL、待办和基础 Markdown 笔记格式。
          </p>
        </div>
        <div className="flex rounded-md border border-border bg-background p-1">
          <button
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded px-3 text-sm transition",
              mode === "edit"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode("edit")}
            type="button"
          >
            <Pencil aria-hidden="true" className="size-4" />
            编辑
          </button>
          <button
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded px-3 text-sm transition",
              mode === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode("preview")}
            type="button"
          >
            <Eye aria-hidden="true" className="size-4" />
            预览
          </button>
        </div>
      </div>

      {mode === "edit" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {toolbarItems.map((item) => {
              const Icon = item.icon;

              return (
                <Button
                  key={item.label}
                  onClick={item.action}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>
          <textarea
            className="min-h-80 w-full rounded-md border border-input bg-background px-3 py-3 font-mono text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            ref={textareaRef}
            value={value}
          />
        </>
      ) : (
        <div className="min-h-80 rounded-md border border-input bg-background px-4 py-3">
          {value.trim() ? (
            <ReactMarkdown
              components={{
                a: ({ children, href }) => (
                  <a
                    className="text-primary underline underline-offset-4"
                    href={href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/30 pl-4 text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                h1: ({ children }) => (
                  <h1 className="text-2xl font-semibold leading-tight">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold leading-tight">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold leading-tight">{children}</h3>
                ),
                hr: () => <hr className="border-border" />,
                img: ({ alt, src }) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={alt ?? ""}
                    className="max-h-96 rounded-md border border-border object-contain"
                    src={src ?? ""}
                  />
                ),
                input: (props) => (
                  <input
                    {...props}
                    className="mr-2 align-middle accent-primary"
                    disabled
                    type="checkbox"
                  />
                ),
                li: ({ children }) => <li className="leading-7">{children}</li>,
                mark: ({ children }) => (
                  <mark className="rounded bg-yellow-200 px-1 text-yellow-950">
                    {children}
                  </mark>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal space-y-1 pl-5">{children}</ol>
                ),
                p: ({ children }) => (
                  <p className="text-sm leading-7 text-foreground">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc space-y-1 pl-5">{children}</ul>
                ),
              }}
              rehypePlugins={[rehypeRaw]}
              remarkPlugins={[remarkGfm]}
            >
              {previewValue}
            </ReactMarkdown>
          ) : (
            <p className="text-sm text-muted-foreground">{placeholder}</p>
          )}
        </div>
      )}
    </section>
  );
}
