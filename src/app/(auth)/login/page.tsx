"use client";
import { GoogleSignIn, AuthCallbackFeedback } from "@/features/auth/GoogleSignIn";
import { useT } from "@/i18n/LanguageProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Layers, LogIn, Mail, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// ── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe requis (min. 6 caractères)"),
});

const forgotSchema = z.object({
  email: z.string().email("Email invalide"),
});

type LoginValues = z.infer<typeof loginSchema>;
type ForgotValues = z.infer<typeof forgotSchema>;

// ── Login sub-form ────────────────────────────────────────────────────────────

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginValues) {
    setLoading(true);
    const { createClient } = await import("@/lib/supabaseClient");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);

    if (error) {
      toast.error(t("Connexion échouée : ") + error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <div className="mb-5 text-center">
        <h2 id="login-title" className="text-2xl font-semibold tracking-tight text-sn-text">{t("Welcome back")}</h2>
        <p className="mt-2 text-sm leading-6 text-sn-text-muted">{t("Sign in to your development library.")}</p>
      </div>
      <AuthCallbackFeedback />
      <GoogleSignIn />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label={t("Email")}
          type="email"
          placeholder={t("you@example.com")}
          autoComplete="username"
          className="h-11 px-3 text-sm"
          error={errors.email?.message}
          {...register("email")}
        />

        <div>
          <div className="relative">
            <Input
              id="login-password"
              label={t("Password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 pl-3 pr-12 text-sm"
              error={errors.password?.message}
              {...register("password")}
            />
            <button
              type="button"
              aria-label={t(showPassword ? "Hide password" : "Show password")}
              aria-pressed={showPassword}
              aria-controls="login-password"
              onClick={() => setShowPassword(value => !value)}
              className="absolute right-1 top-[23px] flex h-10 w-10 items-center justify-center rounded-md text-sn-text-muted hover:bg-sn-table-header hover:text-sn-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-sn-accent"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <div className="mt-3 text-right">
            <button type="button" onClick={onForgot} className="rounded text-xs font-medium text-sn-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sn-accent">
              {t("Mot de passe oublié ?")}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          loading={loading}
          icon={<LogIn className="w-4 h-4" />}
          className="w-full mt-1 h-11"
          size="lg"
        >
          {t("Sign in")}</Button>
      </form>

      <p className="text-sm text-center text-sn-text-muted mt-6">
        {t("No account?")}{" "}
        <Link href="/signup" className="text-sn-accent hover:underline">
          {t("Create one")}</Link>
      </p>
    </>
  );
}

// ── Forgot-password sub-form ──────────────────────────────────────────────────

function ForgotForm({ onBack }: { onBack: () => void }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });

  async function onSubmit(data: ForgotValues) {
    setLoading(true);
    const { createClient } = await import("@/lib/supabaseClient");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(t("Erreur : ") + error.message);
      return;
    }

    setSent(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-sn-text-muted hover:text-sn-text mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("Retour")}</button>

      {sent ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-sn-text">{t("Email envoyé !")}</p>
          <p className="text-xs text-sn-text-muted max-w-[220px]">
            {t("Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe.")}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-1 text-xs text-sn-accent hover:underline"
          >
            {t("Retour à la connexion")}</button>
        </div>
      ) : (
        <>
          <h2 className="text-base font-semibold text-sn-text mb-1">{t("Mot de passe oublié")}</h2>
          <p className="text-xs text-sn-text-muted mb-4">
            {t("Entrez votre email pour recevoir un lien de réinitialisation.")}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label={t("Email")}
              type="email"
              placeholder={t("you@example.com")}
              error={errors.email?.message}
              {...register("email")}
            />

            <Button
              type="submit"
              loading={loading}
              icon={<Mail className="w-4 h-4" />}
              className="w-full"
              size="lg"
            >
              {t("Envoyer le lien")}</Button>
          </form>
        </>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const t = useT();
  const [mode, setMode] = useState<"login" | "forgot">("login");

  return (
    <main className="sn-login-page">
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#91cf62] text-[#163c3f] shadow-sm">
              <Layers className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="text-[30px] font-semibold tracking-tight text-white">SN Dev <span className="text-[#b9e49a]">Hub</span></h1>
          </div>
          <p className="mt-3 text-sm text-white/80">{t("Your ServiceNow development library")}</p>
        </div>

        <section aria-label={t("Sign in to your account")} className="rounded-2xl border border-white/60 bg-white p-6 shadow-[0_24px_80px_-20px_rgba(9,39,46,0.5)] sm:p-7">
          {mode === "login" ? (
            <LoginForm onForgot={() => setMode("forgot")} />
          ) : (
            <ForgotForm onBack={() => setMode("login")} />
          )}
        </section>
        <p className="mt-6 text-center text-xs leading-5 text-white/80">{t("Clients, stories and developments. One place.")}</p>
      </div>
    </main>
  );
}
