import { motion } from "framer-motion";
import { Building2, Megaphone, ShoppingBag, Store, Search, Send, Sparkles } from "lucide-react";

const audiences = [
  { icon: Building2, text: "Marcas que querem ser referências" },
  { icon: Megaphone, text: "Agências de MKT que querem vender o futuro" },
  { icon: ShoppingBag, text: "E-commerce que querem ser recomendados" },
  { icon: Store, text: "Varejo que quer dominar a nova vitrine digital" },
];

const chatResults = [
  {
    name: "Sony WH-1000XM5",
    desc: "Cancelamento de ruído líder de mercado, conforto premium e 30h de bateria.",
  },
  {
    name: "Apple AirPods Max",
    desc: "Áudio espacial imersivo, integração perfeita com ecossistema Apple.",
  },
  {
    name: "Bose QuietComfort Ultra",
    desc: "Som cristalino com CustomTune e cancelamento de ruído adaptativo.",
  },
];

const AudienceSection = () => {
  return (
    <section className="relative py-20 overflow-hidden bg-ivero-dark">
      {/* Subtle gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-ivero-purple/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-ivero-pink/8 blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left Column - Chat Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <div className="rounded-2xl border border-border/20 bg-ivero-dark-surface/80 backdrop-blur-sm p-5 shadow-2xl">
              {/* Search bar */}
              <div className="flex items-center gap-3 rounded-xl bg-background/5 border border-border/10 px-4 py-3 mb-5">
                <Search className="w-4 h-4 text-muted-foreground/60" />
                <span className="text-sm text-muted-foreground/80">Qual o melhor headphone sem fio?</span>
              </div>

              {/* AI response header */}
              <div className="flex items-center gap-2 mb-4 px-1">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-xs font-medium text-accent">IA recomenda</span>
              </div>

              {/* Results */}
              <div className="space-y-3 mb-5">
                {chatResults.map((result, i) => (
                  <motion.div
                    key={result.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="rounded-xl bg-background/5 border border-border/10 p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-accent/70 bg-accent/10 rounded-full px-2 py-0.5">
                        #{i + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-primary-foreground">{result.name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed pl-8">{result.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-3 rounded-xl bg-background/5 border border-border/10 px-4 py-3">
                <span className="text-sm text-muted-foreground/50 flex-1">Pergunte mais sobre esses produtos...</span>
                <Send className="w-4 h-4 text-accent/50" />
              </div>
            </div>
          </motion.div>

          {/* Right Column - Title + Pills */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-10 leading-tight">
              A Ivero é para marcas que querem ser{" "}
              <span className="text-gradient">relevante nas IA's</span>
            </h2>

            <div className="space-y-4">
              {audiences.map((item, index) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border/20 bg-ivero-dark-surface/60 hover:border-accent/30 transition-all duration-300 group"
                >
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-ivero-gradient flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-sm md:text-base font-medium text-primary-foreground/90 group-hover:text-primary-foreground transition-colors">
                    {item.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AudienceSection;
