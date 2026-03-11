import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAffiliateAuth } from "@/lib/affiliate-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  ArrowLeft, ArrowRight, User, CheckCircle, FileText,
  Link2, TrendingUp
} from "lucide-react";

const STEPS = ["Personal", "Agreement"];

export default function AffiliateSignup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setAffiliateDirectly } = useAffiliateAuth();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");

  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState("");

  const [agreed, setAgreed] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  const canNext = () => {
    switch (step) {
      case 0:
        return fullName.trim() && surname.trim() && email.includes("@") && phone.length >= 10 && password.length >= 6 && password === confirmPassword;
      case 1:
        return agreed;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/affiliate/signup", {
        fullName,
        surname,
        email,
        phone,
        password,
        address: [streetAddress, addressCity, addressProvince, addressPostalCode].filter(Boolean).join(", ") || undefined,
        nextOfKinName: nextOfKinName || undefined,
        nextOfKinPhone: nextOfKinPhone || undefined,
        nextOfKinRelationship: nextOfKinRelationship || undefined,
        agreedToTerms: agreed,
      });
      const data = await res.json();
      setAffiliateDirectly(data);
      toast({ title: "Registration submitted!", description: "Your affiliate application is pending approval." });
      navigate("/affiliate/dashboard");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <Link2 className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold" data-testid="text-affiliate-signup-title">Become an Affiliate</h1>
          <p className="text-muted-foreground mt-2">
            Earn R5 for every person you refer who signs up and pays their first month
          </p>
        </div>

        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">How It Works</p>
              <p className="text-muted-foreground">Share your unique affiliate link with friends. When they sign up, register with a plan, and make their first payment, you earn R5 commission. Withdraw your earnings after reaching 200 paid referrals (R1,000 potential earnings).</p>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2 mb-4">
          {STEPS.map((s, i) => (
            <Badge
              key={s}
              variant={i <= step ? "default" : "secondary"}
              className={i < step ? "bg-primary/20 text-primary" : ""}
              data-testid={`badge-affiliate-step-${s.toLowerCase()}`}
            >
              {i < step && <CheckCircle className="h-3 w-3 mr-1" />}
              {s}
            </Badge>
          ))}
        </div>
        <Progress value={progress} className="mb-6 h-2" />

        {step === 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Personal Details</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your first name" data-testid="input-affiliate-name" />
                </div>
                <div>
                  <Label>Surname</Label>
                  <Input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Your surname" data-testid="input-affiliate-surname" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-testid="input-affiliate-email" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" data-testid="input-affiliate-phone" />
              </div>
              <div>
                <Label>Street Address (optional)</Label>
                <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="e.g. 123 Main Street" data-testid="input-affiliate-street" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City / Town</Label>
                  <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="e.g. Johannesburg" data-testid="input-affiliate-city" />
                </div>
                <div>
                  <Label>Province</Label>
                  <Input value={addressProvince} onChange={(e) => setAddressProvince(e.target.value)} placeholder="e.g. Gauteng" data-testid="input-affiliate-province" />
                </div>
              </div>
              <div className="w-1/2">
                <Label>Postal Code</Label>
                <Input value={addressPostalCode} onChange={(e) => setAddressPostalCode(e.target.value)} placeholder="e.g. 2000" data-testid="input-affiliate-postal-code" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" data-testid="input-affiliate-password" />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" data-testid="input-affiliate-confirm-password" />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-semibold mb-3">Next of Kin (Optional)</p>
                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={nextOfKinName} onChange={(e) => setNextOfKinName(e.target.value)} placeholder="Next of kin full name" data-testid="input-affiliate-nok-name" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={nextOfKinPhone} onChange={(e) => setNextOfKinPhone(e.target.value)} placeholder="Next of kin phone number" data-testid="input-affiliate-nok-phone" />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Select value={nextOfKinRelationship} onValueChange={setNextOfKinRelationship}>
                      <SelectTrigger data-testid="select-affiliate-nok-relationship">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Parent", "Spouse", "Sibling", "Child", "Other"].map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Affiliate Agreement</h2>
            </div>

            <Card className="p-4 bg-muted/30 mb-4">
              <h3 className="font-bold mb-2">Registration Summary</h3>
              <div className="text-sm space-y-1">
                <p><strong>Name:</strong> {fullName} {surname}</p>
                <p><strong>Contact:</strong> {phone} | {email}</p>
              </div>
            </Card>

            <div className="space-y-3 text-sm mb-6 max-h-48 overflow-y-auto pr-2">
              <p>I, <strong>{fullName} {surname}</strong>, hereby apply to become an affiliate agent for Abangani Stokvel Fund.</p>
              <p>I understand that I will receive a unique affiliate link upon registration. When someone uses my link to sign up, registers for a plan, and makes their first payment, I will earn a commission of <strong>R5 per paid referral</strong>.</p>
              <p>I acknowledge that withdrawals are available after reaching <strong>200 paid referrals</strong> (R1,000 maximum earnings).</p>
              <p>I agree to promote Abangani Stokvel Fund honestly and ethically, without making misleading claims about the service.</p>
              <p>My registration is subject to approval by Abangani Stokvel Fund administrators.</p>
              <p>I understand that commissions will be paid out after verification.</p>
            </div>

            <div className="flex items-start gap-3 border-t pt-4">
              <Checkbox
                id="affiliate-agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(!!v)}
                data-testid="checkbox-affiliate-agree"
              />
              <Label htmlFor="affiliate-agree" className="text-sm leading-relaxed cursor-pointer">
                I have read and agree to the Abangani Stokvel Fund affiliate terms and conditions
              </Label>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between mt-6 gap-4">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="button-affiliate-previous">
              <ArrowLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
          ) : (
            <Button variant="outline" asChild data-testid="button-affiliate-back">
              <Link href="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Link>
            </Button>
          )}

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} data-testid="button-affiliate-next">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!agreed || isSubmitting} data-testid="button-affiliate-submit">
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already an affiliate?{" "}
          <Link href="/affiliate/login" className="text-primary underline" data-testid="link-affiliate-login">
            Sign in here
          </Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
