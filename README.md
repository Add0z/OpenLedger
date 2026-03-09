# OpenLedger

An open-source personal finance **Progressive Web App (PWA)** built with **React + Next.js** that uses **Google Sheets as the only database**.

## Features

- **Double-entry bookkeeping** — every transaction creates balanced journal entries that always sum to zero
- **Google Sheets as the database** — your financial data lives in your own Google Drive
- **PWA** — installable on mobile and desktop, with offline UI caching
- **Multi-year architecture** — each year stored in a separate spreadsheet (`OpenBudget_YYYY`)
- **Import system** — supports OFX/QFX and CSV bank exports
- **Conflict detection** — warns before overwriting manual spreadsheet edits
- **Reports** — account balances, monthly spending, category breakdown, budget vs actual
- **QuickAdd** — lightweight transaction entry synced with the spreadsheet
- **AuditLog** — every change is recorded with timestamp, user, and action
- **No backend server** — frontend-only, deployable on Vercel

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Next.js (App Router), TypeScript |
| UI | Material UI v7 |
| Auth | NextAuth.js with Google OAuth |
| Database | Google Sheets API |
| Hosting | Vercel |
| Format | Progressive Web App |

## Spreadsheet Schema

Each year uses one Google Spreadsheet containing these sheets:

- **Accounts** — Chart of accounts (`id, name, type, currency, active`)
- **Categories** — Expense/income categories (`id, name, parent, type`)
- **Currencies** — Currency definitions (`code, name, decimals`)
- **Transactions** — Transaction headers (`id, date, description, created_at`)
- **Entries** — Journal entries (`id, transaction_id, account_id, amount, currency`)
- **Budgets** — Budget targets (`id, category_id, period, amount`)
- **QuickAdd** — Lightweight input sheet (`date, description, account, category, amount`)
- **Config** — System settings (`key, value`)
- **AuditLog** — All changes (`id, timestamp, action, entity, entity_id, user`)

> **Data integrity rule:** `Sum(entries.amount)` per `transaction_id` must always equal `0`.
> All amounts are stored as integers in smallest currency unit (e.g., cents).

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Cloud project with OAuth 2.0 credentials
- Google Sheets API enabled

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Add0z/OpenLedger.git
   cd OpenLedger
   npm install
   ```

2. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

3. Fill in your credentials in `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   NEXTAUTH_SECRET=your-secret   # openssl rand -base64 32
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Configure Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials (Web Application)
   - Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs
   - Enable the **Google Sheets API** and **Google Drive API**

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000), sign in with Google, then go to **Settings** to create your first year spreadsheet.

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Add0z/OpenLedger)

Set the same environment variables in your Vercel project settings and update `NEXTAUTH_URL` to your production URL.

## Development

```bash
npm run dev    # Start development server
npm run build  # Production build
npm run lint   # Run ESLint
npm test       # Run Jest tests
```

## License

[AGPL-3.0](LICENSE) — Free to use, modify, and distribute. Closed-source forks are not permitted.
