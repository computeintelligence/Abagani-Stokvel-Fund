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
import { Package, LogIn } from "lucide-react";

export default function SupplierLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { supplier, isLoading, login } = useSupplierAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
