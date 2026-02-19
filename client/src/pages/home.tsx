import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { PLANS } from "@shared/schema";
import {
  Shield, GraduationCap, BookOpen, Gift, ArrowRight,
  Users, CheckCircle, Heart, Star, TrendingUp, Wallet
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
            Join Abangani NS Group and save from just R195/month. Your children receive brand-new school uniforms
            and complete stationery packs at the beginning of every school year.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild data-testid="button-hero-signup">
              <Link href="/signup">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-hero-plans">
              <a href="#pricing">View Plans</a>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" /> No hidden fees</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" /> Join any time</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary" /> Trusted by parents</span>
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

function HowItWorksSection() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-howitworks-title">
            Three simple steps to secure your children's school needs
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              title: "Create Your Account",
              desc: "Sign up for free and choose a subscription plan that suits your family's budget. Add your children's details.",
            },
            {
              icon: CheckCircle,
              title: "Contribute Monthly",
              desc: "Make your monthly contributions via bank transfer, online payment, or at Boxer, Pep, or Shoprite.",
            },
            {
              icon: GraduationCap,
              title: "Receive Benefits",
              desc: "At the start of each school year, your children receive brand-new uniforms and a complete stationery pack.",
            },
          ].map((step) => (
            <Card key={step.title} className="p-6 hover-elevate" data-testid={`card-step-${step.title.toLowerCase().replace(/\s/g, "-")}`}>
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

function PricingSection() {
  const primary = PLANS.primary;
  const highschool = PLANS.highschool;
  const cb500 = PLANS.cashback500;
  const cb1000 = PLANS.cashback1000;

  return (
    <section id="pricing" className="py-20 bg-card/30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Affordable plans designed for every family
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="p-6 flex flex-col hover-elevate" data-testid="card-plan-primary">
            <GraduationCap className="h-8 w-8 text-primary mb-3" />
            <h3 className="text-lg font-bold">{primary.name}</h3>
            <div className="my-4">
              <span className="text-3xl font-bold text-primary">R{primary.amount}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{primary.description}</p>
            <p className="text-xs text-muted-foreground mb-4">Includes R{primary.adminFee} admin fee</p>
            <ul className="text-sm space-y-2 mb-6 flex-1">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Full school uniforms</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Complete stationery pack</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Payment tracking dashboard</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Flexible payment methods</li>
            </ul>
            <Button asChild className="w-full" data-testid="button-select-primary">
              <Link href="/signup">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </Card>

          <Card className="p-6 flex flex-col hover-elevate ring-2 ring-primary relative" data-testid="card-plan-highschool">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
            <BookOpen className="h-8 w-8 text-primary mb-3" />
            <h3 className="text-lg font-bold">{highschool.name}</h3>
            <div className="my-4">
              <span className="text-3xl font-bold text-primary">R{highschool.amount}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{highschool.description}</p>
            <p className="text-xs text-muted-foreground mb-4">Includes R{highschool.adminFee} admin fee</p>
            <ul className="text-sm space-y-2 mb-6 flex-1">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Full school uniforms</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Complete stationery pack</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Payment tracking dashboard</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Flexible payment methods</li>
            </ul>
            <Button asChild className="w-full" data-testid="button-select-highschool">
              <Link href="/signup">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </Card>

          <Card className="p-6 flex flex-col hover-elevate" data-testid="card-plan-cashback">
            <Wallet className="h-8 w-8 text-primary mb-3" />
            <h3 className="text-lg font-bold">Cashback</h3>
            <div className="my-4">
              <span className="text-3xl font-bold text-primary">R500</span>
              <span className="text-muted-foreground"> or </span>
              <span className="text-3xl font-bold text-primary">R1000</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Cashback plan - withdraw funds at the beginning of the year for school supplies
            </p>
            <div className="text-xs text-muted-foreground space-y-1 mb-4">
              <p>R500/month: R{cb500.adminFee} admin fee, R{cb500.contribution} withdrawable</p>
              <p>R1000/month: R{cb1000.adminFee} admin fee, R{cb1000.contribution} withdrawable</p>
            </div>
            <ul className="text-sm space-y-2 mb-6 flex-1">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Payment tracking dashboard</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Flexible payment methods</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /> Cashback at year start</li>
            </ul>
            <Button asChild className="w-full" data-testid="button-select-cashback">
              <Link href="/signup">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Ready to Give Your Children the Best Start?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
          Join our growing community of parents. Sign up today and start saving for uniforms and stationery.
        </p>
        <Button size="lg" asChild data-testid="button-cta-signup">
          <Link href="/signup">
            Join Abangani NS Group <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
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
      <HowItWorksSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
