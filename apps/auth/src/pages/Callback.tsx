import { useEffect, useState } from "react";
import { DASHBOARD_URL } from "@/lib/auth.ts";

/**
 * OAuth callback page — handles redirect from Google / Apple after auth.
 * The backend /auth/google/callback or /auth/apple/callback sets the JWT
 * cookie and redirects here with ?status=ok or ?status=error&message=...
 */
export function CallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const message = params.get("message");

    if (status === "error") {
      setError(message ?? "Erreur d'authentification");
      return;
    }

    // Success — redirect to dashboard
    window.location.href = DASHBOARD_URL;
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 text-4xl">⚠</div>
          <h1 className="font-display text-xl font-bold text-foreground">Échec de la connexion</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Réessayer
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted">Connexion en cours…</p>
      </div>
    </div>
  );
}
