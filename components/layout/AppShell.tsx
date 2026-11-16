"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import {
  BankIcon,
  CalculatorIcon,
  CalendarCheckIcon,
  CashIcon,
  ChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  FileTextIcon,
  FolderIcon,
  HistoryIcon,
  MenuIcon,
  MessageIcon,
  PercentIcon,
  ShieldIcon,
  TimelineIcon,
  UsersIcon,
} from "./icons";

// Para sumar una sección nueva, agregá una entrada acá y su página en app/(app)/<ruta>.
type IconType = (props: { className?: string }) => ReactNode;
type NavItem = { href: string; label: string; Icon: IconType };

const SECTIONS: NavItem[] = [
  { href: "/legajos", label: "Legajos", Icon: FolderIcon },
  { href: "/contratos", label: "Contratos", Icon: FileTextIcon },
  { href: "/central-deudores", label: "Central de deudores", Icon: BankIcon },
  { href: "/mensajes", label: "Mensajes", Icon: MessageIcon },
  { href: "/tasas", label: "Tasas", Icon: PercentIcon },
];

// Mejoras propuestas: las pantallas están vacías hasta que se definan.
const PROPUESTAS = [
  { href: "/historial-documentos", label: "Historial de documentos", Icon: HistoryIcon },
  { href: "/clientes", label: "Cartera de clientes", Icon: UsersIcon },
  { href: "/historial-cliente", label: "Historial del cliente", Icon: TimelineIcon },
  { href: "/cotizador", label: "Cotizador de interés", Icon: CalculatorIcon },
  { href: "/prestamos", label: "Préstamos y cuotas", Icon: CashIcon },
  { href: "/cobranzas", label: "Cobranzas y vencimientos", Icon: CalendarCheckIcon },
  { href: "/reportes", label: "Tablero y reportes", Icon: ChartIcon },
  { href: "/usuarios", label: "Usuarios y permisos", Icon: ShieldIcon },
];

const CLAVE_MENU = "ezmel_menu_colapsado";
let menuEnMemoria: boolean | null = null; // por si el navegador no deja usar localStorage
const oyentes = new Set<() => void>();

function leerMenuColapsado(): boolean {
  try {
    const guardado = localStorage.getItem(CLAVE_MENU);
    if (guardado !== null) return guardado === "1";
  } catch {
    /* sin almacenamiento: se usa la memoria */
  }
  if (menuEnMemoria !== null) return menuEnMemoria;
  // Sin preferencia guardada: desplegado en computadora y plegado (solo íconos) en tablet, donde el contenido necesita el lugar.
  return window.matchMedia("(max-width: 1023px)").matches;
}

function guardarMenuColapsado(valor: boolean) {
  menuEnMemoria = valor;
  try {
    localStorage.setItem(CLAVE_MENU, valor ? "1" : "0");
  } catch {
    /* idem */
  }
  oyentes.forEach((avisar) => avisar());
}

function suscribirMenu(avisar: () => void) {
  oyentes.add(avisar);
  window.addEventListener("storage", avisar);
  window.addEventListener("resize", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
    window.removeEventListener("resize", avisar);
  };
}

interface AppShellProps {
  email: string;
  userName: string | null;
  roleLabel: string;
  tenantName: string;
  /** Rol sin permiso para crear documentos (solo lectura). */
  readOnly: boolean;
  canManageUsers: boolean;
  /** Las tasas son de uso interno: sólo las ven los administradores. */
  canViewRates: boolean;
  children: ReactNode;
}

export function AppShell({ email, userName, roleLabel, tenantName, readOnly, canManageUsers, canViewRates, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Menú de escritorio plegado (sólo íconos). Por defecto va desplegado; en celular se usa siempre el desplegable.
  const colapsado = useSyncExternalStore(suscribirMenu, leerMenuColapsado, () => false);
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);
  const anchoCompleto = ["/contratos", "/legajos", "/clientes", "/mensajes", "/tasas", "/usuarios"].includes(pathname); // el panel de tipos queda pegado al borde derecho
  const initial = ((userName ?? email).trim().charAt(0) || "A").toUpperCase();
  // La pantalla de usuarios es solo para administradores (igual se verifica en el servidor).
  const propuestas = PROPUESTAS.filter((p) => p.href !== "/usuarios" || canManageUsers);
  const secciones = SECTIONS.filter((s) => s.href !== "/tasas" || canViewRates);

  function mostrarTip(e: { currentTarget: HTMLElement }, label: string, siempre = false) {
    if (!colapsado && !siempre) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 10 });
  }

  function alternarMenu() {
    setTip(null);
    guardarMenuColapsado(!colapsado);
  }

  function navLink(href: string, label: string, Icon: IconType, tenue = false) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    const inactiveColor = tenue ? "text-white/65" : "text-white/80";
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMenuOpen(false)}
        aria-current={active ? "page" : undefined}
        aria-label={colapsado ? label : undefined}
        onMouseEnter={(e) => mostrarTip(e, label)}
        onFocus={(e) => mostrarTip(e, label)}
        onMouseLeave={() => setTip(null)}
        onBlur={() => setTip(null)}
        className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
          colapsado ? "md:justify-center md:gap-0 md:px-0" : ""
        } ${active ? "bg-white/15 text-white" : `${inactiveColor} hover:bg-white/10 hover:text-white`}`}
      >
        <Icon className={`h-5 w-5 shrink-0 ${active ? "text-[#6ACEC6]" : ""}`} />
        <span className={colapsado ? "md:hidden" : ""}>{label}</span>
      </Link>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-brand-mid md:block md:h-screen md:overflow-hidden md:p-3">
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <Image src="/logo-white.png" alt="EzMel" width={1200} height={262} priority unoptimized className="h-7 w-auto" />
        <button
          type="button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded-xl p-2 text-white hover:bg-white/15"
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* En celular el panel blanco crece hasta el borde inferior; en escritorio la altura la fija el contenedor. */}
      <div className="flex flex-1 flex-col md:h-full md:flex-row md:gap-3">
        <aside
          className={`${menuOpen ? "flex" : "hidden"} relative shrink-0 flex-col px-4 pb-4 text-white md:flex md:h-full md:p-0 md:transition-[width] md:duration-200 ${
            colapsado ? "md:w-16" : "md:w-56"
          }`}
        >
          {/* Flecha blanca para plegar o expandir el menú (sólo escritorio), dentro del verde. */}
          <button
            type="button"
            onClick={alternarMenu}
            onMouseEnter={(e) => mostrarTip(e, colapsado ? "Expandir" : "Contraer", true)}
            onFocus={(e) => mostrarTip(e, colapsado ? "Expandir" : "Contraer", true)}
            onMouseLeave={() => setTip(null)}
            onBlur={() => setTip(null)}
            aria-label={colapsado ? "Expandir menú" : "Contraer menú"}
            className={`absolute z-20 hidden h-7 w-7 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white md:flex ${
              colapsado ? "left-1/2 top-[58px] -translate-x-1/2" : "right-0 top-8"
            }`}
          >
            {colapsado ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
          </button>

          <div className={`hidden pb-8 pt-5 md:block ${colapsado ? "px-0" : "px-5"}`}>
            {colapsado ? (
              <Image src="/icon.png" alt="EzMel" width={512} height={512} priority unoptimized className="mx-auto h-9 w-9" />
            ) : (
              <Image src="/logo-tagline-white.png" alt="EzMel, servicios financieros" width={1200} height={436} priority unoptimized className="h-auto w-36" />
            )}
          </div>

          <nav
            aria-label="Secciones"
            className="flex-1 space-y-1 overflow-y-auto [scrollbar-color:rgba(255,255,255,0.3)_transparent] [scrollbar-width:thin]"
          >
            {secciones.map(({ href, label, Icon }) => navLink(href, label, Icon))}

            <p className={`px-2.5 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-white/60 ${colapsado ? "md:hidden" : ""}`}>
              En definición
            </p>
            {colapsado && <div aria-hidden className="mx-2 my-3 hidden border-t border-white/20 md:block" />}
            {propuestas.map(({ href, label, Icon }) => navLink(href, label, Icon, true))}
          </nav>

          <div
            className={`mt-2 flex items-center gap-2 border-t border-white/20 px-2 pt-4 ${
              colapsado ? "md:flex-col md:gap-2 md:px-0" : ""
            }`}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6ACEC6] text-sm font-bold text-[#0f3f4d]"
              title={colapsado ? `${userName ?? email} · ${roleLabel}` : undefined}
            >
              {initial}
            </span>
            <div className={`min-w-0 flex-1 ${colapsado ? "md:hidden" : ""}`}>
              <p className="truncate text-[13px] font-semibold leading-tight" title={`${roleLabel} · ${tenantName}`}>
                {roleLabel}
              </p>
              <p className="truncate text-xs text-white/75" title={email}>
                {userName ?? email}
              </p>
            </div>
            <LogoutButton />
          </div>
        </aside>

        {/* Nombre de la sección al pasar el mouse con el menú plegado (va fijo para que no lo recorte el scroll del menú). */}
        {tip && (
          <span
            role="tooltip"
            style={{ top: tip.top, left: tip.left }}
            className="pointer-events-none fixed z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-[#0f3f4d] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-[#6ACEC6]/50 md:block"
          >
            {tip.label}
          </span>
        )}

        <main className={`min-w-0 flex-1 rounded-t-3xl bg-slate-50 px-4 py-6 [scrollbar-color:#a9cbcd_transparent] [scrollbar-width:thin] md:h-full md:overflow-y-auto md:rounded-3xl ${anchoCompleto ? "md:pl-8 md:pr-4" : "md:px-8"} md:py-8`}>
          {readOnly && (
            <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Tu rol es de solo lectura: podés consultar, pero no generar ni descargar documentos nuevos.
            </p>
          )}
          <div className={anchoCompleto ? "" : "mx-auto max-w-5xl"}>{children}</div>
        </main>
      </div>
    </div>
  );
}
