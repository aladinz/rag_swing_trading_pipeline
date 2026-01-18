# Vercel Deployment Guide

This app is configured for deployment on Vercel while maintaining full local development support.

## Quick Start - Local Development

Your local setup remains unchanged:

```bash
# Install dependencies
npm install

# Start development (frontend + backend)
npm run dev

# Or run frontend and backend separately
npm run dev:frontend  # Runs on http://localhost:5173
npm run dev:backend   # Runs on http://localhost:3000
```

**Access locally:** `http://localhost:3000`

## Vercel Deployment

### 1. Prerequisites

- **GitHub Account:** Push your code to GitHub
- **Vercel Account:** Sign up at [vercel.com](https://vercel.com)
- **Environment Variables:** Prepare your secrets

### 2. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended for first-time)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select "Import Git Repository"
3. Find and connect your GitHub repository
4. Vercel will auto-detect settings from `vercel.json`
5. Add environment variables:
   - `BUILT_IN_FORGE_API_KEY` (required)
   - `BUILT_IN_FORGE_API_URL` (required)
   - `DATABASE_URL` (if using database)
   - `OAUTH_SERVER_URL` (if using OAuth)
   - `JWT_SECRET` (if using JWT)
   - Other secrets as needed
6. Click **Deploy**

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy (first time prompts for setup)
vercel

# Add environment variables
vercel env add BUILT_IN_FORGE_API_KEY
vercel env add BUILT_IN_FORGE_API_URL
# ... add other variables as needed

# Redeploy with variables
vercel --prod
```

### 3. Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Required | Example |
|----------|----------|---------|
| `BUILT_IN_FORGE_API_KEY` | ✅ Yes | `sk-xxx...` |
| `BUILT_IN_FORGE_API_URL` | ✅ Yes | `https://forge.manus.im` |
| `DATABASE_URL` | ❌ Optional | `mysql://user:pass@host/db` |
| `OAUTH_SERVER_URL` | ❌ Optional | `https://oauth.example.com` |
| `OWNER_OPEN_ID` | ❌ Optional | Your OAuth ID |
| `JWT_SECRET` | ❌ Optional | Generate a secure secret |
| `VITE_APP_ID` | ❌ Optional | Your app ID |
| `NODE_ENV` | ✅ Yes | `production` |

### 4. Project Structure

```
├── vercel.json              # Vercel configuration
├── .vercelignore           # Files to ignore during deploy
├── api/
│   └── index.ts            # Vercel serverless entry point
├── client/                 # React frontend
├── server/                 # Express backend
├── shared/                 # Shared types
└── dist/                   # Build output (not in git)
```

### 5. How It Works on Vercel

1. **Build Phase:** Vercel runs `npm run build`
   - Frontend built to `dist/public/` (static assets)
   - Backend bundled to `dist/index.js` (Node.js code)
   - API handler created from `api/index.ts`

2. **Runtime:** Requests handled by serverless functions
   - Static files served from CDN
   - `/api/trpc/*` and `/api/oauth/*` go to Node.js function
   - Function keeps app instance in memory for efficiency

3. **Limitations:** Vercel serverless has constraints
   - Max 60 seconds execution time
   - Max 1024 MB memory (default)
   - Stateless between requests (use database for persistence)
   - No persistent file system

## Local vs. Vercel

| Feature | Local | Vercel |
|---------|-------|--------|
| Development | `npm run dev` | Via GitHub (auto-deploy on push) |
| Port | 3000 | https://your-domain.vercel.app |
| Database | Local or remote | Must be remote (cloud) |
| File Storage | Local disk | AWS S3 or cloud storage |
| OAuth Redirect | http://localhost:3000 | https://your-domain.vercel.app |
| Environment | `.env` (local only) | Vercel Dashboard settings |

## Common Issues

### "DATABASE_URL not found"
**Solution:** Add `DATABASE_URL` to Vercel environment variables

### "BUILT_IN_FORGE_API_KEY is required"
**Solution:** Set these vars in Vercel Dashboard:
- `BUILT_IN_FORGE_API_KEY`
- `BUILT_IN_FORGE_API_URL`

### Build fails with "NODE_ENV"
**Solution:** `NODE_ENV=production` is set automatically in `vercel.json`

### OAuth redirects not working
**Solution:** Update your OAuth provider's redirect URI to:
```
https://your-domain.vercel.app/api/oauth/callback
```

### Local development after Vercel setup
**No changes needed!** Run normally:
```bash
npm run dev
```

Your `.env` file is ignored by Git and only used locally.

## Monitoring

After deployment, monitor at:
- **Analytics:** Vercel Dashboard → Analytics
- **Logs:** Vercel Dashboard → Logs (real-time requests)
- **Deployments:** Vercel Dashboard → Deployments (view all deploys)

## Rollback

To revert to a previous deployment:
1. Go to Vercel Dashboard → Deployments
2. Find the working deployment
3. Click ⋯ → Set as Production

## Custom Domain

To use your own domain:
1. Vercel Dashboard → Domains
2. Add your domain
3. Update DNS records (Vercel provides instructions)
4. Update OAuth redirect URIs to use your domain

## Performance Tips

- Keep your database query efficient
- Use caching headers for static assets
- Optimize images before upload
- Monitor serverless function duration

## Support

For Vercel-specific issues, see [vercel.com/docs](https://vercel.com/docs)

For app-specific issues, check logs:
```bash
vercel logs
```
