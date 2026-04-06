import { cn } from "@/lib/utils.ts";
import { RunningIllustration } from "./RunningIllustration.tsx";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ title, subtitle, children, className }: AuthCardProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — illustration (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%]">
        <RunningIllustration />
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Logo (mobile only — hidden on desktop where SVG shows it) */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
              RC
            </div>
          </div>

          <div className="mb-8 text-center">
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
    </div>
  );
}
