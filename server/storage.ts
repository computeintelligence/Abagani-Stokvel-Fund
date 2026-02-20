import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import {
  members, children, payments, suppliers,
  type Member, type InsertMember, type Child, type InsertChild,
  type Payment, type InsertPayment, type Supplier, type InsertSupplier,
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
  updatePaymentStatus(id: string, status: string, reference?: string, method?: string): Promise<void>;

  getStats(): Promise<{
    totalMembers: number;
    active: number;
    pending: number;
    totalRevenue: number;
    tierBreakdown: Record<string, number>;
  }>;

  getMembersWithDetails(): Promise<(Member & { children: Child[]; payments: Payment[] })[]>;

  createSupplier(data: InsertSupplier): Promise<Supplier>;
  getSupplierById(id: string): Promise<Supplier | undefined>;
  getSupplierByPhone(phone: string): Promise<Supplier | undefined>;
  updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier>;
  getAllSuppliers(): Promise<Supplier[]>;
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

  async updatePaymentStatus(id: string, status: string, reference?: string, method?: string): Promise<void> {
    const updateData: any = { status };
    if (status === "paid" || status === "verified") {
      updateData.paidAt = new Date();
      updateData.verifiedAt = status === "verified" ? new Date() : undefined;
    }
    if (reference) updateData.reference = reference;
    if (method) updateData.paymentMethod = method;
    await db.update(payments).set(updateData).where(eq(payments.id, id));
  }

  async getStats() {
    const allMembers = await this.getAllMembers();
    const allPayments = await this.getAllPayments();

    const active = allMembers.filter((m) => m.status === "active").length;
    const pending = allMembers.filter((m) => m.status === "pending").length;
    const totalRevenue = allPayments
      .filter((p) => p.status === "paid" || p.status === "verified")
      .reduce((sum, p) => sum + p.amount, 0);

    const tierBreakdown: Record<string, number> = {};
    for (const m of allMembers) {
      const planName = m.plan;
      tierBreakdown[planName] = (tierBreakdown[planName] || 0) + 1;
    }

    return {
      totalMembers: allMembers.length,
      active,
      pending,
      totalRevenue,
      tierBreakdown,
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
}

export const storage = new DatabaseStorage();
