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
    <section className="py-10 bg-ivero-dark border-b border-ivero-purple/10">
      <div className="container mx-auto px-6">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-sm font-medium text-ivero-slate-light mb-8 tracking-wide uppercase"
        >
          IAs monitoradas pela Ivero
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
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
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-ivero-dark-surface border border-ivero-purple/10 group-hover:border-ivero-purple/30 transition-colors">
                <img
                  src={ai.icon}
                  alt={ai.name}
                  className="w-5 h-5 invert opacity-50 group-hover:opacity-90 transition-opacity"
                />
              </div>
              <span className="text-xs text-ivero-slate-light group-hover:text-primary-foreground transition-colors">
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
