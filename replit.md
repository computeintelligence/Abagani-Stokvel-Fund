# Abangani Stokvel Fund - Stokvel Subscription Platform

## Overview
A SaaS stokvel subscription platform where parents pay monthly contributions towards school uniforms and stationery for their children. Includes a supplier portal for businesses to register and supply goods. Built with React + Express + PostgreSQL.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn UI + Framer Motion (port 5000)
- **Backend**: Express.js with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: Wouter (frontend), Express (backend)
- **Email**: Gmail API via Replit connector + Together AI for AI-generated email content
- **Color Scheme**: Dark forest green (152 56% 28% light, 152 50% 34% dark)

## Key Pages
- `/` - Landing page with hero, pricing (3 plans with per-child pricing), how it works, CTA
- `/about` - About page explaining what a stokvel is, how it works, community benefits
- `/contact` - Contact page with phone, email, location, business hours, payment methods
- `/signup` - Account creation (Name, Surname, Email, Phone, Password) → redirects to /welcome
- `/signin` - Login with phone + password (auto-redirects to dashboard if already logged in)
- `/welcome` - Post-signup welcome screen encouraging plan registration
- `/register` - Plan selection wizard (authenticated, no-plan users only) - 5 steps: Plan → Children → Address → Summary → Agreement
- `/dashboard` - User dashboard with payment progress, monthly payments, children management, export
- `/profile` - View and edit member profile (name, surname, phone, address)
- `/admin` - Admin panel (access code: ABANGANI26) with view-only member details, payment approvals, arrears reminders
- `/supplier/signup` - Supplier registration wizard (4 steps: Personal → Business → Products → Agreement)
- `/supplier/login` - Supplier login page
- `/supplier/dashboard` - Supplier dashboard with profile view/edit, status tracking

## Two-Phase Registration Flow
1. **Signup** (`/signup`): User creates account with Name, Surname, Email, Phone, Password → auto-login → redirect to Welcome page
2. **Welcome** (`/welcome`): Shows tracking number, explains stokvel benefits, encourages registration
3. **Plan Selection** (`/register`): 5-step wizard - Plan → Children → Address → Summary → Agreement → plan activated → redirect to Dashboard

## Pricing Tiers (per-child pricing)
- Primary School: R195/child/month (R45 admin/23%, R150 uniform/stationery)
- High School: R295/child/month (R45 admin/15%, R250 uniform/stationery)
- Cashback: From R500/month (12% admin fee, flexible amount via getCashbackFees())

## Database Tables
- `members` - Parent/guardian accounts with plan info, email, surname, tracking numbers (plan fields nullable for two-phase registration)
- `children` - Children linked to members with school/grade info
- `payments` - Monthly payment records (12 per member per year)
- `suppliers` - Supplier business accounts with goods supplied, status (pending/approved/rejected)

## Supplier System
- Separate auth context (SupplierAuthProvider) with session-based auth (supplierId in session)
- 4-step registration wizard: Personal Details → Business Details → Products → Agreement
- Supplier dashboard with view/edit profile, status indicator (pending/approved/rejected)
- Admin can view all suppliers and approve/reject via admin API routes
- Products selection from predefined list + custom products

## Email Automation (server/email-service.ts)
- **Welcome email**: Sent on signup with AI-generated content via Together AI
- **Registration confirmation**: Sent on plan selection with tracking number
- **Payment verified**: Sent when admin verifies a payment
- **Payment reminder**: Sent by admin for members with unpaid months
- All emails use professional HTML templates with Abangani branding

## Shared Components
- `components/navbar.tsx` - Navigation bar with auth-aware links, custom SVG stokvel logo
- `components/footer.tsx` - Shared footer with quick links, plans, contact info, "Powered by Abangani NS Group"

## Security
- Session-based auth with SESSION_SECRET from env (secure cookies in production)
- Separate member and supplier session auth (memberId / supplierId)
- requireAuth middleware on all member routes
- requireOwnMember middleware on routes with `:id` param (verifies session member matches)
- Child update/delete routes verify child belongs to session member (IDOR protection)
- Admin routes require `x-admin-code: ABANGANI26` header
- Server-side plan validation prevents price tampering during registration
- Signup auto-logs in user and redirects to welcome page
- Admin panel is view-only (no member editing from admin)

## API Routes
### Member Auth
- POST `/api/signup` - Account creation with email (auto-login, sends welcome email)
- POST `/api/register` - Plan selection with address (sends registration email)
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Current user
- POST `/api/auth/logout` - Logout

### Member Data
- PATCH `/api/members/:id/profile` - Update profile (name, surname, phone, address)
- GET/POST `/api/members/:id/children` - Children CRUD (ownership enforced)
- PATCH/DELETE `/api/children/:id` - Child update/delete (ownership enforced)
- GET `/api/members/:id/payments` - Payment records
- POST `/api/members/:id/payments/submit` - Submit payment
- GET `/api/members/:id/export` - Export payments (CSV/PDF)

### Admin
- GET `/api/admin/stats` - Admin statistics
- GET `/api/admin/members` - All members with details
- DELETE `/api/admin/members/:id` - Delete member
- POST `/api/admin/payments/:id/verify` - Verify payment (sends email)
- POST `/api/admin/payments/:id/reject` - Reject payment
- POST `/api/admin/members/:id/send-reminder` - Send payment reminder email
- GET `/api/admin/export` - Export members data (CSV/PDF)
- GET `/api/admin/suppliers` - All suppliers
- PATCH `/api/admin/suppliers/:id/status` - Approve/reject supplier

### Supplier
- POST `/api/supplier/signup` - Create supplier account
- POST `/api/supplier/login` - Supplier login
- GET `/api/supplier/me` - Current supplier
- POST `/api/supplier/logout` - Supplier logout
- PATCH `/api/supplier/profile` - Update supplier profile
