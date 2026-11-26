# alone

Personal site and minigames, built with plain HTML, CSS and JavaScript. The source can be previewed without a build; deployment uses Node.js to version assets.

## Local preview

Serve this directory with a static HTTP server, for example `npx serve .`, and open the displayed address. The guestbook uses browser-local storage on localhost; entries are not shared. GitHub project cards use public GitHub data and fall back to the saved cards when it is unavailable.

## Structure

- `index.html`, `style.css`: page and shared styles; `projects.js` and `guestbook.js`: separate page integrations.
- `tools/`: shared game UI and separate folders for each game's mechanics, interface and styles.
- `api/`: Vercel function entry points.
- `supabase/api/`: server-side implementations; `supabase/migrations/`: database schema and rate limits.

## Optional shared services

The site works as a static preview without these services. To enable the shared guestbook and BlockBlast leaderboard on Vercel, apply both SQL migrations to a Supabase project and configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server-side environment variables. Never expose the service role key in client code. Guestbook messages start as `pending` and require approval in the database before they appear publicly. Use `?guestbook=live` on localhost only when a compatible API is running.

Leaderboard scores are supplied by the client and can be forged; treat the leaderboard as casual rather than competitive. Daily games use UTC dates.

On GitHub Pages the shared wall is shown as coming soon, because GitHub Pages does not run the API functions. Game scripts load when a game is first opened.

## Build and deployment

Run `node build.js` to generate `dist/`. Each CSS and JavaScript URL receives a content hash, including lazily loaded game scripts. Publish the contents of `dist/`, not the source directory, to use automatic cache versioning. The included GitHub Actions workflow builds and publishes on pushes to `main`; in repository Settings → Pages, select **GitHub Actions** as the source. The workflow has not been deployed or configured automatically. For Vercel, configure `node build.js` as the build command and `dist` as the output directory; the API functions remain in the root `api/` directory.
