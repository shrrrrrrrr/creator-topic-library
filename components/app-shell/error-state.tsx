type ErrorStateProps = {
  message?: string;
};

export function ErrorState({ message = "页面加载失败，请稍后重试。" }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
      {message}
    </div>
  );
}
