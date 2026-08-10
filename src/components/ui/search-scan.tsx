/**
 * Nós de IA orbitando — usada nos loadings de análise (Hero/Preview e onboarding).
 * Um ponto central (a marca) com 3 nós orbitando em raios/velocidades diferentes,
 * cada um representando um modelo de IA (ChatGPT, Gemini, Claude, etc.).
 * Representa a mecânica da Ivero: consultar várias IAs ao redor da marca.
 */
export function SearchScan({ className = "" }: { className?: string }) {
  // Cada nó orbita num raio e duração distintos para criar movimento orgânico (não sincronizado).
  // Raio maior = órbita mais lenta; raios menores = mais rápidos.
  const nodes = [
    { r: 18, dur: "2.4s", delay: "0s", size: 2.6, startAngle: 0 },
    { r: 27, dur: "3.4s", delay: "-1.1s", size: 2.2, startAngle: 90 },
    { r: 35, dur: "4.6s", delay: "-2s", size: 1.9, startAngle: 200 },
  ];

  return (
    <div
      className={`relative mx-auto h-24 w-24 ${className}`}
      role="img"
      aria-label="Consultando inteligências artificiais"
    >
      <span className="absolute inset-[18%] rounded-full bg-primary/10 animate-ping" />
      <svg viewBox="0 0 100 100" className="relative h-full w-full">
        {/* Trilhas das órbitas */}
        {nodes.map((n, i) => (
          <circle
            key={`orbit-${i}`}
            cx="50"
            cy="50"
            r={n.r}
            fill="none"
            stroke="hsl(var(--primary) / 0.16)"
            strokeWidth="0.75"
            strokeDasharray="3 5"
          />
        ))}

        {/* Ponto central — a marca auditada */}
        <circle cx="50" cy="50" r="4.5" fill="hsl(var(--primary))" />
        <circle cx="50" cy="50" r="8" fill="none" stroke="hsl(var(--primary) / 0.35)" strokeWidth="0.75" />

        {/* Nós de IA orbitando */}
        {nodes.map((n, i) => {
          // Posição inicial no ângulo de partida (graus) — compensa o delay da animação
          const rad = (n.startAngle * Math.PI) / 180;
          const sx = 50 + n.r * Math.cos(rad);
          const sy = 50 + n.r * Math.sin(rad);
          return (
            <g
              key={`node-${i}`}
              className="origin-center"
              style={{
                animation: `ai-orbit-${i} ${n.dur} linear infinite`,
                animationDelay: n.delay,
                transformBox: "fill-box",
              }}
            >
              <circle
                cx={sx}
                cy={sy}
                r={n.size}
                fill="hsl(var(--primary))"
              />
              <circle
                cx={sx}
                cy={sy}
                r={n.size + 2}
                fill="none"
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth="0.6"
              />
            </g>
          );
        })}
      </svg>

      {/* Keyframes inline — cada órbita gira em torno do centro (50,50) do SVG */}
      <style>{`
        @keyframes ai-orbit-0 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ai-orbit-1 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ai-orbit-2 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}

export default SearchScan;
