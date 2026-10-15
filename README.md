# MediVault

A personal health platform built around a private medical-record vault: upload lab
reports and other documents, extract lab results with OCR, and track medications,
conditions, health metrics, goals and activities.

> MediVault is in active development and is **not** ready for real patient data.
> Extracted results are automated readings that may be wrong; the validation step is
> a plausibility check, not a clinical reference range or a diagnosis.

## Stack

- **Next.js 16** (App Router, Turbopack) and React 19, TypeScript
- **Supabase**: Auth, Postgres and private Storage (bucket `medical-records`)
- **Prisma 8 (release candidate)** runtime: `src/lib/prisma.ts`, contract in `src/prisma/`
- **Document reading** (`src/lib/document-text.ts`): digital PDFs are read locally from
  their built-in text with `unpdf` (free, nothing leaves the server). Scans and photos
  need an OCR provider (`OCR_PROVIDER`); Google Document AI is supported but needs billing.
- **Vitest** for tests; GitHub Actions CI in `.github/workflows/ci.yml`

## Getting started

Requirements: Node 24 and npm, and a Supabase project. An OCR provider is optional.

```bash
npm ci
cp .env.example .env   # then fill in real values; never commit .env
npm run dev            # http://localhost:3000
```

Every variable is documented in [`.env.example`](.env.example). If you use Google OCR,
put the service-account JSON under `credentials/` (git-ignored) and point
`GOOGLE_APPLICATION_CREDENTIALS` at it.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests (no network or credentials needed) |
| `npm run contract:emit` | Regenerate the Prisma contract from `src/prisma/contract.prisma` |
| `npx tsx scripts/smoke-ocr.ts [file] [mime]` | Read a document like the pipeline does, then extract + validate |
| `npx tsx scripts/test-pipeline.ts` | Live end-to-end analysis of one record (needs `TEST_USER_ID`) |

`test-pipeline.ts` (and `smoke-ocr.ts` on scans, when an OCR provider is set) call
real services with your `.env` credentials; they are never run in CI.

## Project layout

```
app/                      Routes (pages and app/api route handlers)
src/lib/medical/          OCR text → lab results (extraction) → plausibility checks (validation)
src/lib/medical-analysis-pipeline.ts   Ownership check → download → OCR → extract → validate → persist
src/lib/dates.ts          Date-only (UTC) vs. date-time (local) conversions
src/lib/supabase*.ts      Supabase browser / server / proxy clients
src/prisma/               Prisma contract (contract.prisma is the source; .json/.d.ts are generated)
```

## Security notes

- Never put secrets in `NEXT_PUBLIC_*` variables. `SUPABASE_SECRET_KEY` and Google
  credentials are server-only.
- The `medical-records` bucket must stay private; files are served through
  short-lived signed URLs after an ownership check.
- Don't push schema changes to the live database to silence Prisma contract
  mismatches; live RLS policies are not yet fully represented in the repo.
