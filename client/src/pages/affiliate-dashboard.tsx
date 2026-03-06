import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAffiliateAuth } from "@/lib/affiliate-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StokvelLogo } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  Link2, Copy, LogOut, TrendingUp, Users, DollarSign,
  MousePointer, CheckCircle, Clock, AlertTriangle, ExternalLink, Banknote, RefreshCw
} from "lucide-react";

interface ReferredMember {
  id: string;
  fullName: string;
  surname: string;
  plan: string | null;
  createdAt: string;
}

interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  commissionEarned: number;
  maxConversions: number;
  commissionPerConversion: number;
  canWithdraw: boolean;
  affiliateLink: string;
  conversions: Array<{ id: string; memberId: string; commissionAmount: number; status: string; convertedAt: string; memberName: string; memberPlan: string | null }>;
  referredMembers: ReferredMember[];
  recentClicks: Array<{ id: string; createdAt: string }>;
}

export default function AffiliateDashboard() {
  const { affiliate, isLoading, logout } = useAffiliateAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<AffiliateStats>({
    queryKey: ["/api/affiliate/stats"],
    enabled: !!affiliate,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <StokvelLogo className="h-10 w-10 animate-pulse" />
      </div>
    );
  }

  if (!affiliate) {
    return <Redirect to="/affiliate/login" />;
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const copyLink = () => {
    if (stats?.affiliateLink) {
      navigator.clipboard.writeText(stats.affiliateLink);
      toast({ title: "Link copied!", description: "Your affiliate link has been copied to clipboard." });
    }
  };

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/affiliate/withdraw");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Withdrawal Submitted", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/stats"] });
    },
    onError: (error: any) => {
      toast({ title: "Withdrawal Failed", description: error.message, variant: "destructive" });
    },
  });

  const statusColor = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    approved: "bg-green-500/10 text-green-600 border-green-500/30",
    rejected: "bg-red-500/10 text-red-600 border-red-500/30",
  }[affiliate.status] || "";

  const statusIcon = {
    pending: <Clock className="h-4 w-4" />,
    approved: <CheckCircle className="h-4 w-4" />,
    rejected: <AlertTriangle className="h-4 w-4" />,
  }[affiliate.status];

  const conversionRate = stats && stats.totalClicks > 0
    ? ((stats.totalConversions / stats.totalClicks) * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <StokvelLogo className="h-6 w-6" />
            <span className="font-bold">Abangani Stokvel Fund</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor} data-testid="badge-affiliate-status">
              {statusIcon}
              <span className="ml-1 capitalize">{affiliate.status}</span>
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/affiliate/stats"] })} data-testid="button-affiliate-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-affiliate-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {affiliate.status === "pending" && (
          <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold">Application Under Review</h3>
                <p className="text-sm text-muted-foreground">
                  Your affiliate application is being reviewed. Once approved, you can start sharing your link and earning commissions.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div>
          <h2 className="text-2xl font-bold" data-testid="text-affiliate-welcome">
            Welcome, {affiliate.fullName}!
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tracking Number: <strong>{affiliate.trackingNumber}</strong>
          </p>
        </div>

        {stats && (
          <>
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Your Affiliate Link</h3>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Input
                  readOnly
                  value={stats.affiliateLink}
                  className="font-mono text-xs sm:text-sm min-w-0 flex-1"
                  data-testid="input-affiliate-link"
                />
                <Button variant="outline" size="icon" onClick={copyLink} className="flex-shrink-0" data-testid="button-copy-link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share this link with friends. When they sign up and pay their first month, you earn R{stats.commissionPerConversion}.
              </p>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center hover-elevate">
                <MousePointer className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold" data-testid="text-total-clicks">{stats.totalClicks}</p>
                <p className="text-xs text-muted-foreground">Link Clicks</p>
              </Card>
              <Card className="p-4 text-center hover-elevate">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold" data-testid="text-total-conversions">{stats.totalConversions}</p>
                <p className="text-xs text-muted-foreground">Conversions</p>
              </Card>
              <Card className="p-4 text-center hover-elevate">
                <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold" data-testid="text-commission-earned">R{stats.commissionEarned}</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </Card>
              <Card className="p-4 text-center hover-elevate">
                <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold" data-testid="text-conversion-rate">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conv. Rate</p>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Earnings Progress</h3>
                {stats.canWithdraw && (
                  <Button
                    onClick={() => withdrawMutation.mutate()}
                    disabled={withdrawMutation.isPending}
                    className="gap-2"
                    data-testid="button-withdraw"
                  >
                    <Banknote className="h-4 w-4" />
                    {withdrawMutation.isPending ? "Submitting..." : "Withdraw"}
                  </Button>
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-4 mb-2">
                <div
                  className="bg-primary h-4 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stats.totalConversions / stats.maxConversions) * 100)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.totalConversions} / {stats.maxConversions} paid referrals (R{stats.commissionEarned} / R{stats.maxConversions} max)
              </p>
              {!stats.canWithdraw && stats.totalConversions > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  You need {stats.maxConversions - stats.totalConversions} more paid referrals to unlock withdrawals.
                </p>
              )}
            </Card>

            {stats.referredMembers.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">Referred Members ({stats.referredMembers.length})</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.referredMembers.map((member) => {
                    const conversion = stats.conversions.find(c => c.memberId === member.id);
                    return (
                      <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg" data-testid={`referred-member-${member.id}`}>
                        <div className="flex items-center gap-2">
                          {conversion ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{member.fullName} {member.surname}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.plan || "No plan yet"} | Joined {new Date(member.createdAt).toLocaleDateString("en-ZA")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {conversion ? (
                            <span className="text-sm font-semibold text-green-600" data-testid={`text-commission-${member.id}`}>+R{conversion.commissionAmount}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Awaiting payment</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {stats.recentClicks.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-3">Recent Link Clicks</h3>
                <div className="space-y-1">
                  {stats.recentClicks.slice(0, 10).map((click) => (
                    <div key={click.id} className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Link clicked</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(click.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {statsLoading && (
          <div className="text-center py-8">
            <StokvelLogo className="h-8 w-8 animate-pulse mx-auto" />
            <p className="text-muted-foreground mt-2">Loading stats...</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
