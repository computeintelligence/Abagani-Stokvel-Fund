import { useState } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MONTHS, PLANS, GRADES } from "@shared/schema";
import type { Child, Payment } from "@shared/schema";
import {
  Shield, Bell, User, Copy, Calendar, CreditCard,
  Download, CheckCircle, AlertCircle, Clock, Plus, Trash2, Edit2, Save, X,
  FileText, FileSpreadsheet, ArrowRight, LogOut
} from "lucide-react";

export default function Dashboard() {
  const { member, logout, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const hasPlan = !!(member?.plan);

  const { data: childrenData, isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["/api/members", member?.id, "children"],
    enabled: !!member && hasPlan,
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/members", member?.id, "payments"],
    enabled: !!member && hasPlan,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-10 w-10 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return <Redirect to="/signin" />;
  }

  if (!hasPlan) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold" data-testid="text-dashboard-brand">Abangani Stokvel Fund</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild data-testid="link-profile">
                <Link href="/profile"><User className="h-4 w-4 mr-2" /> Profile</Link>
              </Button>
              <Button size="icon" variant="ghost" onClick={logout} data-testid="button-logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2" data-testid="text-welcome">
              Welcome, {member.fullName}!
            </h1>
            <p className="text-muted-foreground mb-2">Your tracking number:</p>
            <Badge variant="outline" className="mb-8 text-base" data-testid="badge-tracking">{member.trackingNumber}</Badge>
            <Card className="p-8">
              <h2 className="text-xl font-bold mb-3">Choose Your Subscription Plan</h2>
              <p className="text-muted-foreground mb-6">
                To start your stokvel journey, select a plan and add your children's details.
              </p>
              <Button size="lg" asChild data-testid="button-choose-plan">
                <Link href="/register">
                  Choose a Plan <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const plan = Object.values(PLANS).find((p) => p.amount === member.planAmount);
  const paidPayments = paymentsData?.filter((p) => p.status === "paid" || p.status === "verified") || [];
  const unpaidPayments = paymentsData?.filter((p) => p.status === "unpaid") || [];
  const pendingPayments = paymentsData?.filter((p) => p.status === "pending") || [];
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpected = (paymentsData?.length || 0) * (member.planAmount || 0);
  const progressPercent = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

  const paymentStartDate = new Date(2026, 2, 1);
  const now = new Date();
  const canPay = now >= paymentStartDate;

  const copyTracking = () => {
    navigator.clipboard.writeText(member.trackingNumber);
    toast({ title: "Copied!", description: "Tracking number copied to clipboard." });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold" data-testid="text-dashboard-brand">Abangani Stokvel Fund</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild data-testid="link-profile">
              <Link href="/profile"><User className="h-4 w-4 mr-2" /> Profile</Link>
            </Button>
            <Button size="icon" variant="ghost" onClick={logout} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-welcome">Welcome, {member.fullName}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="secondary" data-testid="badge-plan">{plan?.name || member.plan}</Badge>
            <Badge variant="outline" className="cursor-pointer" onClick={copyTracking} data-testid="badge-tracking">
              {member.trackingNumber}
              <Copy className="h-3 w-3 ml-1" />
            </Badge>
          </div>
        </div>

        <Card className="p-6" data-testid="card-payment-progress">
          <h2 className="text-lg font-bold mb-1">Payment Progress {new Date().getFullYear()}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            R{totalPaid} of R{totalExpected} paid
          </p>
          <Progress value={progressPercent} className="h-3 mb-4" data-testid="progress-payment" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">R{member.planAmount}</p>
              <p className="text-xs text-muted-foreground">Monthly</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{paidPayments.length}</p>
              <p className="text-xs text-muted-foreground">Months Paid</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{unpaidPayments.length + pendingPayments.length}</p>
              <p className="text-xs text-muted-foreground">Unpaid</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.round(progressPercent)}%</p>
              <p className="text-xs text-muted-foreground">Complete</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="payments" data-testid="tabs-dashboard">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
            <TabsTrigger value="children" data-testid="tab-children">Children</TabsTrigger>
            <TabsTrigger value="export" data-testid="tab-export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4 mt-4">
            <PaymentsTab
              payments={paymentsData || []}
              planAmount={member.planAmount || 0}
              canPay={canPay}
              memberId={member.id}
              trackingNumber={member.trackingNumber}
            />
          </TabsContent>

          <TabsContent value="children" className="space-y-4 mt-4">
            <ChildrenTab children={childrenData || []} memberId={member.id} />
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <ExportTab memberId={member.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PaymentsTab({ payments, planAmount, canPay, memberId, trackingNumber }: {
  payments: Payment[];
  planAmount: number;
  canPay: boolean;
  memberId: string;
  trackingNumber: string;
}) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState("eft");
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const boxerSurcharge = 20;
  const getPaymentAmount = (method: string) => {
    return method === "boxer" ? planAmount + boxerSurcharge : planAmount;
  };

  const payMutation = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const formData = new FormData();
      formData.append("month", String(month));
      formData.append("year", String(year));
      formData.append("paymentMethod", paymentMethod);
      formData.append("reference", reference);
      if (proofFile) {
        formData.append("proofOfPayment", proofFile);
      }
      const res = await fetch(`/api/members/${memberId}/payments/submit`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Payment submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "payments"] });
      toast({ title: "Payment submitted!", description: "Your payment is pending verification by admin." });
      setReference("");
      setProofFile(null);
    },
    onError: (err: Error) => {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    },
  });

  const sorted = [...payments].sort((a, b) => a.month - b.month);

  const bankDetails = (
    <Card className="p-3 bg-muted/30 border-muted text-xs space-y-1">
      <p className="font-semibold text-sm">Bank Account Details</p>
      <p>Bank: <strong>FNB (First National Bank)</strong></p>
      <p>Account Name: <strong>Stokvel</strong></p>
      <p>Account Number: <strong>63199744781</strong></p>
      <p>Reference: <strong>{trackingNumber}</strong></p>
    </Card>
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3 className="text-lg font-bold">Monthly Payments</h3>
        {canPay && (
          <Badge variant="default" data-testid="badge-pay-active">
            <CreditCard className="h-3 w-3 mr-1" />
            Pay
          </Badge>
        )}
      </div>

      {!canPay && (
        <Card className="p-4 mb-4 border-primary/20 bg-primary/5" data-testid="card-payment-info">
          <p className="text-sm">
            Payments will be available from <strong>1 March 2026</strong>. You can register now
            and start paying from that date.
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {sorted.map((payment) => (
          <Card
            key={`${payment.month}-${payment.year}`}
            className="p-4 flex items-center justify-between gap-4"
            data-testid={`card-payment-${payment.month}`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{MONTHS[payment.month - 1]} {payment.year}</span>
            </div>
            <div className="flex items-center gap-2">
              {payment.status === "paid" || payment.status === "verified" ? (
                <Badge variant="default" className="bg-primary/10 text-primary" data-testid={`badge-paid-${payment.month}`}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Paid
                </Badge>
              ) : payment.status === "pending" ? (
                <Badge variant="secondary" data-testid={`badge-pending-${payment.month}`}>
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              ) : canPay ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Badge variant="destructive" className="cursor-pointer" data-testid={`badge-unpaid-${payment.month}`}>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Unpaid - Pay Now
                    </Badge>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Pay for {MONTHS[payment.month - 1]} {payment.year}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v)}>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eft">EFT (Bank Transfer)</SelectItem>
                            <SelectItem value="bank">Bank (In-Branch Payment)</SelectItem>
                            <SelectItem value="boxer">Boxer (+R{boxerSurcharge} surcharge)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="rounded-lg border p-3 bg-primary/5">
                        <p className="text-sm font-semibold mb-1">Amount Due</p>
                        <p className="text-2xl font-bold text-primary" data-testid="text-payment-amount">
                          R{getPaymentAmount(paymentMethod)}
                        </p>
                        {paymentMethod === "boxer" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Includes R{boxerSurcharge} Boxer surcharge (R{planAmount} + R{boxerSurcharge})
                          </p>
                        )}
                      </div>

                      {(paymentMethod === "eft" || paymentMethod === "bank") && bankDetails}

                      {paymentMethod === "eft" && (
                        <Card className="p-3 bg-blue-500/5 border-blue-500/20 text-xs">
                          <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">How to pay via EFT</p>
                          <ol className="list-decimal ml-4 mt-1 space-y-1 text-muted-foreground">
                            <li>Transfer R{planAmount} to the account above</li>
                            <li>Use your tracking number <strong>{trackingNumber}</strong> as reference</li>
                            <li>Upload your proof of payment below</li>
                          </ol>
                        </Card>
                      )}

                      {paymentMethod === "bank" && (
                        <Card className="p-3 bg-blue-500/5 border-blue-500/20 text-xs">
                          <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">How to pay at your bank</p>
                          <ol className="list-decimal ml-4 mt-1 space-y-1 text-muted-foreground">
                            <li>Visit any branch and pay R{planAmount} into the account above</li>
                            <li>Use your tracking number <strong>{trackingNumber}</strong> as reference</li>
                            <li>Upload your proof of payment below</li>
                          </ol>
                        </Card>
                      )}

                      {paymentMethod === "boxer" && (
                        <Card className="p-3 bg-orange-500/5 border-orange-500/20 text-xs">
                          <p className="font-semibold text-sm text-orange-700 dark:text-orange-400">How to pay at Boxer</p>
                          <ol className="list-decimal ml-4 mt-1 space-y-1 text-muted-foreground">
                            <li>Visit any Boxer store and pay R{getPaymentAmount("boxer")}</li>
                            <li>Mention your tracking number <strong>{trackingNumber}</strong></li>
                            <li>Keep your receipt and upload the proof of payment below</li>
                          </ol>
                        </Card>
                      )}

                      <div>
                        <Label>Reference / Receipt Number</Label>
                        <Input
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="Enter your payment reference or receipt number"
                          data-testid="input-reference"
                        />
                      </div>

                      <div>
                        <Label>Proof of Payment (Image or PDF)</Label>
                        <Input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,.webp"
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          data-testid="input-proof-of-payment"
                          className="mt-1"
                        />
                        {proofFile && (
                          <p className="text-xs text-muted-foreground mt-1">Selected: {proofFile.name}</p>
                        )}
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => payMutation.mutate({ month: payment.month, year: payment.year })}
                        disabled={!reference || !proofFile || payMutation.isPending}
                        data-testid="button-submit-payment"
                      >
                        {payMutation.isPending ? "Submitting..." : `Submit Payment - R${getPaymentAmount(paymentMethod)}`}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Badge variant="destructive" data-testid={`badge-unpaid-${payment.month}`}>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unpaid
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ChildrenTab({ children: childrenList, memberId }: { children: Child[]; memberId: string }) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Child>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newChild, setNewChild] = useState({ fullName: "", gender: "", school: "", grade: "", uniformSize: "", shoeSize: "" });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Child> }) => {
      await apiRequest("PATCH", `/api/children/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "children"] });
      setEditingId(null);
      toast({ title: "Child updated" });
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/members/${memberId}/children`, newChild);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "children"] });
      setShowAdd(false);
      setNewChild({ fullName: "", gender: "", school: "", grade: "", uniformSize: "", shoeSize: "" });
      toast({ title: "Child added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/children/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "children"] });
      toast({ title: "Child removed" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3 className="text-lg font-bold">Children ({childrenList.length})</h3>
        <Button variant="outline" onClick={() => setShowAdd(true)} data-testid="button-add-child-dashboard">
          <Plus className="h-4 w-4 mr-2" />
          Add Child
        </Button>
      </div>

      {showAdd && (
        <Card className="p-4 mb-4 space-y-3">
          <Input placeholder="Full Name" value={newChild.fullName} onChange={(e) => setNewChild({ ...newChild, fullName: e.target.value })} data-testid="input-new-child-name" />
          <Select value={newChild.gender} onValueChange={(v) => setNewChild({ ...newChild, gender: v })}>
            <SelectTrigger data-testid="select-new-child-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="School" value={newChild.school} onChange={(e) => setNewChild({ ...newChild, school: e.target.value })} data-testid="input-new-child-school" />
          <Select value={newChild.grade} onValueChange={(v) => setNewChild({ ...newChild, grade: v })}>
            <SelectTrigger data-testid="select-new-child-grade"><SelectValue placeholder="Select grade" /></SelectTrigger>
            <SelectContent>
              {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Uniform Size" value={newChild.uniformSize} onChange={(e) => setNewChild({ ...newChild, uniformSize: e.target.value })} />
            <Input placeholder="Shoe Size" value={newChild.shoeSize} onChange={(e) => setNewChild({ ...newChild, shoeSize: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => addMutation.mutate()} disabled={!newChild.fullName || !newChild.school || !newChild.grade || addMutation.isPending} data-testid="button-save-new-child">
              <Save className="h-4 w-4 mr-2" />Save
            </Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)}><X className="h-4 w-4 mr-2" />Cancel</Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {childrenList.map((child) => (
          <Card key={child.id} className="p-4" data-testid={`card-child-${child.id}`}>
            {editingId === child.id ? (
              <div className="space-y-3">
                <Input value={editData.fullName || ""} onChange={(e) => setEditData({ ...editData, fullName: e.target.value })} placeholder="Full Name" />
                <Select value={editData.gender || ""} onValueChange={(v) => setEditData({ ...editData, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={editData.school || ""} onChange={(e) => setEditData({ ...editData, school: e.target.value })} placeholder="School" />
                <Select value={editData.grade || ""} onValueChange={(v) => setEditData({ ...editData, grade: v })}>
                  <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button onClick={() => updateMutation.mutate({ id: child.id, data: editData })} disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4 mr-2" />Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{child.fullName}{child.gender ? ` (${child.gender})` : ""}</p>
                  <p className="text-sm text-muted-foreground">{child.school} - {child.grade}</p>
                  {(child.uniformSize || child.shoeSize) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {child.uniformSize && `Uniform: ${child.uniformSize}`}
                      {child.uniformSize && child.shoeSize && " | "}
                      {child.shoeSize && `Shoes: ${child.shoeSize}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditingId(child.id); setEditData(child); }} data-testid={`button-edit-child-${child.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(child.id)} data-testid={`button-delete-child-${child.id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ExportTab({ memberId }: { memberId: string }) {
  const downloadFile = (format: string) => {
    window.open(`/api/members/${memberId}/export?format=${format}`, "_blank");
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Export Payment Records</h3>
      <p className="text-sm text-muted-foreground mb-4">Download your payment history in your preferred format.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4 hover-elevate cursor-pointer" onClick={() => downloadFile("csv")} data-testid="card-export-csv">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">CSV / Spreadsheet</p>
              <p className="text-sm text-muted-foreground">Download as .csv file</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hover-elevate cursor-pointer" onClick={() => downloadFile("pdf")} data-testid="card-export-pdf">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">PDF Report</p>
              <p className="text-sm text-muted-foreground">Download as .pdf file</p>
            </div>
          </div>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
