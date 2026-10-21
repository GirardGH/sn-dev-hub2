"use client";
import { GoogleSignIn } from "@/features/auth/GoogleSignIn";
import { useT } from "@/i18n/LanguageProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Layers, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z
  .object({
    full_name: z.string().min(2, "Nom requis (min. 2 caractères)"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Mot de passe requis (min. 6 caractères)"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    const { createClient } = await import("@/lib/supabaseClient");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(t("Inscription échouée : ") + error.message);
      return;
    }

    toast.success(t("Compte créé ! Vérifiez votre email."));
    router.push("/login");
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
          <h2 className="text-base font-semibold text-sn-text mb-4">{t("Create an account")}</h2>
          <GoogleSignIn />

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label={t("Full name")}
              placeholder={t("John Doe")}
              error={errors.full_name?.message}
              {...register("full_name")}
            />
            <Input
              label={t("Email")}
              type="email"
              placeholder={t("you@example.com")}
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label={t("Password")}
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label={t("Confirm password")}
              type="password"
              placeholder="••••••••"
              error={errors.confirm_password?.message}
              {...register("confirm_password")}
            />

            <Button
              type="submit"
              loading={loading}
              icon={<UserPlus className="w-4 h-4" />}
              className="w-full mt-1"
              size="lg"
            >
              {t("Create account")}</Button>
          </form>

          <p className="text-xs text-center text-sn-text-muted mt-4">
            {t("Already have an account?")}{" "}
            <Link href="/login" className="text-sn-accent hover:underline">
              {t("Sign in")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
