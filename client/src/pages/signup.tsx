import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserPlus } from "lucide-react";

const RELATIONSHIP_OPTIONS = ["Parent", "Spouse", "Sibling", "Child", "Other"];

export default function SignUp() {
  const [, navigate] = useLocation();
  const { member, setMemberDirectly } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const justSignedUp = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      fetch(`/api/affiliate/track/${ref}`).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (justSignedUp.current && member) {
      navigate("/welcome");
    }
  }, [member, navigate]);

  const canSubmit = fullName.trim().length > 0
    && surname.trim().length > 0
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && phone.trim().length >= 10
    && password.length >= 6
    && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const affiliateRef = urlParams.get("ref") || undefined;
      const res = await apiRequest("POST", "/api/signup", {
        fullName,
        surname,
        email,
        phone,
        password,
        nextOfKinName: nextOfKinName || undefined,
        nextOfKinPhone: nextOfKinPhone || undefined,
        nextOfKinRelationship: nextOfKinRelationship || undefined,
        affiliateRef,
      });
      const memberData = await res.json();
      justSignedUp.current = true;
      setMemberDirectly(memberData);
      toast({ title: "Account created!", description: "Welcome to Abangani Stokvel Fund." });
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold" data-testid="text-signup-title">Create Your Account</h1>
          <p className="text-muted-foreground mt-1">Join Abangani Stokvel Fund today</p>
        </div>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                data-testid="input-signup-fullname"
              />
            </div>
            <div>
              <Label htmlFor="surname">Surname</Label>
              <Input
                id="surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Enter your surname"
                data-testid="input-signup-surname"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                data-testid="input-signup-email"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0676083942"
                data-testid="input-signup-phone"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)"
                data-testid="input-signup-password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                data-testid="input-signup-confirm"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-semibold mb-3">Next of Kin (Optional)</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nextOfKinName">Full Name</Label>
                  <Input
                    id="nextOfKinName"
                    value={nextOfKinName}
                    onChange={(e) => setNextOfKinName(e.target.value)}
                    placeholder="Next of kin full name"
                    data-testid="input-signup-nok-name"
                  />
                </div>
                <div>
                  <Label htmlFor="nextOfKinPhone">Phone Number</Label>
                  <Input
                    id="nextOfKinPhone"
                    value={nextOfKinPhone}
                    onChange={(e) => setNextOfKinPhone(e.target.value)}
                    placeholder="Next of kin phone number"
                    data-testid="input-signup-nok-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="nextOfKinRelationship">Relationship</Label>
                  <Select value={nextOfKinRelationship} onValueChange={setNextOfKinRelationship}>
                    <SelectTrigger data-testid="select-signup-nok-relationship">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !canSubmit} data-testid="button-signup-submit">
              <UserPlus className="h-4 w-4 mr-2" />
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="text-primary font-semibold" data-testid="link-signin">
              Sign in here
            </Link>
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
