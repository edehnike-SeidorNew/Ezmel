import Image from "next/image";

/** Barra superior de la página pública: solo el logo (no hay menú ni sesión). */
export function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-brand-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[960px] items-center px-4">
        <Image
          src="/logo-tagline.png"
          alt="EzMel, servicios financieros"
          width={1200}
          height={436}
          priority
          unoptimized
          className="h-auto w-32 sm:w-36"
        />
      </div>
    </header>
  );
}
