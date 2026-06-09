# Deployment Guide — Vincent Magubo Nyagucha Tribute

A step-by-step runbook to take this site live on **Cloudflare** (Path B: public site + moderated guestbook + photo uploads + admin).

> **Important — do everything in the Cloudflare dashboard (the website).**
> The `wrangler` command-line tool does **not** work on this machine: the network
> proxy blocks it and `wrangler login` fails (the `localhost:8976` page "can't be
> reached"). So we create the database, bucket, and bindings through
> **dash.cloudflare.com**, and the only Terminal commands we use are `git`.

---

## 0. What this project is

| | |
|---|---|
| **Type** | Static multi-page site + Cloudflare Functions backend |
| **Hosting** | Cloudflare Pages (free tier) |
| **Database** | Cloudflare D1 — `nyagucha-tributes` (binding `DB`) |
| **Photo storage** | Cloudflare R2 — `nyagucha-images` (binding `IMAGES`) |
| **Email** | Resend (notifications to family) |
| **Spam protection** | Cloudflare Turnstile |
| **Admin login** | Cloudflare Access (email-only, you for now) |
| **GitHub repo** | `github.com/cjmachoka/nyagucha-tribute` |
| **Project name** | `nyagucha-tribute` |

### Files in this project

```
index.html            Home (photo hero + section hub)
biography.html        Systematic life chapters
tributes.html         Sectionalized tribute messages
gallery.html          Photo album
guestbook.html        Submit form (moderated)
announcements.html    Family notice + condolence messages
css/styles.css        Crisp design (one stylesheet)
js/tributes.js        Loads + groups tributes by section
js/guestbook.js       Validates + submits guestbook
data/tributes.json    Sample tributes (fallback before D1)
data/biography.json   Biography structure
functions/api/tributes.js   API: GET approved, POST pending
schema.sql            D1 table: tributes
wrangler.toml         D1 binding config (needs real database_id)
package.json          helper scripts (CLI; not usable on this machine)
DEPLOYMENT.md         this guide
```

### Build status

| Piece | Status |
|-------|--------|
| Crisp design, all pages | Done |
| Guestbook form + validation | Done |
| Sectionalized tributes (with JSON fallback) | Done |
| API: submit + list tributes | Done (basic) |
| D1 database created + schema applied + bound | Done |
| R2 bucket created + bound | Done (plumbing only — upload code TODO) |
| Site live on `*.pages.dev` | Done |
| Admin panel (`/admin`) — approve / reject tributes | **NEXT** |
| Resend email notification on new tribute | After admin |
| Photo upload code (uses R2) | After admin |
| Turnstile spam protection | After upload code |
| Cloudflare Access on `/admin` | Pairs with admin page |
| Custom domain | When name decided |
| Email Routing (`tributes@yourdomain`) | After domain |

> The site is **live and read-only** right now. Submissions save to D1 as
> `pending` but there is no admin UI to approve them yet — that's the next
> build piece.

---

## 1. Accounts (one-time)

| Step | Go to | Action |
|------|-------|--------|
| 1.1 | [github.com](https://github.com) | Already done — repo `cjmachoka/nyagucha-tribute` |
| 1.2 | [dash.cloudflare.com](https://dash.cloudflare.com) | Sign in |
| 1.3 | [resend.com](https://resend.com) | Sign up (free) |
| 1.4 | [accounts.google.com](https://accounts.google.com) | (Optional) create memorial Gmail for notifications until the domain exists |

---

## 2. Push latest code to GitHub

Run in **Terminal** whenever you change files:

```bash
cd /Users/jabali/Documents/Nyagucha
git add .
git commit -m "Update tribute site"
git push
```

Cloudflare Pages auto-redeploys on every push to `main`.

---

## 3. Deploy on Cloudflare Pages (first time)

1. Go to **dash.cloudflare.com** → **Workers & Pages** → **Create application**
2. The next screen is titled **"Create a Worker"** — **do NOT pick any option here.**
   At the very bottom click the link: **"Looking to deploy Pages? Get started"**

   > ⚠️ **Trap:** the Worker options ("Continue with GitHub", "Import a repository",
   > etc.) create a **Worker**, which runs `wrangler deploy` and fails with
   > *"Missing entry-point to Worker script."* This site is a **Pages** project.

3. In the Pages flow: **Connect to Git** → **GitHub** → select **`cjmachoka/nyagucha-tribute`**
4. Build settings:

   | Field | Value |
   |-------|-------|
   | Project name | `nyagucha-tribute` |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | *(leave empty)* |
   | Build output directory | `/` |

5. **Save and Deploy**
6. Open the **`*.pages.dev`** URL → confirm all pages load

> If the first deploy fails with *"Invalid database UUID
> (REPLACE_WITH_YOUR_D1_DATABASE_ID)"*, that's expected until Step 4 is done —
> the Function needs the real database ID in `wrangler.toml`.

---

## 4. Database — Cloudflare D1 (dashboard only)

**A. Create the database**
1. **dash.cloudflare.com** → top search bar → type **`D1`** → **D1 SQL Database**
2. **Create database** → name: `nyagucha-tributes` → **Create**

**B. Copy the Database ID**
1. On the database page, find **Database ID** (a long UUID like `a1b2c3d4-...`)
2. Copy it
3. Open `wrangler.toml` and replace the placeholder:

```toml
database_id = "PASTE-YOUR-REAL-UUID-HERE"
```

4. Commit + push so Pages redeploys with a valid binding:

```bash
git add wrangler.toml && git commit -m "Add D1 database id" && git push
```

**C. Create the table** (no CLI — use the dashboard console)
1. Database page → **Console** tab
2. Paste the contents of `schema.sql` and run it (creates the `tributes` table + indexes)

> Because the binding lives in `wrangler.toml` (`binding = "DB"`), the Function
> picks it up automatically on the next deploy — no separate dashboard binding step needed.

---

## 5. Photo storage — Cloudflare R2

> **Bindings are managed in `wrangler.toml`, not the dashboard.** Because this
> project has a `wrangler.toml`, the dashboard shows *"Bindings for this project
> are being managed through wrangler.toml"* and the **Add** button is disabled.
> That's expected — all bindings (D1, R2) are added by editing `wrangler.toml`.

**A. Create the bucket** (in the dashboard)
1. **dash.cloudflare.com** → top search bar → type **`R2`** → **R2 Object Storage**
   (first use asks you to enable R2 — free tier)
2. **Create bucket** → name: `nyagucha-images` → **Create**

**B. Add the binding to `wrangler.toml`** (then `git push`)

```toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "nyagucha-images"
```

> ⚠️ **Order matters:** create the bucket **before** pushing the binding, or the
> deploy fails with *"R2 bucket nyagucha-images not found"*.

> **Note:** the bucket is now wired up but **nothing on the site uses it yet** —
> the photo-upload code in `functions/api/tributes.js` is still a TODO. We'll
> build that feature in a later pass; this just gets the plumbing in place.

---

## 6. Environment variables (secrets)

> **You can skip this step entirely for now.** None of the env vars below are
> needed until we build the features that use them. Come back here after the
> matching step is done.

When you do need them: Pages project → **Settings** → **Variables and Secrets**
→ **Production** → **Add variable**.

| Variable | Value | Set it when |
|----------|-------|-------------|
| `NOTIFY_EMAIL` | your Gmail (now), or `tributes@yourdomain` (later) | Step 7 — after Resend is wired |
| `RESEND_API_KEY` | from Resend dashboard | Step 7 — after domain is verified |
| `FROM_EMAIL` | `noreply@yourdomain.com` | Step 7 — after domain is verified |
| `TURNSTILE_SECRET_KEY` | from Turnstile dashboard | Step 8 — after spam protection is wired |

After adding any variable, redeploy: **Deployments** → top deployment → **⋯** → **Retry deployment**.

---

## 7. Email sending — Resend (after domain exists)

1. [resend.com/domains](https://resend.com/domains) → **Add Domain** → your domain
2. Copy the DNS records Resend shows
3. Cloudflare → your domain → **DNS** → **Records** → add each record
4. Wait for **Verified** in Resend
5. **API Keys** → **Create** → copy
6. Put key in Pages env (`RESEND_API_KEY`) → redeploy

---

## 8. Spam protection — Turnstile

1. Cloudflare → **Turnstile** → **Add site**
2. Add the `*.pages.dev` host (and custom domain later)
3. Copy **Site Key** (used in `guestbook.html`) and **Secret Key**
4. Put **Secret Key** in Pages env (`TURNSTILE_SECRET_KEY`) → redeploy

---

## 9. Admin login — Cloudflare Access (you only)

1. Cloudflare → **Zero Trust** ([one.dash.cloudflare.com](https://one.dash.cloudflare.com))
2. Complete first-time Zero Trust setup (free team name)
3. **Access** → **Applications** → **Add an application** → **Self-hosted**
4. Name: `Nyagucha Admin`
5. **Path:** `/admin` (or `/admin/*`)
6. **Policy:** Allow → **Include** → **Emails** → **your admin email only**
7. Save

Test: visit `/admin` → you should get an email-code login.

---

## 10. Notification inbox (after domain) — hand-over ready

1. Cloudflare → your domain → **Email** → **Email Routing** → enable
2. **Create address:** `tributes@yourdomain` → forward to your Gmail (verify)
3. Set `NOTIFY_EMAIL=tributes@yourdomain` in Pages env → redeploy

> **Hand-over later:** Email Routing → edit destination → daughter's Gmail. The site and address stay the same.

---

## 11. Custom domain (when you + sister decide the name)

1. Buy the domain at a registrar
2. Cloudflare → **Add a site** → enter domain → **Free** plan
3. Set the registrar's **nameservers** to Cloudflare's → wait for **Active**
4. Pages project → **Custom domains** → **Set up a custom domain** → enter name → **Activate**
5. Add the domain to **Turnstile** and **Access**, then finish **Resend** (step 7) and **Email Routing** (step 10)

---

## 12. Test end-to-end

| Test | Expected |
|------|----------|
| Open site (no login) | All pages load |
| Submit guestbook | Success message |
| Notification inbox | "New tribute pending" email |
| Open `/admin` | Email-code login, your email only |
| Approve tribute | Appears on Tributes, correct section |
| Submit with photo | Pending → approve → photo shows |

---

## 13. Share with family

1. Send the live URL (no login needed to read)
2. Family browses; sends you photos/text, or you add via admin
3. Later: add family emails to **Access**; hand notification inbox to daughter

---

## Daily operations (after launch)

| Task | How |
|------|-----|
| Edit text/photos | `/admin`, or edit files → `git push` (auto-redeploys) |
| Approve tributes | `/admin` → pending → Approve / Reject |
| Add announcement | `/admin` → Announcements |
| Add admin person | Zero Trust → Access → add email |
| Hand over notifications | Email Routing → change forward target |

---

## Quick command reference

The only commands you need on this machine are `git` (wrangler CLI is blocked by
the proxy — everything else is done in the dashboard):

```bash
# Deploy = push to GitHub (Pages auto-rebuilds)
cd /Users/jabali/Documents/Nyagucha
git add . && git commit -m "update" && git push
```

Done in the **dashboard** instead of the CLI:
- Create D1 database → **D1 SQL Database** → Create
- Run schema → D1 database → **Console** tab → paste `schema.sql`
- Create R2 bucket → **R2 Object Storage** → Create
- Bindings (`DB`, `IMAGES`) → Pages project → **Settings → Bindings**

---

## Known gotchas (things we already hit)

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Missing entry-point to Worker script` / `wrangler deploy` ran | Repo connected as a **Worker**, not Pages | Use **"Looking to deploy Pages? Get started"** (Step 3) |
| `Invalid database UUID (REPLACE_WITH_YOUR_D1_DATABASE_ID)` | `wrangler.toml` still has the placeholder | Put the real D1 **Database ID** in `wrangler.toml` (Step 4), push |
| `wrangler` errors / `Not logged in` / `localhost:8976 refused to connect` | Network proxy blocks the wrangler CLI + OAuth login | Don't use the CLI — do everything in the dashboard |

---

## Order if the domain isn't ready

1. Push code (done) → 2. Pages deploy on `*.pages.dev` → 3. D1 + R2 + bindings →
4. Turnstile + Resend (test) → 5. Access on `/admin` → 6. Test on `pages.dev` →
7. Buy domain → 8. Custom domain + Resend verify + Email Routing → 9. Share with family
