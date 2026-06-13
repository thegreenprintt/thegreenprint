# The Greenprint — Deployment Guide

## Prerequisites
- Node.js 18+
- Vercel account
- Supabase project
- Firebase Realtime Database project: `the-greenprint-53d98-default-rtdb`
- Whop merchant account
- Resend account
- Telegram bot

---

## 1. Supabase Setup
1. Create project at supabase.com
2. Run `lib/supabase/schema.sql` in the SQL editor
3. Copy **Project URL** and **Anon Key** → `.env.local`
4. Copy **Service Role Key** → `.env.local`
5. Enable Email auth under Authentication → Providers

## 2. Firebase RTDB
- Already configured: `https://the-greenprint-53d98-default-rtdb.firebaseio.com`
- Set rules to allow public read:
  ```json
  { "rules": { ".read": true, ".write": "auth != null" } }
  ```
  > Or use a secure rule where only your go-live server can write (use Firebase Admin SDK key).

## 3. Resend
1. Create account at resend.com
2. Add & verify domain `thegreenprint.app` (or your domain)
3. Copy API key → `RESEND_API_KEY`
4. Update `from` address in `app/api/webhooks/whop/route.ts`

## 4. Whop Webhooks
1. In Whop dashboard → Webhooks → Add endpoint:
   `https://yourdomain.com/api/webhooks/whop`
2. Subscribe to: `membership.went_active`, `membership.went_inactive`
3. Copy signing secret → `WHOP_WEBHOOK_SECRET`
4. Update plan IDs in `app/api/webhooks/whop/route.ts`:
   - `plan_MEMBER_ID` → your Member plan ID
   - `plan_TRADER_ID` → your Trader plan ID
   - `plan_ELITE_ID` → your Elite plan ID
5. Update Whop checkout URLs in `app/join/page.tsx`

## 5. Telegram
1. BotFather → `/newbot` → copy token → `TELEGRAM_BOT_TOKEN`
2. Create your community invite link → `TELEGRAM_INVITE_LINK`

## 6. Beehiiv
1. Settings → API → copy key → `BEEHIIV_API_KEY`
2. Copy Publication ID → `BEEHIIV_PUBLICATION_ID`

## 7. Go-Live Password
1. Set `GO_LIVE_PASSWORD` in `.env.local` to your chosen password
2. The SHA-256 hash of your password must match the hash in `app/go-live/page.tsx`
3. To generate hash: `echo -n "yourpassword" | shasum -a 256`
4. Current hash: `688c62cbcc9582042931a11a16cd824cca4396d6a1a51f5da6f61dafb81ca1a9`

## 8. Vercel Deploy
```bash
npm install -g vercel
vercel login
vercel --prod
```
Or push to GitHub and import project on vercel.com.

Add all env vars from `.env.local` to Vercel → Project → Settings → Environment Variables.

---

## Local Dev
```bash
npm install
npm run dev
```
Open http://localhost:3000

---

## Live Stream Architecture
```
Jay (go-live.html or /go-live)
  │ getDisplayMedia + getUserMedia
  │ PeerJS peer ID: gp-greenprint-live
  │ Firebase RTDB: PUT /livestatus.json { isLive: true }
  ↓
Website /stream page
  • polls RTDB every 8s
  • PeerJS connects to gp-greenprint-live
  • receives video via WebRTC

Mobile App (Expo)
  • polls RTDB every 10s
  • isLive=true → shows banner
  • tap → opens /stream?app=1 in WebView
  • ?app=1 bypasses Supabase auth gate (middleware)
```

---

## Tier Permissions (Supabase `users` table)
| Column | Member | Trader | Elite |
|---|---|---|---|
| `scanner_access` | false | true | true |
| `tier` | member | trader | elite |

Scanner page and dashboard scanner widget check these flags.

---

## Security Notes
- Go-live page: password-gated client-side with SHA-256 hash. For higher security, move gate to server action.
- Whop webhooks: HMAC-SHA256 verified on every request.
- Supabase RLS: all tables have row-level security enabled.
- `/stream?app=1`: only bypasses Next.js middleware auth. Supabase session still required for API routes.
