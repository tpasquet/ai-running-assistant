import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionWrapper } from "@/components/shared/SectionWrapper";

const emailSchema = z.string().email("Adresse email invalide.");

export function CTASection() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError(null);
    setLoading(true);
    // Simulated async submit — replace with real API call when ready
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      console.info("[waitlist] email captured:", email);
    }, 600);
  }

  return (
    <SectionWrapper id="cta" className="text-center">
      <div className="mx-auto max-w-2xl space-y-8">
        <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Rejoignez la beta
          <br />
          <span className="text-primary">en avant-première</span>
        </h2>
        <p className="text-muted">
          Accès limité aux 500 premiers coureurs. Inscrivez-vous pour être notifié à l&apos;ouverture.
        </p>

        {submitted ? (
          <p className="text-lg font-semibold text-primary">
            Merci ! Vous serez notifié à l&apos;ouverture de la beta.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:justify-center"
            noValidate
          >
            <div className="flex-1 sm:max-w-xs">
              <label htmlFor="waitlist-email" className="sr-only">
                Email
              </label>
              <Input
                id="waitlist-email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={error ? "email-error" : undefined}
              />
              {error && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-1 text-left text-xs text-red-400"
                >
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "..." : "S'inscrire"}
            </Button>
          </form>
        )}
      </div>
    </SectionWrapper>
  );
}
