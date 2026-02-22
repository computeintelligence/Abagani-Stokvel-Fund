import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Phone, Mail, MapPin, Clock, Send, Loader2 } from "lucide-react";

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });

  const contactMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/contact", formData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message Sent", description: "Thank you for reaching out. We'll get back to you soon." });
      setFormData({ name: "", email: "", subject: "", message: "" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Send", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({ title: "Missing Fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    contactMutation.mutate();
  };

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
              the channels below or send us a message.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
            {[
              { icon: Phone, label: "Phone", value: "067 608 3942", href: "tel:0676083942" },
              { icon: Mail, label: "Email", value: "abanganinsgroup@gmail.com", href: "mailto:abanganinsgroup@gmail.com" },
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

          <Card className="p-6 md:p-8 mb-8">
            <h2 className="text-xl font-bold mb-6" data-testid="text-contact-form-title">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Full Name</Label>
                  <Input
                    id="contact-name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email Address</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-contact-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <Input
                  id="contact-subject"
                  placeholder="What is your enquiry about?"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  data-testid="input-contact-subject"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  placeholder="Type your message here..."
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  data-testid="input-contact-message"
                />
              </div>
              <Button
                type="submit"
                className="w-full sm:w-auto gap-2"
                disabled={contactMutation.isPending}
                data-testid="button-contact-submit"
              >
                {contactMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {contactMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </Card>

          <Card className="p-6 md:p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Payment Methods</h2>
            <p className="text-muted-foreground mb-4">
              We accept payments via bank transfer, online payment, or at Boxer, Pep, or Shoprite.
            </p>
            <p className="text-sm text-muted-foreground">
              For payment assistance, call us at <strong>067 608 3942</strong>
            </p>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
