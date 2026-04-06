import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { AuthCard } from "@/components/AuthCard.tsx";
import { forgotPassword, type ApiError } from "@/lib/auth.ts";

const schema = z.object({
  email: z.string().email("Email invalide"),
});

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = schema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Email invalide");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthCard title="Email envoyé" subtitle="Vérifiez votre boîte mail">
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez vos spams si vous ne le recevez pas.
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle="Entrez votre email pour recevoir un lien de réinitialisation"
    >
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-error">{error}</p>
        )}

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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Envoi…" : "Envoyer le lien"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </AuthCard>
  );
}
