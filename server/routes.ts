import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { registrationSchema, PLANS, MONTHS } from "@shared/schema";
import crypto from "crypto";

type PlanKey = keyof typeof PLANS;

function generateTrackingNumber(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ABG-${year}-${code.slice(0, 4)}-${code.slice(4)}`;
}

function hashPassword(password: string): string {
  const salt = "abangani-ns-2026";
  return crypto.createHash("sha256").update(salt + password).digest("hex");
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const memberId = (req.session as any)?.memberId;
  if (!memberId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  (req as any).memberId = memberId;
  next();
}

function requireOwnMember(req: Request, res: Response, next: NextFunction) {
  const sessionMemberId = (req.session as any)?.memberId;
  if (!sessionMemberId || sessionMemberId !== req.params.id) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  next();
}

const ADMIN_CODE = "ABANGANI26";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminCode = req.headers["x-admin-code"] as string;
  if (adminCode !== ADMIN_CODE) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  app.post("/api/register", async (req, res) => {
    try {
      const data = registrationSchema.parse(req.body);

      const planKey = data.plan as PlanKey;
      const serverPlan = PLANS[planKey];
      if (!serverPlan) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      const existing = await storage.getMemberByPhone(data.phone);
      if (existing) {
        return res.status(400).json({ message: "Phone number already registered" });
      }

      const trackingNumber = generateTrackingNumber();
      const now = new Date();
      const joinMonth = now.getMonth() + 1;
      const joinYear = now.getFullYear();

      const member = await storage.createMember({
        trackingNumber,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address || null,
        plan: serverPlan.name,
        planAmount: serverPlan.amount,
        adminFee: serverPlan.adminFee,
        joinMonth,
        joinYear,
        password: hashPassword(data.password),
      });

      for (const childData of data.children) {
        await storage.createChild({
          memberId: member.id,
          fullName: childData.fullName,
          school: childData.school,
          grade: childData.grade,
          uniformSize: childData.uniformSize || null,
          shoeSize: childData.shoeSize || null,
        });
      }

      for (let month = 1; month <= 12; month++) {
        await storage.createPayment({
          memberId: member.id,
          month,
          year: joinYear,
          amount: serverPlan.amount,
          status: "unpaid",
          paymentMethod: null,
          reference: null,
        });
      }

      (req.session as any).memberId = member.id;
      res.json(member);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      const member = await storage.getMemberByPhone(phone);
      if (!member || member.password !== hashPassword(password)) {
        return res.status(401).json({ message: "Invalid phone number or password" });
      }
      (req.session as any).memberId = member.id;
      res.json(member);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const memberId = (req.session as any)?.memberId;
    if (!memberId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const member = await storage.getMemberById(memberId);
    if (!member) {
      return res.status(401).json({ message: "Member not found" });
    }
    res.json(member);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    res.json({ ok: true });
  });

  app.get("/api/members/:id/children", requireAuth, requireOwnMember, async (req, res) => {
    const children = await storage.getChildrenByMember(req.params.id);
    res.json(children);
  });

  app.get("/api/members/:id/payments", requireAuth, requireOwnMember, async (req, res) => {
    const payments = await storage.getPaymentsByMember(req.params.id);
    res.json(payments);
  });

  app.post("/api/members/:id/children", requireAuth, requireOwnMember, async (req, res) => {
    try {
      const child = await storage.createChild({
        memberId: req.params.id,
        fullName: req.body.fullName,
        school: req.body.school,
        grade: req.body.grade,
        uniformSize: req.body.uniformSize || null,
        shoeSize: req.body.shoeSize || null,
      });
      res.json(child);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/children/:id", requireAuth, async (req, res) => {
    try {
      const memberId = (req.session as any).memberId;
      const memberChildren = await storage.getChildrenByMember(memberId);
      const child = memberChildren.find((c) => String(c.id) === req.params.id);
      if (!child) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await storage.updateChild(req.params.id, req.body);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/children/:id", requireAuth, async (req, res) => {
    try {
      const memberId = (req.session as any).memberId;
      const memberChildren = await storage.getChildrenByMember(memberId);
      const child = memberChildren.find((c) => String(c.id) === req.params.id);
      if (!child) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await storage.deleteChild(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/members/:id/payments/submit", requireAuth, requireOwnMember, async (req, res) => {
    try {
      const { month, year, paymentMethod, reference } = req.body;
      const payments = await storage.getPaymentsByMember(req.params.id);
      const payment = payments.find((p) => p.month === month && p.year === year);
      if (!payment) {
        return res.status(404).json({ message: "Payment record not found" });
      }
      await storage.updatePaymentStatus(payment.id, "pending", reference, paymentMethod);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/members/:id/export", requireAuth, requireOwnMember, async (req, res) => {
    try {
      const format = req.query.format as string || "csv";
      const member = await storage.getMemberById(req.params.id);
      if (!member) return res.status(404).json({ message: "Member not found" });

      const payments = await storage.getPaymentsByMember(req.params.id);
      const sorted = [...payments].sort((a, b) => a.month - b.month);

      if (format === "csv") {
        let csv = "Month,Year,Amount,Status,Payment Method,Reference\n";
        for (const p of sorted) {
          csv += `${MONTHS[p.month - 1]},${p.year},R${p.amount},${p.status},${p.paymentMethod || ""},${p.reference || ""}\n`;
        }
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${member.trackingNumber}-payments.csv"`);
        res.send(csv);
      } else {
        let html = `<html><head><title>Payment Report - ${member.fullName}</title>
          <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
          th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#16a34a;color:white}
          h1{color:#16a34a}.header{margin-bottom:20px}</style></head><body>
          <div class="header"><h1>Abangani NS Group</h1><h2>Payment Report</h2>
          <p><strong>Member:</strong> ${member.fullName}</p>
          <p><strong>Tracking:</strong> ${member.trackingNumber}</p>
          <p><strong>Plan:</strong> ${member.plan} - R${member.planAmount}/month</p></div>
          <table><thead><tr><th>Month</th><th>Year</th><th>Amount</th><th>Status</th><th>Method</th><th>Reference</th></tr></thead><tbody>`;
        for (const p of sorted) {
          html += `<tr><td>${MONTHS[p.month - 1]}</td><td>${p.year}</td><td>R${p.amount}</td><td>${p.status}</td><td>${p.paymentMethod || "-"}</td><td>${p.reference || "-"}</td></tr>`;
        }
        html += `</tbody></table></body></html>`;
        res.setHeader("Content-Type", "text/html");
        res.setHeader("Content-Disposition", `attachment; filename="${member.trackingNumber}-payments.html"`);
        res.send(html);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/members", requireAdmin, async (_req, res) => {
    try {
      const members = await storage.getMembersWithDetails();
      res.json(members);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/members/:id/approve", requireAdmin, async (req, res) => {
    try {
      await storage.updateMemberStatus(req.params.id, "active");
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/admin/members/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteMember(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/payments/:id/verify", requireAdmin, async (req, res) => {
    try {
      await storage.updatePaymentStatus(req.params.id, "verified");
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/payments/:id/reject", requireAdmin, async (req, res) => {
    try {
      await storage.updatePaymentStatus(req.params.id, "unpaid");
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/admin/export", requireAdmin, async (req, res) => {
    try {
      const members = await storage.getMembersWithDetails();
      let csv = "Tracking,Name,Phone,Plan,Amount,Status,Children,Paid Months,Unpaid Months\n";
      for (const m of members) {
        const paid = m.payments.filter((p) => p.status === "paid" || p.status === "verified").length;
        const unpaid = m.payments.filter((p) => p.status === "unpaid").length;
        const childNames = m.children.map((c) => `${c.fullName}(${c.grade})`).join("; ");
        csv += `${m.trackingNumber},"${m.fullName}",${m.phone},${m.plan},R${m.planAmount},${m.status},"${childNames}",${paid},${unpaid}\n`;
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=abangani-members.csv");
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
