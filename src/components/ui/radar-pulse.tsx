/**
 * Radar animado — usado no loading do diagnóstico (Hero/Preview).
 * Diferencia visualmente esse loading dos outros dois (linha discreta pós-gate
 * e subtítulo do onboarding).
 */
export function RadarPulse({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto h-24 w-24 ${className}`} role="img" aria-label="Analisando">
      <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
      <span
        className="absolute inset-[18%] rounded-full bg-primary/15 animate-ping"
        style={{ animationDelay: "0.6s" }}
      />
      <svg viewBox="0 0 100 100" className="relative h-full w-full">
        <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--primary) / 0.25)" strokeWidth="1" />
        <circle cx="50" cy="50" r="31" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="1" />
        <circle cx="50" cy="50" r="16" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="1" />
        <line x1="4" y1="50" x2="96" y2="50" stroke="hsl(var(--primary) / 0.15)" strokeWidth="1" />
        <line x1="50" y1="4" x2="50" y2="96" stroke="hsl(var(--primary) / 0.15)" strokeWidth="1" />
        <g className="origin-center animate-[spin_2.4s_linear_infinite]">
          <path d="M50 50 L96 50 A46 46 0 0 0 82.5 17.5 Z" fill="hsl(var(--primary) / 0.28)" />
          <line x1="50" y1="50" x2="96" y2="50" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="50" cy="50" r="3.5" fill="hsl(var(--primary))" />
      </svg>
    </div>
  );
}

export default RadarPulse;
