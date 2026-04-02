# 🚀 ADVENTIFY Certificate System - Quick Start Guide

**Status:** ✅ Integration Complete

---

## Step 1: Configure Git & Push to GitHub

Run these commands on your Mac:

```bash
cd ~/adventify
git config user.name "GODLISTEN"
git config user.email "godlistenru@gmail.com"
git add -A
git commit -m "Implement complete modern certificate system for ADVENTIFY"
git push
```

---

## Step 2: Update Environment Variables

Edit `~/adventify/.env` and set:

```env
# Required
CERTIFICATE_SIGNING_KEY="your-secure-random-key"

# Optional but recommended
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# Optional
GOOGLE_WALLET_SERVICE_ACCOUNT=""
GOOGLE_WALLET_PRIVATE_KEY=""
BLOCKCHAIN_API_KEY=""
```

---

## Step 3: Install & Setup

```bash
cd ~/adventify

# Install dependencies
npm install
# OR if using bun
bun install

# Sync database
npx prisma db push

# Start development server
npm run dev
# OR
bun run dev
```

---

## Step 4: Verify Everything Works

Open browser to:

1. **Dashboard:** http://localhost:3000/(admin)/certificates
2. **Verification:** http://localhost:3000/verify/test-bcn
3. **API Health:** http://localhost:3000/api/certificates

---

## Step 5: Test Certificate Generation

```bash
# Using curl or Postman
POST http://localhost:3000/api/certificates/generate

Body:
{
  "recipientId": "test-person-id",
  "templateId": "template-minimalist-modern",
  "includeDigitalWallet": true,
  "securityLevel": "enhanced"
}
```

---

## 📋 What Was Integrated

### New Files (6)
- ✨ `src/lib/certificate-templates.ts` - 3 template designs
- ✨ `src/lib/certificate-generation.ts` - PDF + QR generation
- ✨ `src/lib/certificate-api.ts` - API endpoints
- ✨ `src/components/certificates/public-verification.tsx` - Verification UI
- ✨ `src/components/certificates/template-customization.tsx` - Template builder
- ✨ `CERTIFICATE_INTEGRATION_SUMMARY.md` - Full documentation

### Updated Files (4)
- ✏️ `.env` - Added certificate configuration
- ✏️ `src/app/api/certificates/route.ts` - API implementation
- ✏️ `src/app/verify/[bcn]/page.tsx` - Verification page
- ✏️ `src/app/(admin)/certificates/page.tsx` - Admin dashboard

### Already Present (2)
- ✅ Prisma models (Certificate, CertificateTemplate)
- ✅ All dependencies (jspdf, qrcode, nodemailer)

---

## 🎯 Features

✅ 3 professional certificate designs  
✅ PDF generation with high-resolution printing  
✅ QR code generation  
✅ Digital signatures (HMAC-SHA256)  
✅ Digital wallet support (Apple + Google)  
✅ Public verification page  
✅ Certificate management dashboard  
✅ Email delivery  
✅ Revocation system  
✅ Audit logging  

---

## 📞 Need Help?

1. Check `.env` variables
2. Verify `npm install` completed
3. Run `npx prisma db push`
4. Check browser console for errors
5. Review `CERTIFICATE_INTEGRATION_SUMMARY.md` for full docs

---

## 🚀 Production Deployment

### Vercel
```bash
# Everything is committed and pushed
# Vercel will auto-deploy
# Just set environment variables in Vercel dashboard
```

### Self-Hosted
```bash
npm run build
export CERTIFICATE_SIGNING_KEY=...
npm run start
```

---

**Everything is ready! 🎉 Start with Step 1 and work your way down.**
