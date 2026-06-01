type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="rounded-lg border border-dashed border-border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
