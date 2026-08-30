# Development data and bulk imports

`dev-categories.sql` is the baseline taxonomy used by `supabase db reset`. The JSON file `dev-communities.json` contains the only reusable community fixtures. It is explicitly marked as synthetic development data and is not production content.

With `.env.local` configured for a local development Supabase project, add
`CHATSCOUT_IMPORT_ENV=development` and run:

```bash
npm run seed:dev
```

The importer validates the dataset before writing, upserts categories by slug, upserts communities by stable name-derived slug (or matching invite URL), creates the category relationship, and always writes communities as `draft`. It is safe to re-run and never publishes a record.

## Future production imports

Put the vetted, trusted source file at `supabase/import/communities.production.json`. That directory is ignored by Git so real community contact and invite data is not accidentally committed. Use the same JSON shape as `dev-communities.json`, set `CHATSCOUT_IMPORT_ENV=production`, and run:

```bash
npm run import:communities -- --input supabase/import/communities.production.json --production --confirm-unpublished
```

The production command requires both explicit confirmation flags, reports invalid rows before it writes anything, validates Instagram URLs and category references, avoids duplicate records, and imports every record as an unpublished draft. Review and publish imported records using the existing protected admin moderation flow. The importer does not scrape Instagram or make network requests to Instagram.
