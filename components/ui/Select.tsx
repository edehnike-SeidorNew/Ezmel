"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface OpcionSelect<V extends string> {
  value: V;
  label: string;
}

const ALTO_MAX_LISTA = 288;
const SEPARACION = 6;

/**
 * Selector con el estilo de la plataforma (el desplegable nativo del navegador no se puede personalizar).
 * Funciona con teclado (flechas, Inicio/Fin, Enter, Esc, letras) y la lista se dibuja fuera del contenedor, así
 * no la recortan las tablas ni las tarjetas con scroll. Se abre hacia arriba si abajo no hay lugar.
 */
export function Select<V extends string>({
  value,
  onChange,
  opciones,
  id,
  ariaLabel,
  disabled,
  className,
  redondeo = "xl",
}: {
  value: V;
  onChange: (valor: V) => void;
  opciones: OpcionSelect<V>[];
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** Clases extra del botón (ancho, márgenes). */
  className?: string;
  /** Esquinas del botón: "xl" (formularios de Usuarios) o "md" (formularios de Mensajes, Legajos). */
  redondeo?: "xl" | "md";
}) {
  const idLista = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; alto: number } | null>(null);

  const indiceActual = Math.max(
    0,
    opciones.findIndex((o) => o.value === value)
  );
  const actual = opciones[indiceActual];

  const abrir = useCallback(() => {
    if (disabled) return;
    setActivo(indiceActual);
    setAbierto(true);
  }, [disabled, indiceActual]);

  const cerrar = useCallback((devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }, []);

  const elegir = useCallback(
    (i: number) => {
      const o = opciones[i];
      if (o) onChange(o.value);
      cerrar();
    },
    [opciones, onChange, cerrar]
  );

  // Posición de la lista pegada al botón (fija en pantalla); se recalcula si se scrollea o cambia el tamaño.
  const ubicar = useCallback(() => {
    const el = boton.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const alto = Math.min(ALTO_MAX_LISTA, opciones.length * 40 + 12);
    const abajo = window.innerHeight - r.bottom - SEPARACION;
    const arriba = r.top - SEPARACION;
    if (abajo >= alto || abajo >= arriba) {
      setPos({ left: r.left, width: r.width, top: r.bottom + SEPARACION, alto: Math.min(alto, Math.max(abajo - 8, 120)) });
    } else {
      setPos({ left: r.left, width: r.width, bottom: window.innerHeight - r.top + SEPARACION, alto: Math.min(alto, Math.max(arriba - 8, 120)) });
    }
  }, [opciones.length]);

  useLayoutEffect(() => {
    if (abierto) ubicar();
  }, [abierto, ubicar]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent | TouchEvent) => {
      const n = e.target as Node;
      if (boton.current?.contains(n) || lista.current?.contains(n)) return;
      cerrar(false);
    };
    window.addEventListener("resize", ubicar);
    window.addEventListener("scroll", ubicar, true);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    return () => {
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("scroll", ubicar, true);
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
    };
  }, [abierto, ubicar, cerrar]);

  // Mantiene visible la opción resaltada con el teclado.
  useEffect(() => {
    if (!abierto) return;
    lista.current?.children[activo]?.scrollIntoView({ block: "nearest" });
  }, [abierto, activo, pos]);

  function alTeclear(e: React.KeyboardEvent) {
    if (disabled) return;
    const ultimo = opciones.length - 1;
    if (!abierto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActivo((i) => Math.min(i + 1, ultimo));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActivo((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActivo(0);
        break;
      case "End":
        e.preventDefault();
        setActivo(ultimo);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        elegir(activo);
        break;
      case "Escape":
        e.preventDefault();
        cerrar();
        break;
      case "Tab":
        cerrar(false);
        break;
      default: {
        // Escribir la inicial salta a la primera opción que empiece con esa letra.
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const letra = e.key.toLowerCase();
          const desde = opciones.findIndex((o, i) => i > activo && o.label.toLowerCase().startsWith(letra));
          const i = desde >= 0 ? desde : opciones.findIndex((o) => o.label.toLowerCase().startsWith(letra));
          if (i >= 0) setActivo(i);
        }
      }
    }
  }

  return (
    <>
      <button
        ref={boton}
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        disabled={disabled}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={alTeclear}
        className={`relative flex w-full items-center ${redondeo === "md" ? "rounded-md" : "rounded-xl"} border bg-white py-2.5 pl-3.5 pr-11 text-left text-sm text-slate-900 shadow-sm transition-colors hover:border-brand/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6ACEC6]/50 disabled:cursor-not-allowed disabled:opacity-60 ${
          abierto ? "border-brand ring-2 ring-[#6ACEC6]/40" : "border-slate-200"
        } ${className ?? ""}`}
      >
        <span className="truncate">{actual?.label ?? ""}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand transition-transform ${abierto ? "rotate-180" : ""}`}
        >
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>

      {abierto &&
        pos &&
        createPortal(
          <ul
            ref={lista}
            id={idLista}
            role="listbox"
            aria-label={ariaLabel}
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.alto }}
            className="fixed z-[90] overflow-y-auto rounded-xl border border-brand-border bg-white p-1.5 shadow-xl shadow-brand/15"
          >
            {opciones.map((o, i) => {
              const seleccionada = o.value === value;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={seleccionada}
                  onMouseEnter={() => setActivo(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(i)}
                  className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                    i === activo ? "bg-brand-soft text-brand" : "text-slate-800"
                  } ${seleccionada ? "font-semibold" : ""}`}
                >
                  <span className="truncate">{o.label}</span>
                  {seleccionada && (
                    <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-brand">
                      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}
