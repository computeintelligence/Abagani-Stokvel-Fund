import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { signupSchema, registrationSchema, PLANS, MONTHS, getCashbackFees, supplierSignupSchema, supplierLoginSchema, affiliateSignupSchema, affiliateLoginSchema, AFFILIATE_COMMISSION_PER_CONVERSION, AFFILIATE_MAX_CONVERSIONS } from "@shared/schema";
import type { Member, Supplier, Affiliate } from "@shared/schema";
import crypto from "crypto";
import { sendWelcomeEmail, sendRegistrationEmail, sendPaymentSuccessEmail, sendPaymentReminderEmail, sendSupplierRegistrationEmail, sendSupplierApprovalEmail, sendAffiliateRegistrationEmail, sendAffiliateApprovalEmail, sendContactFormEmail, sendWithdrawalInvoiceEmail, sendPasswordResetEmail } from "./email-service";

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

const resetCodes = new Map<string, { code: string; expiresAt: number }>();

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeResetCode(key: string, code: string) {
  resetCodes.set(key, { code, expiresAt: Date.now() + 15 * 60 * 1000 });
}

function validateResetCode(key: string, code: string): boolean {
  const entry = resetCodes.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    resetCodes.delete(key);
    return false;
  }
  if (entry.code !== code) return false;
  resetCodes.delete(key);
  return true;
}

function paramToString(p: string | string[] | undefined): string {
  if (!p) return "";
  return Array.isArray(p) ? p[0] : p;
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
  if (!sessionMemberId || sessionMemberId !== paramToString(req.params.id)) {
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

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [".jpg", ".jpeg", ".png", ".pdf", ".webp"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPG, PNG, WebP and PDF files are allowed"));
      }
    },
  });

  app.get("/api/uploads/:filename", (req: Request, res: Response) => {
    const memberId = (req.session as any)?.memberId;
    const adminCode = req.headers["x-admin-code"];
    if (!memberId && adminCode !== ADMIN_CODE) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const filename = path.basename(paramToString(req.params.filename));
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found" });
    res.sendFile(filePath);
  });

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
        nextOfKinName: data.nextOfKinName || null,
        nextOfKinPhone: data.nextOfKinPhone || null,
        nextOfKinRelationship: data.nextOfKinRelationship || null,
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

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { phone, email } = req.body;
      if (!phone || !email) {
        return res.status(400).json({ message: "Phone number and email are required" });
      }
      const member = await storage.getMemberByPhone(phone);
      if (member && member.email.toLowerCase() === email.toLowerCase()) {
        const code = generateResetCode();
        storeResetCode(`member:${phone}`, code);
        sendPasswordResetEmail(member.fullName, member.email, code).catch(console.error);
      }
      res.json({ message: "If an account exists with that phone and email, a reset code has been sent" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { phone, code, newPassword } = req.body;
      if (!phone || !code || !newPassword) {
        return res.status(400).json({ message: "Phone, code, and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      if (!validateResetCode(`member:${phone}`, code)) {
        return res.status(400).json({ message: "Invalid or expired reset code" });
      }
      const member = await storage.getMemberByPhone(phone);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      await storage.updateMember(member.id, { password: hashPassword(newPassword) });
      res.json({ message: "Password reset successfully" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/members/:id/profile", requireAuth, requireOwnMember, async (req, res) => {
    try {
      const { fullName, surname, phone, address, nextOfKinName, nextOfKinPhone, nextOfKinRelationship } = req.body;
      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;
      if (surname) updateData.surname = surname;
      if (phone) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (nextOfKinName !== undefined) updateData.nextOfKinName = nextOfKinName;
      if (nextOfKinPhone !== undefined) updateData.nextOfKinPhone = nextOfKinPhone;
      if (nextOfKinRelationship !== undefined) updateData.nextOfKinRelationship = nextOfKinRelationship;
      const updated = await storage.updateMember(paramToString(req.params.id), updateData);
      res.json(stripPassword(updated));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/members/:id/children", requireAuth, requireOwnMember, async (req, res) => {
    const children = await storage.getChildrenByMember(paramToString(req.params.id));
    res.json(children);
  });

  app.get("/api/members/:id/payments", requireAuth, requireOwnMember, async (req, res) => {
    const payments = await storage.getPaymentsByMember(paramToString(req.params.id));
    res.json(payments);
  });

  app.post("/api/members/:id/children", requireAuth, requireOwnMember, async (req, res) => {
    try {
      const child = await storage.createChild({
        memberId: paramToString(req.params.id),
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
      const child = memberChildren.find((c) => String(c.id) === paramToString(req.params.id));
      if (!child) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await storage.updateChild(paramToString(req.params.id), req.body);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/children/:id", requireAuth, async (req, res) => {
    try {
      const memberId = (req.session as any).memberId;
      const memberChildren = await storage.getChildrenByMember(memberId);
      const child = memberChildren.find((c) => String(c.id) === paramToString(req.params.id));
      if (!child) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await storage.deleteChild(paramToString(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/members/:id/payments/submit", requireAuth, requireOwnMember, upload.single("proofOfPayment"), async (req, res) => {
    try {
      const { month, year, paymentMethod, reference } = req.body;
      const allowedMethods = ["eft", "bank", "boxer"];
      if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
        return res.status(400).json({ message: "Invalid payment method. Choose EFT, Bank, or Boxer." });
      }
      if (!reference || typeof reference !== "string" || reference.trim().length === 0) {
        return res.status(400).json({ message: "Payment reference is required." });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Proof of payment file is required." });
      }
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: "Invalid month or year." });
      }
      const memberPayments = await storage.getPaymentsByMember(paramToString(req.params.id));
      const payment = memberPayments.find((p) => p.month === monthNum && p.year === yearNum);
      if (!payment) {
        return res.status(404).json({ message: "Payment record not found" });
      }
      const proofPath = `/api/uploads/${req.file.filename}`;
      await storage.updatePaymentStatus(payment.id, "pending", reference.trim(), paymentMethod, proofPath);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/members/:id/export", requireAuth, requireOwnMember, async (req, res) => {
    try {
      const format = req.query.format as string || "csv";
      const member = await storage.getMemberById(paramToString(req.params.id));
      if (!member) return res.status(404).json({ message: "Member not found" });

      const payments = await storage.getPaymentsByMember(paramToString(req.params.id));
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

  app.get("/api/public/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json({ activeMembers: stats.active });
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

  app.patch("/api/admin/members/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !["active", "suspended"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'active' or 'suspended'" });
      }
      await storage.updateMemberStatus(paramToString(req.params.id), status);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/members/:id/approve", requireAdmin, async (req, res) => {
    try {
      await storage.updateMemberStatus(paramToString(req.params.id), "active");
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/admin/members/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteMember(paramToString(req.params.id));
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
      const updated = await storage.updateMember(paramToString(req.params.id), updateData);
      res.json(stripPassword(updated));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/payments/:id/verify", requireAdmin, async (req, res) => {
    try {
      const allPayments = await storage.getAllPayments();
      const payment = allPayments.find(p => p.id === paramToString(req.params.id));
      await storage.updatePaymentStatus(paramToString(req.params.id), "verified");
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
      await storage.updatePaymentStatus(paramToString(req.params.id), "unpaid");
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/members/:id/send-reminder", requireAdmin, async (req, res) => {
    try {
      const member = await storage.getMemberById(paramToString(req.params.id));
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

  app.post("/api/supplier/forgot-password", async (req: Request, res: Response) => {
    try {
      const { phone, email } = req.body;
      if (!phone || !email) {
        return res.status(400).json({ message: "Phone number and email are required" });
      }
      const supplier = await storage.getSupplierByPhone(phone);
      if (supplier && supplier.email.toLowerCase() === email.toLowerCase()) {
        const code = generateResetCode();
        storeResetCode(`supplier:${phone}`, code);
        sendPasswordResetEmail(supplier.fullName, supplier.email, code).catch(console.error);
      }
      res.json({ message: "If an account exists with that phone and email, a reset code has been sent" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/supplier/reset-password", async (req: Request, res: Response) => {
    try {
      const { phone, code, newPassword } = req.body;
      if (!phone || !code || !newPassword) {
        return res.status(400).json({ message: "Phone, code, and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      if (!validateResetCode(`supplier:${phone}`, code)) {
        return res.status(400).json({ message: "Invalid or expired reset code" });
      }
      const supplier = await storage.getSupplierByPhone(phone);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      await storage.updateSupplier(supplier.id, { password: hashPassword(newPassword) });
      res.json({ message: "Password reset successfully" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/supplier/profile", async (req: Request, res: Response) => {
    const supplierId = (req.session as any)?.supplierId;
    if (!supplierId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const allowed = ["businessName", "businessType", "registrationNumber", "address", "goodsSupplied", "fullName", "surname", "phone", "email", "nextOfKinName", "nextOfKinPhone", "nextOfKinRelationship"];
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

  app.patch("/api/affiliate/profile", async (req: Request, res: Response) => {
    const affiliateId = (req.session as any)?.affiliateId;
    if (!affiliateId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const allowed = ["fullName", "surname", "phone", "email", "address", "bankName", "accountNumber", "nextOfKinName", "nextOfKinPhone", "nextOfKinRelationship"];
      const updates: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const updated = await storage.updateAffiliate(affiliateId, updates);
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ── Affiliate Routes ──────────────────────────────────────────────
  const BASE_URL = 'https://abanganistokvelfund.co.za';

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

  app.post("/api/affiliate/forgot-password", async (req: Request, res: Response) => {
    try {
      const { phone, email } = req.body;
      if (!phone || !email) {
        return res.status(400).json({ message: "Phone number and email are required" });
      }
      const affiliate = await storage.getAffiliateByPhone(phone);
      if (affiliate && affiliate.email.toLowerCase() === email.toLowerCase()) {
        const code = generateResetCode();
        storeResetCode(`affiliate:${phone}`, code);
        sendPasswordResetEmail(affiliate.fullName, affiliate.email, code).catch(console.error);
      }
      res.json({ message: "If an account exists with that phone and email, a reset code has been sent" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/affiliate/reset-password", async (req: Request, res: Response) => {
    try {
      const { phone, code, newPassword } = req.body;
      if (!phone || !code || !newPassword) {
        return res.status(400).json({ message: "Phone, code, and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      if (!validateResetCode(`affiliate:${phone}`, code)) {
        return res.status(400).json({ message: "Invalid or expired reset code" });
      }
      const affiliate = await storage.getAffiliateByPhone(phone);
      if (!affiliate) {
        return res.status(404).json({ message: "Affiliate not found" });
      }
      await storage.updateAffiliate(affiliate.id, { password: hashPassword(newPassword) });
      res.json({ message: "Password reset successfully" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/affiliate/stats", async (req: Request, res: Response) => {
    const affiliateId = (req.session as any)?.affiliateId;
    if (!affiliateId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const affiliate = await storage.getAffiliateById(affiliateId);
      if (!affiliate) return res.status(404).json({ message: "Not found" });
      const conversions = await storage.getAffiliateConversions(affiliateId);
      const clicks = await storage.getAffiliateClicks(affiliateId);
      const referredMembers = await storage.getMembersByAffiliateCode(affiliate.affiliateCode);
      const affiliateLink = `${BASE_URL}/signup?ref=${affiliate.affiliateCode}`;

      const memberMap = new Map(referredMembers.map(m => [m.id, m]));
      const enrichedConversions = conversions.map(c => {
        const member = memberMap.get(c.memberId);
        return {
          ...c,
          memberName: member ? `${member.fullName} ${member.surname}` : "Unknown",
          memberPlan: member?.plan || null,
        };
      });

      const referredList = referredMembers.map(m => ({
        id: m.id,
        fullName: m.fullName,
        surname: m.surname,
        plan: m.plan,
        createdAt: m.createdAt,
      }));

      res.json({
        totalClicks: affiliate.totalClicks,
        totalConversions: affiliate.totalConversions,
        commissionEarned: affiliate.commissionEarned,
        maxConversions: AFFILIATE_MAX_CONVERSIONS,
        commissionPerConversion: AFFILIATE_COMMISSION_PER_CONVERSION,
        canWithdraw: affiliate.totalConversions >= AFFILIATE_MAX_CONVERSIONS,
        affiliateLink,
        conversions: enrichedConversions,
        referredMembers: referredList,
        recentClicks: clicks.slice(-20).reverse(),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/affiliate/track/:code", async (req: Request, res: Response) => {
    try {
      const affiliate = await storage.getAffiliateByCode(paramToString(req.params.code));
      if (!affiliate) return res.status(404).json({ message: "Invalid affiliate link" });
      const ip = req.ip || req.headers["x-forwarded-for"] as string || "";
      const ua = req.headers["user-agent"] || "";
      await storage.recordAffiliateClick(affiliate.id, ip, ua);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/affiliate/withdraw", async (req: Request, res: Response) => {
    const affiliateId = (req.session as any)?.affiliateId;
    if (!affiliateId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const affiliate = await storage.getAffiliateById(affiliateId);
      if (!affiliate) return res.status(404).json({ message: "Not found" });
      if (affiliate.totalConversions < AFFILIATE_MAX_CONVERSIONS) {
        return res.status(400).json({ message: `You need at least ${AFFILIATE_MAX_CONVERSIONS} paid referrals to withdraw. You currently have ${affiliate.totalConversions}.` });
      }
      sendWithdrawalInvoiceEmail(
        affiliate.fullName,
        affiliate.email,
        affiliate.phone,
        affiliate.trackingNumber,
        affiliate.bankName,
        affiliate.accountNumber,
        affiliate.totalConversions,
        affiliate.commissionEarned
      ).catch(console.error);
      res.json({ message: "Withdrawal invoice has been sent. You will be notified when the payment is processed." });
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
      const updated = await storage.updateSupplier(paramToString(req.params.id), { status });
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
      await storage.deleteSupplier(paramToString(req.params.id));
      res.json({ message: "Supplier deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/affiliates", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const allAffiliates = await storage.getAllAffiliates();
      const affiliatesWithReferrals = await Promise.all(
        allAffiliates.map(async ({ password, ...a }) => {
          const referred = await storage.getMembersByAffiliateCode(a.affiliateCode);
          return {
            ...a,
            referredMembers: referred.map(m => ({
              id: m.id,
              fullName: m.fullName,
              surname: m.surname,
              plan: m.plan,
              status: m.status,
              trackingNumber: m.trackingNumber,
              createdAt: m.createdAt,
            })),
          };
        })
      );
      res.json(affiliatesWithReferrals);
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
      const updated = await storage.updateAffiliate(paramToString(req.params.id), { status });
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
      await storage.deleteAffiliate(paramToString(req.params.id));
      res.json({ message: "Affiliate deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/members/:id/edit", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fullName, surname, email, phone, address, plan, planAmount, nextOfKinName, nextOfKinPhone, nextOfKinRelationship } = req.body;
      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (surname !== undefined) updateData.surname = surname;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (plan !== undefined) updateData.plan = plan;
      if (planAmount !== undefined) updateData.planAmount = planAmount;
      if (nextOfKinName !== undefined) updateData.nextOfKinName = nextOfKinName;
      if (nextOfKinPhone !== undefined) updateData.nextOfKinPhone = nextOfKinPhone;
      if (nextOfKinRelationship !== undefined) updateData.nextOfKinRelationship = nextOfKinRelationship;
      const updated = await storage.updateMember(paramToString(req.params.id), updateData);
      res.json(stripPassword(updated));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/admin/suppliers/:id/edit", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fullName, surname, email, phone, businessName, businessType, registrationNumber, address, goodsSupplied, nextOfKinName, nextOfKinPhone, nextOfKinRelationship } = req.body;
      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (surname !== undefined) updateData.surname = surname;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (businessName !== undefined) updateData.businessName = businessName;
      if (businessType !== undefined) updateData.businessType = businessType;
      if (registrationNumber !== undefined) updateData.registrationNumber = registrationNumber;
      if (address !== undefined) updateData.address = address;
      if (goodsSupplied !== undefined) updateData.goodsSupplied = goodsSupplied;
      if (nextOfKinName !== undefined) updateData.nextOfKinName = nextOfKinName;
      if (nextOfKinPhone !== undefined) updateData.nextOfKinPhone = nextOfKinPhone;
      if (nextOfKinRelationship !== undefined) updateData.nextOfKinRelationship = nextOfKinRelationship;
      const updated = await storage.updateSupplier(paramToString(req.params.id), updateData);
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/admin/affiliates/:id/edit", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fullName, surname, email, phone, address, bankName, accountNumber, nextOfKinName, nextOfKinPhone, nextOfKinRelationship } = req.body;
      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (surname !== undefined) updateData.surname = surname;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (bankName !== undefined) updateData.bankName = bankName;
      if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
      if (nextOfKinName !== undefined) updateData.nextOfKinName = nextOfKinName;
      if (nextOfKinPhone !== undefined) updateData.nextOfKinPhone = nextOfKinPhone;
      if (nextOfKinRelationship !== undefined) updateData.nextOfKinRelationship = nextOfKinRelationship;
      const updated = await storage.updateAffiliate(paramToString(req.params.id), updateData);
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/members", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fullName, surname, email, phone, password, plan, address, nextOfKinName, nextOfKinPhone, nextOfKinRelationship } = req.body;
      if (!fullName || !surname || !phone || !password) {
        return res.status(400).json({ message: "Full name, surname, phone, and password are required" });
      }
      const existing = await storage.getMemberByPhone(phone);
      if (existing) {
        return res.status(400).json({ message: "Phone number already registered" });
      }
      const trackingNumber = generateTrackingNumber();
      const planInfo = plan ? Object.values(PLANS).find(p => p.name === plan) : null;
      const member = await storage.createMember({
        trackingNumber,
        fullName,
        surname,
        email: email || "",
        phone,
        password: hashPassword(password),
        plan: plan || null,
        planAmount: planInfo ? planInfo.amount : null,
        adminFee: planInfo ? planInfo.adminFee : null,
        joinMonth: plan ? new Date().getMonth() + 1 : null,
        joinYear: plan ? new Date().getFullYear() : null,
        address: address || null,
        referredByAffiliate: null,
        nextOfKinName: nextOfKinName || null,
        nextOfKinPhone: nextOfKinPhone || null,
        nextOfKinRelationship: nextOfKinRelationship || null,
      });
      await storage.updateMemberStatus(member.id, "active");
      const updated = await storage.getMemberById(member.id);
      res.json(stripPassword(updated!));
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/suppliers", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fullName, surname, email, phone, password, businessName, businessType, registrationNumber, address, goodsSupplied, nextOfKinName, nextOfKinPhone, nextOfKinRelationship } = req.body;
      if (!fullName || !surname || !email || !phone || !password || !businessName || !businessType || !address) {
        return res.status(400).json({ message: "Required fields missing" });
      }
      const existing = await storage.getSupplierByPhone(phone);
      if (existing) {
        return res.status(400).json({ message: "Phone number already registered" });
      }
      const trackingNumber = generateSupplierTrackingNumber();
      const supplier = await storage.createSupplier({
        trackingNumber,
        fullName,
        surname,
        email,
        phone,
        password: hashPassword(password),
        businessName,
        businessType,
        registrationNumber: registrationNumber || null,
        address,
        goodsSupplied: goodsSupplied || [],
        agreedToTerms: true,
        nextOfKinName: nextOfKinName || null,
        nextOfKinPhone: nextOfKinPhone || null,
        nextOfKinRelationship: nextOfKinRelationship || null,
      });
      const updated = await storage.updateSupplier(supplier.id, { status: "approved" });
      const { password: _, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/affiliates", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fullName, surname, email, phone, password, address, bankName, accountNumber, nextOfKinName, nextOfKinPhone, nextOfKinRelationship } = req.body;
      if (!fullName || !surname || !email || !phone || !password) {
        return res.status(400).json({ message: "Required fields missing" });
      }
      const existing = await storage.getAffiliateByPhone(phone);
      if (existing) {
        return res.status(400).json({ message: "Phone number already registered" });
      }
      const trackingNumber = generateAffiliateTrackingNumber();
      const affiliateCode = generateAffiliateCode();
      const affiliate = await storage.createAffiliate({
        trackingNumber,
        affiliateCode,
        fullName,
        surname,
        email,
        phone,
        password: hashPassword(password),
        address: address || null,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        agreedToTerms: true,
        nextOfKinName: nextOfKinName || null,
        nextOfKinPhone: nextOfKinPhone || null,
        nextOfKinRelationship: nextOfKinRelationship || null,
      });
      const updated = await storage.updateAffiliate(affiliate.id, { status: "approved" });
      const { password: _, ...safe } = updated;
      res.json(safe);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  return httpServer;
}
