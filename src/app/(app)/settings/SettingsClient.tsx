"use client";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useT } from "@/i18n/LanguageProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, User, Shield } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

interface Props {
  user: SupabaseUser | null;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

export function SettingsClient({ user, profile }: Props) {
  const t = useT();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  async function saveProfile() {
    setSaving(true);
    const { createClient } = await import("@/lib/supabaseClient");
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName } as { full_name: string })
      .eq("id", user!.id);
    setSaving(false);
    if (error) toast.error(t("Error: ") + error.message);
    else { toast.success(t("Profile saved!")); router.refresh(); }
  }

  async function changePassword() {
    if (newPassword.length < 6) {
      toast.error(t("Password must be at least 6 characters."));
      return;
    }
    setChangingPassword(true);
    const { createClient } = await import("@/lib/supabaseClient");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) toast.error(t("Error: ") + error.message);
    else { toast.success(t("Password updated!")); setNewPassword(""); }
  }

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: t("Settings") }]} className="mb-3" />

      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-sn-accent" />
        <h1 className="text-lg font-semibold text-sn-text">{t("Settings")}</h1>
      </div>

      <div className="space-y-4">
        <Card title={t("Language")}>
          <fieldset>
            <legend className="text-sm text-sn-text-muted mb-4">{t("Choose the language used throughout the application.")}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([['fr', 'Français / French'], ['en', 'English / Anglais']] as const).map(([value, label]) => (
                <label key={value} className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer ${language === value ? 'border-sn-accent bg-sn-accent-light' : 'border-sn-border hover:bg-sn-table-header'}`}>
                  <input type="radio" name="language" value={value} checked={language === value} onChange={() => setLanguage(value)} className="accent-sn-accent" />
                  <span className="font-medium">{label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-sn-text-muted mt-3" role="status">{t("Language preference saved on this browser.")}</p>
          </fieldset>
        </Card>
        {/* Profile */}
        <Card
          title={t("Profile")}
          actions={
            <div className="flex items-center gap-1.5 text-xs text-sn-text-muted">
              <User className="w-3.5 h-3.5" />
              {t("Account")}</div>
          }
        >
          <div className="space-y-4">
            <Input
              label={t("Email")}
              value={user?.email ?? ""}
              disabled
              hint={t("Email cannot be changed")}
            />
            <Input
              label={t("Full Name")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("John Doe")}
            />
            <Button onClick={saveProfile} loading={saving}>
              {t("Save Profile")}</Button>
          </div>
        </Card>

        {/* Security */}
        <Card
          title={t("Security")}
          actions={
            <div className="flex items-center gap-1.5 text-xs text-sn-text-muted">
              <Shield className="w-3.5 h-3.5" />
              {t("Password")}</div>
          }
        >
          <div className="space-y-4">
            <Input
              label={t("New Password")}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              hint={t("Minimum 6 characters")}
            />
            <Button
              variant="secondary"
              onClick={changePassword}
              loading={changingPassword}
              disabled={!newPassword}
            >
              {t("Change Password")}</Button>
          </div>
        </Card>

        {/* Account info */}
        <Card title={t("Account Information")}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-sn-text-muted">{t("User ID")}</span>
              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-sn-text">
                {user?.id?.slice(0, 20)}...
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-sn-text-muted">{t("Created")}</span>
              <span className="text-sn-text">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB")
                  : "—"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
