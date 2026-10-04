# Operations

## Scheduled directory jobs
Production Vercel Cron routes are protected by the project-level CRON_SECRET. Health checks and quality scans use the same secret. Ambiguous health failures never archive or delete a listing.
