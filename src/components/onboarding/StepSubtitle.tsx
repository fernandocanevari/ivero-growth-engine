/**
 * Subtítulo compartilhado das etapas do onboarding.
 * Fonte maior que o padrão para diferenciar do loading do preview.
 */
export function StepSubtitle({
  step,
  total = 3,
  label,
  className = "",
}: {
  step: number;
  total?: number;
  label: string;
  className?: string;
}) {
  return (
    <p
      className={`text-base sm:text-lg font-semibold tracking-tight text-ivero-purple mb-6 ${className}`}
    >
      Etapa {step} de {total} · {label}
    </p>
  );
}

export default StepSubtitle;
