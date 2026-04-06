import { cn } from "@/lib/utils.ts";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ title, subtitle, children, className }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
            RC
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          )}
        </div>

        <div className={cn("rounded-2xl border border-border bg-white p-6 shadow-sm", className)}>
          {children}
        </div>
      </div>
    </div>
  );
}
