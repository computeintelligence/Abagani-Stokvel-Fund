import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Shield, ArrowRight, CheckCircle, GraduationCap, BookOpen, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const benefits = [
  {
    icon: GraduationCap,
    title: "Brand New Uniforms",
    description: "Quality school uniforms for your children"
  },
  {
    icon: BookOpen,
    title: "Complete Stationery",
    description: "All necessary school supplies included"
  },
  {
    icon: Sparkles,
    title: "Community Savings",
    description: "Save together with other parents in our network"
  }
];

export default function Welcome() {
  const { member, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center flex-1 py-20">
          <div className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!member) {
    return <Redirect to="/signup" />;
  }

  if (member.plan) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl w-full"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2" data-testid="text-welcome-title">
              Welcome to Abangani NS Group!
            </h1>
            <p className="text-xl text-primary font-semibold mb-4">
              Hello, {member.fullName}!
            </p>
          </div>

          {/* Description */}
          <Card className="p-6 mb-8 bg-card/50">
            <p className="text-muted-foreground mb-4">
              Abangani NS Group is a trusted stokvel platform where parents come together to save monthly for their children's school uniforms and stationery.
            </p>
            <p className="text-sm text-muted-foreground">
              By joining our community, you're taking a proactive step to ensure your children have everything they need for a successful school year.
            </p>
          </Card>

          {/* Benefits */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Why Choose Abangani?</h2>
            <div className="space-y-3">
              {benefits.map((benefit, index) => {
                const BenefitIcon = benefit.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-accent/10"
                  >
                    <BenefitIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{benefit.title}</p>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Tracking Number Card */}
          <Card className="p-6 mb-8 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Your Tracking Number</p>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <Badge 
              variant="secondary" 
              className="text-base px-3 py-1"
              data-testid="badge-welcome-tracking"
            >
              {member.trackingNumber}
            </Badge>
            <p className="text-xs text-muted-foreground mt-3">
              Use this number to track your account and payments
            </p>
          </Card>

          {/* Account Creation Message */}
          <Card className="p-4 mb-8 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Your account has been created successfully. The next step is to choose a subscription plan that works best for your family.
            </p>
          </Card>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full h-11" 
              asChild
              data-testid="button-continue-register"
            >
              <Link href="/register" className="flex items-center justify-center gap-2">
                Continue to Registration
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              asChild
            >
              <Link href="/dashboard" data-testid="link-go-dashboard">
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
