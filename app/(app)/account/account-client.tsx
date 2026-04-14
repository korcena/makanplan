"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function AccountClient({
  user,
}: {
  user: { id: string; name: string; email: string; householdId: string | null };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return toast("Failed to save", "error");
    toast("Name updated", "success");
    router.refresh();
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast(d.error || "Failed", "error");
    }
    setCurrentPassword("");
    setNewPassword("");
    toast("Password changed", "success");
  };

  const leave = async () => {
    if (!confirm("Leave your current household?")) return;
    const res = await fetch("/api/household/leave", { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast(d.error || "Failed", "error");
    }
    toast("Left household", "success");
    router.push("/household");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="acc-name">Name</Label>
              <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <Input
                id="new"
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit">Change password</Button>
          </form>
        </CardContent>
      </Card>

      {user.householdId && (
        <Card>
          <CardHeader>
            <CardTitle>Leave household</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={leave}>
              Leave household
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
