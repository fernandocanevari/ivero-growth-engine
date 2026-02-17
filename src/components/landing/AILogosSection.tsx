import { motion } from "framer-motion";

const aiLogos = [
  { name: "ChatGPT", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg" },
  { name: "Gemini", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlegemini.svg" },
  { name: "Perplexity", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/perplexity.svg" },
  { name: "Claude", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/anthropic.svg" },
  { name: "Copilot", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/githubcopilot.svg" },
  { name: "Meta AI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/meta.svg" },
  { name: "Grok", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg" },
];

const LogoItem = ({ ai }: { ai: (typeof aiLogos)[number] }) => (
  <div className="flex flex-col items-center gap-2 group shrink-0 px-10">
    <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-ivero-dark-surface border border-ivero-purple/10 group-hover:border-ivero-purple/30 transition-colors">
      <img
        src={ai.icon}
        alt={ai.name}
        className="w-7 h-7 invert opacity-50 group-hover:opacity-90 transition-opacity"
      />
    </div>
    <span className="text-sm font-medium text-ivero-slate-light group-hover:text-primary-foreground transition-colors whitespace-nowrap">
      {ai.name}
    </span>
  </div>
);

const AILogosSection = () => {
  const doubled = [...aiLogos, ...aiLogos];

  return (
    <section className="py-10 bg-gradient-to-r from-[hsl(265,50%,12%)] via-[hsl(280,45%,15%)] to-[hsl(265,50%,12%)] border-y border-ivero-purple/20 overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-base md:text-lg font-semibold text-primary-foreground mb-8 tracking-wide uppercase"
        >
          IAs monitoradas pela Ivero
        </motion.p>
      </div>

      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-[hsl(265,50%,12%)] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-[hsl(265,50%,12%)] to-transparent pointer-events-none" />

        <motion.div
          className="flex items-center w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear",
            },
          }}
        >
          {doubled.map((ai, i) => (
            <LogoItem key={`${ai.name}-${i}`} ai={ai} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AILogosSection;
