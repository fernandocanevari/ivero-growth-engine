import { motion } from "framer-motion";
import { Building2, Megaphone, ShoppingBag, Store, Search, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const audiences = [
  {
    icon: Building2,
    text: (
      <>
        <strong className="text-foreground">Marcas</strong> que querem ser <strong className="text-foreground">referências</strong>
      </>
    ),
  },
  {
    icon: Megaphone,
    text: (
      <>
        <strong className="text-foreground">Agências de MKT</strong> que querem vender o <strong className="text-foreground">futuro</strong>
      </>
    ),
  },
  {
    icon: ShoppingBag,
    text: (
      <>
        <strong className="text-foreground">E-commerce</strong> que querem ser <strong className="text-foreground">recomendados</strong>
      </>
    ),
  },
  {
    icon: Store,
    text: (
      <>
        <strong className="text-foreground">Varejo</strong> que quer dominar a nova <strong className="text-foreground">vitrine digital</strong>
      </>
    ),
  },
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

const typingText = "Qual o melhor headphone sem fio?";

const TypingText = () => {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < typingText.length) {
        setDisplayed(typingText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        // Blink cursor a few times then restart
        setTimeout(() => {
          setDisplayed("");
          i = 0;
          // Restart after pause
          const restart = setInterval(() => {
            if (i < typingText.length) {
              setDisplayed(typingText.slice(0, i + 1));
              i++;
            } else {
              clearInterval(restart);
            }
          }, 60);
        }, 3000);
      }
    }, 60);

    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);

    return () => {
      clearInterval(interval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <span className="text-sm text-muted-foreground">
      {displayed}
      <span className={`inline-block w-[2px] h-4 bg-accent ml-0.5 align-middle transition-opacity ${showCursor ? "opacity-100" : "opacity-0"}`} />
    </span>
  );
};

const AudienceSection = () => {
  return (
    <section className="relative py-20 overflow-hidden bg-background">
      {/* Gradient orbs on white */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-ivero-purple/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-ivero-pink/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[80px] pointer-events-none" />

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
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-ivero-purple/5">
              {/* Search bar with typing */}
              <div className="flex items-center gap-3 rounded-xl bg-secondary/50 border border-border px-4 py-3 mb-5">
                <Search className="w-4 h-4 text-muted-foreground" />
                <TypingText />
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
                    className="rounded-xl bg-secondary/30 border border-border p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-accent bg-accent/10 rounded-full px-2 py-0.5">
                        #{i + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">{result.name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-8">{result.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-3 rounded-xl bg-secondary/50 border border-border px-4 py-3">
                <span className="text-sm text-muted-foreground/60 flex-1">Pergunte mais sobre esses produtos...</span>
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
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-10 leading-tight">
              A Ivero é para marcas que querem ser{" "}
              <span className="text-gradient">relevante nas IA's</span>
            </h2>

            <div className="space-y-4">
              {audiences.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-card hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 group"
                >
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-ivero-gradient flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-sm md:text-base font-medium text-muted-foreground group-hover:text-foreground transition-colors">
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
