import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Users, CheckCircle, GraduationCap, Shield, Heart,
  ArrowRight, Wallet, ShoppingBag, BookOpen
} from "lucide-react";
import { motion } from "framer-motion";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">About Us</Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-about-title">
              How It Works
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Abangani NS Group is a stokvel where parents contribute monthly to
              cover their children's school needs at the start of each year.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: Users,
                title: "1. Create Your Account",
                desc: "Sign up for free and choose a subscription plan that suits your family's budget. Add your children's details.",
              },
              {
                icon: CheckCircle,
                title: "2. Contribute Monthly",
                desc: "Make your monthly contributions via bank transfer, online payment, or at Boxer, Pep, or Shoprite. If you join mid-year, catch up on previous months at your own pace.",
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

          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-why-title">
              Why Parents Trust Us
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built on the proven South African stokvel tradition
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {[
              { icon: Shield, title: "Secure & Transparent", desc: "Track every payment in real-time" },
              { icon: Heart, title: "Community Driven", desc: "Parents saving together for their children" },
              { icon: ShoppingBag, title: "Bulk Purchasing", desc: "Lower prices through group buying power" },
              { icon: BookOpen, title: "Quality Guaranteed", desc: "Durable uniforms and complete stationery" },
            ].map((item) => (
              <Card key={item.title} className="p-6 text-center hover-elevate" data-testid={`card-trust-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>

          <div className="text-center bg-primary/5 rounded-md p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Give Your Children the Best Start?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join our growing community of parents. Sign up today and start saving for uniforms and stationery.
            </p>
            <Button size="lg" asChild data-testid="button-about-signup">
              <Link href="/signup">
                Join Abangani NS Group <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
