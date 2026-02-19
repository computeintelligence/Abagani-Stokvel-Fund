# Abangani NS Group - Stokvel Subscription Platform

## Overview
A SaaS stokvel subscription platform where parents pay monthly contributions towards school uniforms and stationery for their children. Built with React + Express + PostgreSQL.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn UI + Framer Motion (port 5000)
- **Backend**: Express.js with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: Wouter (frontend), Express (backend)
- **Email**: Gmail API via Replit connector + Together AI for AI-generated email content
- **Color Scheme**: Dark forest green (152 56% 28% light, 152 50% 34% dark)

## Key Pages
- `/` - Landing page with hero, pricing (4 plans with admin fee %), how it works, CTA
- `/about` - About page with "How It Works" steps and "Why Parents Trust Us"
- `/contact` - Contact page with phone, email, location, business hours, payment methods
- `/signup` - Account creation (Name, Surname, Email, Phone, Password) → redirects to /welcome
- `/signin` - Login with phone + password (auto-redirects to dashboard if already logged in)
- `/welcome` - Post-signup welcome screen encouraging plan registration
- `/register` - Plan selection wizard (authenticated, no-plan users only) - 4 steps: Plan → Children → Summary → Agreement
- `/dashboard` - User dashboard with payment progress, monthly payments, children management, export
- `/profile` - View and edit member profile (name, surname, phone, address)
- `/admin` - Admin panel (access code: ABANGANI26) with member CRUD, payment approvals, arrears reminders

## Two-Phase Registration Flow
1. **Signup** (`/signup`): User creates account with Name, Surname, Email, Phone, Password → auto-login → redirect to Welcome page
2. **Welcome** (`/welcome`): Shows tracking number, explains stokvel benefits, encourages registration
3. **Plan Selection** (`/register`): Authenticated user with no plan selects a subscription, adds children, agrees to terms → plan activated → redirect to Dashboard

## Pricing Tiers (with admin fee %)
- Primary School: R195/month (R45 admin/23%, R150 uniform/stationery)
- High School: R295/month (R45 admin/15%, R250 uniform/stationery)
- Cashback R500: R500/month (R60 admin/12%, R440 withdrawable)
- Cashback R1000: R1000/month (R105 admin/11%, R895 withdrawable)

## Database Tables
- `members` - Parent/guardian accounts with plan info, email, surname, tracking numbers (plan fields nullable for two-phase registration)
- `children` - Children linked to members with school/grade info
- `payments` - Monthly payment records (12 per member per year)

## Email Automation (server/email-service.ts)
- **Welcome email**: Sent on signup with AI-generated content via Together AI
- **Registration confirmation**: Sent on plan selection with tracking number
- **Payment verified**: Sent when admin verifies a payment
- **Payment reminder**: Sent by admin for members with unpaid months
- All emails use professional HTML templates with Abangani branding

## Shared Components
- `components/navbar.tsx` - Navigation bar with auth-aware links
- `components/footer.tsx` - Shared footer with quick links, plans, contact info

## Security
- Session-based auth with SESSION_SECRET from env (secure cookies in production)
- requireAuth middleware on all member routes
- requireOwnMember middleware on routes with `:id` param (verifies session member matches)
- Child update/delete routes verify child belongs to session member (IDOR protection)
- Admin routes require `x-admin-code: ABANGANI26` header
- Server-side plan validation prevents price tampering during registration
- Signup auto-logs in user and redirects to welcome page

## API Routes
- POST `/api/signup` - Account creation with email (auto-login, sends welcome email)
- POST `/api/register` - Plan selection (sends registration email)
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Current user
- POST `/api/auth/logout` - Logout
- PATCH `/api/members/:id/profile` - Update profile (name, surname, phone, address)
- GET/POST `/api/members/:id/children` - Children CRUD (ownership enforced)
- PATCH/DELETE `/api/children/:id` - Child update/delete (ownership enforced)
- GET `/api/members/:id/payments` - Payment records
- POST `/api/members/:id/payments/submit` - Submit payment
- GET `/api/members/:id/export` - Export payments (CSV/PDF)
- GET `/api/admin/stats` - Admin statistics
- GET `/api/admin/members` - All members with details
- PATCH `/api/admin/members/:id` - Edit member details
- DELETE `/api/admin/members/:id` - Delete member
- POST `/api/admin/payments/:id/verify` - Verify payment (sends email)
- POST `/api/admin/payments/:id/reject` - Reject payment
- POST `/api/admin/members/:id/send-reminder` - Send payment reminder email
- GET `/api/admin/export` - Export members data (CSV/PDF)
