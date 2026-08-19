"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, LoginState } from "@/lib/supabase/auth-actions";

const initialState: LoginState = {};

function NotAdminNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("error") !== "not_admin") return null;
  return (
    <p className="text-red-400 text-sm mb-5">
      Ce compte n&apos;a pas les droits d&apos;administration. Connectez-vous avec le compte agence.
    </p>
  );
}

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <span className="w-10 h-10 rounded-full border border-gold flex items-center justify-center font-display text-gold">
            CH
          </span>
          <span className="font-display text-ivory text-lg">
            CASA <em className="text-gold not-italic italic">Habitat</em>
          </span>
        </div>

        <div className="bg-navy-deep border border-gold/15 rounded-sm p-8">
          <h1 className="font-display text-ivory text-xl mb-1">Administration</h1>
          <p className="text-ivory/50 text-sm mb-8">Connexion réservée à l&apos;agence.</p>

          <Suspense fallback={null}>
            <NotAdminNotice />
          </Suspense>

          <form action={formAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="font-mono text-[10.5px] uppercase tracking-widest text-ivory/50">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                className="bg-transparent border-b border-ivory/25 focus:border-gold outline-none py-2.5 text-ivory text-[15px]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="font-mono text-[10.5px] uppercase tracking-widest text-ivory/50">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="bg-transparent border-b border-ivory/25 focus:border-gold outline-none py-2.5 text-ivory text-[15px]"
              />
            </div>

            {state.error && (
              <p className="text-red-400 text-sm">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="bg-gold text-navy font-semibold text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm hover:bg-gold-bright transition-colors disabled:opacity-50"
            >
              {pending ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
