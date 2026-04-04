import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const stats = [
  { value: "500+", label: "Coureurs en beta" },
  { value: "92%", label: "Satisfaction" },
  { value: "−18%", label: "Blessures déclarées" },
];

const testimonials = [
  {
    quote: "Depuis que j'utilise RunCoach AI, j'ai réduit mes blessures de moitié. Les recommandations sont vraiment adaptées à mon niveau.",
    name: "Marie D.",
    stat: "52 km/semaine · Semi-marathon",
  },
  {
    quote: "L'agent Physio m'a alerté sur une surcharge avant que je ne me blesse. Je n'aurais pas vu ça moi-même.",
    name: "Thomas R.",
    stat: "35 km/semaine · Trail",
  },
  {
    quote: "Les plans d'entraînement sont cohérents avec ma vie réelle — pas juste un programme générique. C'est bluffant.",
    name: "Sophie M.",
    stat: "42 km/semaine · Marathon",
  },
];

export function SocialProofSection() {
  return (
    <div className="bg-surface">
      <SectionWrapper id="social-proof" className="space-y-16">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="font-display text-4xl font-bold text-primary">{s.value}</div>
              <div className="mt-1 text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="space-y-8">
          <h2 className="font-display text-3xl font-bold text-center text-foreground">
            Ce qu&apos;ils en disent
          </h2>
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent>
              {testimonials.map((t) => (
                <CarouselItem key={t.name} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col justify-between p-6 pt-6">
                      <p className="text-foreground leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                      <div className="mt-6">
                        <div className="font-semibold text-foreground">{t.name}</div>
                        <div className="text-xs text-muted">{t.stat}</div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </SectionWrapper>
    </div>
  );
}
