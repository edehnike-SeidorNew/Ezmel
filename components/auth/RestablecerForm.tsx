"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-[#6ACEC6]/40";

export function RestablecerForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== repetir) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo cambiar la contraseña.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-6 space-y-4 text-left">
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-slate-900">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
      </div>
      <div>
        <label htmlFor="repetir" className="block text-sm font-semibold text-slate-900">
          Repetir contraseña
        </label>
        <input
          id="repetir"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-brand-hover disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
