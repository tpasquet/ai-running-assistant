import { cn } from "@/lib/utils.ts";

// Unsplash — free to use (Unsplash License, commercial use allowed)
// Photo by Sporlab: runners on road, dynamic group shot
const PHOTO_URL =
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ title, subtitle, children, className }: AuthCardProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — photo (desktop only) */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative flex-col justify-end overflow-hidden"
        style={{
          backgroundImage: `url(${PHOTO_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Gradient overlay — top subtle + strong bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Branding over photo */}
        <div className="relative z-10 p-10">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
            RC
          </div>
          <p className="font-display text-2xl font-bold text-white leading-snug">
            Courez plus loin.
            <br />
            Récupérez mieux.
          </p>
          <p className="mt-2 text-sm text-white/60">
            Votre coach IA personnel, connecté à Strava.
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Logo (mobile only) */}
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
