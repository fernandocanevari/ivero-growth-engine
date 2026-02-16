const Footer = () => {
  return (
    <footer className="py-12 bg-ivero-dark border-t border-ivero-purple/10">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="font-display text-xl font-bold text-gradient">Ivero</span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Termos</a>
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Privacidade</a>
            <a href="#" className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors">Contato</a>
          </div>
          <p className="text-sm text-ivero-slate-light">
            © 2026 Ivero. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
