import { useState } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSupplierAuth } from "@/lib/supplier-auth";
import { Navbar, StokvelLogo } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Package, LogIn, KeyRound, ArrowLeft, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function SupplierLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { supplier, isLoading, login } = useSupplierAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [forgotMode, setForgotMode] = useState<"hidden" | "request" | "reset">("hidden");
  const [resetPhone, setResetPhone] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <StokvelLogo className="h-10 w-10 animate-pulse" />
      </div>
    );
  }

  if (supplier) {
    return <Redirect to="/supplier/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(phone, password);
      navigate("/supplier/dashboard");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Invalid phone or password", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    try {
      const res = await apiRequest("POST", "/api/supplier/forgot-password", { phone: resetPhone, email: resetEmail });
      const data = await res.json();
      toast({ title: "Code Sent", description: data.message });
      setForgotMode("reset");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    try {
      const res = await apiRequest("POST", "/api/supplier/reset-password", { phone: resetPhone, code: resetCode, newPassword });
      const data = await res.json();
      toast({ title: "Success", description: data.message });
      setForgotMode("hidden");
      setResetPhone("");
      setResetEmail("");
      setResetCode("");
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <Package className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold" data-testid="text-supplier-login-title">Supplier Login</h1>
          <p className="text-muted-foreground mt-1">Access your supplier dashboard</p>
        </div>

        <Card className="p-6">
          {forgotMode === "hidden" && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712345678"
                    required
                    data-testid="input-supplier-login-phone"
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    data-testid="input-supplier-login-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-supplier-login">
                  <LogIn className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => setForgotMode("request")}
                  className="text-sm text-primary font-semibold hover:underline"
                  data-testid="link-supplier-forgot-password"
                >
                  <KeyRound className="h-3 w-3 inline mr-1" />
                  Forgot Password?
                </button>
              </div>
            </>
          )}

          {forgotMode === "request" && (
            <form onSubmit={handleForgotRequest} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setForgotMode("hidden")} data-testid="button-supplier-back-to-login">
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <h2 className="text-lg font-semibold">Forgot Password</h2>
              </div>
              <p className="text-sm text-muted-foreground">Enter your phone number and email to receive a reset code.</p>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  placeholder="0712345678"
                  data-testid="input-supplier-forgot-phone"
                />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  data-testid="input-supplier-forgot-email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isForgotLoading || !resetPhone || !resetEmail} data-testid="button-supplier-send-reset-code">
                <Mail className="h-4 w-4 mr-2" />
                {isForgotLoading ? "Sending..." : "Send Reset Code"}
              </Button>
            </form>
          )}

          {forgotMode === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setForgotMode("request")} data-testid="button-supplier-back-to-request">
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <h2 className="text-lg font-semibold">Reset Password</h2>
              </div>
              <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to your email and your new password.</p>
              <div>
                <Label>Reset Code</Label>
                <Input
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  data-testid="input-supplier-reset-code"
                />
              </div>
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  data-testid="input-supplier-new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isForgotLoading || !resetCode || !newPassword} data-testid="button-supplier-reset-password">
                <KeyRound className="h-4 w-4 mr-2" />
                {isForgotLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Not a supplier yet?{" "}
          <Link href="/supplier/signup" className="text-primary underline" data-testid="link-supplier-register">
            Register here
          </Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
