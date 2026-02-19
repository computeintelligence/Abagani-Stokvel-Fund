import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Phone, Mail, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Contact</Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-contact-title">
              Get in Touch
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Have questions? We're here to help. Reach out to us through any of
              the channels below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
            {[
              { icon: Phone, label: "Phone", value: "078 772 2258", href: "tel:0787722258" },
              { icon: Mail, label: "Email", value: "info@abanganins.co.za", href: "mailto:info@abanganins.co.za" },
              { icon: MapPin, label: "Location", value: "South Africa", href: null },
              { icon: Clock, label: "Business Hours", value: "Mon - Fri, 8am - 5pm", href: null },
            ].map((item) => (
              <Card key={item.label} className="p-6 hover-elevate" data-testid={`card-contact-${item.label.toLowerCase()}`}>
                <div className="flex items-start gap-4">
                  <item.icon className="h-8 w-8 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">{item.label}</h3>
                    {item.href ? (
                      <a href={item.href} className="text-sm text-primary" data-testid={`link-contact-${item.label.toLowerCase()}`}>
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">{item.value}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-6 md:p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Payment Methods</h2>
            <p className="text-muted-foreground mb-4">
              We accept payments via bank transfer, online payment, or at Boxer, Pep, or Shoprite.
            </p>
            <p className="text-sm text-muted-foreground">
              For payment assistance, call us at <strong>078 772 2258</strong>
            </p>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
