"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isMockMode } from "@/lib/supabase/env";

type Mode = "login" | "signup" | "recover";

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-[#6ACEC6]/40";

export function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const router = useRouter();
  const mock = isMockMode();
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState<"password" | null>(null);

  const signup = mode === "signup";
  const recover = mode === "recover";

  function switchMode() {
    setMode(signup || recover ? "login" : "signup");
    setError(null);
    setInfo(null);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading("password");
    try {
      if (recover) {
        const res = await fetch("/api/auth/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "No se pudo enviar el email.");
          return;
        }
        setInfo(
          "Si ese email tiene una cuenta, te enviamos un enlace para elegir una nueva contraseña. Revisá también el correo no deseado."
        );
        return;
      }
      const endpoint =mock ? "/api/auth/mock-login" : signup ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, provider: "password" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo completar la operación");
        return;
      }

      if (signup && data.needsConfirmation) {
        setInfo("Te enviamos un email para confirmar tu cuenta. Confirmala y después iniciá sesión.");
        setMode("login");
        setPassword("");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        {signup && !mock && (
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-slate-900">
              Nombre y apellido
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-900">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        {!recover && (
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-slate-900">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={signup && !mock ? 8 : undefined}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {signup && !mock && <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>}
          {!signup && !mock && (
            <button
              type="button"
              onClick={() => {
                setMode("recover");
                setError(null);
                setInfo(null);
              }}
              className="mt-2 text-xs font-semibold text-brand hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="text-sm text-emerald-700">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading !== null}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-brand-hover disabled:opacity-60"
        >
          {recover
            ? loading === "password"
              ? "Enviando..."
              : "Enviar enlace"
            : loading === "password"
              ? signup
                ? "Creando cuenta..."
                : "Ingresando..."
              : signup && !mock
                ? "Crear cuenta"
                : "Iniciar sesión"}
        </button>
      </form>

      {!mock && (
        <p className="mt-3 text-center text-sm text-slate-600">
          {signup || recover ? "¿Ya tenés cuenta?" : "¿Te invitaron?"}{" "}
          <button type="button" onClick={switchMode} className="font-semibold text-brand hover:underline">
            {signup || recover ? "Iniciá sesión" : "Creá tu cuenta"}
          </button>
        </p>
      )}
    </div>
  );
}
