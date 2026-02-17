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

const AILogosSection = () => {
  return (
    <section className="py-10 bg-gradient-to-r from-[hsl(265,50%,12%)] via-[hsl(280,45%,15%)] to-[hsl(265,50%,12%)] border-y border-ivero-purple/20">
      <div className="container mx-auto px-6">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-base md:text-lg font-semibold text-primary-foreground mb-8 tracking-wide uppercase"
        >
          IAs monitoradas pela Ivero
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-10 md:gap-16"
        >
          {aiLogos.map((ai, i) => (
            <motion.div
              key={ai.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-ivero-dark-surface border border-ivero-purple/10 group-hover:border-ivero-purple/30 transition-colors">
                <img
                  src={ai.icon}
                  alt={ai.name}
                  className="w-7 h-7 invert opacity-50 group-hover:opacity-90 transition-opacity"
                />
              </div>
              <span className="text-sm font-medium text-ivero-slate-light group-hover:text-primary-foreground transition-colors">
                {ai.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default AILogosSection;
