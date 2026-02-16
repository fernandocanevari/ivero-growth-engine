import { motion } from "framer-motion";
import { Building2, ShoppingBag, Megaphone, BarChart3 } from "lucide-react";

const audiences = [
  {
    icon: Building2,
    title: "Startups & Scale-ups",
    description: "Encontre product-market fit geográfico e identifique regiões de alta demanda para expandir com eficiência.",
    tag: "Growth",
  },
  {
    icon: ShoppingBag,
    title: "E-commerces",
    description: "Otimize logística, identifique hubs de consumo e personalize ofertas por região.",
    tag: "Vendas",
  },
  {
    icon: Megaphone,
    title: "Agências de Marketing",
    description: "Entregue campanhas hipersegmentadas com dados geográficos reais para seus clientes.",
    tag: "Performance",
  },
  {
    icon: BarChart3,
    title: "Franquias & Varejo",
    description: "Analise potencial de novas localizações, monitore concorrência e otimize áreas de cobertura.",
    tag: "Expansão",
  },
];

const AudienceSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-accent mb-4 block">
            Para quem é
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            A Ivero é para quem quer{" "}
            <span className="text-gradient">crescer com inteligência</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {audiences.map((audience, index) => (
            <motion.div
              key={audience.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group flex gap-5 p-8 rounded-2xl border border-border bg-card hover:border-accent/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="shrink-0 w-14 h-14 rounded-xl bg-ivero-gradient flex items-center justify-center">
                <audience.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display text-lg font-semibold text-card-foreground">
                    {audience.title}
                  </h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                    {audience.tag}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {audience.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AudienceSection;
