import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Activity, Brain, RefreshCw, Calendar, TrendingUp, Shield } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { SectionWrapper } from "@/components/shared/SectionWrapper";

const features = [
  {
    icon: TrendingUp,
    title: "CTL/ATL/TSB",
    description: "Suivi de la charge d'entraînement en temps réel. Identifiez surmenage et sous-entraînement avant qu'ils impactent vos performances.",
  },
  {
    icon: Brain,
    title: "Agents IA spécialisés",
    description: "Trois agents dédiés — Coach, Physio, Mental — analysent votre profil sous des angles complémentaires pour des conseils précis.",
  },
  {
    icon: RefreshCw,
    title: "Sync Strava",
    description: "Connexion OAuth Strava en un clic. Vos 90 derniers jours d'activités synchronisés automatiquement, nouvelles activités en temps réel.",
  },
  {
    icon: Calendar,
    title: "Recommandations quotidiennes",
    description: "Chaque matin, une recommandation d'entraînement calibrée sur vos données récentes, vos objectifs et votre état de forme.",
  },
  {
    icon: Activity,
    title: "Plans d'entraînement",
    description: "Plans structurés sur mesure : endurance fondamentale, fractionné, récupération. Adaptés à votre niveau et vos objectifs.",
  },
  {
    icon: Shield,
    title: "Détection blessures",
    description: "Analyse prédictive des signaux d'alerte — surcharge, douleurs répétées, baisse de performances — pour prévenir avant de guérir.",
  },
];

interface FeatureCardProps {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <Card
      role="article"
      className="group transition-all duration-200 hover:border-primary/50"
    >
      <CardHeader>
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
          <Icon size={20} />
        </div>
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div className="bg-surface">
      <SectionWrapper id="features">
        <div ref={ref} className="space-y-12">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-muted">
              Un système complet, de l'analyse de données à la recommandation personnalisée.
            </p>
          </div>

          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, staggerChildren: 0.1 }}
          >
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </motion.div>
        </div>
      </SectionWrapper>
    </div>
  );
}
