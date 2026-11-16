/**
 * Indicador de pasos. En pantallas anchas muestra el nombre de todos los pasos; en celular sólo el del
 * paso actual (los demás quedan como número, con el nombre disponible para lectores de pantalla), así
 * no se desborda aunque los nombres sean largos.
 */
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex w-full items-center gap-2 sm:gap-4">
      {steps.map((label, i) => (
        <li key={label} className={`flex items-center gap-2 ${i === current ? "min-w-0" : "shrink-0"}`}>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              i === current
                ? "bg-brand text-white"
                : i < current
                  ? "bg-brand-soft text-brand"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {i + 1}
          </span>
          <span
            className={`text-sm ${
              i === current ? "font-bold text-brand" : "sr-only text-slate-600 sm:not-sr-only"
            }`}
          >
            {label}
          </span>
          {i < steps.length - 1 && <span aria-hidden className="h-px w-3 shrink-0 bg-brand-border sm:mx-2 sm:w-8" />}
        </li>
      ))}
    </ol>
  );
}
