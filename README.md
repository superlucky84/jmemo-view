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

## Implemented Baseline
- Express SSR app with Lithent (`lithent/ssr`)
- MongoDB Atlas connection via env (`MONGODB_URI`)
- Card list page (`title/tag/date`) + detail markdown page
- Category filter from env (`JMEMO_CATEGORY_FILTER`)
- Light/Dark theme toggle (`jmemo_theme` persistence)
- GitHub markdown styles via `github-markdown-css`
