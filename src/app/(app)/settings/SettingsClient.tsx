"use client";

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
    if (error) toast.error("Error: " + error.message);
    else { toast.success("Profile saved!"); router.refresh(); }
  }

  async function changePassword() {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setChangingPassword(true);
    const { createClient } = await import("@/lib/supabaseClient");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) toast.error("Error: " + error.message);
    else { toast.success("Password updated!"); setNewPassword(""); }
  }

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: "Settings" }]} className="mb-3" />

      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-sn-accent" />
        <h1 className="text-lg font-semibold text-sn-text">Settings</h1>
      </div>

      <div className="space-y-4">
        {/* Profile */}
        <Card
          title="Profile"
          actions={
            <div className="flex items-center gap-1.5 text-xs text-sn-text-muted">
              <User className="w-3.5 h-3.5" />
              Account
            </div>
          }
        >
          <div className="space-y-4">
            <Input
              label="Email"
              value={user?.email ?? ""}
              disabled
              hint="Email cannot be changed"
            />
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
            <Button onClick={saveProfile} loading={saving}>
              Save Profile
            </Button>
          </div>
        </Card>

        {/* Security */}
        <Card
          title="Security"
          actions={
            <div className="flex items-center gap-1.5 text-xs text-sn-text-muted">
              <Shield className="w-3.5 h-3.5" />
              Password
            </div>
          }
        >
          <div className="space-y-4">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              hint="Minimum 6 characters"
            />
            <Button
              variant="secondary"
              onClick={changePassword}
              loading={changingPassword}
              disabled={!newPassword}
            >
              Change Password
            </Button>
          </div>
        </Card>

        {/* Account info */}
        <Card title="Account Information">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-sn-text-muted">User ID</span>
              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-sn-text">
                {user?.id?.slice(0, 20)}...
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-sn-text-muted">Created</span>
              <span className="text-sn-text">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("fr-FR")
                  : "—"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
