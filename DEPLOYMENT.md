Overview

This repository contains a Vite React client (in `client/`) and an Express + Drizzle server (in `server/`). Recommended deployment:

- Client: Vercel (static site)
- Server: Render or Railway (persistent Node service)

Vercel (client)

1. On Vercel, create a new project and point it to this repository.
2. Use the project root `Abangani-Stokvel-Fund/Abangani-Stokvel-Fund`.
3. Vercel will detect `vercel.json` which builds `client/package.json`. The build runs the repository `build` script which runs Vite and outputs `client/dist`.
4. Environment variables (set in Vercel):
   - `VITE_API_URL` - the public URL of your server (e.g. `https://api.example.com`). The client reads this at build/runtime to call the API.

Server (Render / Railway)

1. Create a new Node service (Docker or manual) pointing at the repository root `Abangani-Stokvel-Fund/Abangani-Stokvel-Fund`.
2. Use the start command:

   npm run dev

   or build and run the production bundle via:

   npm run build
   npm start

3. Environment variables (set in the host service):
   - `DATABASE_URL` - Postgres connection string
   - `SESSION_SECRET` - session secret
   - `PORT` - port to bind (Render/Railway typically set automatically)
   - Email/API keys used by `server/email-service.ts`

Notes

- Do NOT commit `.env.local` to the repo. Add it to your host's environment settings instead.
- If you prefer Vercel to proxy `/api/*` to the server, Vercel rewrites require a fixed destination URL — set this in `vercel.json` or configure a reverse proxy in Vercel. The recommended approach is to set `VITE_API_URL` and have the client call the server directly.

Commands for local testing

Run the full dev environment locally from the repo root:

```bash
npm run dev
```

Build both client and server locally:

```bash
npm run build
```
