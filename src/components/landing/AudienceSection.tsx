import { motion } from "framer-motion";
import { Building2, Megaphone, ShoppingBag, Briefcase } from "lucide-react";

const audiences = [
  {
    icon: Building2,
    title: "Marcas & Empresas",
    description: "Descubra como sua marca é percebida e recomendada por IAs generativas. Proteja sua reputação no novo canal de descoberta.",
    tag: "Branding",
  },
  {
    icon: Megaphone,
    title: "Agências de Marketing",
    description: "Ofereça GEO como serviço premium. Mostre aos seus clientes como eles performam nas respostas de IA vs concorrentes.",
    tag: "Serviço",
  },
  {
    icon: ShoppingBag,
    title: "E-commerces & D2C",
    description: "Quando alguém pergunta à IA 'qual o melhor produto X?', sua marca precisa estar na resposta. A Ivero garante isso.",
    tag: "Vendas",
  },
  {
    icon: Briefcase,
    title: "Times de SEO & Conteúdo",
    description: "GEO é o novo SEO. Adapte sua estratégia de conteúdo para ser citado por motores generativos, não apenas rankeado.",
    tag: "Estratégia",
  },
];

const AudienceSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            A Ivero é para quem quer{" "}
            <span className="text-gradient">ser relevante na era da IA</span>
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
