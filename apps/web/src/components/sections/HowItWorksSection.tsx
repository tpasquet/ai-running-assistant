import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SectionWrapper } from "@/components/shared/SectionWrapper";

const steps = [
  {
    number: "01",
    title: "Connectez Strava",
    description: "Autorisez RunCoach AI à accéder à vos activités Strava en un clic. Vos 90 derniers jours sont importés automatiquement.",
  },
  {
    number: "02",
    title: "L'IA analyse vos données",
    description: "Nos trois agents spécialisés calculent votre charge d'entraînement, détectent les risques et évaluent votre état de forme.",
  },
  {
    number: "03",
    title: "Recevez vos recommandations",
    description: "Chaque jour, une recommandation personnalisée : séance à réaliser, conseils de récupération, alertes de surmenage.",
  },
];

// Unsplash — free to use. Runner on road, motion blur
const ILLUSTRATION_URL =
  "https://plus.unsplash.com/premium_photo-1674605365723-15e6749630f4?auto=format&fit=crop&w=1200&q=80";

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <SectionWrapper id="how-it-works">
      <div ref={ref} className="space-y-12">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Comment ça marche ?
          </h2>
        </div>

        <div className="relative flex flex-col gap-8 lg:flex-row lg:gap-0">
          {/* Connector line (desktop only) */}
          <div className="absolute left-0 right-0 top-8 hidden border-t border-dashed border-border lg:block" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative flex flex-1 flex-col items-center text-center lg:px-8"
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              {/* Pill step number — matches Figma */}
              <div className="relative z-10 mb-6 flex h-14 w-8 items-center justify-center rounded-full border-2 border-primary bg-background font-display text-xs font-bold text-primary">
                {step.number}
              </div>
              <h3 className="mb-3 font-display text-lg font-bold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Photo illustration */}
        <motion.div
          className="relative mt-8 overflow-hidden rounded-2xl"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <img
            src={ILLUSTRATION_URL}
            alt="Coureurs sur route"
            className="h-56 w-full object-cover object-center sm:h-72 lg:h-80"
          />
          {/* Orange tint overlay */}
          <div className="absolute inset-0 bg-primary/20" />
          {/* Tagline overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-display text-xl font-bold text-white drop-shadow-lg sm:text-2xl lg:text-3xl">
              Chaque foulée compte.
            </p>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
