# Quick Vercel Setup Guide

## 🚀 5-Minute Setup

### Local Development (unchanged)
```bash
npm run dev
# Access at http://localhost:3000
```

### Deploy to Vercel

**Step 1: Go to Vercel**
- Visit [vercel.com/new](https://vercel.com/new)
- Click "Import Git Repository"
- Search for `rag_swing_trading_pipeline`
- Connect it

**Step 2: Configure Environment Variables**
Add in Vercel Dashboard → Settings → Environment Variables:

```
BUILT_IN_FORGE_API_KEY=your-key-here
BUILT_IN_FORGE_API_URL=https://forge.manus.im
DATABASE_URL=mysql://user:pass@host/db (if using)
OAUTH_SERVER_URL=https://oauth.example.com (if using)
JWT_SECRET=generate-a-secret-key (if using)
```

**Step 3: Deploy**
- Click "Deploy"
- Wait ~2-3 minutes
- Your app is live at `https://your-project.vercel.app`

---

## 📋 What Changed

✅ **Added files:**
- `vercel.json` - Vercel configuration
- `api/index.ts` - Serverless handler
- `.vercelignore` - Deployment optimization
- `VERCEL_SETUP.md` - Full documentation

✅ **No changes to:**
- Local development workflow
- `package.json` scripts
- Source code
- Database setup

---

## 🔗 Key URLs

| Environment | URL | Access |
|-------------|-----|--------|
| Local | `http://localhost:3000` | Your machine only |
| Vercel | `https://project.vercel.app` | Anywhere globally |
| GitHub | `github.com/aladinz/rag_swing_trading_pipeline` | Latest code |

---

## ⚠️ Required Environment Variables

These MUST be set in Vercel for the app to work:

```
✅ BUILT_IN_FORGE_API_KEY     (Get from Manus Forge)
✅ BUILT_IN_FORGE_API_URL     (https://forge.manus.im)
```

Without these, the app will fail when trying to fetch market data.

---

## 🐛 Troubleshooting

**Q: "Build failed" on Vercel**
→ Check `npm run build` works locally first: `npm run build`

**Q: "Environment variable not found"**
→ Add it to Vercel Dashboard → Settings → Environment Variables

**Q: "API calls fail on Vercel"**
→ Verify `BUILT_IN_FORGE_API_KEY` is correctly set

**Q: "Local development still works?"**
→ Yes! Your `.env` file is only for local development

**Q: "How to use a custom domain?"**
→ Vercel Dashboard → Domains → Add your domain

---

## 📚 Full Documentation

See `VERCEL_SETUP.md` for complete details including:
- Detailed deployment steps
- Environment variable reference
- How Vercel deployment works
- Performance optimization tips
- Rollback instructions
- Custom domain setup

---

## ✨ Summary

- **Local:** `npm run dev` works exactly as before
- **Deployed:** Your app is accessible globally via HTTPS
- **Updates:** Push to GitHub → Auto-deploy to Vercel
- **No downtime:** Vercel handles staging and rollbacks

Happy deploying! 🎉
