import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MONTHS, PLANS } from "@shared/schema";
import type { Member, Payment, Child } from "@shared/schema";
import {
  Shield, Users, CheckCircle, CreditCard, Clock, Moon, Sun,
  LogOut, Download, Trash2, Search, Mail, FileText, Eye,
  Link2, Package, XCircle, UserCheck, RefreshCw, Edit2, Plus
} from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { Footer } from "@/components/footer";
import { StokvelLogo } from "@/components/navbar";
import type { Supplier, Affiliate } from "@shared/schema";

const KIN_RELATIONSHIPS = ["Parent", "Spouse", "Sibling", "Child", "Other"];

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
  const [proofDialogUrl, setProofDialogUrl] = useState<string | null>(null);

  const [editMember, setEditMember] = useState<(Member & { children: Child[]; payments: Payment[] }) | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [editAffiliate, setEditAffiliate] = useState<Affiliate | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addAffiliateOpen, setAddAffiliateOpen] = useState(false);

  const { data: stats } = useQuery<{
    totalMembers: number;
    active: number;
    pending: number;
    totalRevenue: number;
    tierBreakdown: Record<string, number>;
    totalSuppliers?: number;
    totalAffiliates?: number;
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

  const updateMemberStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "suspended" }) => {
      await adminFetch(`/api/admin/members/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Member status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
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
  const { data: affiliatesData } = useQuery<(Affiliate & { referredMembers?: (Member & { id: string })[] })[]>({ queryKey: ["/api/admin/affiliates"] });

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

  const editMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await adminFetch(`/api/admin/members/${id}/edit`, { method: "PATCH", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      setEditMember(null);
      toast({ title: "Member updated" });
    },
    onError: (err: Error) => toast({ title: "Failed to update member", description: err.message, variant: "destructive" }),
  });

  const editSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await adminFetch(`/api/admin/suppliers/${id}/edit`, { method: "PATCH", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers"] });
      setEditSupplier(null);
      toast({ title: "Supplier updated" });
    },
    onError: (err: Error) => toast({ title: "Failed to update supplier", description: err.message, variant: "destructive" }),
  });

  const editAffiliateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await adminFetch(`/api/admin/affiliates/${id}/edit`, { method: "PATCH", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      setEditAffiliate(null);
      toast({ title: "Affiliate updated" });
    },
    onError: (err: Error) => toast({ title: "Failed to update affiliate", description: err.message, variant: "destructive" }),
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      await adminFetch("/api/admin/members", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setAddMemberOpen(false);
      toast({ title: "Member added" });
    },
    onError: (err: Error) => toast({ title: "Failed to add member", description: err.message, variant: "destructive" }),
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (data: any) => {
      await adminFetch("/api/admin/suppliers", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/suppliers"] });
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setAddSupplierOpen(false);
      toast({ title: "Supplier added" });
    },
    onError: (err: Error) => toast({ title: "Failed to add supplier", description: err.message, variant: "destructive" }),
  });

  const addAffiliateMutation = useMutation({
    mutationFn: async (data: any) => {
      await adminFetch("/api/admin/affiliates", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setAddAffiliateOpen(false);
      toast({ title: "Affiliate added" });
    },
    onError: (err: Error) => toast({ title: "Failed to add affiliate", description: err.message, variant: "destructive" }),
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
            <span className="font-bold hidden sm:inline" data-testid="text-admin-brand">Abangani Stokvel Fund - Admin</span>
            <span className="font-bold sm:hidden" data-testid="text-admin-brand-mobile">Admin</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => { adminQueryClient.invalidateQueries(); }} data-testid="button-admin-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePdfExport} data-testid="button-admin-pdf-export" className="sm:hidden">
              <FileText className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={handlePdfExport} data-testid="button-admin-pdf-export-desktop" className="hidden sm:inline-flex">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCsvExport} data-testid="button-admin-csv-export" className="sm:hidden">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={handleCsvExport} data-testid="button-admin-csv-export-desktop" className="hidden sm:inline-flex">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          <Card className="p-4 text-center" data-testid="card-stat-total">
            <Users className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </Card>
          <Card className="p-4 text-center" data-testid="card-stat-active">
            <CheckCircle className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </Card>
          <Card className="p-4 text-center" data-testid="card-stat-suppliers">
            <Package className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.totalSuppliers || 0}</p>
            <p className="text-xs text-muted-foreground">Suppliers</p>
          </Card>
          <Card className="p-4 text-center" data-testid="card-stat-affiliates">
            <Link2 className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.totalAffiliates || 0}</p>
            <p className="text-xs text-muted-foreground">Affiliates</p>
          </Card>
          <Card className="p-4 text-center" data-testid="card-stat-revenue">
            <CreditCard className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">R{stats?.totalRevenue || 0}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
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
          <TabsList className="flex-wrap h-auto gap-1 w-full">
            <TabsTrigger value="members" data-testid="tab-admin-members">Members ({filteredMembers.length})</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-admin-payments">Payments ({pendingPayments.length})</TabsTrigger>
            <TabsTrigger value="arrears" data-testid="tab-admin-arrears">Arrears ({arrearsMembers.length})</TabsTrigger>
            <TabsTrigger value="suppliers" data-testid="tab-admin-suppliers">Suppliers ({suppliers?.length || 0})</TabsTrigger>
            <TabsTrigger value="affiliates" data-testid="tab-admin-affiliates">Affiliates ({affiliatesData?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-3 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setAddMemberOpen(true)} data-testid="button-add-member">
                <Plus className="h-4 w-4 mr-1" /> Add Member
              </Button>
            </div>
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
                  onApprove={() => updateMemberStatusMutation.mutate({ id: m.id, status: "active" })}
                  onReject={() => updateMemberStatusMutation.mutate({ id: m.id, status: "suspended" })}
                  isUpdatingStatus={updateMemberStatusMutation.isPending}
                  onEdit={() => setEditMember(m)}
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
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold" data-testid={`text-payment-member-${p.id}`}>{m.fullName} {m.surname}</p>
                      <p className="text-sm text-muted-foreground">
                        R{p.amount} - {MONTHS[p.month - 1]} {p.year}
                      </p>
                      {p.paymentMethod && (
                        <p className="text-sm text-muted-foreground">
                          Method: <span className="capitalize font-medium">{p.paymentMethod === "eft" ? "EFT" : p.paymentMethod === "bank" ? "Bank" : p.paymentMethod === "boxer" ? "Boxer" : p.paymentMethod}</span>
                        </p>
                      )}
                      {p.reference && (
                        <p className="text-sm text-muted-foreground">Ref: {p.reference}</p>
                      )}
                      {m.trackingNumber && (
                        <p className="text-xs text-muted-foreground">Tracking: {m.trackingNumber}</p>
                      )}
                      {(p as any).proofOfPayment && (
                        <button
                          type="button"
                          onClick={() => setProofDialogUrl((p as any).proofOfPayment)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1 cursor-pointer bg-transparent border-0 p-0"
                          data-testid={`button-view-proof-${p.id}`}
                        >
                          <Eye className="h-3 w-3" />
                          View Proof of Payment
                        </button>
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            <div className="flex justify-end">
              <Button onClick={() => setAddSupplierOpen(true)} data-testid="button-add-supplier">
                <Plus className="h-4 w-4 mr-1" /> Add Supplier
              </Button>
            </div>
            {!suppliers || suppliers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground" data-testid="text-no-suppliers">No suppliers registered</Card>
            ) : (
              suppliers.map((s) => (
                <Card key={s.id} className="p-4" data-testid={`card-supplier-${s.id}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
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
                        onClick={() => setEditSupplier(s)}
                        data-testid={`button-edit-supplier-${s.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
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
            <div className="flex justify-end">
              <Button onClick={() => setAddAffiliateOpen(true)} data-testid="button-add-affiliate">
                <Plus className="h-4 w-4 mr-1" /> Add Affiliate
              </Button>
            </div>
            {!affiliatesData || affiliatesData.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground" data-testid="text-no-affiliates">No affiliates registered</Card>
            ) : (
              affiliatesData.map((a) => (
                <Card key={a.id} className="p-4" data-testid={`card-affiliate-${a.id}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
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
                      {a.referredMembers && a.referredMembers.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Referred Members ({a.referredMembers.length}):</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {a.referredMembers.map((rm: any) => (
                              <div key={rm.id} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1" data-testid={`admin-referred-${rm.id}`}>
                                <Users className="h-3 w-3 flex-shrink-0" />
                                <span>{rm.fullName} {rm.surname}</span>
                                <span className="text-muted-foreground/60">|</span>
                                <span>{rm.plan || "No plan"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
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
                        onClick={() => setEditAffiliate(a)}
                        data-testid={`button-edit-affiliate-${a.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
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

      <Dialog open={!!proofDialogUrl} onOpenChange={(open) => { if (!open) setProofDialogUrl(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-proof-of-payment">
          <DialogHeader>
            <DialogTitle>Proof of Payment</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 overflow-auto">
            {proofDialogUrl && (
              proofDialogUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={proofDialogUrl}
                  className="w-full h-[70vh] rounded-md border"
                  title="Proof of Payment PDF"
                  data-testid="iframe-proof-pdf"
                />
              ) : (
                <img
                  src={proofDialogUrl}
                  alt="Proof of Payment"
                  className="max-w-full max-h-[70vh] rounded-md object-contain"
                  data-testid="img-proof-image"
                />
              )
            )}
            {proofDialogUrl && (
              <a
                href={proofDialogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
                data-testid="link-proof-new-tab"
              >
                Open in new tab
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {editMember && (
        <EditMemberDialog
          member={editMember}
          open={!!editMember}
          onClose={() => setEditMember(null)}
          onSave={(data) => editMemberMutation.mutate({ id: editMember.id, data })}
          isPending={editMemberMutation.isPending}
        />
      )}

      {editSupplier && (
        <EditSupplierDialog
          supplier={editSupplier}
          open={!!editSupplier}
          onClose={() => setEditSupplier(null)}
          onSave={(data) => editSupplierMutation.mutate({ id: editSupplier.id, data })}
          isPending={editSupplierMutation.isPending}
        />
      )}

      {editAffiliate && (
        <EditAffiliateDialog
          affiliate={editAffiliate}
          open={!!editAffiliate}
          onClose={() => setEditAffiliate(null)}
          onSave={(data) => editAffiliateMutation.mutate({ id: editAffiliate.id, data })}
          isPending={editAffiliateMutation.isPending}
        />
      )}

      <AddMemberDialog
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        onSave={(data) => addMemberMutation.mutate(data)}
        isPending={addMemberMutation.isPending}
      />

      <AddSupplierDialog
        open={addSupplierOpen}
        onClose={() => setAddSupplierOpen(false)}
        onSave={(data) => addSupplierMutation.mutate(data)}
        isPending={addSupplierMutation.isPending}
      />

      <AddAffiliateDialog
        open={addAffiliateOpen}
        onClose={() => setAddAffiliateOpen(false)}
        onSave={(data) => addAffiliateMutation.mutate(data)}
        isPending={addAffiliateMutation.isPending}
      />

      <Footer />
    </div>
  );
}

function MemberCard({ member, expanded, onToggleExpand, onDelete, onApprove, onReject, isUpdatingStatus, onEdit }: {
  member: Member & { children: Child[]; payments: Payment[] };
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
  isUpdatingStatus: boolean;
  onEdit: () => void;
}) {
  const plan = Object.values(PLANS).find((p) => p.name === member.plan);
  const paidCount = member.payments.filter((p) => p.status === "paid" || p.status === "verified").length;
  const unpaidCount = member.payments.filter((p) => p.status === "unpaid").length;

  return (
    <Card className="p-4" data-testid={`card-member-${member.id}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
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
        <div className="flex gap-1 flex-shrink-0 flex-wrap">
          {member.status === "pending" && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onApprove}
                disabled={isUpdatingStatus}
                data-testid={`button-approve-member-${member.id}`}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onReject}
                disabled={isUpdatingStatus}
                data-testid={`button-reject-member-${member.id}`}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" onClick={onEdit} data-testid={`button-edit-member-${member.id}`}>
            <Edit2 className="h-4 w-4" />
          </Button>
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

function NextOfKinFields({ values, onChange }: { values: { nextOfKinName: string; nextOfKinPhone: string; nextOfKinRelationship: string }; onChange: (field: string, value: string) => void }) {
  return (
    <>
      <div className="space-y-1">
        <Label>Next of Kin Name</Label>
        <Input value={values.nextOfKinName} onChange={(e) => onChange("nextOfKinName", e.target.value)} data-testid="input-next-of-kin-name" />
      </div>
      <div className="space-y-1">
        <Label>Next of Kin Phone</Label>
        <Input value={values.nextOfKinPhone} onChange={(e) => onChange("nextOfKinPhone", e.target.value)} data-testid="input-next-of-kin-phone" />
      </div>
      <div className="space-y-1">
        <Label>Next of Kin Relationship</Label>
        <Select value={values.nextOfKinRelationship} onValueChange={(v) => onChange("nextOfKinRelationship", v)}>
          <SelectTrigger data-testid="select-next-of-kin-relationship">
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent>
            {KIN_RELATIONSHIPS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function EditMemberDialog({ member, open, onClose, onSave, isPending }: {
  member: Member & { children: Child[]; payments: Payment[] };
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    fullName: member.fullName,
    surname: member.surname,
    email: member.email || "",
    phone: member.phone,
    address: member.address || "",
    plan: member.plan || "",
    planAmount: member.planAmount?.toString() || "",
    nextOfKinName: member.nextOfKinName || "",
    nextOfKinPhone: member.nextOfKinPhone || "",
    nextOfKinRelationship: member.nextOfKinRelationship || "",
  });
  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-member">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} data-testid="input-edit-member-fullname" />
            </div>
            <div className="space-y-1">
              <Label>Surname</Label>
              <Input value={form.surname} onChange={(e) => set("surname", e.target.value)} data-testid="input-edit-member-surname" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="input-edit-member-email" />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="input-edit-member-phone" />
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} data-testid="input-edit-member-address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
                <SelectTrigger data-testid="select-edit-member-plan">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PLANS).map((p) => (
                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Plan Amount (R)</Label>
              <Input type="number" value={form.planAmount} onChange={(e) => set("planAmount", e.target.value)} data-testid="input-edit-member-plan-amount" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground pt-2">Next of Kin</p>
          <NextOfKinFields values={form} onChange={set} />
          <Button className="w-full" onClick={() => onSave({ ...form, planAmount: form.planAmount ? parseInt(form.planAmount) : undefined })} disabled={isPending} data-testid="button-save-edit-member">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditSupplierDialog({ supplier, open, onClose, onSave, isPending }: {
  supplier: Supplier;
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    fullName: supplier.fullName,
    surname: supplier.surname,
    email: supplier.email,
    phone: supplier.phone,
    businessName: supplier.businessName,
    businessType: supplier.businessType,
    registrationNumber: supplier.registrationNumber || "",
    address: supplier.address,
    goodsSupplied: supplier.goodsSupplied?.join(", ") || "",
    nextOfKinName: supplier.nextOfKinName || "",
    nextOfKinPhone: supplier.nextOfKinPhone || "",
    nextOfKinRelationship: supplier.nextOfKinRelationship || "",
  });
  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-supplier">
        <DialogHeader>
          <DialogTitle>Edit Supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} data-testid="input-edit-supplier-fullname" />
            </div>
            <div className="space-y-1">
              <Label>Surname</Label>
              <Input value={form.surname} onChange={(e) => set("surname", e.target.value)} data-testid="input-edit-supplier-surname" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="input-edit-supplier-email" />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="input-edit-supplier-phone" />
          </div>
          <div className="space-y-1">
            <Label>Business Name</Label>
            <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} data-testid="input-edit-supplier-business-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Business Type</Label>
              <Input value={form.businessType} onChange={(e) => set("businessType", e.target.value)} data-testid="input-edit-supplier-business-type" />
            </div>
            <div className="space-y-1">
              <Label>Registration Number</Label>
              <Input value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} data-testid="input-edit-supplier-reg-number" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} data-testid="input-edit-supplier-address" />
          </div>
          <div className="space-y-1">
            <Label>Goods Supplied (comma separated)</Label>
            <Input value={form.goodsSupplied} onChange={(e) => set("goodsSupplied", e.target.value)} data-testid="input-edit-supplier-goods" />
          </div>
          <p className="text-sm font-medium text-muted-foreground pt-2">Next of Kin</p>
          <NextOfKinFields values={form} onChange={set} />
          <Button className="w-full" onClick={() => onSave({ ...form, goodsSupplied: form.goodsSupplied.split(",").map((s) => s.trim()).filter(Boolean) })} disabled={isPending} data-testid="button-save-edit-supplier">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditAffiliateDialog({ affiliate, open, onClose, onSave, isPending }: {
  affiliate: Affiliate;
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    fullName: affiliate.fullName,
    surname: affiliate.surname,
    email: affiliate.email,
    phone: affiliate.phone,
    address: affiliate.address || "",
    bankName: affiliate.bankName || "",
    accountNumber: affiliate.accountNumber || "",
    nextOfKinName: affiliate.nextOfKinName || "",
    nextOfKinPhone: affiliate.nextOfKinPhone || "",
    nextOfKinRelationship: affiliate.nextOfKinRelationship || "",
  });
  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-affiliate">
        <DialogHeader>
          <DialogTitle>Edit Affiliate</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} data-testid="input-edit-affiliate-fullname" />
            </div>
            <div className="space-y-1">
              <Label>Surname</Label>
              <Input value={form.surname} onChange={(e) => set("surname", e.target.value)} data-testid="input-edit-affiliate-surname" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="input-edit-affiliate-email" />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="input-edit-affiliate-phone" />
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} data-testid="input-edit-affiliate-address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Bank Name</Label>
              <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} data-testid="input-edit-affiliate-bank" />
            </div>
            <div className="space-y-1">
              <Label>Account Number</Label>
              <Input value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} data-testid="input-edit-affiliate-account" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground pt-2">Next of Kin</p>
          <NextOfKinFields values={form} onChange={set} />
          <Button className="w-full" onClick={() => onSave(form)} disabled={isPending} data-testid="button-save-edit-affiliate">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({ open, onClose, onSave, isPending }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    fullName: "", surname: "", email: "", phone: "", password: "",
    plan: "", address: "",
    nextOfKinName: "", nextOfKinPhone: "", nextOfKinRelationship: "",
  });
  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-add-member">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} data-testid="input-add-member-fullname" />
            </div>
            <div className="space-y-1">
              <Label>Surname *</Label>
              <Input value={form.surname} onChange={(e) => set("surname", e.target.value)} data-testid="input-add-member-surname" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="input-add-member-email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="input-add-member-phone" />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} data-testid="input-add-member-password" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Plan</Label>
            <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
              <SelectTrigger data-testid="select-add-member-plan">
                <SelectValue placeholder="Select plan (optional)" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PLANS).map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} data-testid="input-add-member-address" />
          </div>
          <p className="text-sm font-medium text-muted-foreground pt-2">Next of Kin</p>
          <NextOfKinFields values={form} onChange={set} />
          <Button className="w-full" onClick={() => onSave(form)} disabled={isPending || !form.fullName || !form.surname || !form.phone || !form.password} data-testid="button-save-add-member">
            {isPending ? "Adding..." : "Add Member"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddSupplierDialog({ open, onClose, onSave, isPending }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    fullName: "", surname: "", email: "", phone: "", password: "",
    businessName: "", businessType: "", registrationNumber: "", address: "", goodsSupplied: "",
    nextOfKinName: "", nextOfKinPhone: "", nextOfKinRelationship: "",
  });
  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-add-supplier">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} data-testid="input-add-supplier-fullname" />
            </div>
            <div className="space-y-1">
              <Label>Surname *</Label>
              <Input value={form.surname} onChange={(e) => set("surname", e.target.value)} data-testid="input-add-supplier-surname" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email *</Label>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="input-add-supplier-email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="input-add-supplier-phone" />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} data-testid="input-add-supplier-password" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Business Name *</Label>
            <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} data-testid="input-add-supplier-business-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Business Type *</Label>
              <Input value={form.businessType} onChange={(e) => set("businessType", e.target.value)} data-testid="input-add-supplier-business-type" />
            </div>
            <div className="space-y-1">
              <Label>Registration Number</Label>
              <Input value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} data-testid="input-add-supplier-reg-number" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Address *</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} data-testid="input-add-supplier-address" />
          </div>
          <div className="space-y-1">
            <Label>Goods Supplied (comma separated)</Label>
            <Input value={form.goodsSupplied} onChange={(e) => set("goodsSupplied", e.target.value)} data-testid="input-add-supplier-goods" />
          </div>
          <p className="text-sm font-medium text-muted-foreground pt-2">Next of Kin</p>
          <NextOfKinFields values={form} onChange={set} />
          <Button className="w-full" onClick={() => onSave({ ...form, goodsSupplied: form.goodsSupplied.split(",").map((s) => s.trim()).filter(Boolean) })} disabled={isPending || !form.fullName || !form.surname || !form.email || !form.phone || !form.password || !form.businessName || !form.businessType || !form.address} data-testid="button-save-add-supplier">
            {isPending ? "Adding..." : "Add Supplier"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddAffiliateDialog({ open, onClose, onSave, isPending }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    fullName: "", surname: "", email: "", phone: "", password: "",
    address: "", bankName: "", accountNumber: "",
    nextOfKinName: "", nextOfKinPhone: "", nextOfKinRelationship: "",
  });
  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-add-affiliate">
        <DialogHeader>
          <DialogTitle>Add Affiliate</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} data-testid="input-add-affiliate-fullname" />
            </div>
            <div className="space-y-1">
              <Label>Surname *</Label>
              <Input value={form.surname} onChange={(e) => set("surname", e.target.value)} data-testid="input-add-affiliate-surname" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email *</Label>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="input-add-affiliate-email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="input-add-affiliate-phone" />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} data-testid="input-add-affiliate-password" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} data-testid="input-add-affiliate-address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Bank Name</Label>
              <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} data-testid="input-add-affiliate-bank" />
            </div>
            <div className="space-y-1">
              <Label>Account Number</Label>
              <Input value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} data-testid="input-add-affiliate-account" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground pt-2">Next of Kin</p>
          <NextOfKinFields values={form} onChange={set} />
          <Button className="w-full" onClick={() => onSave(form)} disabled={isPending || !form.fullName || !form.surname || !form.email || !form.phone || !form.password} data-testid="button-save-add-affiliate">
            {isPending ? "Adding..." : "Add Affiliate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
