/**
 * Lupa animada — usada nos loadings de análise (Hero/Preview e onboarding).
 * A lupa orbita/gira como se estivesse escaneando o site.
 */
export function SearchScan({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto h-24 w-24 ${className}`}
      role="img"
      aria-label="Analisando"
    >
      <span className="absolute inset-[12%] rounded-full bg-primary/15 animate-ping" />
      <svg viewBox="0 0 100 100" className="relative h-full w-full">
        <circle
          cx="50"
          cy="50"
          r="34"
          fill="none"
          stroke="hsl(var(--primary) / 0.2)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <g className="origin-center animate-[spin_2.6s_linear_infinite]">
          {/* lupa orbitando o centro */}
          <g transform="translate(50 14)">
            <circle
              cx="0"
              cy="0"
              r="13"
              fill="hsl(var(--primary) / 0.12)"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
            />
            <line
              x1="9.2"
              y1="9.2"
              x2="19"
              y2="19"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
        </g>
        <circle cx="50" cy="50" r="3" fill="hsl(var(--primary) / 0.55)" />
      </svg>
    </div>
  );
}

export default SearchScan;
