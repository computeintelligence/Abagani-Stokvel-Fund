import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme-provider";
import { useAuth } from "@/lib/auth";
import { Menu, Moon, Sun, Shield } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { member } = useAuth();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/#about" },
    { label: "Contact", href: "/#contact" },
  ];

  const handleNavClick = (href: string) => {
    setOpen(false);
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      if (location === "/") {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = href;
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          <span className="font-bold text-lg" data-testid="text-brand">Abangani NS Group</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              asChild
              onClick={() => handleNavClick(link.href)}
            >
              {link.href.startsWith("/#") ? (
                <a href={link.href} data-testid={`link-${link.label.toLowerCase()}`}>{link.label}</a>
              ) : (
                <Link href={link.href} data-testid={`link-${link.label.toLowerCase()}`}>{link.label}</Link>
              )}
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
                <Link href="/register">Sign Up</Link>
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
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Abangani NS Group</span>
              </div>
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Button
                    key={link.href}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleNavClick(link.href)}
                    asChild
                  >
                    {link.href.startsWith("/#") ? (
                      <a href={link.href}>{link.label}</a>
                    ) : (
                      <Link href={link.href}>{link.label}</Link>
                    )}
                  </Button>
                ))}
                <div className="border-t my-2" />
                {member ? (
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start" asChild onClick={() => setOpen(false)}>
                      <Link href="/signin">Sign In</Link>
                    </Button>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link href="/register">Sign Up</Link>
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
