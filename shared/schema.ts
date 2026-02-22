import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackingNumber: text("tracking_number").notNull().unique(),
  fullName: text("full_name").notNull(),
  surname: text("surname").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull(),
  address: text("address"),
  plan: text("plan"),
  planAmount: integer("plan_amount"),
  adminFee: integer("admin_fee"),
  joinMonth: integer("join_month"),
  joinYear: integer("join_year"),
  password: text("password").notNull(),
  referredByAffiliate: varchar("referred_by_affiliate"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const children = pgTable("children", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  fullName: text("full_name").notNull(),
  school: text("school").notNull(),
  grade: text("grade").notNull(),
  uniformSize: text("uniform_size"),
  shoeSize: text("shoe_size"),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("unpaid"),
  paymentMethod: text("payment_method"),
  reference: text("reference"),
  paidAt: timestamp("paid_at"),
  verifiedAt: timestamp("verified_at"),
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  trackingNumber: true,
  createdAt: true,
  status: true,
});

export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  paidAt: true,
  verifiedAt: true,
});

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof children.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export const loginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  fullName: z.string().min(1),
  surname: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
});

export type SignupData = z.infer<typeof signupSchema>;

export const registrationSchema = z.object({
  plan: z.string(),
  planAmount: z.number(),
  adminFee: z.number(),
  address: z.string().optional(),
  children: z.array(z.object({
    fullName: z.string().min(1),
    school: z.string().min(1),
    grade: z.string().min(1),
    uniformSize: z.string().optional(),
    shoeSize: z.string().optional(),
  })).min(1),
  agreedToTerms: z.boolean(),
});

export type RegistrationData = z.infer<typeof registrationSchema>;

export const PLANS = {
  primary: {
    name: "Primary School",
    amount: 195,
    adminFee: 45,
    contribution: 150,
    description: "School uniforms and full stationery for primary school learners",
    perChild: true,
  },
  highschool: {
    name: "High School",
    amount: 295,
    adminFee: 45,
    contribution: 250,
    description: "School uniforms and full stationery for high school learners",
    perChild: true,
  },
  cashback: {
    name: "Cashback",
    amount: 500,
    adminFee: 60,
    contribution: 440,
    description: "Cashback plan - withdraw funds at the beginning of the year for school supplies",
    perChild: false,
  },
} as const;

export function getCashbackFees(amount: number) {
  const adminFeeRate = 0.12;
  const adminFee = Math.round(amount * adminFeeRate);
  return { adminFee, contribution: amount - adminFee };
}

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackingNumber: text("tracking_number").unique(),
  fullName: text("full_name").notNull(),
  surname: text("surname").notNull().default(""),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  password: text("password").notNull(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  registrationNumber: text("registration_number"),
  address: text("address").notNull(),
  goodsSupplied: text("goods_supplied").array().notNull(),
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export const supplierSignupSchema = z.object({
  fullName: z.string().min(1),
  surname: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  businessName: z.string().min(1),
  businessType: z.string().min(1),
  registrationNumber: z.string().optional(),
  address: z.string().min(1),
  goodsSupplied: z.array(z.string()).min(1),
  agreedToTerms: z.boolean(),
});

export type SupplierSignupData = z.infer<typeof supplierSignupSchema>;

export const supplierLoginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackingNumber: text("tracking_number").notNull().unique(),
  affiliateCode: text("affiliate_code").notNull().unique(),
  fullName: text("full_name").notNull(),
  surname: text("surname").notNull().default(""),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  password: text("password").notNull(),
  idNumber: text("id_number"),
  address: text("address"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
  status: text("status").notNull().default("pending"),
  totalClicks: integer("total_clicks").notNull().default(0),
  totalConversions: integer("total_conversions").notNull().default(0),
  commissionEarned: integer("commission_earned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const affiliateConversions = pgTable("affiliate_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull(),
  memberId: varchar("member_id").notNull(),
  status: text("status").notNull().default("pending"),
  commissionAmount: integer("commission_amount").notNull().default(0),
  convertedAt: timestamp("converted_at").defaultNow(),
});

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({
  id: true,
  trackingNumber: true,
  affiliateCode: true,
  createdAt: true,
  status: true,
  totalClicks: true,
  totalConversions: true,
  commissionEarned: true,
});

export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Affiliate = typeof affiliates.$inferSelect;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type AffiliateConversion = typeof affiliateConversions.$inferSelect;

export const affiliateSignupSchema = z.object({
  fullName: z.string().min(1),
  surname: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  idNumber: z.string().optional(),
  address: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  agreedToTerms: z.boolean(),
});

export type AffiliateSignupData = z.infer<typeof affiliateSignupSchema>;

export const affiliateLoginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

export const AFFILIATE_COMMISSION_PER_CONVERSION = 5;
export const AFFILIATE_MAX_CONVERSIONS = 1000;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

export const GRADES = [
  "Grade R", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7",
  "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"
] as const;
