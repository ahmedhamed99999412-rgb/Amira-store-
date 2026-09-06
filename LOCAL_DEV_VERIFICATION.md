# Local Development Verification

This project is configured for Windows/macOS/Linux local development with Node.js 22.6+ and npm.

## Clean setup

```bash
cd project
npm install
npm run setup:local
npm run db:push
npm run db:seed:full
npm run dev
```

## Production-style local check

```bash
cd project
npm install
npm run setup:local
npm run db:push
npm run db:seed:full
npm run lint
npm run build
npm run start
```

## Expected database baseline

The full seed is expected to restore the handoff dataset:

- 21 models/tables
- 543 records
- 23 product images
- 7 category images
- 5 banner images

The seed reads `project/database/full-data-dump.json` and `project/database/images/`.
