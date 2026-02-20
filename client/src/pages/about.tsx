import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Users, CheckCircle, GraduationCap, Shield, Heart,
  ArrowRight, Wallet, ShoppingBag, BookOpen, Handshake, PiggyBank, Calendar
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
              What is a Stokvel?
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              A stokvel is a traditional South African savings club where a group of people pool their money together for a common goal. Rooted in Ubuntu - the belief that "I am because we are" - stokvels have been helping communities thrive for generations.
            </p>
          </div>

          <Card className="p-6 md:p-8 mb-16 bg-primary/5 border-primary/20">
            <div className="max-w-3xl mx-auto text-center">
              <Handshake className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4" data-testid="text-about-stokvel">About Abangani Stokvel Fund</h2>
              <p className="text-muted-foreground mb-4">
                Abangani Stokvel Fund is a modern stokvel specifically designed for parents who want to prepare for their children's school needs. Instead of scrambling to buy uniforms and stationery at the start of each year, our members contribute small monthly amounts throughout the year.
              </p>
              <p className="text-muted-foreground">
                By pooling resources together, we leverage bulk purchasing power to negotiate better prices with suppliers, meaning your contributions go further. At the beginning of the new school year, your children receive brand-new school uniforms and complete stationery packs - or you can choose our cashback option.
              </p>
            </div>
          </Card>

          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-howitworks-title">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Getting started is simple - follow these steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            {[
              {
                icon: Users,
                step: "1",
                title: "Sign Up",
                desc: "Create a free account and provide your basic details. You'll receive a unique tracking number to monitor your savings.",
              },
              {
                icon: Calendar,
                step: "2",
                title: "Choose a Plan",
                desc: "Select a subscription plan that fits your budget - Primary School, High School, or Cashback. Add your children's details.",
              },
              {
                icon: PiggyBank,
                step: "3",
                title: "Save Monthly",
                desc: "Contribute your monthly amount via bank transfer, online payment, or at Boxer, Pep, or Shoprite. Track every payment on your dashboard.",
              },
              {
                icon: GraduationCap,
                step: "4",
                title: "Receive Benefits",
                desc: "At the beginning of the new school year, your children receive full school uniforms and stationery, or you withdraw your cashback savings.",
              },
            ].map((item) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className="p-6 hover-elevate h-full" data-testid={`card-step-${item.step}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl font-bold text-primary">{item.step}</span>
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-why-title">
              Why Parents Trust Us
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built on the proven South African stokvel tradition
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {[
              { icon: Shield, title: "Secure & Transparent", desc: "Track every payment in real-time on your personal dashboard" },
              { icon: Heart, title: "Community Driven", desc: "Parents saving together for their children's future" },
              { icon: ShoppingBag, title: "Bulk Purchasing", desc: "Lower prices through group buying power with trusted suppliers" },
              { icon: BookOpen, title: "Quality Guaranteed", desc: "Durable uniforms and complete stationery packs for every child" },
            ].map((item) => (
              <Card key={item.title} className="p-6 text-center hover-elevate" data-testid={`card-trust-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>

          <Card className="p-6 md:p-8 mb-16">
            <h2 className="text-2xl font-bold mb-4 text-center">What Makes a Stokvel Special?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                { title: "Collective Savings Power", desc: "When parents save together, even small monthly contributions add up to significant purchasing power. This is the heart of the stokvel model." },
                { title: "Accountability & Discipline", desc: "Being part of a group encourages consistent saving habits. Your monthly contribution helps keep you on track for the school year." },
                { title: "Better Prices for Everyone", desc: "By buying in bulk from approved suppliers, we negotiate discounts that individual families wouldn't get on their own." },
                { title: "Peace of Mind", desc: "No more January panic. When the new school year starts, everything your child needs is already taken care of." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="text-center bg-primary/5 rounded-md p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Give Your Children the Best Start?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join our growing community of parents. Sign up today and start saving for uniforms and stationery.
            </p>
            <Button size="lg" asChild data-testid="button-about-signup">
              <Link href="/signup">
                Join Abangani Stokvel Fund <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
