import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import {
  members, children, payments, suppliers, affiliates, affiliateClicks, affiliateConversions,
  type Member, type InsertMember, type Child, type InsertChild,
  type Payment, type InsertPayment, type Supplier, type InsertSupplier,
  type Affiliate, type InsertAffiliate, type AffiliateClick, type AffiliateConversion,
} from "@shared/schema";

export interface IStorage {
  createMember(data: InsertMember & { trackingNumber: string }): Promise<Member>;
  getMemberById(id: string): Promise<Member | undefined>;
  getMemberByPhone(phone: string): Promise<Member | undefined>;
  getAllMembers(): Promise<Member[]>;
  updateMemberStatus(id: string, status: string): Promise<void>;
  updateMember(id: string, data: Partial<Member>): Promise<Member>;
  deleteMember(id: string): Promise<void>;

  createChild(data: InsertChild): Promise<Child>;
  getChildrenByMember(memberId: string): Promise<Child[]>;
  updateChild(id: string, data: Partial<Child>): Promise<void>;
  deleteChild(id: string): Promise<void>;

  createPayment(data: InsertPayment): Promise<Payment>;
  getPaymentsByMember(memberId: string): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  updatePaymentStatus(id: string, status: string, reference?: string, method?: string, proofOfPayment?: string): Promise<void>;

  getStats(): Promise<{
    totalMembers: number;
    active: number;
    pending: number;
    totalRevenue: number;
    tierBreakdown: Record<string, number>;
    totalSuppliers: number;
    totalAffiliates: number;
  }>;

  getMembersWithDetails(): Promise<(Member & { children: Child[]; payments: Payment[] })[]>;

  createSupplier(data: InsertSupplier): Promise<Supplier>;
  getSupplierById(id: string): Promise<Supplier | undefined>;
  getSupplierByPhone(phone: string): Promise<Supplier | undefined>;
  updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier>;
  getAllSuppliers(): Promise<Supplier[]>;
  deleteSupplier(id: string): Promise<void>;

  createAffiliate(data: InsertAffiliate & { trackingNumber: string; affiliateCode: string }): Promise<Affiliate>;
  getAffiliateById(id: string): Promise<Affiliate | undefined>;
  getAffiliateByPhone(phone: string): Promise<Affiliate | undefined>;
  getAffiliateByCode(code: string): Promise<Affiliate | undefined>;
  updateAffiliate(id: string, data: Partial<Affiliate>): Promise<Affiliate>;
  getAllAffiliates(): Promise<Affiliate[]>;
  deleteAffiliate(id: string): Promise<void>;

  recordAffiliateClick(affiliateId: string, ipAddress?: string, userAgent?: string): Promise<void>;
  getAffiliateClicks(affiliateId: string): Promise<AffiliateClick[]>;
  createAffiliateConversion(affiliateId: string, memberId: string, commissionAmount: number): Promise<AffiliateConversion>;
  getAffiliateConversions(affiliateId: string): Promise<AffiliateConversion[]>;
  updateConversionStatus(id: string, status: string): Promise<void>;
  getMembersByAffiliateCode(affiliateCode: string): Promise<Member[]>;
}

export class DatabaseStorage implements IStorage {
  async createMember(data: InsertMember & { trackingNumber: string }): Promise<Member> {
    const [member] = await db.insert(members).values(data).returning();
    return member;
  }

  async getMemberById(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async getMemberByPhone(phone: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.phone, phone));
    return member;
  }

  async getAllMembers(): Promise<Member[]> {
    return db.select().from(members);
  }

  async updateMemberStatus(id: string, status: string): Promise<void> {
    await db.update(members).set({ status }).where(eq(members.id, id));
  }

  async updateMember(id: string, data: Partial<Member>): Promise<Member> {
    const { id: _, createdAt, ...updateData } = data as any;
    const [updated] = await db.update(members).set(updateData).where(eq(members.id, id)).returning();
    return updated;
  }

  async deleteMember(id: string): Promise<void> {
    await db.delete(payments).where(eq(payments.memberId, id));
    await db.delete(children).where(eq(children.memberId, id));
    await db.delete(members).where(eq(members.id, id));
  }

  async createChild(data: InsertChild): Promise<Child> {
    const [child] = await db.insert(children).values(data).returning();
    return child;
  }

  async getChildrenByMember(memberId: string): Promise<Child[]> {
    return db.select().from(children).where(eq(children.memberId, memberId));
  }

  async updateChild(id: string, data: Partial<Child>): Promise<void> {
    const { id: _, memberId, ...updateData } = data as any;
    await db.update(children).set(updateData).where(eq(children.id, id));
  }

  async deleteChild(id: string): Promise<void> {
    await db.delete(children).where(eq(children.id, id));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  async getPaymentsByMember(memberId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.memberId, memberId));
  }

  async getAllPayments(): Promise<Payment[]> {
    return db.select().from(payments);
  }

  async updatePaymentStatus(id: string, status: string, reference?: string, method?: string, proofOfPayment?: string): Promise<void> {
    const updateData: any = { status };
    if (status === "paid" || status === "verified") {
      updateData.paidAt = new Date();
      updateData.verifiedAt = status === "verified" ? new Date() : undefined;
    }
    if (reference) updateData.reference = reference;
    if (method) updateData.paymentMethod = method;
    if (proofOfPayment) updateData.proofOfPayment = proofOfPayment;
    await db.update(payments).set(updateData).where(eq(payments.id, id));
  }

  async getStats() {
    const allMembers = await this.getAllMembers();
    const allPayments = await this.getAllPayments();
    const allSuppliers = await this.getAllSuppliers();
    const allAffiliates = await this.getAllAffiliates();

    const active = allMembers.filter((m) => m.status === "active").length;
    const pending = allMembers.filter((m) => m.status === "pending").length;
    const totalRevenue = allPayments
      .filter((p) => p.status === "paid" || p.status === "verified")
      .reduce((sum, p) => sum + p.amount, 0);

    const tierBreakdown: Record<string, number> = {};
    for (const m of allMembers) {
      const planName = m.plan || "No plan";
      tierBreakdown[planName] = (tierBreakdown[planName] || 0) + 1;
    }

    return {
      totalMembers: allMembers.length,
      active,
      pending,
      totalRevenue,
      tierBreakdown,
      totalSuppliers: allSuppliers.length,
      totalAffiliates: allAffiliates.length,
    };
  }

  async getMembersWithDetails(): Promise<(Member & { children: Child[]; payments: Payment[] })[]> {
    const allMembers = await this.getAllMembers();
    const result = [];
    for (const member of allMembers) {
      const memberChildren = await this.getChildrenByMember(member.id);
      const memberPayments = await this.getPaymentsByMember(member.id);
      result.push({ ...member, children: memberChildren, payments: memberPayments });
    }
    return result;
  }

  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(data).returning();
    return supplier;
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async getSupplierByPhone(phone: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.phone, phone));
    return supplier;
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const { id: _, createdAt, ...updateData } = data as any;
    const [updated] = await db.update(suppliers).set(updateData).where(eq(suppliers.id, id)).returning();
    return updated;
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers);
  }

  async deleteSupplier(id: string): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  async createAffiliate(data: InsertAffiliate & { trackingNumber: string; affiliateCode: string }): Promise<Affiliate> {
    const [affiliate] = await db.insert(affiliates).values(data).returning();
    return affiliate;
  }

  async getAffiliateById(id: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
    return affiliate;
  }

  async getAffiliateByPhone(phone: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.phone, phone));
    return affiliate;
  }

  async getAffiliateByCode(code: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.affiliateCode, code));
    return affiliate;
  }

  async updateAffiliate(id: string, data: Partial<Affiliate>): Promise<Affiliate> {
    const { id: _, createdAt, ...updateData } = data as any;
    const [updated] = await db.update(affiliates).set(updateData).where(eq(affiliates.id, id)).returning();
    return updated;
  }

  async getAllAffiliates(): Promise<Affiliate[]> {
    return db.select().from(affiliates);
  }

  async deleteAffiliate(id: string): Promise<void> {
    await db.delete(affiliateConversions).where(eq(affiliateConversions.affiliateId, id));
    await db.delete(affiliateClicks).where(eq(affiliateClicks.affiliateId, id));
    await db.delete(affiliates).where(eq(affiliates.id, id));
  }

  async recordAffiliateClick(affiliateId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await db.insert(affiliateClicks).values({ affiliateId, ipAddress, userAgent });
    await db.update(affiliates).set({
      totalClicks: sql`${affiliates.totalClicks} + 1`,
    }).where(eq(affiliates.id, affiliateId));
  }

  async getAffiliateClicks(affiliateId: string): Promise<AffiliateClick[]> {
    return db.select().from(affiliateClicks).where(eq(affiliateClicks.affiliateId, affiliateId));
  }

  async createAffiliateConversion(affiliateId: string, memberId: string, commissionAmount: number): Promise<AffiliateConversion> {
    const [conversion] = await db.insert(affiliateConversions).values({
      affiliateId,
      memberId,
      commissionAmount,
      status: "earned",
    }).returning();
    await db.update(affiliates).set({
      totalConversions: sql`${affiliates.totalConversions} + 1`,
      commissionEarned: sql`${affiliates.commissionEarned} + ${commissionAmount}`,
    }).where(eq(affiliates.id, affiliateId));
    return conversion;
  }

  async getAffiliateConversions(affiliateId: string): Promise<AffiliateConversion[]> {
    return db.select().from(affiliateConversions).where(eq(affiliateConversions.affiliateId, affiliateId));
  }

  async updateConversionStatus(id: string, status: string): Promise<void> {
    await db.update(affiliateConversions).set({ status }).where(eq(affiliateConversions.id, id));
  }

  async getMembersByAffiliateCode(affiliateCode: string): Promise<Member[]> {
    return db.select().from(members).where(eq(members.referredByAffiliate, affiliateCode));
  }
}

export const storage = new DatabaseStorage();
