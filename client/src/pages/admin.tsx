import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MONTHS, PLANS } from "@shared/schema";
import type { Member, Payment, Child } from "@shared/schema";
import {
  Shield, Users, CheckCircle, CreditCard, Clock, Moon, Sun,
  LogOut, Download, Trash2, Search, Mail, FileText, Eye,
  Link2, Package, XCircle, UserCheck
} from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { Footer } from "@/components/footer";
import { StokvelLogo } from "@/components/navbar";
import type { Supplier, Affiliate } from "@shared/schema";

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
            <StokvelLogo className="h-10 w-10 mx-auto mb-3" />
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
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

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

  const sendReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminFetch(`/api/admin/members/${id}/send-reminder`, { method: "POST" });
    },
    onSuccess: () => {
      toast({ title: "Reminder sent successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send reminder", description: err.message, variant: "destructive" });
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

  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/admin/suppliers"] });
  const { data: affiliatesData } = useQuery<Affiliate[]>({ queryKey: ["/api/admin/affiliates"] });

  const updateSupplierStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await adminFetch(`/api/admin/suppliers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers"] });
      toast({ title: "Supplier status updated" });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminFetch(`/api/admin/suppliers/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers"] });
      toast({ title: "Supplier deleted" });
    },
  });

  const updateAffiliateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await adminFetch(`/api/admin/affiliates/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      toast({ title: "Affiliate status updated" });
    },
  });

  const deleteAffiliateMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminFetch(`/api/admin/affiliates/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      toast({ title: "Affiliate deleted" });
    },
  });

  const handlePdfExport = async () => {
    try {
      const res = await fetch("/api/admin/export?format=pdf", {
        headers: { "x-admin-code": ADMIN_CODE },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "abangani-members.pdf";
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF exported successfully" });
    } catch {
      toast({ title: "PDF export failed", variant: "destructive" });
    }
  };

  const handleCsvExport = async () => {
    try {
      const res = await fetch("/api/admin/export?format=csv", {
        headers: { "x-admin-code": ADMIN_CODE },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "abangani-members.csv";
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "CSV exported successfully" });
    } catch {
      toast({ title: "CSV export failed", variant: "destructive" });
    }
  };

  const filteredMembers = members?.filter((m) =>
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    m.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
    (m.email && m.email.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const pendingPayments: { payment: Payment; member: Member & { children: Child[]; payments: Payment[] } }[] = [];
  members?.forEach((m) => {
    m.payments.filter((p) => p.status === "pending").forEach((p) => {
      pendingPayments.push({ payment: p, member: m });
    });
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <StokvelLogo className="h-6 w-6" />
            <span className="font-bold" data-testid="text-admin-brand">Abangani Stokvel Fund - Admin</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={handlePdfExport} data-testid="button-admin-pdf-export">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="ghost" onClick={handleCsvExport} data-testid="button-admin-csv-export">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-admin-theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={onLogout} data-testid="button-admin-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6 flex-1">
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
            placeholder="Search members by name, email, phone, or tracking number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-admin-search"
          />
        </div>

        <Tabs defaultValue="members" data-testid="tabs-admin">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="members" data-testid="tab-admin-members">Members ({filteredMembers.length})</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-admin-payments">Payments ({pendingPayments.length})</TabsTrigger>
            <TabsTrigger value="arrears" data-testid="tab-admin-arrears">Arrears ({arrearsMembers.length})</TabsTrigger>
            <TabsTrigger value="suppliers" data-testid="tab-admin-suppliers">Suppliers ({suppliers?.length || 0})</TabsTrigger>
            <TabsTrigger value="affiliates" data-testid="tab-admin-affiliates">Affiliates ({affiliatesData?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-3 mt-4">
            {filteredMembers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground" data-testid="text-no-members">No members found</Card>
            ) : (
              filteredMembers.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  expanded={expandedMember === m.id}
                  onToggleExpand={() => setExpandedMember(expandedMember === m.id ? null : m.id)}
                  onDelete={() => {
                    if (confirm("Are you sure you want to delete this member?")) deleteMemberMutation.mutate(m.id);
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-3 mt-4">
            {pendingPayments.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground" data-testid="text-no-payments">No pending payments</Card>
            ) : (
              pendingPayments.map(({ payment: p, member: m }) => (
                <Card key={p.id} className="p-4" data-testid={`card-payment-${p.id}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold" data-testid={`text-payment-member-${p.id}`}>{m.fullName} {m.surname}</p>
                      <p className="text-sm text-muted-foreground">
                        R{p.amount} - {MONTHS[p.month - 1]} {p.year}
                      </p>
                      {p.paymentMethod && (
                        <p className="text-sm text-muted-foreground">via {p.paymentMethod}</p>
                      )}
                      {p.reference && (
                        <p className="text-sm text-muted-foreground">Ref: {p.reference}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="default"
                        onClick={() => verifyMutation.mutate(p.id)}
                        disabled={verifyMutation.isPending}
                        data-testid={`button-verify-payment-${p.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(p.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-payment-${p.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="arrears" className="space-y-3 mt-4">
            {arrearsMembers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground" data-testid="text-no-arrears">No members in arrears</Card>
            ) : (
              arrearsMembers.map((m) => {
                const unpaidPayments = m.payments.filter((p) => p.status === "unpaid");
                return (
                  <Card key={m.id} className="p-4" data-testid={`card-arrears-${m.id}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-semibold" data-testid={`text-arrears-name-${m.id}`}>{m.fullName} {m.surname}</p>
                        <p className="text-sm text-muted-foreground">{m.phone}</p>
                        {m.email && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {m.email}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Unpaid: {unpaidPayments.map((p) => `${MONTHS[p.month - 1]} ${p.year}`).join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{unpaidPayments.length} unpaid</Badge>
                        <Button
                          variant="outline"
                          onClick={() => sendReminderMutation.mutate(m.id)}
                          disabled={sendReminderMutation.isPending}
                          data-testid={`button-send-reminder-${m.id}`}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Send Reminder
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-3 mt-4">
            {!suppliers || suppliers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground" data-testid="text-no-suppliers">No suppliers registered</Card>
            ) : (
              suppliers.map((s) => (
                <Card key={s.id} className="p-4" data-testid={`card-supplier-${s.id}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{s.fullName} {s.surname}</p>
                      <p className="text-sm font-medium text-primary">{s.businessName}</p>
                      <p className="text-sm text-muted-foreground">{s.phone} | {s.email}</p>
                      <p className="text-sm text-muted-foreground">{s.businessType} | {s.address}</p>
                      {s.createdAt && (
                        <p className="text-xs text-muted-foreground">Registered: {new Date(s.createdAt).toLocaleDateString("en-ZA")}</p>
                      )}
                      {s.trackingNumber && (
                        <p className="text-xs text-muted-foreground">Tracking: {s.trackingNumber}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.goodsSupplied?.map((g, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{g}</Badge>
                        ))}
                      </div>
                      <div className="mt-2">
                        <Badge
                          className={
                            s.status === "approved" ? "bg-green-500/10 text-green-600 border-green-500/30" :
                            s.status === "rejected" ? "bg-red-500/10 text-red-600 border-red-500/30" :
                            "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                          }
                        >
                          {s.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {s.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                          {s.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {s.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {s.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateSupplierStatusMutation.mutate({ id: s.id, status: "approved" })}
                            disabled={updateSupplierStatusMutation.isPending}
                            data-testid={`button-approve-supplier-${s.id}`}
                          >
                            <UserCheck className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateSupplierStatusMutation.mutate({ id: s.id, status: "rejected" })}
                            disabled={updateSupplierStatusMutation.isPending}
                            data-testid={`button-reject-supplier-${s.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Delete this supplier?")) deleteSupplierMutation.mutate(s.id);
                        }}
                        data-testid={`button-delete-supplier-${s.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="affiliates" className="space-y-3 mt-4">
            {!affiliatesData || affiliatesData.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground" data-testid="text-no-affiliates">No affiliates registered</Card>
            ) : (
              affiliatesData.map((a) => (
                <Card key={a.id} className="p-4" data-testid={`card-affiliate-${a.id}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{a.fullName} {a.surname}</p>
                      <p className="text-sm text-muted-foreground">{a.phone} | {a.email}</p>
                      {a.createdAt && (
                        <p className="text-xs text-muted-foreground">Registered: {new Date(a.createdAt).toLocaleDateString("en-ZA")}</p>
                      )}
                      {a.trackingNumber && (
                        <p className="text-xs text-muted-foreground">Tracking: {a.trackingNumber}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Code: {a.affiliateCode}</p>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{a.totalClicks} clicks</span>
                        <span>{a.totalConversions} conversions</span>
                        <span>R{a.commissionEarned} earned</span>
                      </div>
                      {a.bankName && (
                        <p className="text-xs text-muted-foreground">Bank: {a.bankName} | Acc: {a.accountNumber}</p>
                      )}
                      <div className="mt-2">
                        <Badge
                          className={
                            a.status === "approved" ? "bg-green-500/10 text-green-600 border-green-500/30" :
                            a.status === "rejected" ? "bg-red-500/10 text-red-600 border-red-500/30" :
                            "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                          }
                        >
                          {a.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {a.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                          {a.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {a.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {a.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateAffiliateStatusMutation.mutate({ id: a.id, status: "approved" })}
                            disabled={updateAffiliateStatusMutation.isPending}
                            data-testid={`button-approve-affiliate-${a.id}`}
                          >
                            <UserCheck className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateAffiliateStatusMutation.mutate({ id: a.id, status: "rejected" })}
                            disabled={updateAffiliateStatusMutation.isPending}
                            data-testid={`button-reject-affiliate-${a.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Delete this affiliate?")) deleteAffiliateMutation.mutate(a.id);
                        }}
                        data-testid={`button-delete-affiliate-${a.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

function MemberCard({ member, expanded, onToggleExpand, onDelete }: {
  member: Member & { children: Child[]; payments: Payment[] };
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
}) {
  const plan = Object.values(PLANS).find((p) => p.name === member.plan);
  const paidCount = member.payments.filter((p) => p.status === "paid" || p.status === "verified").length;
  const unpaidCount = member.payments.filter((p) => p.status === "unpaid").length;

  return (
    <Card className="p-4" data-testid={`card-member-${member.id}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-semibold" data-testid={`text-member-name-${member.id}`}>{member.fullName} {member.surname}</p>
          <p className="text-sm text-muted-foreground" data-testid={`text-member-phone-${member.id}`}>{member.phone}</p>
          {member.email && (
            <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid={`text-member-email-${member.id}`}>
              <Mail className="h-3 w-3" /> {member.email}
            </p>
          )}
          {member.createdAt && (
            <p className="text-xs text-muted-foreground">Registered: {new Date(member.createdAt).toLocaleDateString("en-ZA")}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="secondary">{member.plan || "No plan"}</Badge>
            <Badge variant="outline">{member.trackingNumber}</Badge>
            <Badge variant={member.status === "active" ? "default" : member.status === "suspended" ? "destructive" : "secondary"}>
              {member.status}
            </Badge>
          </div>
          {member.children.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Children: {member.children.map((c) => `${c.fullName}${c.gender ? ` - ${c.gender}` : ""} (${c.grade})`).join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onToggleExpand} data-testid={`button-view-member-${member.id}`}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} data-testid={`button-delete-member-${member.id}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium">{member.address || "Not provided"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Plan Amount</p>
              <p className="font-medium">{member.planAmount ? `R${member.planAmount}/mo` : "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Admin Fee</p>
              <p className="font-medium">{member.adminFee ? `R${member.adminFee}` : "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Joined</p>
              <p className="font-medium">{member.joinMonth && member.joinYear ? `${MONTHS[member.joinMonth - 1]} ${member.joinYear}` : "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Payments</p>
              <p className="font-medium">{paidCount} paid, {unpaidCount} unpaid</p>
            </div>
          </div>

          {member.children.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Children Details</p>
              <div className="space-y-2">
                {member.children.map((c) => (
                  <div key={c.id} className="text-sm bg-accent/10 rounded p-2">
                    <p className="font-medium">{c.fullName}{c.gender ? ` (${c.gender})` : ""}</p>
                    <p className="text-muted-foreground">{c.school} - {c.grade}{c.uniformSize ? `, Size: ${c.uniformSize}` : ""}{c.shoeSize ? `, Shoe: ${c.shoeSize}` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
