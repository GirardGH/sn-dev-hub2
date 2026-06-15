"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Layers, LogIn } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe requis (min. 6 caractères)"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
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
          <h2 className="text-base font-semibold text-sn-text mb-4">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

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
        </div>
      </div>
    </div>
  );
}
