import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { AuthCard } from "@/components/AuthCard.tsx";
import { SocialButton } from "@/components/SocialButton.tsx";
import { register, startGoogleOAuth, DASHBOARD_URL, type ApiError } from "@/lib/auth.ts";

const schema = z.object({
  name: z.string().min(2, "Prénom requis (2 caractères min)"),
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "8 caractères minimum")
    .regex(/[A-Z]/, "Une majuscule requise")
    .regex(/[0-9]/, "Un chiffre requis"),
});

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = schema.safeParse({ name, email, password });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Formulaire invalide");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      window.location.href = DASHBOARD_URL;
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Créer un compte" subtitle="Rejoignez RunCoach AI gratuitement">
      <div className="space-y-3">
        <SocialButton provider="google" onClick={startGoogleOAuth} disabled={loading} />
      </div>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-error">{error}</p>
        )}

        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
            Prénom
          </label>
          <input
            id="name"
            type="text"
            autoComplete="given-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Thomas"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8+ car., 1 maj., 1 chiffre"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Création…" : "Créer mon compte"}
        </button>

        <p className="text-center text-xs text-muted">
          En créant un compte, vous acceptez nos{" "}
          <a href="#" className="text-primary hover:underline">
            Conditions d&apos;utilisation
          </a>
        </p>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Déjà un compte ?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
}
