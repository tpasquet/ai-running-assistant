import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/shared/SectionWrapper";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export function HeroSection() {
  return (
    <SectionWrapper className="flex min-h-screen flex-col items-center justify-center pt-20 text-center lg:flex-row lg:text-left">
      <motion.div
        className="flex-1 space-y-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
      >
        <motion.h1
          variants={fadeUp}
          className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          Votre coach running
          <br />
          <span className="text-primary">propulsé par l'IA</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="max-w-xl text-lg text-muted"
        >
          RunCoach AI analyse vos données Strava et génère des recommandations
          d'entraînement personnalisées grâce à trois agents IA spécialisés.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-4 lg:justify-start justify-center">
          <Button size="lg" asChild>
            <a href="#cta">Rejoindre la beta</a>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <a href="#how-it-works">Voir la démo</a>
          </Button>
        </motion.div>
      </motion.div>

      {/* Visual placeholder */}
      <motion.div
        className="mt-12 flex-1 lg:mt-0 lg:pl-12"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="mx-auto h-80 w-full max-w-md rounded-2xl border border-border bg-surface flex items-center justify-center text-muted">
          [App mockup]
        </div>
      </motion.div>
    </SectionWrapper>
  );
}
