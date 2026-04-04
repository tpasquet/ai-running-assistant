import { Github } from "lucide-react";

const links = [
  { label: "Conditions générales d'utilisation", href: "/cgu" },
  { label: "Politique de confidentialité", href: "/privacy" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface" role="contentinfo">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <div>
          <span className="font-display text-lg font-bold text-foreground">
            RunCoach <span className="text-primary">AI</span>
          </span>
          <p className="mt-1 text-xs text-muted">
            Votre coach running propulsé par l&apos;IA.
          </p>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap gap-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="https://github.com/tpasquet/ai-running-assistant"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
          className="text-muted hover:text-foreground transition-colors"
        >
          <Github size={20} />
        </a>
      </div>
    </footer>
  );
}
