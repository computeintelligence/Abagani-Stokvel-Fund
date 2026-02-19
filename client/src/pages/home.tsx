import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { PLANS } from "@shared/schema";
import {
  Shield, GraduationCap, BookOpen, Gift, ArrowRight,
  Users, CheckCircle, Phone, Mail, MapPin, Heart, Star, TrendingUp
} from "lucide-react";

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 dark:from-primary/10 dark:via-background dark:to-primary/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="max-w-6xl mx-auto px-4 py-20 md:py-32 relative">
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-6" data-testid="badge-hero">
            <Star className="h-3 w-3 mr-1" />
            South Africa's Trusted Stokvel Platform
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
            Invest in Your Child's{" "}
            <span className="text-primary">Future Today</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Join Abangani NS Group and secure your children's school uniforms
            and stationery through affordable monthly contributions. Together we
            build a brighter future.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild data-testid="button-hero-signup">
              <Link href="/register">
                Join Now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-hero-learn">
              <a href="#about">Learn More</a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-3xl mx-auto">
          {[
            { icon: Users, label: "Growing Community", value: "500+ Families" },
            { icon: Heart, label: "Years of Trust", value: "Since 2023" },
            { icon: TrendingUp, label: "Children Supported", value: "1000+" },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 text-center hover-elevate">
              <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-xl font-bold" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const planIcons: Record<string, React.ReactNode> = {
    primary: <GraduationCap className="h-8 w-8 text-primary" />,
    highschool: <BookOpen className="h-8 w-8 text-primary" />,
    cashback500: <Gift className="h-8 w-8 text-primary" />,
    cashback1000: <Shield className="h-8 w-8 text-primary" />,
  };

  const planKeys = Object.keys(PLANS) as Array<keyof typeof PLANS>;

  return (
    <section id="pricing" className="py-20 bg-card/30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Affordable monthly contributions to secure your child's education
            needs. Choose the plan that works best for your family.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {planKeys.map((key) => {
            const plan = PLANS[key];
            const isCashback = key.startsWith("cashback");
            return (
              <Card key={key} className="p-6 flex flex-col hover-elevate" data-testid={`card-plan-${key}`}>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    {planIcons[key]}
                    <h3 className="text-lg font-bold mt-2">{plan.name}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {plan.description}
                </p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-primary">R{plan.amount}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 mb-4">
                  <p>R{plan.adminFee} administration fee</p>
                  <p>R{plan.contribution} goes to {isCashback ? "savings (withdrawable)" : "uniform & stationery"}</p>
                </div>
                <Button asChild className="w-full" data-testid={`button-select-${key}`}>
                  <Link href="/register">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">About Us</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-about-title">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Abangani NS Group is a stokvel where parents contribute monthly to
            cover their children's school needs at the start of each year.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              title: "1. Register & Choose Plan",
              desc: "Sign up, select a plan for your child, and start contributing monthly. You can register at any time during the year.",
            },
            {
              icon: CheckCircle,
              title: "2. Pay Monthly",
              desc: "Make affordable monthly payments. If you join mid-year, catch up on previous months at your own pace.",
            },
            {
              icon: GraduationCap,
              title: "3. Receive Benefits",
              desc: "At the beginning of the new school year, your child receives full school uniforms and stationery, or you can opt for cashback.",
            },
          ].map((step) => (
            <Card key={step.title} className="p-6 hover-elevate" data-testid={`card-step-${step.title.slice(0,1)}`}>
              <step.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="py-20 bg-card/30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Contact</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-contact-title">
            Get in Touch
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Have questions? We're here to help. Reach out to us through any of
            the channels below.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: Phone, label: "Phone", value: "078 772 2258" },
            { icon: Mail, label: "Email", value: "info@abanganins.co.za" },
            { icon: MapPin, label: "Location", value: "South Africa" },
          ].map((item) => (
            <Card key={item.label} className="p-6 text-center hover-elevate" data-testid={`card-contact-${item.label.toLowerCase()}`}>
              <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-1">{item.label}</h3>
              <p className="text-sm text-muted-foreground">{item.value}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold">Abangani NS Group</span>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Abangani NS Group. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <PricingSection />
      <AboutSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
