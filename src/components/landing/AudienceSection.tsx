import { motion } from "framer-motion";
import { Building2, Megaphone, ShoppingBag, Store, Search, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import productNike from "@/assets/product-nike.png";
import productAdidas from "@/assets/product-adidas.png";
import productNewBalance from "@/assets/product-newbalance.png";
import { AUDIENCE } from "@/content/landing";

const AUDIENCE_STYLE: Record<
  string,
  { icon: typeof Building2; borderColor: string; iconBg: string; iconColor: string; glowColor: string }
> = {
  marcas: {
    icon: Building2,
    borderColor: "border-[hsl(265,70%,65%)]",
    iconBg: "bg-[hsl(265,70%,95%)]",
    iconColor: "text-[hsl(265,70%,45%)]",
    glowColor: "bg-[hsl(265,70%,65%)]",
  },
  agencias: {
    icon: Megaphone,
    borderColor: "border-[hsl(280,60%,65%)]",
    iconBg: "bg-[hsl(280,60%,95%)]",
    iconColor: "text-[hsl(280,60%,45%)]",
    glowColor: "bg-[hsl(280,60%,65%)]",
  },
  ecommerce: {
    icon: ShoppingBag,
    borderColor: "border-[hsl(300,50%,65%)]",
    iconBg: "bg-[hsl(300,50%,95%)]",
    iconColor: "text-[hsl(300,50%,45%)]",
    glowColor: "bg-[hsl(300,50%,65%)]",
  },
  varejo: {
    icon: Store,
    borderColor: "border-[hsl(330,85%,70%)]",
    iconBg: "bg-[hsl(330,85%,95%)]",
    iconColor: "text-[hsl(330,85%,45%)]",
    glowColor: "bg-[hsl(330,85%,65%)]",
  },
};

const audiences = AUDIENCE.items.map((item) => ({
  ...AUDIENCE_STYLE[item.key],
  text: (
    <>
      <strong className="text-foreground">{item.strong1}</strong>
      {item.middle}
      <strong className="text-foreground">{item.strong2}</strong>
    </>
  ),
}));

const chatResults = [
  {
    name: "Tênis Nike Air Max 90",
    desc: "Design icônico com amortecimento Air visível e conforto para o dia a dia.",
    image: productNike,
  },
  {
    name: "Adidas Ultraboost 23",
    desc: "Retorno de energia incomparável com tecnologia Boost e malha Primeknit.",
    image: productAdidas,
  },
  {
    name: "New Balance 550",
    desc: "Estilo retrô com construção premium em couro e ótimo custo-benefício.",
    image: productNewBalance,
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
    <section className="relative py-14 sm:py-20 overflow-hidden bg-surface-2">
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-ivero-purple/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-ivero-pink/5 blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start max-w-6xl mx-auto">
          {/* Chat Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <motion.div
              animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-6 rounded-3xl bg-[hsl(265,70%,28%,0.2)] blur-[50px] pointer-events-none"
            />
            <motion.div
              animate={{ opacity: [0.08, 0.18, 0.08], scale: [1, 1.03, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -inset-3 rounded-3xl bg-[hsl(280,60%,50%,0.1)] blur-[30px] pointer-events-none"
            />

            <div className="relative rounded-2xl border-2 border-[hsl(265,70%,70%,0.4)] bg-card p-4 sm:p-6 shadow-[0_20px_60px_-10px_hsl(265,70%,50%,0.25),0_8px_24px_-6px_hsl(280,60%,50%,0.15)] ring-1 ring-[hsl(265,70%,80%,0.2)]">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-[hsl(265,70%,55%)] via-[hsl(300,60%,55%)] to-[hsl(330,85%,55%)]" />

              <div className="flex items-center gap-2 mb-4 mt-1">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-destructive/50" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[hsl(45,90%,55%,0.5)]" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[hsl(140,60%,50%,0.5)]" />
                <span className="ml-auto text-[10px] font-medium text-muted-foreground/50 tracking-wider uppercase">Ivero AI</span>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-secondary/60 border border-border px-3 sm:px-4 py-2.5 sm:py-3 mb-4 sm:mb-5">
                <Search className="w-4 h-4 text-ivero-purple shrink-0" />
                <TypingText />
              </div>

              <div className="flex items-center gap-2 mb-3 sm:mb-4 px-1">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-ivero-gradient flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-primary-foreground" />
                  </motion.div>
                </div>
                <span className="text-xs font-semibold text-ivero-purple">IA recomenda</span>
              </div>

              <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-5">
                {chatResults.map((result, i) => (
                  <motion.div
                    key={result.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="relative rounded-xl border border-[hsl(265,70%,70%,0.25)] bg-secondary/30 overflow-hidden cursor-pointer hover:-translate-y-0.5 hover:border-[hsl(265,70%,60%,0.5)] hover:shadow-md hover:shadow-ivero-purple/5 transition-all duration-300 group/card"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[hsl(265,70%,60%)] via-[hsl(300,60%,55%)] to-[hsl(330,85%,60%)] opacity-40 group-hover/card:opacity-80 transition-opacity duration-300" />

                    <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 pl-3.5 sm:pl-4">
                      <img src={result.image} alt={result.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover bg-secondary/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                          <span className="text-[10px] sm:text-xs font-bold text-primary-foreground bg-ivero-gradient rounded-full px-1.5 sm:px-2 py-0.5">
                            #{i + 1}
                          </span>
                          <h4 className="text-xs sm:text-sm font-semibold text-foreground group-hover/card:text-ivero-purple transition-colors truncate">{result.name}</h4>
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">{result.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 rounded-xl bg-secondary/60 border border-border px-3 sm:px-4 py-2.5 sm:py-3">
                <span className="text-xs sm:text-sm text-foreground/50 flex-1">Pergunte mais sobre esses produtos...</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-ivero-gradient flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shrink-0">
                  <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-foreground" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Title + Pills */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-7 sm:mb-10 leading-tight">
              A Ivero é para marcas que querem ser{" "}
              <span className="text-gradient">relevante nas IA's</span>
            </h2>

            <div className="space-y-3 sm:space-y-4">
              {audiences.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40, scale: 0.94 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.7, delay: 0.15 + index * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="relative overflow-hidden rounded-xl cursor-pointer hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 group"
                >
                  <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${item.glowColor} opacity-50 group-hover:opacity-100 group-hover:h-[3px] transition-all duration-300`} />
                  <div className={`absolute bottom-0 left-[10%] right-[10%] h-[6px] ${item.glowColor} opacity-20 blur-[6px] group-hover:opacity-50 transition-all duration-300`} />

                  <div className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 bg-card border-2 ${item.borderColor} rounded-xl hover:shadow-lg transition-shadow duration-300`}>
                    <div className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                      <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.iconColor}`} />
                    </div>
                    <span className="text-sm sm:text-base font-medium text-muted-foreground group-hover:text-foreground transition-colors">
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
