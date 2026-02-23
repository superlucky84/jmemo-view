# jmemo-view

SSR refactoring workspace for `../jwreview`.

## Prerequisites
- Node.js 20+
- pnpm 9+

## Setup
1. Install dependencies:
   - `pnpm install`
2. Copy env template:
   - `cp .env.example .env`
3. Fill `MONGODB_URI` in `.env`.
4. Validate env:
   - `pnpm run env:check`
5. Optional DB connectivity check:
   - `pnpm run db:ping`

## Run
- Development server:
  - `pnpm run dev`
- Production-like start:
  - `pnpm run build`
  - `pnpm run server:start`

## Test
- Full test:
  - `pnpm run test`
- Unit + smoke:
  - `pnpm run test:unit`
  - `pnpm run test:smoke`
- Integration (mock):
  - `pnpm run test:integration`
- Integration (Atlas real DB):
  - `pnpm run test:integration:atlas`
  - requires `RUN_ATLAS_INTEGRATION=1` (script sets it automatically) and valid `.env`
- JUnit report:
  - `pnpm run test:report`
  - output: `reports/junit.xml`

## Post-Deploy Smoke
- Start server and run:
  - `pnpm run smoke:release`
- Optional detail endpoint check:
  - `SMOKE_NOTE_ID=<24hexObjectId> pnpm run smoke:release`
- Optional base URL override:
  - `SMOKE_BASE_URL=http://127.0.0.1:4100 pnpm run smoke:release`

## Implemented Baseline
- Express SSR app with Lithent (`lithent/ssr`)
- MongoDB Atlas connection via env (`MONGODB_URI`)
- Card list page (`title/tag/date`) + detail markdown page
- Category filter from env (`JMEMO_CATEGORY_FILTER`)
- Light/Dark theme toggle (`jmemo_theme` persistence)
- GitHub markdown styles via `github-markdown-css`
