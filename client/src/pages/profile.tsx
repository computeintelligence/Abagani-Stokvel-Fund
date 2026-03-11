import { useState } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, User, Edit2, Save, X, Copy, ArrowLeft, LogOut
} from "lucide-react";

const RELATIONSHIP_OPTIONS = ["Parent", "Spouse", "Sibling", "Child", "Other"];

export default function Profile() {
  const { member, logout, isLoading: authLoading, refresh } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState("");
  const [saving, setSaving] = useState(false);

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

  const startEditing = () => {
    setFullName(member.fullName);
    setSurname(member.surname || "");
    setPhone(member.phone);
    const addrParts = (member.address || "").split(", ");
    setStreetAddress(addrParts[0] || "");
    setAddressCity(addrParts[1] || "");
    setAddressProvince(addrParts[2] || "");
    setAddressPostalCode(addrParts[3] || "");
    setNextOfKinName(member.nextOfKinName || "");
    setNextOfKinPhone(member.nextOfKinPhone || "");
    setNextOfKinRelationship(member.nextOfKinRelationship || "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/members/${member.id}/profile`, {
        fullName,
        surname,
        phone,
        address: [streetAddress, addressCity, addressProvince, addressPostalCode].filter(Boolean).join(", "),
        nextOfKinName: nextOfKinName || null,
        nextOfKinPhone: nextOfKinPhone || null,
        nextOfKinRelationship: nextOfKinRelationship || null,
      });
      await refresh();
      setEditing(false);
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyTracking = () => {
    navigator.clipboard.writeText(member.trackingNumber);
    toast({ title: "Copied!", description: "Tracking number copied to clipboard." });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm" data-testid="link-back-dashboard">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={logout} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-profile-name">
            {member.fullName} {member.surname || ""}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {member.plan && (
              <Badge variant="secondary" data-testid="badge-profile-plan">{member.plan}</Badge>
            )}
            <Badge variant="outline" className="cursor-pointer" onClick={copyTracking} data-testid="badge-profile-tracking">
              {member.trackingNumber}
              <Copy className="h-3 w-3 ml-1" />
            </Badge>
          </div>
        </div>

        <Card className="p-6" data-testid="card-profile-info">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold">Personal Information</h2>
            {!editing && (
              <Button variant="outline" onClick={startEditing} data-testid="button-edit-profile">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  data-testid="input-profile-fullname"
                />
              </div>
              <div>
                <Label htmlFor="surname">Surname</Label>
                <Input
                  id="surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  data-testid="input-profile-surname"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="input-profile-phone"
                />
              </div>
              <div>
                <Label>Street Address</Label>
                <Input
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. 123 Main Street"
                  data-testid="input-profile-street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City / Town</Label>
                  <Input
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    placeholder="e.g. Johannesburg"
                    data-testid="input-profile-city"
                  />
                </div>
                <div>
                  <Label>Province</Label>
                  <Input
                    value={addressProvince}
                    onChange={(e) => setAddressProvince(e.target.value)}
                    placeholder="e.g. Gauteng"
                    data-testid="input-profile-province"
                  />
                </div>
              </div>
              <div className="w-1/2">
                <Label>Postal Code</Label>
                <Input
                  value={addressPostalCode}
                  onChange={(e) => setAddressPostalCode(e.target.value)}
                  placeholder="e.g. 2000"
                  data-testid="input-profile-postal-code"
                />
              </div>
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-semibold mb-3">Next of Kin</p>
                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={nextOfKinName}
                      onChange={(e) => setNextOfKinName(e.target.value)}
                      placeholder="Next of kin full name"
                      data-testid="input-profile-nok-name"
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={nextOfKinPhone}
                      onChange={(e) => setNextOfKinPhone(e.target.value)}
                      placeholder="Next of kin phone number"
                      data-testid="input-profile-nok-phone"
                    />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Select value={nextOfKinRelationship} onValueChange={setNextOfKinRelationship}>
                      <SelectTrigger data-testid="select-profile-nok-relationship">
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
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving || !fullName.trim() || !surname.trim() || !phone.trim()} data-testid="button-save-profile">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)} data-testid="button-cancel-edit">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium" data-testid="text-profile-fullname">{member.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Surname</p>
                <p className="font-medium" data-testid="text-profile-surname">{member.surname || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium" data-testid="text-profile-phone">{member.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium" data-testid="text-profile-address">{member.address || "-"}</p>
              </div>
              {member.plan && (
                <div>
                  <p className="text-sm text-muted-foreground">Subscription Plan</p>
                  <p className="font-medium" data-testid="text-profile-plan">{member.plan} - R{member.planAmount}/month</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium" data-testid="text-profile-joined">
                  {member.createdAt ? new Date(member.createdAt).toLocaleDateString("en-ZA", { year: "numeric", month: "long" }) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account Status</p>
                <Badge variant={member.status === "active" ? "default" : "secondary"} data-testid="badge-profile-status">
                  {member.status}
                </Badge>
              </div>
              {(member.nextOfKinName || member.nextOfKinPhone || member.nextOfKinRelationship) && (
                <div className="border-t pt-4 mt-2">
                  <p className="text-sm font-semibold mb-3">Next of Kin</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium" data-testid="text-profile-nok-name">{member.nextOfKinName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium" data-testid="text-profile-nok-phone">{member.nextOfKinPhone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Relationship</p>
                      <p className="font-medium" data-testid="text-profile-nok-relationship">{member.nextOfKinRelationship || "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
