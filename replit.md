# Abangani Stokvel Fund - Stokvel Subscription Platform

## Overview
A SaaS stokvel subscription platform where parents pay monthly contributions towards school uniforms and stationery for their children. Includes a supplier portal for businesses to register and supply goods, and an affiliate program for referral commissions. Built with React + Express + PostgreSQL.

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
- `/admin` - Admin panel (access code: ABANGANI26) with member/supplier/affiliate management, payment approvals, arrears reminders
- `/supplier/signup` - Supplier registration wizard (4 steps: Personal → Business → Products → Agreement)
- `/supplier/login` - Supplier login page
- `/supplier/dashboard` - Supplier dashboard with profile view/edit, status tracking
- `/affiliate/signup` - Affiliate registration wizard (3 steps: Personal → Banking → Agreement)
- `/affiliate/login` - Affiliate login page
- `/affiliate/dashboard` - Affiliate dashboard with link, stats (clicks, conversions, earnings), progress bar

## Two-Phase Registration Flow
1. **Signup** (`/signup`): User creates account with Name, Surname, Email, Phone, Password → auto-login → redirect to Welcome page
2. **Welcome** (`/welcome`): Shows tracking number, explains stokvel benefits, encourages registration
3. **Plan Selection** (`/register`): 5-step wizard - Plan → Children → Address → Summary → Agreement → plan activated → redirect to Dashboard

## Pricing Tiers (per-child pricing)
- Primary School: R195/child/month (R45 admin/23%, R150 uniform/stationery)
- High School: R295/child/month (R45 admin/15%, R250 uniform/stationery)
- Cashback: From R500/month (12% admin fee, flexible amount via getCashbackFees())

## Database Tables
- `members` - Parent/guardian accounts with plan info, email, surname, tracking numbers (plan fields nullable for two-phase registration), referredByAffiliate
- `children` - Children linked to members with school/grade/gender info
- `payments` - Monthly payment records (12 per member per year)
- `suppliers` - Supplier business accounts with goods supplied, status (pending/approved/rejected)
- `affiliates` - Affiliate accounts with tracking number, affiliate code, banking details, click/conversion stats (no ID number field)
- `affiliate_clicks` - Records of clicks on affiliate links
- `affiliate_conversions` - Conversion records when referred members make first payment

## Supplier System
- Separate auth context (SupplierAuthProvider) with session-based auth (supplierId in session)
- 4-step registration wizard: Personal Details → Business Details → Products → Agreement
- Supplier dashboard with view/edit profile, status indicator (pending/approved/rejected)
- Admin can view all suppliers and approve/reject via admin API routes
- Products selection from predefined list + custom products

## Affiliate System
- Separate auth context (AffiliateAuthProvider) with session-based auth (affiliateId in session)
- 3-step registration wizard: Personal Details → Banking Details (optional) → Agreement
- Affiliate dashboard with unique link, click/conversion stats, earnings progress bar
- Commission: R5 per paid referral, withdraw after 1,000 paid referrals (R5,000 max earnings)
- Conversion flow: Click affiliate link → signup with ?ref=CODE → register → first payment verified → commission credited
- Withdrawal: Auto-generated invoice sent to admin (abanganinsgroup@gmail.com) + confirmation to affiliate when they click Withdraw at 1,000+ referrals
- Tracking numbers: AFF-YYYY-XXXXXX format
- Admin can view all affiliates and approve/reject/delete via admin panel

## Email Automation (server/email-service.ts)
- **Welcome email**: Sent on signup with AI-generated content via Together AI
- **Registration confirmation**: Sent on plan selection with tracking number
- **Payment verified**: Sent when admin verifies a payment
- **Payment reminder**: Sent by admin for members with unpaid months
- **Supplier registration**: Sent on supplier signup with tracking number
- **Affiliate registration**: Sent on affiliate signup with tracking number
- **Supplier/Affiliate approval**: Sent when admin approves supplier or affiliate
- **Withdrawal invoice**: Auto-generated when affiliate requests withdrawal at 1,000+ referrals, sent to admin + affiliate
- **Contact form**: Routes messages to abanganinsgroup@gmail.com (form on /contact page)
- All emails use professional HTML templates with Abangani branding
- All email links use custom domain: https://abanganistokvelfund.co.za

## Shared Components
- `components/navbar.tsx` - Navigation bar with auth-aware links, custom SVG stokvel logo
- `components/footer.tsx` - Shared footer with quick links, plans, contact info, "Powered by Abangani NS Group"

## Security
- Session-based auth with SESSION_SECRET from env (secure cookies in production)
- Separate member, supplier, and affiliate session auth (memberId / supplierId / affiliateId)
- requireAuth middleware on all member routes
- requireOwnMember middleware on routes with `:id` param (verifies session member matches)
- Child update/delete routes verify child belongs to session member (IDOR protection)
- Admin routes require `x-admin-code: ABANGANI26` header
- Server-side plan validation prevents price tampering during registration
- Signup auto-logs in user and redirects to welcome page
- Admin can delete members, suppliers, and affiliates

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
- DELETE `/api/admin/suppliers/:id` - Delete supplier
- GET `/api/admin/affiliates` - All affiliates
- PATCH `/api/admin/affiliates/:id/status` - Approve/reject affiliate
- DELETE `/api/admin/affiliates/:id` - Delete affiliate

### Supplier
- POST `/api/supplier/signup` - Create supplier account
- POST `/api/supplier/login` - Supplier login
- GET `/api/supplier/me` - Current supplier
- POST `/api/supplier/logout` - Supplier logout
- PATCH `/api/supplier/profile` - Update supplier profile

### Affiliate
- POST `/api/affiliate/signup` - Create affiliate account
- POST `/api/affiliate/login` - Affiliate login
- GET `/api/affiliate/me` - Current affiliate
- POST `/api/affiliate/logout` - Affiliate logout
- GET `/api/affiliate/stats` - Dashboard statistics (clicks, conversions, earnings, link)
- GET `/api/affiliate/track/:code` - Record affiliate link click
- POST `/api/affiliate/withdraw` - Request commission withdrawal (requires 1000+ referrals)

### Contact
- POST `/api/contact` - Send contact form message to abanganinsgroup@gmail.com
