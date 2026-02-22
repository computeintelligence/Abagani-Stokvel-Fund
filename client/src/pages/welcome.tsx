import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowRight, CheckCircle, GraduationCap, BookOpen, Sparkles, Shield, Package, Link2 } from "lucide-react";
import { StokvelLogo } from "@/components/navbar";
import { motion } from "framer-motion";

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
            <StokvelLogo className="h-16 w-16" />
            <h1 className="text-3xl font-bold mb-2" data-testid="text-welcome-title">
              Welcome to Abangani Stokvel Fund!
            </h1>
            <p className="text-xl text-primary font-semibold mb-4">
              Hello, {member.fullName}!
            </p>
          </div>

          {/* Account Creation Message */}
          <Card className="p-4 mb-8 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Your account has been created successfully. Choose how you'd like to get started with Abangani Stokvel Fund.
              </p>
            </div>
          </Card>

          {/* Tracking Number Card */}
          <Card className="p-4 mb-8 bg-primary/5 border-primary/20">
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

          {/* Three Registration Options */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">How would you like to join?</h2>
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Link href="/register">
                  <Card className="p-5 cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:shadow-md hover-elevate" data-testid="card-option-member">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg">Member</h3>
                        <p className="text-sm text-muted-foreground">
                          Save monthly for your children's school uniforms and stationery
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Card>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Link href="/supplier/signup">
                  <Card className="p-5 cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:shadow-md hover-elevate" data-testid="card-option-supplier">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg">Supplier</h3>
                        <p className="text-sm text-muted-foreground">
                          Register your business to supply school uniforms and stationery
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Card>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Link href="/affiliate/signup">
                  <Card className="p-5 cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:shadow-md hover-elevate" data-testid="card-option-affiliate">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Link2 className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg">Affiliate</h3>
                        <p className="text-sm text-muted-foreground">
                          Earn R5 commission for every person you refer who joins
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Dashboard Link */}
          <Button 
            variant="ghost" 
            className="w-full"
            asChild
          >
            <Link href="/dashboard" data-testid="link-go-dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
