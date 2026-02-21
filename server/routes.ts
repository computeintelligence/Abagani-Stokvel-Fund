import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { signupSchema, registrationSchema, PLANS, MONTHS, getCashbackFees, supplierSignupSchema, supplierLoginSchema, affiliateSignupSchema, affiliateLoginSchema, AFFILIATE_COMMISSION_PER_CONVERSION, AFFILIATE_MAX_CONVERSIONS } from "@shared/schema";
import type { Member, Supplier, Affiliate } from "@shared/schema";
import crypto from "crypto";
import { sendWelcomeEmail, sendRegistrationEmail, sendPaymentSuccessEmail, sendPaymentReminderEmail, sendSupplierRegistrationEmail, sendSupplierApprovalEmail, sendAffiliateRegistrationEmail, sendAffiliateApprovalEmail, sendContactFormEmail } from "./email-service";

type PlanKey = keyof typeof PLANS;

function stripPassword(member: Member): Omit<Member, "password"> {
  const { password, ...rest } = member;
  return rest;
}

function generateTrackingNumber(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ABG-${year}-${code.slice(0, 4)}-${code.slice(4)}`;
}

function generateSupplierTrackingNumber(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SUP-${year}-${code}`;
}

function generateAffiliateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateAffiliateTrackingNumber(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AFF-${year}-${code}`;
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
  app.set("trust proxy", 1);
  const PgStore = connectPgSimple(session);
  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        tableName: "session",
        createTableIfMissing: true,
      }),
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

  app.post("/api/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);

      const existing = await storage.getMemberByPhone(data.phone);
      if (existing) {
        return res.status(400).json({ message: "Phone number already registered" });
      }

      const trackingNumber = generateTrackingNumber();

      const affiliateRef = req.body.affiliateRef || null;
      const member = await storage.createMember({
        trackingNumber,
        fullName: data.fullName,
        surname: data.surname,
        email: data.email,
        phone: data.phone,
        plan: null,
        planAmount: null,
        adminFee: null,
        joinMonth: null,
        joinYear: null,
        address: null,
        referredByAffiliate: affiliateRef,
        password: hashPassword(data.password),
      });

      (req.session as any).memberId = member.id;
      res.json(stripPassword(member));

      sendWelcomeEmail(data.fullName, data.email).catch(console.error);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/register", requireAuth, async (req, res) => {
    try {
      const memberId = (req.session as any).memberId;
      const member = await storage.getMemberById(memberId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      if (member.plan) {
        return res.status(400).json({ message: "Already registered with a plan" });
      }

      const data = registrationSchema.parse(req.body);

      const planKey = data.plan as PlanKey;
      const serverPlan = PLANS[planKey];
      if (!serverPlan) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      let totalAmount: number;
      let adminFee: number;

      if (planKey === "cashback") {
        if (data.planAmount < 500) {
          return res.status(400).json({ message: "Cashback amount must be at least R500" });
        }
        totalAmount = data.planAmount;
        const fees = getCashbackFees(data.planAmount);
        adminFee = fees.adminFee;
      } else {
        const childCount = data.children.length;
        totalAmount = serverPlan.amount * childCount;
        adminFee = serverPlan.adminFee * childCount;
      }

      const now = new Date();
      const joinMonth = now.getMonth() + 1;
      const joinYear = now.getFullYear();

      if (data.address) {
        await storage.updateMember(memberId, { address: data.address });
      }

      const updated = await storage.updateMember(memberId, {
        plan: serverPlan.name,
        planAmount: totalAmount,
        adminFee: adminFee,
        joinMonth,
        joinYear,
        status: "active",
      });

      for (const childData of data.children) {
        await storage.createChild({
          memberId,
          fullName: childData.fullName,
          school: childData.school,
          grade: childData.grade,
          uniformSize: childData.uniformSize || null,
          shoeSize: childData.shoeSize || null,
        });
      }

      for (let month = 1; month <= 12; month++) {
        await storage.createPayment({
          memberId,
          month,
          year: joinYear,
          amount: totalAmount,
          status: "unpaid",
          paymentMethod: null,
          reference: null,
        });
      }

      res.json(stripPassword(updated));

      sendRegistrationEmail(member.fullName, member.email, member.trackingNumber, serverPlan.name, totalAmount).catch(console.error);
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
      res.json(stripPassword(member));
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
    res.json(stripPassword(member));
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    res.json({ ok: true });
  });

  app.patch("/api/members/:id/profile", requireAuth, requireOwnMember, async (req, res) => {
    try {
      const { fullName, surname, phone, address } = req.body;
      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;
      if (surname) updateData.surname = surname;
      if (phone) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      const updated = await storage.updateMember(req.params.id, updateData);
      res.json(stripPassword(updated));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
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
      res.json(members.map(m => {
        const { password, ...rest } = m;
        return rest;
      }));
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

  app.patch("/api/admin/members/:id", requireAdmin, async (req, res) => {
    try {
      const { fullName, surname, email, phone, address, plan, planAmount, adminFee, status } = req.body;
      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (surname !== undefined) updateData.surname = surname;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (plan !== undefined) updateData.plan = plan;
      if (planAmount !== undefined) updateData.planAmount = planAmount;
      if (adminFee !== undefined) updateData.adminFee = adminFee;
      if (status !== undefined) updateData.status = status;
      const updated = await storage.updateMember(req.params.id, updateData);
      res.json(stripPassword(updated));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/payments/:id/verify", requireAdmin, async (req, res) => {
    try {
      const allPayments = await storage.getAllPayments();
      const payment = allPayments.find(p => p.id === req.params.id);
      await storage.updatePaymentStatus(req.params.id, "verified");
      res.json({ ok: true });

      if (payment) {
        const member = await storage.getMemberById(payment.memberId);
        if (member?.email) {
          sendPaymentSuccessEmail(member.fullName, member.email, payment.amount, MONTHS[payment.month - 1], payment.year).catch(console.error);
        }

        if (member?.referredByAffiliate) {
          const memberPayments = await storage.getPaymentsByMember(member.id);
          const verifiedPayments = memberPayments.filter(p => p.status === "verified");
          if (verifiedPayments.length === 1) {
            const affiliate = await storage.getAffiliateByCode(member.referredByAffiliate);
            if (affiliate && affiliate.status === "approved" && affiliate.totalConversions < AFFILIATE_MAX_CONVERSIONS) {
              await storage.createAffiliateConversion(affiliate.id, member.id, AFFILIATE_COMMISSION_PER_CONVERSION);
            }
          }
        }
      }
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

  app.post("/api/admin/members/:id/send-reminder", requireAdmin, async (req, res) => {
    try {
      const member = await storage.getMemberById(req.params.id);
      if (!member) return res.status(404).json({ message: "Member not found" });
      if (!member.email) return res.status(400).json({ message: "Member has no email" });
      const payments = await storage.getPaymentsByMember(member.id);
      const unpaid = payments.filter(p => p.status === "unpaid");
      if (unpaid.length === 0) return res.status(400).json({ message: "No unpaid months" });
      const unpaidMonths = unpaid.map(p => MONTHS[p.month - 1]);
      await sendPaymentReminderEmail(member.fullName, member.email, member.planAmount || 0, unpaidMonths as string[]);
      res.json({ ok: true, message: `Reminder sent to ${member.email}` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/export", requireAdmin, async (req, res) => {
    try {
      const members = await storage.getMembersWithDetails();
      const format = (req.query.format as string) || "csv";

      const buildRows = () => {
        return members.map((m) => {
          const paid = m.payments.filter((p) => p.status === "paid" || p.status === "verified").length;
          const unpaid = m.payments.filter((p) => p.status === "unpaid").length;
          const childNames = m.children.map((c) => `${c.fullName} (${c.grade})`).join("; ");
          return {
            tracking: m.trackingNumber,
            name: m.fullName,
            surname: m.surname || "",
            phone: m.phone,
            email: m.email || "",
            plan: m.plan || "No plan",
            amount: m.planAmount ? `R${m.planAmount}` : "N/A",
            status: m.status,
            children: childNames || "None",
            paid: String(paid),
            unpaid: String(unpaid),
          };
        });
      };

      if (format === "pdf") {
        const PDFDocument = (await import("pdfkit")).default;
        const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => {
          const pdfData = Buffer.concat(buffers);
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "attachment; filename=abangani-members.pdf");
          res.send(pdfData);
        });

        doc.fontSize(16).font("Helvetica-Bold").text("Abangani NS Group - Members Report", { align: "center" });
        doc.fontSize(9).font("Helvetica").text(`Generated: ${new Date().toLocaleDateString("en-ZA")}`, { align: "center" });
        doc.moveDown(1);

        const rows = buildRows();
        const headers = ["Tracking", "Name", "Surname", "Phone", "Plan", "Amount", "Status", "Children", "Paid", "Unpaid"];
        const colWidths = [70, 75, 65, 80, 70, 55, 55, 130, 35, 40];
        const startX = 30;
        let y = doc.y;

        doc.fontSize(8).font("Helvetica-Bold");
        let x = startX;
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], x, y, { width: colWidths[i], lineBreak: false });
          x += colWidths[i];
        }
        y += 15;
        doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke();
        y += 5;

        doc.font("Helvetica").fontSize(7);
        for (const row of rows) {
          if (y > 550) {
            doc.addPage();
            y = 30;
            doc.fontSize(8).font("Helvetica-Bold");
            x = startX;
            for (let i = 0; i < headers.length; i++) {
              doc.text(headers[i], x, y, { width: colWidths[i], lineBreak: false });
              x += colWidths[i];
            }
            y += 15;
            doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke();
            y += 5;
            doc.font("Helvetica").fontSize(7);
          }

          const values = [row.tracking, row.name, row.surname, row.phone, row.plan, row.amount, row.status, row.children, row.paid, row.unpaid];
          x = startX;
          for (let i = 0; i < values.length; i++) {
            doc.text(values[i], x, y, { width: colWidths[i], lineBreak: false });
            x += colWidths[i];
          }
          y += 13;
        }

        doc.moveDown(2);
        doc.fontSize(8).font("Helvetica").text(`Total Members: ${rows.length}`, startX);

        doc.end();
      } else {
        const rows = buildRows();
        let csv = "Tracking,Name,Surname,Phone,Email,Plan,Amount,Status,Children,Paid Months,Unpaid Months\n";
        for (const r of rows) {
          csv += `${r.tracking},"${r.name}","${r.surname}",${r.phone},"${r.email}",${r.plan},${r.amount},${r.status},"${r.children}",${r.paid},${r.unpaid}\n`;
        }
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=abangani-members.csv");
        res.send(csv);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Supplier Routes ──────────────────────────────────────────────
  app.post("/api/supplier/signup", async (req: Request, res: Response) => {
    try {
      const data = supplierSignupSchema.parse(req.body);
      const existing = await storage.getSupplierByPhone(data.phone);
      if (existing) {
        return res.status(400).json({ message: "A supplier with this phone number already exists" });
      }
      if (!data.agreedToTerms) {
        return res.status(400).json({ message: "You must agree to the terms" });
      }
      const trackingNumber = generateSupplierTrackingNumber();
      const supplier = await storage.createSupplier({
        ...data,
        trackingNumber,
        password: hashPassword(data.password),
      });
      (req.session as any).supplierId = supplier.id;
      const { password, ...safe } = supplier;
      sendSupplierRegistrationEmail(data.fullName, data.email, data.businessName, trackingNumber).catch(console.error);
      res.status(201).json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/supplier/login", async (req: Request, res: Response) => {
    try {
      const data = supplierLoginSchema.parse(req.body);
      const supplier = await storage.getSupplierByPhone(data.phone);
      if (!supplier || supplier.password !== hashPassword(data.password)) {
        return res.status(401).json({ message: "Invalid phone or password" });
      }
      (req.session as any).supplierId = supplier.id;
      const { password, ...safe } = supplier;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/supplier/me", async (req: Request, res: Response) => {
    const supplierId = (req.session as any)?.supplierId;
    if (!supplierId) return res.status(401).json({ message: "Not authenticated" });
    const supplier = await storage.getSupplierById(supplierId);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    const { password, ...safe } = supplier;
    res.json(safe);
  });

  app.post("/api/supplier/logout", (req: Request, res: Response) => {
    delete (req.session as any).supplierId;
    res.json({ message: "Logged out" });
  });

  app.patch("/api/supplier/profile", async (req: Request, res: Response) => {
    const supplierId = (req.session as any)?.supplierId;
    if (!supplierId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const allowed = ["businessName", "businessType", "registrationNumber", "address", "goodsSupplied", "fullName", "surname", "phone", "email"];
      const updates: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const updated = await storage.updateSupplier(supplierId, updates);
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Affiliate Routes ──────────────────────────────────────────────
  const BASE_URL = process.env.REPLIT_DEPLOYMENT_URL
    ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
    : process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';

  app.post("/api/affiliate/signup", async (req: Request, res: Response) => {
    try {
      const data = affiliateSignupSchema.parse(req.body);
      const existing = await storage.getAffiliateByPhone(data.phone);
      if (existing) {
        return res.status(400).json({ message: "An affiliate with this phone number already exists" });
      }
      if (!data.agreedToTerms) {
        return res.status(400).json({ message: "You must agree to the terms" });
      }
      const trackingNumber = generateAffiliateTrackingNumber();
      const affiliateCode = generateAffiliateCode();
      const affiliate = await storage.createAffiliate({
        ...data,
        trackingNumber,
        affiliateCode,
        password: hashPassword(data.password),
      });
      (req.session as any).affiliateId = affiliate.id;
      const { password, ...safe } = affiliate;
      const affiliateLink = `${BASE_URL}/signup?ref=${affiliateCode}`;
      sendAffiliateRegistrationEmail(data.fullName, data.email, trackingNumber, affiliateCode, affiliateLink).catch(console.error);
      res.status(201).json({ ...safe, affiliateLink });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/affiliate/login", async (req: Request, res: Response) => {
    try {
      const data = affiliateLoginSchema.parse(req.body);
      const affiliate = await storage.getAffiliateByPhone(data.phone);
      if (!affiliate || affiliate.password !== hashPassword(data.password)) {
        return res.status(401).json({ message: "Invalid phone or password" });
      }
      (req.session as any).affiliateId = affiliate.id;
      const { password, ...safe } = affiliate;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/affiliate/me", async (req: Request, res: Response) => {
    const affiliateId = (req.session as any)?.affiliateId;
    if (!affiliateId) return res.status(401).json({ message: "Not authenticated" });
    const affiliate = await storage.getAffiliateById(affiliateId);
    if (!affiliate) return res.status(404).json({ message: "Affiliate not found" });
    const { password, ...safe } = affiliate;
    res.json(safe);
  });

  app.post("/api/affiliate/logout", (req: Request, res: Response) => {
    delete (req.session as any).affiliateId;
    res.json({ message: "Logged out" });
  });

  app.get("/api/affiliate/stats", async (req: Request, res: Response) => {
    const affiliateId = (req.session as any)?.affiliateId;
    if (!affiliateId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const affiliate = await storage.getAffiliateById(affiliateId);
      if (!affiliate) return res.status(404).json({ message: "Not found" });
      const conversions = await storage.getAffiliateConversions(affiliateId);
      const clicks = await storage.getAffiliateClicks(affiliateId);
      const affiliateLink = `${BASE_URL}/signup?ref=${affiliate.affiliateCode}`;
      res.json({
        totalClicks: affiliate.totalClicks,
        totalConversions: affiliate.totalConversions,
        commissionEarned: affiliate.commissionEarned,
        maxConversions: AFFILIATE_MAX_CONVERSIONS,
        commissionPerConversion: AFFILIATE_COMMISSION_PER_CONVERSION,
        affiliateLink,
        conversions: conversions.map(c => ({ ...c })),
        recentClicks: clicks.slice(-20).reverse(),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/affiliate/track/:code", async (req: Request, res: Response) => {
    try {
      const affiliate = await storage.getAffiliateByCode(req.params.code);
      if (!affiliate) return res.status(404).json({ message: "Invalid affiliate link" });
      const ip = req.ip || req.headers["x-forwarded-for"] as string || "";
      const ua = req.headers["user-agent"] || "";
      await storage.recordAffiliateClick(affiliate.id, ip, ua);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Contact Form Route ──────────────────────────────────────────────
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }
      sendContactFormEmail(name, email, subject, message).catch(console.error);
      res.json({ message: "Message sent successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Admin Supplier/Affiliate Routes ──────────────────────────────────
  app.get("/api/admin/suppliers", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const allSuppliers = await storage.getAllSuppliers();
      res.json(allSuppliers.map(({ password, ...s }) => s));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/suppliers/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const updated = await storage.updateSupplier(req.params.id, { status });
      const { password, ...safe } = updated;
      const approved = status === "approved";
      sendSupplierApprovalEmail(updated.fullName, updated.email, updated.businessName, approved).catch(console.error);
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/admin/suppliers/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteSupplier(req.params.id);
      res.json({ message: "Supplier deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/affiliates", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const allAffiliates = await storage.getAllAffiliates();
      res.json(allAffiliates.map(({ password, ...a }) => a));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/affiliates/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const updated = await storage.updateAffiliate(req.params.id, { status });
      const { password, ...safe } = updated;
      const approved = status === "approved";
      const affiliateLink = `${BASE_URL}/signup?ref=${updated.affiliateCode}`;
      sendAffiliateApprovalEmail(updated.fullName, updated.email, affiliateLink, approved).catch(console.error);
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/admin/affiliates/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteAffiliate(req.params.id);
      res.json({ message: "Affiliate deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
