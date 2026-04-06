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

      {/* App mockup */}
      <motion.div
        className="mt-12 flex-1 lg:mt-0 lg:pl-12 flex justify-center"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {/* Phone frame */}
        <div className="relative mx-auto w-[260px]">
          <div className="rounded-[2.5rem] border-[6px] border-zinc-700 bg-zinc-800 shadow-2xl overflow-hidden">
            {/* Screen */}
            <div className="bg-[#FFF9F7] rounded-[2rem] overflow-hidden" style={{ minHeight: 520 }}>

              {/* Status bar */}
              <div className="flex justify-between items-center px-5 pt-3 pb-1">
                <span className="text-[10px] font-semibold text-[#1C1410]">9:41</span>
                <span className="text-[9px] text-[#6B5B52]">●●● 🔋</span>
              </div>

              {/* Header */}
              <div className="flex justify-between items-center px-4 pb-2">
                <span className="text-[13px] font-bold text-[#1C1410]">Samedi 4 avril</span>
                <div className="w-6 h-6 rounded-full bg-[#FF5722] flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">T</span>
                </div>
              </div>

              {/* Alert */}
              <div className="mx-3 mb-2 rounded-lg px-3 py-1.5" style={{ background: 'rgba(255,152,0,0.12)', border: '1px solid rgba(255,152,0,0.3)' }}>
                <span className="text-[9px] font-medium text-orange-700">⚠ Surcharge légère — ATL &gt; CTL depuis 4j</span>
              </div>

              {/* Coach IA card */}
              <div className="mx-3 mb-2 rounded-xl bg-white border border-[#E8D5CC] p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[8px] font-semibold text-white bg-[#FF5722] rounded px-1.5 py-0.5">Coach IA</span>
                  <span className="text-[8px] text-[#6B5B52]">06h30</span>
                </div>
                <p className="text-[9px] text-[#1C1410] leading-relaxed mb-2">
                  Terry, votre ATL dépasse votre CTL. Aujourd'hui : récupération active — footing léger 35 min en zone 1-2.
                </p>
                <div className="border-t border-[#E8D5CC] pt-1.5">
                  <span className="text-[9px] font-medium text-[#FF5722]">Pourquoi ? Demander au Coach →</span>
                </div>
              </div>

              {/* Session card */}
              <div className="mx-3 mb-2 rounded-xl bg-white border border-[#E8D5CC] p-3">
                <p className="text-[8px] text-[#6B5B52] mb-1.5">Séance du jour</p>
                <div className="inline-flex items-center gap-1 bg-[#FFF0EB] rounded px-1.5 py-0.5 mb-2">
                  <span className="text-[9px] font-medium text-[#FF5722]">♻ Récupération active</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[['Durée','35 min'],['Allure','Libre'],['Zone','Z1-Z2'],['Dist.','~5 km']].map(([l,v]) => (
                    <div key={l}>
                      <p className="text-[7px] text-[#6B5B52]">{l}</p>
                      <p className="text-[9px] font-semibold text-[#1C1410]">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats row */}
              <div className="mx-3 grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl bg-white border border-[#E8D5CC] p-2">
                  <p className="text-[7px] text-[#6B5B52] mb-1">Charge</p>
                  <div className="flex gap-0.5 items-end h-4">
                    {[60,75,65,50,85,70,90].map((h,i) => (
                      <div key={i} className="flex-1 rounded-sm bg-[#FF5722]" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <p className="text-[7px] text-[#6B5B52] mt-1">CTL 42 · TSB -6</p>
                </div>
                <div className="rounded-xl bg-white border border-[#E8D5CC] p-2">
                  <p className="text-[7px] text-[#6B5B52] mb-0.5">Volume</p>
                  <p className="text-[13px] font-bold text-[#1C1410]">38 km</p>
                  <div className="w-full bg-[#E8D5CC] rounded-full h-1 mt-1">
                    <div className="bg-[#FF5722] h-1 rounded-full" style={{ width: '69%' }} />
                  </div>
                  <p className="text-[7px] text-[#6B5B52] mt-0.5">69% objectif</p>
                </div>
              </div>

              {/* Bottom tab bar */}
              <div className="border-t border-[#E8D5CC] bg-white px-1 py-1.5">
                <div className="grid grid-cols-5 text-center">
                  {[
                    { icon: '⌂', label: "Auj.", active: true },
                    { icon: '💬', label: 'Chat', active: false },
                    { icon: '📅', label: 'Plan', active: false },
                    { icon: '🏃', label: 'Activ.', active: false },
                    { icon: '◯', label: 'Profil', active: false },
                  ].map(tab => (
                    <div key={tab.label}>
                      <div className={`text-[12px] ${tab.active ? 'text-[#FF5722]' : 'text-[#6B5B52]'}`}>{tab.icon}</div>
                      <div className={`text-[6px] ${tab.active ? 'font-semibold text-[#FF5722]' : 'text-[#6B5B52]'}`}>{tab.label}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
          {/* Phone shadow */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-40 h-4 bg-black/30 blur-xl rounded-full" />
        </div>
      </motion.div>
    </SectionWrapper>
  );
}
