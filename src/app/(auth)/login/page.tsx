"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Layers, LogIn, Mail, ArrowLeft } from "lucide-react";
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
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
      toast.error("Connexion échouée : " + error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <h2 className="text-base font-semibold text-sn-text mb-4">Sign in to your account</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            onClick={onForgot}
            className="mt-1.5 text-xs text-sn-accent hover:underline"
          >
            Mot de passe oublié ?
          </button>
        </div>

        <Button
          type="submit"
          loading={loading}
          icon={<LogIn className="w-4 h-4" />}
          className="w-full mt-1"
          size="lg"
        >
          Sign in
        </Button>
      </form>

      <p className="text-xs text-center text-sn-text-muted mt-4">
        No account?{" "}
        <Link href="/signup" className="text-sn-accent hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}

// ── Forgot-password sub-form ──────────────────────────────────────────────────

function ForgotForm({ onBack }: { onBack: () => void }) {
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
      toast.error("Erreur : " + error.message);
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
        Retour
      </button>

      {sent ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-sn-text">Email envoyé !</p>
          <p className="text-xs text-sn-text-muted max-w-[220px]">
            Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-1 text-xs text-sn-accent hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-base font-semibold text-sn-text mb-1">Mot de passe oublié</h2>
          <p className="text-xs text-sn-text-muted mb-4">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
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
              Envoyer le lien
            </Button>
          </form>
        </>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "forgot">("login");

  return (
    <div className="min-h-screen bg-sn-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-sn-accent rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sn-text">SN Dev Hub</h1>
            <p className="text-xs text-sn-text-muted">ServiceNow Manager</p>
          </div>
        </div>

        <div className="bg-white border border-sn-border rounded shadow-sm p-6">
          {mode === "login" ? (
            <LoginForm onForgot={() => setMode("forgot")} />
          ) : (
            <ForgotForm onBack={() => setMode("login")} />
          )}
        </div>
      </div>
    </div>
  );
}
