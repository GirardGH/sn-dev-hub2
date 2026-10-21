"use client";
import { useT } from "@/i18n/LanguageProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Layers, KeyRound, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z
  .object({
    password: z.string().min(8, "Mot de passe requis (min. 8 caractères)"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    const { createClient } = await import("@/lib/supabaseClient");
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password: data.password });
    setLoading(false);

    if (error) {
      toast.error(t("Erreur : ") + error.message);
      return;
    }

    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="min-h-screen bg-sn-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-sn-accent rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sn-text">{t("SN Dev Hub")}</h1>
            <p className="text-xs text-sn-text-muted">{t("ServiceNow Manager")}</p>
          </div>
        </div>

        <div className="bg-white border border-sn-border rounded-sm shadow-xs p-6">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-sn-text">{t("Mot de passe mis à jour !")}</p>
              <p className="text-xs text-sn-text-muted">{t("Redirection vers la connexion…")}</p>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-sn-text mb-1">
                {t("Nouveau mot de passe")}</h2>
              <p className="text-xs text-sn-text-muted mb-4">
                {t("Choisissez un nouveau mot de passe pour votre compte.")}</p>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Input
                  label={t("Nouveau mot de passe")}
                  type="password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register("password")}
                />
                <Input
                  label={t("Confirmer le mot de passe")}
                  type="password"
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  {...register("confirmPassword")}
                />

                <Button
                  type="submit"
                  loading={loading}
                  icon={<KeyRound className="w-4 h-4" />}
                  className="w-full mt-1"
                  size="lg"
                >
                  {t("Mettre à jour")}</Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
