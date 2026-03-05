# Deployment Guide: Frontend on Vercel + Backend on Render

This project is configured for:

- `client` (React + Vite) on **Vercel**
- `server` (Express + Prisma + Auth.js) on **Render**
- embeddings on **Cloudflare Workers AI**

---

## 1) Prerequisites

1. GitHub repo with latest code pushed.
2. Production Postgres (for `DATABASE_URL`).
3. Qdrant instance (`QDRANT_URL`, `QDRANT_API_KEY`).
4. ImageKit credentials.
5. Google and GitHub OAuth apps.
6. Render account and Vercel account.
7. Cloudflare account with Workers AI enabled.

---

## 2) Create Cloudflare Workers AI Credentials

1. Open Cloudflare dashboard.
2. Copy your **Account ID** from account settings.
3. Create an API token with Workers AI permissions.
4. Keep these values ready:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_EMBEDDING_MODEL` (default: `@cf/baai/bge-base-en-v1.5`)

No Ollama service deployment is required in this setup.

---

## 3) Deploy Backend (Render Web Service)

1. Render -> `New` -> `Web Service`.
2. Connect GitHub repo.
3. Set **Root Directory** to `server`.
4. Runtime: Node.
5. Build Command:

```bash
npm ci && npm run build
```

6. Start Command:

```bash
npm run start
```

7. Health Check Path: `/health`.
8. If available in your Render plan, set pre-deploy command:

```bash
npx prisma migrate deploy
```

### Backend Environment Variables

Set these in Render service settings:

- `NODE_ENV=production`
- `PORT=10000` (or use Render default injected port)
- `CORS_ORIGIN=https://<your-frontend>.vercel.app`
- `FRONTEND_URL=https://<your-frontend>.vercel.app`
- `DATABASE_URL=<your-prod-database-url>`
- `AUTH_SECRET=<strong-random-secret>`
- `AUTH_GITHUB_ID=<...>`
- `AUTH_GITHUB_SECRET=<...>`
- `AUTH_GOOGLE_ID=<...>`
- `AUTH_GOOGLE_SECRET=<...>`
- `IMAGEKIT_PRIVATE_KEY=<...>`
- `IMAGEKIT_PUBLIC_KEY=<...>`
- `IMAGEKIT_URL_ENDPOINT=<...>`
- `GEMINI_API_KEY=<...>`
- `QDRANT_API_KEY=<...>`
- `QDRANT_URL=<...>`
- `CLOUDFLARE_ACCOUNT_ID=<...>`
- `CLOUDFLARE_API_TOKEN=<...>`
- `CLOUDFLARE_EMBEDDING_MODEL=@cf/baai/bge-base-en-v1.5`
- `EMBEDDING_VECTOR_DIMENSION=768`
- `EMBEDDING_TIMEOUT_MS=60000`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX_REQUESTS=100`

After deploy, verify:

- `GET https://<backend>.onrender.com/health`
- `GET https://<backend>.onrender.com/ready`

---

## 4) Deploy Frontend (Vercel)

1. Vercel -> `Add New` -> `Project`.
2. Import same GitHub repo.
3. Set **Root Directory** to `client`.
4. Build command:

```bash
npm run build
```

5. Output directory: `dist`.
6. Add env variable:

- `VITE_API_URL=https://<backend>.onrender.com/api/v1`

7. Deploy.

This repo already includes `client/vercel.json` SPA rewrite so deep links work:

- `/dashboard`
- `/documents`
- `/chat/:id`

---

## 5) OAuth Provider Setup

Update OAuth callback URLs to backend domain:

### Google OAuth

- Authorized redirect URI:
  - `https://<backend>.onrender.com/auth/callback/google`

### GitHub OAuth

- Authorization callback URL:
  - `https://<backend>.onrender.com/auth/callback/github`

Then redeploy backend once.

---

## 6) Final Wiring Order

1. Deploy backend first.
2. Deploy frontend with backend URL.
3. Update backend `CORS_ORIGIN` and `FRONTEND_URL` to final Vercel URL.
4. Redeploy backend.
5. Update OAuth callback URLs.
6. Redeploy backend again.

---

## 7) Production Smoke Tests

1. Sign in with Google.
2. Sign in with GitHub.
3. Upload a text-based PDF.
4. Verify ingestion steps move to `ready`.
5. Send chat query and receive response.
6. Upload scanned/image-only PDF and verify expected failure UX.
7. Sign out and verify redirect to signin page.
8. Refresh app and verify session behavior.

---

## 8) Known Limitation (No Custom Domain Yet)

Using `*.vercel.app` + `*.onrender.com` means cross-site cookies.

This codebase now sets production Auth.js cookies with:

- `Secure=true`
- `SameSite=None`

This is required for cross-site cookie flows. For best long-term reliability, move to custom domains later (`app.yourdomain.com` + `api.yourdomain.com`).
