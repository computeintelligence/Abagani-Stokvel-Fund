import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSupplierAuth } from "@/lib/supplier-auth";
import { Navbar, StokvelLogo } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  ArrowLeft, ArrowRight, User, Building2, CheckCircle, FileText,
  Plus, X, Package
} from "lucide-react";

const BUSINESS_TYPES = [
  "School Uniform Manufacturer",
  "School Uniform Retailer",
  "Stationery Supplier",
  "Shoe Manufacturer/Retailer",
  "General School Supplies",
  "Fabric & Textiles",
  "Other",
];

const GOODS_OPTIONS = [
  "School Shirts",
  "School Trousers/Skirts",
  "School Blazers",
  "School Shoes",
  "School Bags",
  "Stationery Packs",
  "Exercise Books",
  "Calculators & Instruments",
  "Sports Uniforms",
  "Winter Wear",
];

const STEPS = ["Personal", "Business", "Products", "Agreement"];

export default function SupplierSignup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setSupplierDirectly } = useSupplierAuth();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");

  const [goodsSupplied, setGoodsSupplied] = useState<string[]>([]);
  const [customGood, setCustomGood] = useState("");

  const [agreed, setAgreed] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  const toggleGood = (good: string) => {
    setGoodsSupplied((prev) =>
      prev.includes(good) ? prev.filter((g) => g !== good) : [...prev, good]
    );
  };

  const addCustomGood = () => {
    if (customGood.trim() && !goodsSupplied.includes(customGood.trim())) {
      setGoodsSupplied([...goodsSupplied, customGood.trim()]);
      setCustomGood("");
    }
  };

  const canNext = () => {
    switch (step) {
      case 0:
        return fullName.trim() && surname.trim() && email.includes("@") && phone.length >= 10 && password.length >= 6 && password === confirmPassword;
      case 1:
        return businessName.trim() && businessType && address.trim();
      case 2:
        return goodsSupplied.length > 0;
      case 3:
        return agreed;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/supplier/signup", {
        fullName,
        surname,
        email,
        phone,
        password,
        businessName,
        businessType,
        registrationNumber: registrationNumber || undefined,
        address,
        goodsSupplied,
        agreedToTerms: agreed,
      });
      const data = await res.json();
      setSupplierDirectly(data);
      toast({ title: "Registration submitted!", description: "Your supplier application is pending approval." });
      navigate("/supplier/dashboard");
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
          <Package className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold" data-testid="text-supplier-signup-title">Register as a Supplier</h1>
          <p className="text-muted-foreground mt-2">
            Join our network and supply school uniforms & stationery to Abangani families
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {STEPS.map((s, i) => (
            <Badge
              key={s}
              variant={i <= step ? "default" : "secondary"}
              className={i < step ? "bg-primary/20 text-primary" : ""}
              data-testid={`badge-supplier-step-${s.toLowerCase()}`}
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
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your first name" data-testid="input-supplier-name" />
                </div>
                <div>
                  <Label>Surname</Label>
                  <Input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Your surname" data-testid="input-supplier-surname" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-testid="input-supplier-email" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" data-testid="input-supplier-phone" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" data-testid="input-supplier-password" />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" data-testid="input-supplier-confirm-password" />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Business Details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Business Name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business/company name" data-testid="input-supplier-business-name" />
              </div>
              <div>
                <Label>Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger data-testid="select-supplier-business-type">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Company Registration Number (optional)</Label>
                <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="e.g. 2024/123456/07" data-testid="input-supplier-reg-number" />
              </div>
              <div>
                <Label>Business Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full business address" data-testid="input-supplier-address" />
              </div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Products You Supply</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select all the goods and services you can provide to our families.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {GOODS_OPTIONS.map((good) => (
                <div
                  key={good}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    goodsSupplied.includes(good) ? "border-primary bg-primary/5" : "hover:border-primary/40"
                  }`}
                  onClick={() => toggleGood(good)}
                  data-testid={`toggle-good-${good.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <Checkbox checked={goodsSupplied.includes(good)} />
                  <span className="text-sm">{good}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customGood}
                onChange={(e) => setCustomGood(e.target.value)}
                placeholder="Add custom product/service..."
                onKeyDown={(e) => e.key === "Enter" && addCustomGood()}
                data-testid="input-supplier-custom-good"
              />
              <Button variant="outline" onClick={addCustomGood} data-testid="button-add-custom-good">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {goodsSupplied.filter((g) => !GOODS_OPTIONS.includes(g)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {goodsSupplied
                  .filter((g) => !GOODS_OPTIONS.includes(g))
                  .map((g) => (
                    <Badge key={g} variant="secondary" className="cursor-pointer" onClick={() => toggleGood(g)}>
                      {g} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Selected: {goodsSupplied.length} product{goodsSupplied.length !== 1 ? "s" : ""}
            </p>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Supplier Agreement</h2>
            </div>

            <Card className="p-4 bg-muted/30 mb-4">
              <h3 className="font-bold mb-2">Registration Summary</h3>
              <div className="text-sm space-y-1">
                <p><strong>Contact:</strong> {fullName} {surname} | {phone} | {email}</p>
                <p><strong>Business:</strong> {businessName} ({businessType})</p>
                {registrationNumber && <p><strong>Reg No:</strong> {registrationNumber}</p>}
                <p><strong>Address:</strong> {address}</p>
                <p><strong>Products:</strong> {goodsSupplied.join(", ")}</p>
              </div>
            </Card>

            <div className="space-y-3 text-sm mb-6 max-h-48 overflow-y-auto pr-2">
              <p>I, <strong>{fullName} {surname}</strong>, representing <strong>{businessName}</strong>, hereby apply to become a registered supplier for Abangani Stokvel Fund.</p>
              <p>I agree to supply school uniforms, stationery, and/or related goods at competitive prices that benefit the members of the stokvel.</p>
              <p>I understand that my registration is subject to approval by Abangani Stokvel Fund administrators.</p>
              <p>I commit to maintaining quality standards and timely delivery of all goods ordered through the platform.</p>
              <p>I agree to provide transparent pricing and communicate any changes in advance.</p>
            </div>

            <div className="flex items-start gap-3 border-t pt-4">
              <Checkbox
                id="supplier-agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(!!v)}
                data-testid="checkbox-supplier-agree"
              />
              <Label htmlFor="supplier-agree" className="text-sm leading-relaxed cursor-pointer">
                I have read and agree to the Abangani Stokvel Fund supplier terms and conditions
              </Label>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between mt-6 gap-4">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="button-supplier-previous">
              <ArrowLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
          ) : (
            <Button variant="outline" asChild data-testid="button-supplier-back">
              <Link href="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Link>
            </Button>
          )}

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} data-testid="button-supplier-next">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!agreed || isSubmitting} data-testid="button-supplier-submit">
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already registered as a supplier?{" "}
          <Link href="/supplier/login" className="text-primary underline" data-testid="link-supplier-login">
            Sign in here
          </Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
