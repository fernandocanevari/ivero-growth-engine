import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Para quem", href: "#para-quem" },
  { label: "Preços", href: "#precos" },
  { label: "Blog", href: "/blog" },
  { label: "Legal", href: "/legal" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm"
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="font-display text-2xl font-bold text-gradient">
          Ivero
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-ivero-dark/70 hover:text-ivero-dark transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a href="/login" className="text-sm font-medium text-ivero-dark/70 hover:text-ivero-dark transition-colors">
            Entrar
          </a>
          <Button variant="hero" size="sm" className="px-6" asChild>
            <a href="/preview">Ver como apareço nas IAs</a>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-ivero-dark"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden border-t border-gray-200 bg-white"
        >
          <div className="container mx-auto px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-ivero-dark/70 hover:text-ivero-dark transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a href="/login" className="text-sm font-medium text-ivero-dark/70 hover:text-ivero-dark transition-colors py-2">
              Entrar
            </a>
            <Button variant="hero" size="sm" className="px-6 w-fit" asChild>
              <a href="/preview" onClick={() => setIsOpen(false)}>Ver como apareço nas IAs</a>
            </Button>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
