# Site integrations

## GitHub projects

The project cards load the three most recently updated public repositories from
the `d6s8` GitHub profile. This uses the public GitHub API and does not need a
token. If the API is unavailable, the page keeps the saved project cards and
shows an explicit status message.

## Supabase guestbook

The shared guestbook uses a Vercel serverless endpoint and a Supabase database.
New entries are saved as `pending`; only approved entries are displayed. The
API limits submissions to three per IP hash per hour. It stores an HMAC hash,
not the raw IP address.

1. Create a Supabase project.
2. Run `supabase/migrations/20261122_guestbook.sql` in the Supabase SQL Editor.
3. Add these environment variables to Vercel for Development, Preview, and
   Production:
   - `SUPABASE_URL` — the project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — the server-only service role key.
4. Deploy the site to Vercel. Vercel detects `api/guestbook.js` as the
   `/api/guestbook` endpoint.
5. To run locally with Vercel's functions, use `vercel dev` and create an
   ignored `.env.local` from `.env.example`.

Never put `SUPABASE_SERVICE_ROLE_KEY` in browser code or commit it. The public
site only calls `/api/guestbook`.

To moderate entries, open `guestbook_entries` in the Supabase Table Editor.
Change `status` from `pending` to `approved` to publish a note, or to `rejected`
to keep it hidden.

When the Vercel endpoint is absent on `localhost` or when opening the page from
disk, the page switches to a local-only preview backed by browser storage. That
preview is not shared with visitors. To test the API under `vercel dev`, add
`?guestbook=live` to the local URL.

## BlockBlast daily leaderboard

The shared daily leaderboard uses the same server-only Supabase credentials as
the guestbook.

1. Run `supabase/migrations/20261122_blockblast_leaderboard.sql` in the
   Supabase SQL Editor.
2. Keep `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured in Vercel.
3. Deploy the site. Vercel detects `api/blockblast-leaderboard.js` as the
   `/api/blockblast-leaderboard` endpoint.
4. To test locally, use `vercel dev`; the static Python preview does not run API
   routes.

The browser sends only the daily date, score, and a random anonymous player ID.
The API stores each player's best score per day and rate-limits leaderboard
requests by an HMAC of the request IP; raw IP addresses are not stored. Scores are
client-reported and the board is intended for casual play, not as a cheat-proof
competition.

## Deferred

Spotify status is not connected yet. It needs a Spotify developer application
and a server-side OAuth setup; add the required credentials as Vercel
environment variables, never to `script.js`.

Donation cards remain placeholders until public payment URLs are provided.
