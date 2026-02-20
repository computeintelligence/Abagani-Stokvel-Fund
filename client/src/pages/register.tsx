import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PLANS, MONTHS, GRADES, getCashbackFees } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { StokvelLogo } from "@/components/navbar";
import {
  ArrowLeft, ArrowRight, GraduationCap, BookOpen, Wallet,
  Plus, Trash2, CheckCircle, AlertTriangle
} from "lucide-react";

type PlanKey = keyof typeof PLANS;

interface ChildData {
  fullName: string;
  school: string;
  grade: string;
  uniformSize: string;
  shoeSize: string;
}

const STEPS = ["Plan", "Children", "Address", "Summary", "Agreement"];

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { member, isLoading: authLoading, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [cashbackAmount, setCashbackAmount] = useState(500);
  const [children, setChildren] = useState<ChildData[]>([
    { fullName: "", school: "", grade: "", uniformSize: "", shoeSize: "" },
  ]);
  const [address, setAddress] = useState("");
  const [agreed, setAgreed] = useState(false);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const plan = selectedPlan ? PLANS[selectedPlan] : null;
  const isCashback = selectedPlan === "cashback";

  const getMonthlyAmount = () => {
    if (!plan || !selectedPlan) return 0;
    if (isCashback) return cashbackAmount;
    return plan.amount * children.length;
  };

  const getAdminFee = () => {
    if (!plan || !selectedPlan) return 0;
    if (isCashback) return getCashbackFees(cashbackAmount).adminFee;
    return plan.adminFee * children.length;
  };

  const getContribution = () => {
    if (!plan || !selectedPlan) return 0;
    if (isCashback) return getCashbackFees(cashbackAmount).contribution;
    return plan.contribution * children.length;
  };

  const monthlyAmount = getMonthlyAmount();
  const catchUpMonths = currentMonth;
  const totalFirstPayment = monthlyAmount * (catchUpMonths + 1);

  const progress = ((step + 1) / STEPS.length) * 100;

  const planIcons: Record<string, React.ReactNode> = {
    primary: <GraduationCap className="h-8 w-8 text-primary" />,
    highschool: <BookOpen className="h-8 w-8 text-primary" />,
    cashback: <Wallet className="h-8 w-8 text-primary" />,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <StokvelLogo className="h-10 w-10 animate-pulse" />
      </div>
    );
  }

  if (!member) {
    return <Redirect to="/signup" />;
  }

  if (member.plan) {
    return <Redirect to="/dashboard" />;
  }

  const addChild = () => {
    setChildren([...children, { fullName: "", school: "", grade: "", uniformSize: "", shoeSize: "" }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: keyof ChildData, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const canNext = () => {
    switch (step) {
      case 0: return !!selectedPlan && (!isCashback || cashbackAmount >= 500);
      case 1: return children.every((c) => c.fullName.trim() && c.school.trim() && c.grade);
      case 2: return true;
      case 3: return true;
      case 4: return agreed;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan || !plan) return;
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/register", {
        plan: selectedPlan,
        planAmount: isCashback ? cashbackAmount : plan.amount * children.length,
        adminFee: getAdminFee(),
        address: address || undefined,
        children: children.map((c) => ({
          fullName: c.fullName,
          school: c.school,
          grade: c.grade,
          uniformSize: c.uniformSize || undefined,
          shoeSize: c.shoeSize || undefined,
        })),
        agreedToTerms: agreed,
      });
      await refresh();
      toast({ title: "Registration complete!", description: "Your plan has been activated." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAgreement = () => {
    if (!plan || !selectedPlan) return null;
    if (isCashback) {
      const fees = getCashbackFees(cashbackAmount);
      return (
        <div className="space-y-3 text-sm">
          <p>I, <strong>{member.fullName} {member.surname}</strong>, commit to paying my monthly subscription of <strong>R{cashbackAmount}</strong> on time each month.</p>
          <p>Of my monthly R{cashbackAmount} subscription, <strong>R{fees.adminFee}</strong> goes towards administration fees (12%), and <strong>R{fees.contribution}</strong> is available as cashback. I may withdraw this amount at the beginning of the year for school supplies.</p>
          <p>I understand that consistent monthly payments are required to remain in good standing and qualify for the cashback benefit.</p>
          <p>If I join after January, I must settle outstanding months. I can settle them gradually alongside my current monthly payment.</p>
        </div>
      );
    }
    return (
      <div className="space-y-3 text-sm">
        <p>I, <strong>{member.fullName} {member.surname}</strong>, commit to paying my monthly subscription of <strong>R{monthlyAmount}</strong> (R{plan.amount} x {children.length} child{children.length > 1 ? "ren" : ""}) on time each month.</p>
        <p>Of my monthly subscription, <strong>R{getAdminFee()}</strong> goes towards administration fees, and <strong>R{getContribution()}</strong> goes towards school uniforms and stationery for my child(ren).</p>
        <p>At the beginning of the new school year, my child(ren) will receive full school uniforms and stationery as per the {plan.name} tier.</p>
        <p>I understand that consistent monthly payments are required to remain eligible for benefits.</p>
        <p>If I join after January, I must settle outstanding months. I can settle them gradually alongside my current monthly payment.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <StokvelLogo className="h-6 w-6" />
            <span className="font-bold">Choose Your Plan</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {STEPS.map((s, i) => (
            <Badge
              key={s}
              variant={i <= step ? "default" : "secondary"}
              className={i < step ? "bg-primary/20 text-primary" : ""}
              data-testid={`badge-step-${s.toLowerCase().replace(/\s/g, "-")}`}
            >
              {i < step && <CheckCircle className="h-3 w-3 mr-1" />}
              {s}
            </Badge>
          ))}
        </div>

        <Progress value={progress} className="mb-6 h-2" data-testid="progress-registration" />

        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6" data-testid="text-step-title">Choose Your Plan</h2>
            <div className="space-y-3">
              {(Object.keys(PLANS) as PlanKey[]).map((key) => {
                const p = PLANS[key];
                const isSelected = selectedPlan === key;
                const isCb = key === "cashback";
                return (
                  <Card
                    key={key}
                    className={`p-4 cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary" : ""} hover-elevate`}
                    onClick={() => setSelectedPlan(key)}
                    data-testid={`card-plan-${key}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">{planIcons[key]}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold">{p.name}</h3>
                        <p className="text-sm text-muted-foreground">{p.description}</p>
                        {!isCb && (
                          <p className="text-xs text-muted-foreground mt-1">
                            R{p.adminFee} admin ({Math.round((p.adminFee / p.amount) * 100)}%) | R{p.contribution} uniform & stationery per child
                          </p>
                        )}
                        {isCb && (
                          <p className="text-xs text-muted-foreground mt-1">
                            12% admin fee | Choose any amount from R500
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {isCb ? (
                          <>
                            <span className="text-lg font-bold">From R500</span>
                            <span className="text-sm text-muted-foreground">/month</span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl font-bold">R{p.amount}</span>
                            <span className="text-sm text-muted-foreground">/child/mo</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {selectedPlan === "cashback" && (
              <Card className="p-4 mt-4 border-primary/30">
                <Label className="mb-2 block font-semibold">Choose your monthly cashback amount (minimum R500)</Label>
                <Input
                  type="number"
                  min={500}
                  step={50}
                  value={cashbackAmount}
                  onChange={(e) => setCashbackAmount(Math.max(500, parseInt(e.target.value) || 500))}
                  className="mb-2"
                  data-testid="input-cashback-amount"
                />
                <div className="text-sm text-muted-foreground">
                  <p>Admin fee (12%): R{getCashbackFees(cashbackAmount).adminFee}</p>
                  <p>Withdrawable savings: R{getCashbackFees(cashbackAmount).contribution}</p>
                </div>
              </Card>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-2" data-testid="text-step-title">Children Details</h2>
            {!isCashback && (
              <p className="text-sm text-muted-foreground mb-6">
                You pay R{plan?.amount}/month per child. Adding more children adjusts your total.
              </p>
            )}
            <div className="space-y-4">
              {children.map((child, index) => (
                <Card key={index} className="p-6" data-testid={`card-child-${index}`}>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="font-bold">Child {index + 1}</h3>
                    {children.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChild(index)}
                        data-testid={`button-remove-child-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        value={child.fullName}
                        onChange={(e) => updateChild(index, "fullName", e.target.value)}
                        placeholder="Child's full name"
                        data-testid={`input-child-name-${index}`}
                      />
                    </div>
                    <div>
                      <Label>School</Label>
                      <Input
                        value={child.school}
                        onChange={(e) => updateChild(index, "school", e.target.value)}
                        placeholder="School name"
                        data-testid={`input-child-school-${index}`}
                      />
                    </div>
                    <div>
                      <Label>Grade</Label>
                      <Select value={child.grade} onValueChange={(v) => updateChild(index, "grade", v)}>
                        <SelectTrigger data-testid={`select-child-grade-${index}`}>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADES.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Uniform Size (optional)</Label>
                        <Input
                          value={child.uniformSize}
                          onChange={(e) => updateChild(index, "uniformSize", e.target.value)}
                          placeholder="e.g. 28"
                          data-testid={`input-child-uniform-${index}`}
                        />
                      </div>
                      <div>
                        <Label>Shoe Size (optional)</Label>
                        <Input
                          value={child.shoeSize}
                          onChange={(e) => updateChild(index, "shoeSize", e.target.value)}
                          placeholder="e.g. 5"
                          data-testid={`input-child-shoe-${index}`}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              <Button variant="outline" className="w-full" onClick={addChild} data-testid="button-add-child">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Child
              </Button>

              {!isCashback && children.length > 0 && (
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <p className="text-sm font-medium">
                    Monthly total: R{plan?.amount} x {children.length} child{children.length > 1 ? "ren" : ""} = <strong>R{(plan?.amount || 0) * children.length}/month</strong>
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-6" data-testid="text-step-title">Your Address</h2>
            <Card className="p-6">
              <div>
                <Label>Physical Address (optional)</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your full address"
                  className="mt-2"
                  data-testid="input-address"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Your address helps us with delivery of school uniforms and stationery.
                </p>
              </div>
            </Card>
          </div>
        )}

        {step === 3 && plan && (
          <div>
            <h2 className="text-2xl font-bold mb-6" data-testid="text-step-title">Registration Summary</h2>
            <Card className="p-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-semibold">{plan.name} - R{monthlyAmount}/month</p>
                {!isCashback && children.length > 1 && (
                  <p className="text-xs text-muted-foreground">(R{plan.amount} x {children.length} children)</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member</p>
                <p className="font-semibold">{member.fullName} {member.surname} | {member.phone}</p>
              </div>
              {address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-semibold">{address}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Children ({children.length})</p>
                {children.map((c, i) => (
                  <p key={i} className="font-semibold">{c.fullName} - {c.school} ({c.grade})</p>
                ))}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fee Breakdown</p>
                <p className="text-sm">Admin fee: R{getAdminFee()}/mo | {isCashback ? "Savings" : "Contribution"}: R{getContribution()}/mo</p>
              </div>
            </Card>

            {catchUpMonths > 0 && (
              <Card className="p-6 mt-4 border-yellow-500/30 bg-yellow-500/5" data-testid="card-catchup">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold mb-1">Catch-Up Payment Required</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Since you're joining in {MONTHS[currentMonth]}, you need to cover the months from January to {MONTHS[currentMonth - 1]}.
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span>Catch-up ({catchUpMonths} months x R{monthlyAmount})</span>
                        <span className="font-semibold">R{catchUpMonths * monthlyAmount}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>{MONTHS[currentMonth]} payment</span>
                        <span className="font-semibold">R{monthlyAmount}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t pt-1 mt-1">
                        <span className="font-bold">Total first payment</span>
                        <span className="font-bold">R{totalFirstPayment}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      You can settle outstanding months gradually - pay at least the current month plus one catch-up month each time.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="mt-4">
              <h3 className="text-lg font-bold">Monthly Payment Going Forward</h3>
              <p className="text-3xl font-bold text-primary">R{monthlyAmount}/month</p>
              <p className="text-sm text-muted-foreground">
                From {MONTHS[currentMonth]} to December {currentYear}
              </p>
            </div>
          </div>
        )}

        {step === 4 && plan && (
          <div>
            <h2 className="text-2xl font-bold mb-6" data-testid="text-step-title">Terms & Agreement</h2>
            <Card className="p-6">
              <h3 className="font-bold mb-3">Abangani Stokvel Fund Membership Agreement</h3>
              <p className="text-sm text-muted-foreground mb-4">
                By joining Abangani Stokvel Fund, I agree to the following:
              </p>
              <div className="max-h-60 overflow-y-auto pr-2 mb-4 space-y-2">
                {renderAgreement()}
              </div>
              <div className="flex items-start gap-3 border-t pt-4">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(!!v)}
                  data-testid="checkbox-agree"
                />
                <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                  I have read and agree to the Abangani Stokvel Fund membership terms and conditions
                </Label>
              </div>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 gap-4">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="button-previous">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate("/dashboard")} data-testid="button-cancel">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          )}

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              data-testid="button-next"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!agreed || isSubmitting}
              data-testid="button-complete-registration"
            >
              {isSubmitting ? "Registering..." : "Complete Registration"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
