# Minimal post likes and site views

The app uses Neon Postgres over HTTPS, compatible with a Neon database connected through Vercel Marketplace. There are two tables: `website_metrics` for the site-wide page-view counter and `website_post_likes` for anonymous post reactions. There is no account system or analytics dashboard.

## Connect production storage

1. In Vercel project `paulano1s-projects/personal-website`, open **Storage** and connect a Neon Postgres database through Marketplace. Use a production database binding for Production and an isolated database/branch for Preview.
2. Ensure the project receives the secret `DATABASE_URL` connection string, or the existing Neon integration variable `PERSONAL_WEBSITE_POSTGRES_URL`. The app and build initializer accept either, with `DATABASE_URL` taking precedence. Keep it server-side; never put it in a `NEXT_PUBLIC_` variable or paste it into chat/source files.
3. Redeploy. The build runs `scripts/setup-engagement.mjs --if-configured`, which creates the two tables and seeds the view counter at **1,000 only if it does not exist**. It does not reset existing totals or reactions. Database initialization failure stops the build.

You can initialize manually from a secure terminal with DATABASE_URL injected, or use a local ignored environment file:

```sh
node --env-file=.env.local scripts/setup-engagement.mjs
```

A saved requirement in the Codex cloud configuration does not create a database or configure the Vercel project. Local use also needs the actual database binding and HTTPS access to that specific Neon endpoint. The integration uses the connection string to construct the Neon HTTPS request, so a placeholder string cannot substitute for a valid runtime connection URL.

## Counting behavior

- Views count JavaScript-rendered page visits and client-side route changes, not unique people. The first visit after the seed increments 1,000 to 1,001. React Strict Mode replay does not count the same mounted navigation twice. Counting uses an atomic database increment.
- A small heart under each post lets visitors like or unlike it. The database enforces one like per browser token per post. Requests set the desired state rather than blindly toggling it, so retrying a request does not duplicate a like.
- The random browser token is stored only in an HttpOnly, SameSite cookie, secure in production. The database stores a post-specific SHA-256 hash of that token, not the token itself. Different posts get different hashes. The application does not collect names, email addresses, IP addresses, or user agents for engagement. This is browser-level deduplication, not proof of a person's identity.
- Missing/unavailable storage hides the public counters rather than showing invented activity. The APIs return HTTP 503. Unknown/draft posts are rejected before database access; writes validate browser origin and use parameterized SQL.

Vercel's platform request logging is separate from application storage. Firewall rate limits can be added if needed; this intentionally remains a small anonymous counter, not an authentication or anti-fraud system.

## Verification

```sh
node .yarn/releases/yarn-4.18.1.cjs test:engagement
```

The anonymous-token test always runs. Real SQL tests require an isolated **local** Postgres database and `TEST_DATABASE_URL`; they refuse non-local hosts because they reset the test tables. They cover the exact seed, migration repeatability, concurrent increments, duplicate likes, unlike isolation, and SQL parameterization. CI provides a disposable Postgres service and runs the full suite. Without TEST_DATABASE_URL the integration test is explicitly skipped.
