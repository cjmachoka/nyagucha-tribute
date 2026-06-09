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
index.html            Home (hero photo + intro + hub)
biography.html        Systematic life chapters (loads from API)
tributes.html         Sectionalized tribute messages (loads from API)
gallery.html          Photo album (loads from API)
guestbook.html        Submit form (moderated)
announcements.html    Family notice + condolence messages (loads from API)
css/styles.css        Crisp design (one stylesheet)
js/site-content.js    Loads hero photo + site settings on every page
js/announcements.js   Loads announcements list
js/gallery.js         Loads gallery photos
js/biography.js       Loads biography chapters + photos
js/tributes.js        Loads + groups tributes by section
js/guestbook.js       Validates + submits guestbook
data/tributes.json    Sample tributes (fallback before D1)
data/biography.json   Biography structure (legacy fallback)

admin/index.html              Tributes (approve/reject)
admin/site.html               Hero photo, hero text, intro, family notice
admin/announcements.html      Create / edit / delete announcements
admin/gallery.html            Upload / edit / delete gallery photos
admin/biography.html          Chapters and chapter photos
js/admin-common.js            Shared admin utilities (auth, fetch, escape)
js/admin.js                   Tributes admin logic
js/admin-site.js              Site settings admin
js/admin-announcements.js     Announcements admin
js/admin-gallery.js           Gallery admin
js/admin-biography.js         Biography admin

functions/_lib/auth.js                          Admin auth (Cf-Access header)
functions/_lib/upload.js                        R2 upload + validation helper
functions/images/[[path]].js                    Streams images from R2 with caching
functions/api/tributes.js                       Public: GET approved, POST pending
functions/api/settings.js                       Public: GET site settings
functions/api/announcements.js                  Public: GET published announcements
functions/api/gallery.js                        Public: GET published photos
functions/api/biography.js                      Public: GET published chapters
functions/api/admin/tributes.js                 Admin: GET by status
functions/api/admin/tributes/[id].js            Admin: PATCH / DELETE
functions/api/admin/settings.js                 Admin: GET / PATCH / POST (hero upload)
functions/api/admin/announcements.js            Admin: GET / POST
functions/api/admin/announcements/[id].js       Admin: PATCH / DELETE
functions/api/admin/gallery.js                  Admin: GET / POST (upload)
functions/api/admin/gallery/[id].js             Admin: PATCH / DELETE
functions/api/admin/biography.js                Admin: GET / POST
functions/api/admin/biography/[id].js           Admin: PATCH / DELETE chapter
functions/api/admin/biography/[id]/photos.js    Admin: GET / POST chapter photos
functions/api/admin/biography/[id]/photos/[photoId].js  Admin: DELETE chapter photo

schema.sql            D1 base: tributes table
schema-cms.sql        D1 CMS: site_settings, announcements, gallery, biography
wrangler.toml         D1 + R2 binding config
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
| D1 database + tributes schema | Done |
| D1 CMS schema (`schema-cms.sql`) | **Run once in D1 Console after pulling this update** |
| R2 bucket created + bound | Done |
| Site live on `*.pages.dev` | Done |
| Admin: Tributes (approve / reject / delete) | Done |
| Admin: Site (hero photo, hero text, intro, family notice) | Done |
| Admin: Announcements (full CRUD) | Done |
| Admin: Gallery (upload / caption / delete) | Done |
| Admin: Biography (chapters + per-chapter photos) | Done |
| Cloudflare Access on `/admin` + `/api/admin` | Done |
| Resend email notification on new tribute | Next |
| Turnstile spam protection | Optional |
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

**C. Create the tables** (no CLI — use the dashboard console)
1. Database page → **Console** tab
2. Paste the contents of `schema.sql` and **Run** — creates the `tributes` table
3. Paste the contents of `schema-cms.sql` and **Run** — creates the CMS tables
   (`site_settings`, `announcements`, `gallery_photos`, `bio_chapters`,
   `bio_chapter_photos`) and seeds them with the current page defaults so the
   site keeps looking the same before any edits

> Because the binding lives in `wrangler.toml` (`binding = "DB"`), the Function
> picks it up automatically on the next deploy — no separate dashboard binding step needed.

> **Re-running the migrations is safe** — every table uses `IF NOT EXISTS` and
> every seed uses `INSERT OR IGNORE`. If a future build adds more tables, you'll
> see a new `schema-*.sql` file to paste into the Console.

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

## 9. Admin login — Cloudflare Access

The admin panel lives at **`/admin`** on the live site. It must be locked so
only the family can approve/reject submissions. Cloudflare Access does this
without any password — the admin gets a one-time login code by email.

**Two protected paths** (the second is the admin API — protect it too or
someone could call it directly):

| Path | Why |
|------|-----|
| `/admin/*` | The admin UI |
| `/api/admin/*` | The admin API (approve, reject, delete) |

### Step-by-step

1. Open **[one.dash.cloudflare.com](https://one.dash.cloudflare.com)** (Zero Trust)
2. First time only: pick a free **team name** (e.g. `nyagucha`)
3. Left sidebar → **Access** → **Applications** → **Add an application** → **Self-hosted**
4. **Application Configuration:**
   - **Application name:** `Nyagucha Admin`
   - **Session duration:** `24 hours`
   - **Application domain:** your `*.pages.dev` URL → **Path:** `admin`
   - **+ Add another domain/path** → same domain → **Path:** `api/admin`
5. **Identity providers:** keep **One-time PIN** ticked (sends a code to the email)
6. **Next** → **Add a policy:**
   - **Policy name:** `Family admins`
   - **Action:** `Allow`
   - **Include** → **Emails** → add:
     - `cjmachoka@gmail.com`
     - `remembering.vincent@gmail.com`
   - *(later: add Vincent's daughter's email when she's ready)*
7. **Next** → **Add application**

### Test it

1. Open your site → add `/admin` to the URL
2. You should see a Cloudflare login page asking for your email
3. Enter `cjmachoka@gmail.com` → check inbox → enter the 6-digit code
4. You land on the admin panel showing pending tributes

Once logged in, the same session works for the API automatically (Access sets a
cookie that the admin page sends along).

---

## 9b. Admin tour (what each page does)

All five admin pages share the same login. Click between them using the row of
tabs (`Tributes · Site · Announcements · Gallery · Biography`).

| Page | URL | What you do here |
|------|-----|------------------|
| Tributes | `/admin/` | Approve, reject, or delete guestbook submissions. Change their section. |
| Site | `/admin/site.html` | Upload the **hero photo**. Edit the hero text (eyebrow, name, subtitle), the opening section, and the family-notice card on the home page. |
| Announcements | `/admin/announcements.html` | Add / edit / delete the items on `/announcements`. Pin important ones to the top. Choose a type (family notice, funeral, memorial, condolence, news, general). |
| Gallery | `/admin/gallery.html` | Upload photos to the gallery (5 MB max, JPG/PNG/WebP). Edit captions. Delete. |
| Biography | `/admin/biography.html` | Add or edit life chapters. Upload multiple photos per chapter with captions. Publish or move to draft. |

### Important: photos and the R2 bucket

- All uploaded photos go to the **`nyagucha-images`** R2 bucket.
- They're served from `/images/<key>` through the `functions/images/[[path]].js`
  endpoint (cached at the edge for a year).
- When you **delete** a photo or chapter, the underlying R2 object is deleted too.

### How content reaches the live site

The public pages now load their content from the API:

- `index.html` → `/api/settings` (hero image + hero text + family notice)
- `announcements.html` → `/api/announcements`
- `gallery.html` → `/api/gallery`
- `biography.html` → `/api/biography`
- `tributes.html` → `/api/tributes`

So a change made in `/admin` is live as soon as you save — no git push needed.

---

## 10. Notification inbox — hand-over ready

Notifications about new pending tributes go to a dedicated Gmail that you'll
hand over to Vincent's daughter when she's ready. This is **separate from your
admin login** (`cjmachoka@gmail.com`), so the inbox can change owners without
affecting site access.

**Designated notification inbox:** `remembering.vincent@gmail.com`

### Before custom domain
- `NOTIFY_EMAIL` = `remembering.vincent@gmail.com`
- The Function (once Resend is wired in Step 7) sends notifications from
  Resend's shared `onboarding@resend.dev` address to that Gmail

### After custom domain (cleaner, professional)
1. Cloudflare → your domain → **Email** → **Email Routing** → enable
2. **Create address:** `tributes@yourdomain` → forward to `remembering.vincent@gmail.com`
3. Update Pages env: `NOTIFY_EMAIL = tributes@yourdomain` → redeploy

### Handing over to the daughter (any time)
- **Easy:** in Gmail, share the password / give her the recovery options
- **Cleaner (after domain):** Email Routing → edit destination → her Gmail. The
  site keeps working, the address `tributes@yourdomain` stays the same, only
  the underlying inbox owner changes
- Also add her email to **Cloudflare Access** (Step 9) so she can use the admin panel

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
