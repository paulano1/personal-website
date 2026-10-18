# Newsletter operations

The site uses Vercel Workflow for durable signup and weekly delivery, Resend Contacts/Segments for the mailing list, and Resend Broadcasts for issues and managed unsubscribe links. The server stores pending consent and issue reservations in Workflow; no additional database is required.

## Activate on Vercel

In `paulano1s-projects/personal-website`, configure the following server-side environment variables for **Production**. Keep Preview disabled or use an isolated test segment and sender.

| Variable                    | Value                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`            | A secret Resend API key with contacts, segments, broadcasts, and sending access. Never expose it through a `NEXT_PUBLIC_` variable.                                                                           |
| `RESEND_SEGMENT_ID`         | A dedicated segment containing only confirmed newsletter subscribers.                                                                                                                                         |
| `NEWSLETTER_FROM`           | Your verified sender, such as `Ano <newsletter@your-verified-domain>`.                                                                                                                                        |
| `NEWSLETTER_POSTAL_ADDRESS` | The legitimate mailing address to include in each issue's footer.                                                                                                                                             |
| `CRON_SECRET`               | A strong random secret, stored as a sensitive Vercel variable. Vercel adds it as the cron request's bearer token. Generate it locally with `openssl rand -hex 32`; do not paste it into chat or source files. |
| `NEWSLETTER_ENABLED`        | Start with `false`. Set to `true` only after the other settings and subscriber segment are ready.                                                                                                             |

Resend must have the sending domain verified (SPF/DKIM). Use a dedicated newsletter segment, not an existing list of people who did not opt in. To verify the sender domain and create or find the segment, run the setup helper in a terminal with your real key and sender securely injected:

```sh
node scripts/setup-newsletter.mjs
```

It prints the non-secret segment ID to copy into Vercel. It does not send email or import contacts. A cloud proxy secret binding is separate from Vercel's production environment variables; configure both only if local live-provider validation is needed.

Redeploy after changing Vercel variables. Set a Vercel Firewall rate limit on `POST /api/newsletter` to suit expected traffic. The application also validates input size and email format, rejects cross-origin browser requests, uses a honeypot, and reserves one confirmation email per normalized address per UTC hour. Those controls do not replace network-level abuse protection.

## Reader journey

1. A reader submits their email at `/newsletter`, on the homepage, or below the blog list.
2. Workflow creates a cryptographically random, expiring confirmation token in a **step**, commits its hook, and sends a confirmation email through Resend. Nothing is added to the mailing list yet.
3. The link opens `/newsletter/confirm#token`. The fragment stays out of server requests/referrers. Opening the link does not subscribe the reader; the reader must press **Confirm subscription**, so mail scanners cannot opt them in automatically.
4. The authenticated token resumes the existing workflow, which adds the confirmed email to the dedicated segment. A used or expired token cannot enroll again. Confirmation expires after 24 hours.
5. Broadcast unsubscribe links are handled by Resend and suppress subsequent issues. Re-subscribing requires a new confirmation; merely submitting the form never resets an unsubscribe.

Pending consent is durable on Vercel and survives instance restarts. Workflow logs contain subscriber data; restrict dashboard access and use Vercel's storage/encryption and retention controls. Local Workflow state is development data under `.next/workflow-data` and is not a substitute for production storage.

## Weekly schedule and duplicate prevention

`vercel.json` invokes `/api/cron/newsletter` every Monday at **16:00 UTC**. Workflow waits until **9:00 a.m. America/Los_Angeles**, which is 16:00 UTC in summer and 17:00 UTC in winter. Delivery may be later if the cron/provider is delayed; Vercel plan scheduling precision applies.

Each issue covers the half-open interval from the previous Monday at 9 a.m. Pacific through the current Monday at 9 a.m. Pacific. DST boundaries are calculated independently. Only published, non-draft posts whose `date` falls in that interval are included. Date-only frontmatter becomes eligible after its UTC publication day ends, so a Monday post published after the send is included the following week. Use the actual publication date; backdating a post outside the current interval will omit it. Changes to older posts do not resend them. No posts means no broadcast.

A retained Workflow hook atomically reserves each issue key for 30 days, covering concurrent and late cron retries. Steps reconcile broadcasts by deterministic issue name, reuse the created broadcast ID, and skip sending an already queued/sent broadcast. Confirmation email retries use Resend idempotency keys.

Do not delete issue reservations or create another broadcast to recover a failed send. Inspect the existing run and broadcast first, then retry the failed step through Workflow's supported recovery controls. This avoids sending an issue twice. Provider failures are surfaced without logging email addresses or raw provider error bodies.

To preview the current issue without starting a workflow or sending anything, request `/api/cron/newsletter?preview=true` with the cron bearer token from a secure terminal. The response contains the issue window, post count, HTML, and plain text. Do not put the token in the URL.

Setting `NEWSLETTER_ENABLED=false` and redeploying disables new signups and digest sends. Existing workflows remain pinned to the deployment that started them, so cancel pending runs in Workflow as well when pausing delivery. Steps check the configuration of their own deployment before contacting Resend. A broadcast already handed to Resend must be canceled in Resend if still cancelable.

## Verification

```sh
node .yarn/releases/yarn-4.18.1.cjs test:newsletter
node .yarn/releases/yarn-4.18.1.cjs lint
node .yarn/releases/yarn-4.18.1.cjs build
node .yarn/releases/yarn-4.18.1.cjs typecheck
node .yarn/releases/yarn-4.18.1.cjs serve
# In a second terminal:
node .yarn/releases/yarn-4.18.1.cjs smoke
```

Unit tests cover DST, date boundaries, drafts/future posts, escaping, token expiry, provider errors, duplicate delivery recovery, input limits, and origin checks. CI runs the newsletter tests and site smoke suite without credentials. The public form checks availability and shows an opening-soon message while delivery is disabled; direct signup requests return an honest 503 rather than reporting success.

Before enabling real delivery, use your own test address to verify confirmation, membership, an issue to an isolated test segment, and unsubscribe behavior with the real Resend account. Fixture tests cannot establish domain verification or inbox delivery. Newsletter workflows require a server runtime on Vercel; static GitHub Pages exports cannot run this feature.
