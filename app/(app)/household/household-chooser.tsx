"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function HouseholdChooser() {
  const router = useRouter();
  const { toast } = useToast();
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("create");
    const res = await fetch("/api/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName }),
    });
    setLoading(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Failed to create", "error");
      return;
    }
    toast("Household created", "success");
    router.push("/dashboard");
    router.refresh();
  };

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("join");
    const res = await fetch("/api/household/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode.trim().toUpperCase() }),
    });
    setLoading(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast(d.error || "Failed to join", "error");
      return;
    }
    toast("Joined household", "success");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a household</CardTitle>
          <CardDescription>You&apos;ll be the owner.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="household-name">Household name</Label>
              <Input
                id="household-name"
                placeholder="The Smith Family"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading === "create"}>
              {loading === "create" ? "Creating…" : "Create household"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Join a household</CardTitle>
          <CardDescription>Enter an 8-character invite code.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite">Invite code</Label>
              <Input
                id="invite"
                placeholder="ABCD1234"
                className="uppercase tracking-wider"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <Button type="submit" className="w-full" variant="outline" disabled={loading === "join"}>
              {loading === "join" ? "Joining…" : "Join household"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
