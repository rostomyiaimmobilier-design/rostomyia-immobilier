This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Background Recommendations Cron

This project includes a daily cron to rebuild personalized recommendations:

- Route: `/api/cron/recommendations/rebuild`
- Schedule: `30 3 * * *` (UTC), configured in `vercel.json`
- Security: set `CRON_SECRET` in your deployment environment

The cron route only executes when one of these headers matches `CRON_SECRET`:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`
- `x-recommendations-secret: <CRON_SECRET>`

Manual test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<your-domain>/api/cron/recommendations/rebuild?limitUsers=200&topN=24&lookbackDays=120"
```

## WhatsApp notifications via n8n

Visit validation notifications can be sent through an n8n Webhook.

### 1) Create n8n webhook

- In n8n, create a workflow with a `Webhook` trigger.
- Method: `POST`
- Keep payload as JSON.
- Copy the **Production URL** from n8n (this is your real webhook URL).

Expected JSON payload from this app:

```json
{
  "to": "213XXXXXXXXX",
  "message": "Nouvelle visite validee...\nDate: ...",
  "context": "agency_visit_validated"
}
```

`context` can be:

- `agency_visit_validated`
- `owner_visit_validated`

### 2) Configure environment variables

Set at least one webhook URL:

- `WHATSAPP_WEBHOOK_URL`

Optional override URLs:

- `AGENCY_WHATSAPP_WEBHOOK_URL`
- `OWNER_WHATSAPP_WEBHOOK_URL`

Optional webhook secrets (sent as both `Authorization: Bearer <secret>` and `x-webhook-secret: <secret>`):

- `WHATSAPP_WEBHOOK_SECRET`
- `AGENCY_WHATSAPP_WEBHOOK_SECRET`
- `OWNER_WHATSAPP_WEBHOOK_SECRET`

### 3) Minimal n8n flow

- `Webhook` -> (optional secret validation) -> provider node/function -> `Respond to Webhook`
- Provider step should send `message` to WhatsApp destination `to`.

### 4) Test

```bash
curl -X POST "$WHATSAPP_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WHATSAPP_WEBHOOK_SECRET" \
  -d '{"to":"213555000111","message":"Test visite validee","context":"agency_visit_validated"}'
```
