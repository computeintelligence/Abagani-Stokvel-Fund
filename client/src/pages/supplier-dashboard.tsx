import { useState } from "react";
import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSupplierAuth } from "@/lib/supplier-auth";
import { StokvelLogo } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  Package, Building2, User, MapPin, LogOut,
  Edit, Save, X, CheckCircle, Clock, AlertTriangle, Plus
} from "lucide-react";

const GOODS_OPTIONS = [
  "School Shirts", "School Trousers/Skirts", "School Blazers", "School Shoes",
  "School Bags", "Stationery Packs", "Exercise Books", "Calculators & Instruments",
  "Sports Uniforms", "Winter Wear",
];

const BUSINESS_TYPES = [
  "School Uniform Manufacturer", "School Uniform Retailer", "Stationery Supplier",
  "Shoe Manufacturer/Retailer", "General School Supplies", "Fabric & Textiles", "Other",
];

export default function SupplierDashboard() {
  const { supplier, isLoading, logout, refresh } = useSupplierAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [goodsSupplied, setGoodsSupplied] = useState<string[]>([]);
  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customGood, setCustomGood] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <StokvelLogo className="h-10 w-10 animate-pulse" />
      </div>
    );
  }

  if (!supplier) {
    return <Redirect to="/supplier/login" />;
  }

  const startEdit = () => {
    setBusinessName(supplier.businessName);
    setBusinessType(supplier.businessType);
    setRegistrationNumber(supplier.registrationNumber || "");
    const addrParts = (supplier.address || "").split(", ");
    setStreetAddress(addrParts[0] || "");
    setAddressCity(addrParts[1] || "");
    setAddressProvince(addrParts[2] || "");
    setAddressPostalCode(addrParts[3] || "");
    setGoodsSupplied([...supplier.goodsSupplied]);
    setFullName(supplier.fullName);
    setSurname(supplier.surname);
    setPhone(supplier.phone);
    setEmail(supplier.email);
    setNextOfKinName(supplier.nextOfKinName || "");
    setNextOfKinPhone(supplier.nextOfKinPhone || "");
    setNextOfKinRelationship(supplier.nextOfKinRelationship || "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest("PATCH", "/api/supplier/profile", {
        businessName,
        businessType,
        registrationNumber: registrationNumber || undefined,
        address: [streetAddress, addressCity, addressProvince, addressPostalCode].filter(Boolean).join(", "),
        goodsSupplied,
        fullName,
        surname,
        phone,
        email,
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
      setIsSaving(false);
    }
  };

  const statusColor = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    approved: "bg-green-500/10 text-green-600 border-green-500/30",
    rejected: "bg-red-500/10 text-red-600 border-red-500/30",
  }[supplier.status] || "";

  const statusIcon = {
    pending: <Clock className="h-4 w-4" />,
    approved: <CheckCircle className="h-4 w-4" />,
    rejected: <AlertTriangle className="h-4 w-4" />,
  }[supplier.status];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <StokvelLogo className="h-6 w-6" />
            <span className="font-bold">Abangani Stokvel Fund</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColor} data-testid="badge-supplier-status">
              {statusIcon}
              <span className="ml-1 capitalize">{supplier.status}</span>
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => { logout(); window.location.href = "/"; }} data-testid="button-supplier-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {supplier.status === "pending" && (
          <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold">Application Under Review</h3>
                <p className="text-sm text-muted-foreground">
                  Your supplier registration is being reviewed by our team. You will be notified once approved.
                </p>
              </div>
            </div>
          </Card>
        )}

        {supplier.status === "rejected" && (
          <Card className="p-4 border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold">Application Rejected</h3>
                <p className="text-sm text-muted-foreground">
                  Unfortunately your application was not approved. Please update your details and contact us for review.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold" data-testid="text-supplier-welcome">
            Welcome, {supplier.fullName}
          </h2>
          {!editing && (
            <Button variant="outline" onClick={startEdit} data-testid="button-supplier-edit">
              <Edit className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
          )}
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Personal Details</h3>
          </div>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} data-testid="input-edit-supplier-name" />
                </div>
                <div>
                  <Label>Surname</Label>
                  <Input value={surname} onChange={(e) => setSurname(e.target.value)} data-testid="input-edit-supplier-surname" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-edit-supplier-email" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-edit-supplier-phone" />
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {supplier.fullName} {supplier.surname}</p>
              <p><strong>Email:</strong> {supplier.email}</p>
              <p><strong>Phone:</strong> {supplier.phone}</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Next of Kin</h3>
          </div>
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={nextOfKinName} onChange={(e) => setNextOfKinName(e.target.value)} placeholder="Next of kin full name" data-testid="input-edit-supplier-nok-name" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={nextOfKinPhone} onChange={(e) => setNextOfKinPhone(e.target.value)} placeholder="Next of kin phone number" data-testid="input-edit-supplier-nok-phone" />
              </div>
              <div>
                <Label>Relationship</Label>
                <Select value={nextOfKinRelationship} onValueChange={setNextOfKinRelationship}>
                  <SelectTrigger data-testid="select-edit-supplier-nok-relationship">
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
          ) : (
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {supplier.nextOfKinName || "-"}</p>
              <p><strong>Phone:</strong> {supplier.nextOfKinPhone || "-"}</p>
              <p><strong>Relationship:</strong> {supplier.nextOfKinRelationship || "-"}</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Business Details</h3>
          </div>
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>Business Name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} data-testid="input-edit-business-name" />
              </div>
              <div>
                <Label>Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger data-testid="select-edit-business-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Registration Number</Label>
                <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} data-testid="input-edit-reg-number" />
              </div>
              <div>
                <Label>Street Address</Label>
                <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="e.g. 45 Industrial Road" data-testid="input-edit-street" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>City / Town</Label>
                  <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="e.g. Johannesburg" data-testid="input-edit-city" />
                </div>
                <div>
                  <Label>Province</Label>
                  <Input value={addressProvince} onChange={(e) => setAddressProvince(e.target.value)} placeholder="e.g. Gauteng" data-testid="input-edit-province" />
                </div>
              </div>
              <div className="w-full sm:w-1/2">
                <Label>Postal Code</Label>
                <Input value={addressPostalCode} onChange={(e) => setAddressPostalCode(e.target.value)} placeholder="e.g. 2000" data-testid="input-edit-postal-code" />
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p><strong>Business:</strong> {supplier.businessName}</p>
              <p><strong>Type:</strong> {supplier.businessType}</p>
              {supplier.registrationNumber && <p><strong>Reg No:</strong> {supplier.registrationNumber}</p>}
              <p><strong>Address:</strong> {supplier.address}</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Products Supplied</h3>
          </div>
          {editing ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {GOODS_OPTIONS.map((good) => (
                  <div
                    key={good}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                      goodsSupplied.includes(good) ? "border-primary bg-primary/5" : "hover:border-primary/40"
                    }`}
                    onClick={() => toggleGood(good)}
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
                  placeholder="Add custom product..."
                  onKeyDown={(e) => e.key === "Enter" && addCustomGood()}
                />
                <Button variant="outline" onClick={addCustomGood}>
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
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {supplier.goodsSupplied.map((good) => (
                <Badge key={good} variant="secondary">{good}</Badge>
              ))}
            </div>
          )}
        </Card>

        {editing && (
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={cancelEdit} data-testid="button-supplier-cancel-edit">
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-supplier-save">
              <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
