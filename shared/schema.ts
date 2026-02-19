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
  },
  highschool: {
    name: "High School",
    amount: 295,
    adminFee: 45,
    contribution: 250,
    description: "School uniforms and full stationery for high school learners",
  },
  cashback500: {
    name: "Cashback R500",
    amount: 500,
    adminFee: 60,
    contribution: 440,
    description: "Cashback plan - withdraw funds at the beginning of the year for school supplies",
  },
  cashback1000: {
    name: "Cashback R1000",
    amount: 1000,
    adminFee: 105,
    contribution: 895,
    description: "Premium cashback plan - withdraw funds at the beginning of the year for school supplies",
  },
} as const;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

export const GRADES = [
  "Grade R", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7",
  "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"
] as const;
