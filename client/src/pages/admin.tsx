import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { MONTHS, PLANS } from "@shared/schema";
import { useTheme } from "@/lib/theme-provider";
import type { Member, Payment, Child } from "@shared/schema";
import {
  Shield, Users, CheckCircle, CreditCard, Clock, Moon, Sun,
  LogOut, FileSpreadsheet, Download, Trash2, Search
} from "lucide-react";

const ADMIN_CODE = "ABANGANI26";

async function adminFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      "x-admin-code": ADMIN_CODE,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res;
}

const adminQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await adminFetch(queryKey.join("/"));
        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: false,
    },
  },
});

export default function Admin() {
  const [accessCode, setAccessCode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="p-6 w-full max-w-sm">
          <div className="text-center mb-6">
            <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
            <h1 className="text-xl font-bold" data-testid="text-admin-title">Admin Access</h1>
            <p className="text-sm text-muted-foreground">Enter the admin access code</p>
          </div>
          <Input
            type="password"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Access code"
            className="mb-4"
            data-testid="input-admin-code"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (accessCode === ADMIN_CODE) {
                  setAuthenticated(true);
                } else {
                  toast({ title: "Invalid code", variant: "destructive" });
                }
              }
            }}
          />
          <Button
            className="w-full"
            onClick={() => {
              if (accessCode === ADMIN_CODE) {
                setAuthenticated(true);
              } else {
                toast({ title: "Invalid code", variant: "destructive" });
              }
            }}
            data-testid="button-admin-login"
          >
            Access Admin Panel
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <QueryClientProvider client={adminQueryClient}>
      <AdminPanel toggleTheme={toggleTheme} theme={theme} onLogout={() => setAuthenticated(false)} />
    </QueryClientProvider>
  );
}

function AdminPanel({ toggleTheme, theme, onLogout }: { toggleTheme: () => void; theme: string; onLogout: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: stats } = useQuery<{
    totalMembers: number;
    active: number;
    pending: number;
    totalRevenue: number;
    tierBreakdown: Record<string, number>;
  }>({ queryKey: ["/api/admin/stats"] });

  const { data: members } = useQuery<(Member & { children: Child[]; payments: Payment[] })[]>({
    queryKey: ["/api/admin/members"],
  });

  const arrearsMembers = members?.filter((m) =>
    m.payments.some((p) => p.status === "unpaid")
  ) || [];

  const verifyMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await adminFetch(`/api/admin/payments/${paymentId}/verify`, { method: "POST" });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Payment verified" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await adminFetch(`/api/admin/payments/${paymentId}/reject`, { method: "POST" });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Payment rejected" });
    },
  });

  const approveMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminFetch(`/api/admin/members/${id}/approve`, { method: "POST" });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Member approved" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminFetch(`/api/admin/members/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Member deleted" });
    },
  });

  const filteredMembers = members?.filter((m) =>
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    m.trackingNumber.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const activeMembers = filteredMembers.filter((m) => m.status === "active");
  const pendingMembers = filteredMembers.filter((m) => m.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold" data-testid="text-admin-brand">Admin Panel</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={() => {
              const a = document.createElement("a");
              a.href = "/api/admin/export?format=csv";
              fetch(a.href, { headers: { "x-admin-code": ADMIN_CODE } })
                .then(r => r.blob())
                .then(blob => {
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "abangani-members.csv";
                  link.click();
                });
            }} data-testid="button-admin-sheets">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Sheets
            </Button>
            <Button variant="ghost" onClick={() => {
              fetch("/api/admin/export?format=csv", { headers: { "x-admin-code": ADMIN_CODE } })
                .then(r => r.blob())
                .then(blob => {
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "abangani-members.csv";
                  link.click();
                });
            }} data-testid="button-admin-csv">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button size="icon" variant="ghost" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={onLogout} data-testid="button-admin-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 text-center" data-testid="card-stat-total">
            <Users className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
            <p className="text-xs text-muted-foreground">Total Members</p>
          </Card>
          <Card className="p-4 text-center" data-testid="card-stat-active">
            <CheckCircle className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </Card>
          <Card className="p-4 text-center" data-testid="card-stat-revenue">
            <CreditCard className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">R{stats?.totalRevenue || 0}</p>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </Card>
          <Card className="p-4 text-center" data-testid="card-stat-pending">
            <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </Card>
        </div>

        {stats?.tierBreakdown && Object.keys(stats.tierBreakdown).length > 0 && (
          <Card className="p-4" data-testid="card-tier-breakdown">
            <h3 className="font-bold mb-3">Tier Breakdown</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.tierBreakdown).map(([tier, count]) => (
                <div key={tier} className="flex items-center gap-2">
                  <Badge variant="secondary">{tier}</Badge>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search members by name, phone, or tracking number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-admin-search"
          />
        </div>

        <Tabs defaultValue="pending" data-testid="tabs-admin">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-admin-pending">Pending ({pendingMembers.length})</TabsTrigger>
            <TabsTrigger value="members" data-testid="tab-admin-members">Members</TabsTrigger>
            <TabsTrigger value="arrears" data-testid="tab-admin-arrears">Arrears ({arrearsMembers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingMembers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No pending members</Card>
            ) : (
              pendingMembers.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  onApprove={() => approveMemberMutation.mutate(m.id)}
                  onDelete={() => deleteMemberMutation.mutate(m.id)}
                  onVerify={(id) => verifyMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-3 mt-4">
            {activeMembers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No active members</Card>
            ) : (
              activeMembers.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  onDelete={() => deleteMemberMutation.mutate(m.id)}
                  onVerify={(id) => verifyMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="arrears" className="space-y-3 mt-4">
            {arrearsMembers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No members in arrears</Card>
            ) : (
              arrearsMembers.map((m) => {
                const unpaid = m.payments.filter((p) => p.status === "unpaid").length;
                return (
                  <Card key={m.id} className="p-4" data-testid={`card-arrears-${m.id}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-semibold">{m.fullName}</p>
                        <p className="text-sm text-muted-foreground">{m.phone}</p>
                      </div>
                      <Badge variant="destructive">{unpaid} unpaid</Badge>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MemberCard({ member, onApprove, onDelete, onVerify, onReject }: {
  member: Member & { children: Child[]; payments: Payment[] };
  onApprove?: () => void;
  onDelete: () => void;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const plan = Object.values(PLANS).find((p) => p.amount === member.planAmount);
  const memberPendingPayments = member.payments.filter((p) => p.status === "pending");

  return (
    <Card className="p-4" data-testid={`card-member-${member.id}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold">{member.fullName}</p>
          <p className="text-sm text-muted-foreground">{member.phone}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="secondary">{plan?.name || member.plan}</Badge>
            <Badge variant="outline">{member.trackingNumber}</Badge>
          </div>
          {member.children.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {member.children.map((c) => `${c.fullName} (${c.grade})`).join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {member.status === "pending" && onApprove && (
            <Button variant="default" onClick={onApprove} data-testid={`button-approve-${member.id}`}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Verify
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onDelete} data-testid={`button-delete-member-${member.id}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {memberPendingPayments.length > 0 && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {memberPendingPayments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 flex-wrap text-sm">
              <div>
                <span className="text-muted-foreground">R{p.amount} - {MONTHS[p.month - 1]} {p.year}</span>
                {p.paymentMethod && <span className="text-muted-foreground"> via {p.paymentMethod}</span>}
                {p.reference && <span className="text-muted-foreground"> Ref: {p.reference}</span>}
              </div>
              <div className="flex gap-1">
                <Button variant="default" onClick={() => onVerify(p.id)} data-testid={`button-verify-payment-${p.id}`}>
                  <CheckCircle className="h-3 w-3 mr-1" />Verify
                </Button>
                <Button variant="destructive" onClick={() => onReject(p.id)} data-testid={`button-reject-payment-${p.id}`}>
                  <Trash2 className="h-3 w-3 mr-1" />Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
