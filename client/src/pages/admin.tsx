import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MONTHS, PLANS } from "@shared/schema";
import type { Member, Payment, Child } from "@shared/schema";
import {
  Shield, Users, CheckCircle, CreditCard, Clock, Moon, Sun,
  LogOut, Download, Trash2, Search, Edit2, Save, X, Mail, FileText
} from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { Footer } from "@/components/footer";

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

function EditMemberDialog({ member, onClose }: { member: Member & { children: Child[]; payments: Payment[] }; onClose: () => void }) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState(member.fullName);
  const [surname, setSurname] = useState(member.surname);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone);
  const [address, setAddress] = useState(member.address || "");
  const [status, setStatus] = useState(member.status);

  const editMutation = useMutation({
    mutationFn: async (data: { fullName: string; surname: string; email: string; phone: string; address: string; status: string }) => {
      await adminFetch(`/api/admin/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      adminQueryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Member updated successfully" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update member", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-fullName">Full Name</Label>
        <Input
          id="edit-fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          data-testid={`input-edit-fullName-${member.id}`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-surname">Surname</Label>
        <Input
          id="edit-surname"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          data-testid={`input-edit-surname-${member.id}`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-email">Email</Label>
        <Input
          id="edit-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid={`input-edit-email-${member.id}`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-phone">Phone</Label>
        <Input
          id="edit-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          data-testid={`input-edit-phone-${member.id}`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-address">Address</Label>
        <Input
          id="edit-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          data-testid={`input-edit-address-${member.id}`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid={`select-edit-status-${member.id}`}>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} data-testid={`button-cancel-edit-${member.id}`}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          onClick={() => editMutation.mutate({ fullName, surname, email, phone, address, status })}
          disabled={editMutation.isPending}
          data-testid={`button-save-edit-${member.id}`}
        >
          <Save className="h-4 w-4 mr-1" />
          {editMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function AdminPanel({ toggleTheme, theme, onLogout }: { toggleTheme: () => void; theme: string; onLogout: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingMember, setEditingMember] = useState<(Member & { children: Child[]; payments: Payment[] }) | null>(null);

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
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold" data-testid="text-admin-brand">Admin Panel</span>
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
          <TabsList>
            <TabsTrigger value="members" data-testid="tab-admin-members">All Members ({filteredMembers.length})</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-admin-payments">Payments ({pendingPayments.length})</TabsTrigger>
            <TabsTrigger value="arrears" data-testid="tab-admin-arrears">Arrears ({arrearsMembers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-3 mt-4">
            {filteredMembers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground" data-testid="text-no-members">No members found</Card>
            ) : (
              filteredMembers.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  onEdit={() => setEditingMember(m)}
                  onDelete={() => {
                    if (window.confirm(`Are you sure you want to delete ${m.fullName}?`)) {
                      deleteMemberMutation.mutate(m.id);
                    }
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
                      <p className="font-semibold" data-testid={`text-payment-member-${p.id}`}>{m.fullName}</p>
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
                        <p className="font-semibold" data-testid={`text-arrears-name-${m.id}`}>{m.fullName}</p>
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
        </Tabs>
      </main>

      <Dialog open={!!editingMember} onOpenChange={(open) => { if (!open) setEditingMember(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <EditMemberDialog member={editingMember} onClose={() => setEditingMember(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function MemberCard({ member, onEdit, onDelete }: {
  member: Member & { children: Child[]; payments: Payment[] };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const plan = Object.values(PLANS).find((p) => p.amount === member.planAmount);

  return (
    <Card className="p-4" data-testid={`card-member-${member.id}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold" data-testid={`text-member-name-${member.id}`}>{member.fullName}</p>
          <p className="text-sm text-muted-foreground" data-testid={`text-member-phone-${member.id}`}>{member.phone}</p>
          {member.email && (
            <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid={`text-member-email-${member.id}`}>
              <Mail className="h-3 w-3" /> {member.email}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="secondary">{plan?.name || member.plan}</Badge>
            <Badge variant="outline">{member.trackingNumber}</Badge>
            <Badge variant={member.status === "active" ? "default" : member.status === "suspended" ? "destructive" : "secondary"}>
              {member.status}
            </Badge>
          </div>
          {member.children.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {member.children.map((c) => `${c.fullName} (${c.grade})`).join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} data-testid={`button-edit-member-${member.id}`}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} data-testid={`button-delete-member-${member.id}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
