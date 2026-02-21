import { Link } from "wouter";
import { Phone, Mail, MapPin } from "lucide-react";
import { StokvelLogo } from "./navbar";

export function Footer() {
  return (
    <footer className="border-t bg-card/30 py-10" data-testid="footer">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <StokvelLogo className="h-6 w-6" />
              <span className="font-bold">Abangani Stokvel Fund</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A trusted stokvel platform helping parents save for school uniforms and stationery.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Quick Links</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/" data-testid="link-footer-home">Home</Link>
              <Link href="/about" data-testid="link-footer-about">About Us</Link>
              <Link href="/contact" data-testid="link-footer-contact">Contact</Link>
              <Link href="/signup" data-testid="link-footer-signup">Sign Up</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Registrations</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/signup" data-testid="link-footer-member">Register as Member</Link>
              <Link href="/supplier/signup" data-testid="link-footer-supplier">Register as Supplier</Link>
              <Link href="/affiliate/signup" data-testid="link-footer-affiliate">Register as Affiliate</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Contact Us</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a href="tel:0676083942" className="flex items-center gap-2">
                <Phone className="h-3 w-3" /> 067 608 3942
              </a>
              <a href="mailto:info@abanganins.co.za" className="flex items-center gap-2">
                <Mail className="h-3 w-3" /> info@abanganins.co.za
              </a>
              <span className="flex items-center gap-2">
                <MapPin className="h-3 w-3" /> South Africa
              </span>
            </div>
          </div>
        </div>
        <div className="border-t pt-6 text-center text-xs text-muted-foreground space-y-1">
          <p>&copy; {new Date().getFullYear()} Abangani Stokvel Fund. All rights reserved.</p>
          <p>Powered by Abangani NS Group</p>
        </div>
      </div>
    </footer>
  );
}
