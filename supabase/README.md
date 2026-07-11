# NJUASCO Supabase Setup

This folder contains the database and notification pieces for the admissions flow.

## Apply the schema

Run this after linking the Supabase project:

```bash
supabase link --project-ref gkzuzugokctccfadzqwf
supabase db push
```

The migration creates:

- `admission_applications`
- `admission_documents`
- `admission_notifications`
- private storage bucket `admission-documents`
- RLS policies for public submission and authenticated admin management

## Browser client

The static site now includes `supabase-client.js`. It uses the public config in `db.js` and the Supabase browser SDK loaded on:

- `apply.html`
- `admission-status.html`

If the SDK is unavailable, the forms continue to work through the existing localStorage fallback.

Copy `.env.example` to your Supabase secrets/local environment and replace the placeholder values before deploying functions.

## Run this SQL in Supabase

Open Supabase SQL Editor and run `supabase/run-this-in-sql-editor.sql`.

## Admin Auth users

Create Supabase Auth email/password users for:

- `info@njuasco.edu.gh`
- `novatech1025@gmail.com`

Those two emails are the only full admin accounts. Sub-admins must also be Supabase Auth users, but their access is controlled by the matching active email profile in the Admin Dashboard's Sub-Admin Management page.

## Google Auth

The old Google OAuth client was deleted, which causes `Error 401: deleted_client`. Create a new OAuth client and replace the values in Supabase.

In Google Cloud Console:

1. Open APIs & Services > OAuth consent screen and make the app name `NJUASCO`.
2. Open APIs & Services > Credentials > Create Credentials > OAuth client ID.
3. Choose Web application.
4. Add this Authorized redirect URI:

```text
https://gkzuzugokctccfadzqwf.supabase.co/auth/v1/callback
```

In Supabase Dashboard, open Authentication > Providers > Google:

- Enable Google
- Paste the new Google Client ID
- Paste the new Google Client Secret
- Save

Google sign-in is allowed only when the returned email matches a full admin email or an active sub-admin profile email.

## Deploy notifications

Set secrets first:

```bash
supabase secrets set RESEND_API_KEY=... EMAIL_FROM=admissions@njuasco.edu.gh
supabase secrets set ARKESEL_API_KEY=... ARKESEL_SENDER_ID=NJUASCO
supabase functions deploy send-admission-notification
```

The current static admin page prepares local email/SMS drafts. This Edge Function is ready for the next step, where admin decisions can call Supabase to send messages automatically.

## Deploy SMS OTP

The shop checkout and staff step-up login use the `checkout-otp` Edge Function. Set the verification secret and Arkesel API key, then deploy it:

```bash
supabase secrets set CHECKOUT_VERIFY_SECRET=... SUPABASE_URL=https://gkzuzugokctccfadzqwf.supabase.co SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set ARKESEL_API_KEY=... ARKESEL_SENDER_ID=NJUASCO
supabase functions deploy checkout-otp
```

If you need a different sender ID, set `ARKESEL_SENDER_ID` to the approved value from your Arkesel account.

## Deploy Stripe payments

The donation page and shop checkout first try the local Node server endpoint, then fall back to the hosted `stripe-checkout` Supabase Edge Function. Set your Stripe secret key and live site URL, then deploy:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_or_live_... SITE_URL=https://your-live-njuasco-site.example
supabase functions deploy stripe-checkout
```

For this project reference you can also run:

```bash
npm run deploy:stripe
```

Use Stripe Dashboard > Developers > API keys for `STRIPE_SECRET_KEY`. Use a test key while testing and a live key only when the shop and donation pages are ready for real payments.

## Supabase Auth branding

In Supabase Dashboard, set Authentication > Email Templates so every subject and body uses `NJUASCO` as the product/school name. In Authentication > URL Configuration, set the Site URL to the live NJUASCO website URL and add any local development redirect URLs you use.

Recommended email subjects:

- Confirm signup: `Confirm your NJUASCO account`
- Magic Link: `Your NJUASCO sign-in link`
- Change Email Address: `Confirm your NJUASCO email change`
- Reset Password: `Reset your NJUASCO password`
- Invite User: `You have been invited to NJUASCO`

Recommended shared email body:

```html
<h2>NJUASCO Account Verification</h2>
<p>Use this secure link to continue with your NJUASCO account:</p>
<p><a href="{{ .ConfirmationURL }}">Continue to NJUASCO</a></p>
<p>If you did not request this, you can ignore this message.</p>
```

For Authentication > Providers > Phone, configure your provider as needed in Supabase. This website uses the hosted `checkout-otp` Edge Function with Arkesel for SMS delivery rather than Supabase's built-in Twilio provider.

## Deploy NJB City AI

The website chat tries the local `/api/ai` proxy first, then the hosted Supabase Edge Function. GitHub Pages cannot run `server.js`, so deploy this function before publishing the site on GitHub.

### Option A — GitHub Actions (recommended for live site)

1. Create a Supabase access token: [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. In GitHub repo **Settings → Secrets and variables → Actions**, add:
   - `SUPABASE_ACCESS_TOKEN` — your Supabase personal access token
   - `GROQ_API_KEY` — your Groq API key
3. Go to **Actions → Deploy NJB City AI → Run workflow**, or push changes to `main`.

### Option B — Deploy from your computer

```powershell
npx supabase login
.\scripts\deploy-ai.ps1
```

Or with npm (after `npx supabase login` and with `GROQ_API_KEY` in `.env`):

```bash
npx supabase secrets set GROQ_API_KEY=... GROQ_MODEL=llama-3.1-8b-instant --project-ref gkzuzugokctccfadzqwf
npx supabase functions deploy njuasco-ai --project-ref gkzuzugokctccfadzqwf
```

For local development, run:

```bash
npm run start:3000
```

Keep VS Code Live Server on `http://127.0.0.1:5500` if you like; the browser chat will fall through to the AI proxy at `http://127.0.0.1:3000/api/ai`. If you want Node to serve the whole site instead, stop Live Server and run `npm run start:5500`.
