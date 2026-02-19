# Abangani NS Group - Stokvel Subscription Platform

## Overview
A SaaS stokvel subscription platform where parents pay monthly contributions towards school uniforms and stationery for their children. Built with React + Express + PostgreSQL.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn UI (port 5000)
- **Backend**: Express.js with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: Wouter (frontend), Express (backend)

## Key Pages
- `/` - Landing page with hero, pricing (3 tiers), how it works, CTA
- `/about` - About page with "How It Works" steps and "Why Parents Trust Us"
- `/contact` - Contact page with phone, email, location, business hours, payment methods
- `/signup` - Simple account creation (Name, Surname, Phone, Password)
- `/signin` - Login with phone + password
- `/register` - Plan selection wizard (authenticated, no-plan users only) - 4 steps: Plan → Children → Summary → Agreement
- `/dashboard` - User dashboard with payment progress, monthly payments, children management, export. Shows "Choose a Plan" prompt for users without a plan.
- `/profile` - View and edit member profile (name, surname, phone, address)
- `/admin` - Secret admin panel (access code: ABANGANI26)

## Two-Phase Registration Flow
1. **Signup** (`/signup`): User creates account with Name, Surname, Phone, Password → auto-login → redirect to Dashboard
2. **Plan Selection** (`/register`): Authenticated user with no plan selects a subscription, adds children, agrees to terms → plan activated → redirect to Dashboard

## Pricing Tiers
- Primary School: R195/month (R45 admin, R150 uniform/stationery)
- High School: R295/month (R45 admin, R250 uniform/stationery)
- Cashback R500: R500/month (R60 admin, R440 withdrawable)
- Cashback R1000: R1000/month (R105 admin, R895 withdrawable)

## Database Tables
- `members` - Parent/guardian accounts with plan info (plan fields nullable for two-phase registration), surname field, tracking numbers
- `children` - Children linked to members with school/grade info
- `payments` - Monthly payment records (12 per member per year)

## Security
- Session-based auth with SESSION_SECRET from env (secure cookies in production)
- requireAuth middleware on all member routes
- requireOwnMember middleware on routes with `:id` param (verifies session member matches)
- Child update/delete routes verify child belongs to session member (IDOR protection)
- Admin routes require `x-admin-code: ABANGANI26` header
- Server-side plan validation prevents price tampering during registration
- Signup auto-logs in user and redirects to dashboard

## API Routes
- POST `/api/signup` - Simple account creation (auto-login)
- POST `/api/register` - Plan selection (authenticated, no-plan users only)
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
- POST `/api/admin/members/:id/approve` - Approve member
- DELETE `/api/admin/members/:id` - Delete member
- POST `/api/admin/payments/:id/verify` - Verify payment
- POST `/api/admin/payments/:id/reject` - Reject payment
