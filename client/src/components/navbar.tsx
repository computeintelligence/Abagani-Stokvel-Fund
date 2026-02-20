import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme-provider";
import { useAuth } from "@/lib/auth";
import { Menu, Moon, Sun } from "lucide-react";

function StokvelLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="20" cy="20" r="18" fill="currentColor" className="text-primary" opacity="0.15" />
      <circle cx="20" cy="20" r="14" fill="currentColor" className="text-primary" opacity="0.25" />
      <path d="M20 8 L20 32" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 14 C14 11, 20 9, 24 12 C28 15, 22 18, 20 18 C18 18, 12 21, 16 24 C20 27, 26 25, 26 22" stroke="currentColor" className="text-primary" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="12" r="3" fill="currentColor" className="text-primary" opacity="0.5" />
      <circle cx="28" cy="12" r="3" fill="currentColor" className="text-primary" opacity="0.5" />
      <circle cx="12" cy="28" r="3" fill="currentColor" className="text-primary" opacity="0.5" />
      <circle cx="28" cy="28" r="3" fill="currentColor" className="text-primary" opacity="0.5" />
    </svg>
  );
}

export { StokvelLogo };

export function Navbar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { member } = useAuth();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <StokvelLogo className="h-8 w-8" />
          <span className="font-bold text-lg" data-testid="text-brand">Abangani Stokvel Fund</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              asChild
            >
              <Link href={link.href} data-testid={`link-${link.label.toLowerCase()}`}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {member ? (
            <Button asChild data-testid="link-dashboard">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild data-testid="link-signin">
                <Link href="/signin">Sign In</Link>
              </Button>
              <Button asChild data-testid="link-signup">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-1">
          <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle-mobile">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex items-center gap-2 mb-6 mt-2">
                <StokvelLogo className="h-7 w-7" />
                <span className="font-bold text-lg">Abangani Stokvel Fund</span>
              </div>
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Button
                    key={link.href}
                    variant="ghost"
                    className="justify-start"
                    asChild
                    onClick={() => setOpen(false)}
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
                <div className="border-t my-2" />
                {member ? (
                  <>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                    <Button variant="ghost" className="justify-start" asChild onClick={() => setOpen(false)}>
                      <Link href="/profile">Profile</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start" asChild onClick={() => setOpen(false)}>
                      <Link href="/signin">Sign In</Link>
                    </Button>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link href="/signup">Sign Up</Link>
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
