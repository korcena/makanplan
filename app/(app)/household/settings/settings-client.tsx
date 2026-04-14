"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Copy, RefreshCw, Trash2, Crown } from "lucide-react";

type Member = { id: string; name: string; email: string; role: "OWNER" | "MEMBER" };

export function SettingsClient({
  me,
  household,
  members,
}: {
  me: { id: string; role: "OWNER" | "MEMBER" };
  household: { id: string; name: string; inviteCode: string };
  members: Member[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(household.name);
  const [inviteCode, setInviteCode] = useState(household.inviteCode);
  const isOwner = me.role === "OWNER";

  const updateName = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/household", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return toast("Failed to update", "error");
    toast("Household renamed", "success");
    router.refresh();
  };

  const regenerate = async () => {
    const res = await fetch("/api/household", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateInviteCode: true }),
    });
    if (!res.ok) return toast("Failed to regenerate", "error");
    const data = await res.json();
    setInviteCode(data.household.inviteCode);
    toast("Invite code regenerated", "success");
    router.refresh();
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    toast("Invite code copied", "success");
  };

  const memberAction = async (userId: string, action: "remove" | "transfer_ownership") => {
    if (action === "remove" && !confirm("Remove this member from the household?")) return;
    if (action === "transfer_ownership" && !confirm("Transfer ownership to this member?")) return;
    const res = await fetch("/api/household/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast(d.error || "Failed", "error");
    }
    toast("Done", "success");
    router.refresh();
  };

  const leave = async () => {
    if (!confirm("Leave this household?")) return;
    const res = await fetch("/api/household/leave", { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast(d.error || "Failed to leave", "error");
    }
    router.push("/household");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>{isOwner ? "As owner, you can rename the household." : "Only the owner can edit household details."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={updateName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hh-name">Name</Label>
              <Input
                id="hh-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOwner}
              />
            </div>
            {isOwner && <Button type="submit">Save</Button>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite code</CardTitle>
          <CardDescription>Share this code with others to let them join.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <code className="flex-1 px-4 py-3 rounded-md bg-muted font-mono text-lg tracking-wider text-center">
              {inviteCode}
            </code>
            <Button variant="outline" size="icon" onClick={copyCode} aria-label="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            {isOwner && (
              <Button variant="outline" size="icon" onClick={regenerate} aria-label="Regenerate">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>{members.length} member{members.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{m.name}</span>
                    {m.role === "OWNER" && (
                      <Badge variant="soft" className="gap-1">
                        <Crown className="h-3 w-3" /> Owner
                      </Badge>
                    )}
                    {m.id === me.id && <Badge variant="outline">You</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                {isOwner && m.id !== me.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => memberAction(m.id, "transfer_ownership")}
                    >
                      Make owner
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => memberAction(m.id, "remove")}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave household</CardTitle>
          <CardDescription>
            {isOwner && members.length > 1
              ? "Transfer ownership before you can leave."
              : "Leave this household. You can join another later."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={leave}>
            Leave household
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
