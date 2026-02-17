import { motion } from "framer-motion";
import { Building2, Megaphone, ShoppingBag, Store, Search, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const audiences = [
  {
    icon: Building2,
    text: (
      <>
        <strong className="text-primary-foreground">Marcas</strong> que querem ser <strong className="text-primary-foreground">referências</strong>
      </>
    ),
    gradient: "from-[hsl(265,70%,35%)] to-[hsl(265,70%,20%)]",
    borderGlow: "bg-[hsl(265,70%,50%)]",
  },
  {
    icon: Megaphone,
    text: (
      <>
        <strong className="text-primary-foreground">Agências de MKT</strong> que querem vender o <strong className="text-primary-foreground">futuro</strong>
      </>
    ),
    gradient: "from-[hsl(280,60%,40%)] to-[hsl(280,60%,22%)]",
    borderGlow: "bg-[hsl(280,60%,55%)]",
  },
  {
    icon: ShoppingBag,
    text: (
      <>
        <strong className="text-primary-foreground">E-commerce</strong> que querem ser <strong className="text-primary-foreground">recomendados</strong>
      </>
    ),
    gradient: "from-[hsl(300,50%,40%)] to-[hsl(300,50%,22%)]",
    borderGlow: "bg-[hsl(300,50%,55%)]",
  },
  {
    icon: Store,
    text: (
      <>
        <strong className="text-primary-foreground">Varejo</strong> que quer dominar a nova <strong className="text-primary-foreground">vitrine digital</strong>
      </>
    ),
    gradient: "from-[hsl(330,85%,45%)] to-[hsl(330,85%,25%)]",
    borderGlow: "bg-[hsl(330,85%,55%)]",
  },
];

const chatResults = [
  {
    name: "Tênis Nike Air Max 90",
    desc: "Design icônico com amortecimento Air visível e conforto para o dia a dia.",
  },
  {
    name: "Adidas Ultraboost 23",
    desc: "Retorno de energia incomparável com tecnologia Boost e malha Primeknit.",
  },
  {
    name: "New Balance 550",
    desc: "Estilo retrô com construção premium em couro e ótimo custo-benefício.",
  },
];

const typingText = "Qual o melhor tênis casual?";

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
        setTimeout(() => {
          setDisplayed("");
          i = 0;
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
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-ivero-purple/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-ivero-pink/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[80px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start max-w-6xl mx-auto">
          {/* Left Column - Chat Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Purple glow behind chat */}
            <div className="absolute -inset-6 rounded-3xl bg-[hsl(265,70%,28%,0.2)] blur-[50px] pointer-events-none" />
            <div className="absolute -inset-3 rounded-3xl bg-[hsl(280,60%,50%,0.1)] blur-[30px] pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl bg-[hsl(330,85%,55%,0.05)] blur-[20px] pointer-events-none" />

            <div className="relative rounded-2xl border border-[hsl(265,70%,40%,0.3)] bg-gradient-to-br from-ivero-dark via-ivero-dark-surface to-[hsl(265,70%,15%)] p-6 shadow-2xl shadow-ivero-purple/30 ring-1 ring-ivero-purple/20 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
              {/* Header bar */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-[hsl(45,90%,55%,0.6)]" />
                <div className="w-3 h-3 rounded-full bg-[hsl(140,60%,50%,0.6)]" />
                <span className="ml-auto text-[10px] font-medium text-[hsl(0,0%,100%,0.4)] tracking-wider uppercase">Ivero AI</span>
              </div>

              {/* Search bar with typing */}
              <div className="flex items-center gap-3 rounded-xl bg-[hsl(230,20%,16%)] border border-[hsl(265,70%,40%,0.2)] px-4 py-3 mb-5">
                <Search className="w-4 h-4 text-accent/70" />
                <TypingText />
              </div>

              {/* AI response header */}
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-6 h-6 rounded-lg bg-ivero-gradient flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                  </motion.div>
                </div>
                <span className="text-xs font-semibold text-accent">IA recomenda</span>
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
                    className="rounded-xl bg-[hsl(230,20%,14%)] border border-[hsl(265,70%,40%,0.15)] p-4 cursor-pointer hover:bg-[hsl(265,70%,20%,0.2)] hover:border-[hsl(265,70%,50%,0.3)] hover:shadow-lg hover:shadow-ivero-purple/10 hover:-translate-y-0.5 transition-all duration-300 group/card"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary-foreground bg-ivero-gradient rounded-full px-2.5 py-0.5">
                        #{i + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-[hsl(0,0%,92%)] group-hover/card:text-accent transition-colors">{result.name}</h4>
                    </div>
                    <p className="text-xs text-[hsl(230,10%,55%)] leading-relaxed pl-9">{result.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-3 rounded-xl bg-[hsl(230,20%,16%)] border border-[hsl(265,70%,40%,0.2)] px-4 py-3">
                <span className="text-sm text-[hsl(230,10%,45%)] flex-1">Pergunte mais sobre esses produtos...</span>
                <div className="w-8 h-8 rounded-lg bg-ivero-gradient flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                  <Send className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Title + Pills */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
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
                  className="relative overflow-hidden rounded-xl cursor-pointer hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 group"
                >
                  {/* Gradient bottom border glow */}
                  <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${item.borderGlow} opacity-60 group-hover:opacity-100 group-hover:h-[3px] transition-all duration-300`} />
                  <div className={`absolute bottom-0 left-[10%] right-[10%] h-[6px] ${item.borderGlow} opacity-30 blur-[6px] group-hover:opacity-60 transition-all duration-300`} />

                  <div className={`flex items-center gap-4 px-5 py-4 bg-gradient-to-r ${item.gradient} border border-[hsl(0,0%,100%,0.08)] rounded-xl`}>
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-[hsl(0,0%,100%,0.1)] flex items-center justify-center backdrop-blur-sm border border-[hsl(0,0%,100%,0.1)]">
                      <item.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="text-sm md:text-base font-medium text-[hsl(0,0%,80%)] group-hover:text-primary-foreground transition-colors">
                      {item.text}
                    </span>
                  </div>
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