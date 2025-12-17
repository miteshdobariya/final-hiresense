"use client"
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface Admin {
  _id: string;
  username?: string;
  email: string;
  role: string;
}

export default function AdminsPage() {
  const { data: session, status } = useSession();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const router = useRouter();

  // Helper to check if a user is a super admin
  const superAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",") || []).map(e => e.trim());
  const isSuperAdminEmail = (email: string) => superAdminEmails.includes(email);

  useEffect(() => {
    if (status === "loading") return;
    if (!isSuperAdminEmail(session?.user?.email || "")) {
      toast.error("Unauthorized: Only super admins can view this page.");
      router.replace("/admin");
      return;
    }
    if (status === "authenticated") {
      if (session.user.role === "hr") {
        router.replace("/admin");
      }
    }
    fetchAdmins();
    // eslint-disable-next-line
  }, [status, session, router]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      if (res.ok) {
        setAdmins(data.admins);
      } else {
        throw new Error(data.error || "Failed to fetch admins");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch admins";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDemote = async (adminId: string) => {
    if (!adminId) {
      toast.error("Admin ID is required");
      return;
    }
    if (!window.confirm("Are you sure you want to demote this admin to interviewer?")) return;
    try {
      const res = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Admin demoted to interviewer");
        setAdmins(admins.filter((a) => a.id !== adminId));
      } else {
        throw new Error(data.error || "Failed to demote admin");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to demote admin";
      toast.error(errorMessage);
    }
  };

  const filteredAdmins = admins.filter((admin) => {
    if (roleFilter === "all") return true;
    return admin.role === roleFilter;
  });

  if (loading) {
    return <div className="p-6">Loading admins...</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <h2 className="text-3xl font-bold tracking-tight mb-4">Admins & HR</h2>
      <div className="mb-4 flex gap-2 items-center">
        <span>Filter by role:</span>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="all">All</option>
          <option value="admin">Admin</option>
          <option value="hr">HR</option>
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAdmins.map((admin, idx) => (
          <Card key={admin.id || idx}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{admin.username || admin.email}</CardTitle>
              <Badge>
                {admin.role ? admin.role.charAt(0).toUpperCase() + admin.role.slice(1) : "Unknown"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="mb-2">Email: {admin.email}</div>
              <div className="mb-2">Role: {admin.role}</div>
              {!isSuperAdminEmail(admin.email) && admin.id && (
                <Button variant="destructive" onClick={() => handleDemote(admin.id)}>
                  Demote to Interviewer
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredAdmins.length === 0 && <div>No admins or HR found.</div>}
    </div>
  );
} 