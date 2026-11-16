import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { RestablecerForm } from "@/components/auth/RestablecerForm";

/** Pantalla para elegir la nueva contraseña. Se llega desde el link del mail de recuperación. */
export default async function RestablecerPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?error=recuperar");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a5f6f] to-[#237082] px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <Image
          src="/logo-tagline.png"
          alt="EzMel, servicios financieros"
          width={1200}
          height={436}
          priority
          unoptimized
          className="mx-auto h-auto w-44"
        />
        <h1 className="mt-6 text-center text-2xl font-bold text-[#1a5f6f]">Elegí tu nueva contraseña</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Cuenta: <strong className="text-slate-900">{session.email}</strong>
        </p>
        <RestablecerForm />
      </div>
    </div>
  );
}
