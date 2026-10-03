export default function PageHeader({
  title,
  description,
  badge,
  action,
  secondaryAction,
  children,
}) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-border">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {(action || secondaryAction || children) && (
        <div className="flex items-center gap-2.5 shrink-0">
          {secondaryAction}
          {action}
          {children}
        </div>
      )}
    </div>
  );
}
