# Traffic split: old site 90% / new site 10%

`worker.js` runs on Cloudflare in front of two Netlify sites and decides, per visitor, which one serves the page.

## Behaviour
- New visitor gets a random bucket (0-99) in cookie `md_bucket` (30 days). `bucket < NEW_SITE_PERCENT` = new site.
  The visitor stays on the same site. Raising the percentage later only adds visitors to the new site.
- Always the old site: search/ad crawlers (Googlebot, AdsBot, ...), `/blog`, `/learning`, `/e-learning`, `/tech-courses`,
  the Google Ads landing paths proxied to Cloudflare Pages, and any non-GET request.
- Page missing on the new site (404) or new site down: the old site's page is served instead.
- QA: `?md_variant=new`, `?md_variant=old`, `?md_variant=reset`. Response header `x-md-variant` shows what was served.
- Analytics: every HTML page gets `dataLayer.push({md_variant})` (GTM) and a Clarity custom tag `md_variant`.

## Deploy
1. Netlify: deploy this repo as a NEW site (build settings come from `/netlify.toml`). Add env vars
   `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` and redeploy. Do NOT attach microdegree.work to it.
2. In `wrangler.toml` set `OLD_ORIGIN` / `NEW_ORIGIN` to the two `*.netlify.app` names, and check:
   `curl -I https://<old>.netlify.app/` and `curl -I https://<new>.netlify.app/` both answer 200
   (a 301 to microdegree.work would make a loop) and have no `x-robots-tag: noindex`.
3. Cloudflare: add microdegree.work as a zone, copy ALL existing DNS records (including MX/TXT), switch the
   nameservers at the registrar. Keep `www` and `@` pointing at the old Netlify site and set to Proxied (orange cloud).
   SSL/TLS mode: Full (strict). Turn Rocket Loader off. Add no cache rule for HTML.
4. `cd cloudflare-worker && npx wrangler deploy` (needs the Workers Paid plan: every asset request goes through the Worker).
   Set the route's failure mode to "fail open" in the dashboard so an outage falls back to the old site.
5. Test with `?md_variant=new` first, then leave `NEW_SITE_PERCENT = "10"`.

## Operate
- Ramp up: change `NEW_SITE_PERCENT` (10 -> 25 -> 50 -> 100) and `npx wrangler deploy`.
- Emergency stop: `NEW_SITE_PERCENT = "0"` and deploy (or disable the route in the dashboard).
- Tests: `node worker.test.mjs`
