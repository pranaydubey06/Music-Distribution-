# Spilrix Distribution

A premium, minimalist artist-submission portal. Artists register with email
and password (Supabase Auth, with email verification), then submit
Singles/EPs/Albums for review. Admins triage everything from a hidden control
room at `/spilrix-admin`, track releases through to "Live," and hand off files
for manual upload to streaming platforms.

Built with Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase.

---

## ⚠️ Upgrading an existing Spilrix project?

Run these migration scripts **in order**, once each, in your Supabase SQL
Editor — do NOT run `supabase/schema.sql` on an existing project (that file
is for brand-new databases only):

1. `supabase/migration-ep-album.sql` — if you haven't already (Release +
   Track structure, EP/Album support).
2. `supabase/migration-profile-uid-scheduled-delete.sql` — artist UID, social
   links, and the scheduled-deletion columns on releases.
3. `supabase/migration-draft-status.sql` — allows 'Draft' as a release status.
4. `supabase/migration-upload-release-metadata.sql` — stores the complete
   six-step upload workflow metadata (release credits, platforms, and track
   credits) used by the Upload Release page.

5. `supabase/migration-artist-access.sql` — adds the admin-controlled upload access and its append-only access history.

Each script is safe to run on a database with real data already in it.

---

## 1. How it's wired together

```
Browser (anon key)              Server (service role key)
─────────────────────           ──────────────────────────
Supabase Auth (email+password) ─▶ Verified on every API call:
  session JWT attached to            supabase.auth.getUser(token) resolves
  every fetch('/api/...')            the token to a user, then to the one
                                      artist row that user owns.

Direct-to-Storage uploads  ──▶  Supabase Storage buckets
                                 ('profiles', 'songs', 'covers' — public
                                  read, open insert, no update/delete)

fetch('/api/...')           ──▶  Route Handlers (/app/api/**)
                                 → requireArtist()/requireUser() verify the
                                   Bearer token, then all Supabase table
                                   reads/writes happen server-side via the
                                   service role key (RLS denies anon and
                                   authenticated entirely — see below)

sessionStorage ('spilrix_admin_passcode')
  → admin gate, checked server-side on every /api/admin/** call
```

**Why route DB access through API routes instead of letting the browser talk
to Supabase tables directly?** Rather than write per-table RLS policies
against `auth.uid()` and open the tables up to the anon/authenticated keys
(which any visitor could call from devtools), every table read/write goes
through a Route Handler using the **service role** key, which never reaches
the browser. The route handler independently re-derives the caller's identity
from their Supabase session token (`requireArtist`/`requireUser` in
`lib/api-auth.ts`) — a browser can never simply claim an `artist_id` in a
request and have it trusted. `artists`, `releases`, `tracks`, and `tickets`
keep RLS *enabled with zero policies* — fully locked to anon and
authenticated roles, accessible only server-side. The Storage buckets are
the exception: file uploads happen directly from the browser to avoid
Vercel's request-body size limits, so they do need an anon-accessible insert
policy (see the security notes below).

## 2. The release model: Release + Tracks

A **release** is the "project" — a Single, EP, or Album. Its songs live in a
separate **tracks** table; a Single just happens to have exactly one. Status,
cover art, and release date all live on the release, not per-track — a whole
EP moves through review together, the way it would with a real distributor.

```
Release (Single / EP / Album)
  title, cover_art_url, release_date, status, rejection_reason,
  spotify_url, apple_music_url, youtube_url,
  scheduled_deletion_at, deletion_reason
  │
  └── Tracks (1 or more)
        song_title, genre, audio_url, explicit, songwriter, track_number
```

### Status lifecycle

```
Draft → Pending Review → Approved → Sent to Platforms → Live
                 │
                 └────────────────────────────────────────▶ Rejected → (resubmit) → Pending Review
```

- **Draft** — saved but not submitted. Only the artist can see it; it never
  reaches the admin panel. Can be edited, deleted outright, or duplicated.
- **Pending Review** — submitted, awaiting your review. Can still be edited
  or deleted outright by the artist (no admin action needed yet).
- **Approved** — you've reviewed it and it's good to go out.
- **Sent to Platforms** — you've handed the files off (e.g. to whoever
  manually uploads to Spotify/Apple Music/etc.).
- **Live** — it's actually live. Admin can attach Spotify/Apple Music/YouTube
  links here, which then show up on the artist's Status page as clickable
  "Listen on ___" buttons.
- **Rejected** — comes with a reason you write when rejecting. The artist
  sees that reason on their Status page along with a **Resubmit** button,
  which reopens the same form (pre-filled) to fix and resend. Resubmitting
  resets status to Pending Review.

Any release, regardless of status, can be **duplicated** into a fresh Draft —
useful for reusing most of an EP's metadata for a new single, or recovering
from a release you want to substantially redo.

### Deletion is scheduled, not instant

Clicking "Delete" on a release doesn't remove it right away. Admin writes a
reason and picks a window (24 or 48 hours). The release stays visible — on
both the admin panel and the artist's own Status page — with a warning
banner showing the deadline and reason, and admin can **cancel** the
scheduled deletion any time before it fires.

There's no dedicated cron job behind this. Vercel's Hobby plan only runs
scheduled functions once a day with imprecise timing, which isn't a good fit
for a 24h/48h deadline. Instead, `lib/process-scheduled-deletions.ts` runs at
the top of both `GET /api/releases` and `GET /api/admin/releases` — so a
release past its deadline gets permanently deleted (DB rows + every Storage
file) the next time anyone loads a page that lists releases. For an actively
used app this is effectively real-time; if nobody opens the site for a few
days, cleanup just waits for the next visit.

## 3. Folder structure

```
app/
├── page.tsx                       Login gateway (/)
├── layout.tsx                     Root layout, fonts, metadata
├── globals.css                    Design tokens (Tailwind v4 @theme)
├── dashboard/
│   ├── layout.tsx                 Session guard + TopNav + Sidebar shell
│   ├── page.tsx                   Home — welcome + quick stats
│   ├── upload/page.tsx            Upload tab (ReleaseForm)
│   ├── status/page.tsx            Status tab — resubmit, live links, deletion warning
│   ├── support/page.tsx           Support tab — submit a ticket
│   ├── analytics/page.tsx         Release counts by type/status + timeline
│   ├── royalties/page.tsx         "Coming soon" placeholder
│   └── notifications/page.tsx     "Coming soon" placeholder
├── spilrix-admin/
│   ├── layout.tsx                 noindex metadata
│   └── page.tsx                   Passcode gate + roster + artist drill-down
└── api/
    ├── artists/
    │   ├── route.ts                POST create artist
    │   └── [id]/route.ts           GET/PATCH own profile (name/photo/social links)
    ├── releases/
    │   ├── route.ts                POST create release+tracks (Draft or Pending Review)
    │   │                              · GET own releases (also runs scheduled-deletion sweep)
    │   └── [id]/
    │       ├── route.ts                PATCH edit (Draft/Pending/Rejected only, artist-owned)
    │       │                              · DELETE outright (Draft/Pending only, artist-owned)
    │       ├── submit/route.ts         POST promote a Draft to Pending Review
    │       └── duplicate/route.ts      POST copy a release (+ its files) into a new Draft
    ├── tickets/route.ts           POST create ticket
    └── admin/
        ├── auth/route.ts          POST verify passcode
        ├── artists/route.ts       GET all artists (passcode-protected)
        ├── storage/route.ts       GET Storage usage across all buckets
        ├── tickets/
        │   ├── route.ts            GET all tickets (passcode-protected)
        │   └── [id]/route.ts       PATCH ticket status (passcode-protected)
        └── releases/
            ├── route.ts            GET all releases+tracks (passcode-protected)
            └── [id]/
                ├── route.ts             PATCH status lifecycle
                ├── schedule-deletion/   POST set deadline + reason
                └── cancel-deletion/     POST undo a scheduled deletion

components/
├── ui/                            Button, Card, Field (Input/Select/Textarea)
├── StatusBadge.tsx                The recurring "catalog stamp" status pill
├── Logo.tsx
├── EqualizerAnimation.tsx         Animated bars next to the dashboard wordmark
├── dashboard/
│   ├── SessionProvider, TopNav, Sidebar, MobileTabs
│   ├── ReleaseForm.tsx            Shared create/resubmit form (release + tracks)
│   ├── ProfilePanel.tsx           View/edit profile modal — UID, photo, social links
│   └── ComingSoon.tsx             Shared placeholder for Royalties/Notifications
└── admin/
    ├── AdminGate, ArtistRoster (UID + search), ArtistDetailPanel (tickets toggle)
    ├── ReleaseManager.tsx          Per-artist release cards: full status actions,
    │                               scheduled deletion, ZIP download, days-until-release
    └── TicketsList.tsx

lib/
├── supabase/
│   ├── client.ts                  Browser client (anon key) — Storage only
│   ├── server.ts                  Server client (service role) — API routes only
│   └── storage-path.ts            Public URL → {bucket, path} parser (for deletes)
├── process-scheduled-deletions.ts Finds + permanently deletes overdue releases
├── browser-storage.ts             Notifying localStorage/sessionStorage helpers
├── use-browser-storage-value.ts   useSyncExternalStore-based read hook
├── session.ts                     Legacy pre-auth session cleanup (clearSession) + ArtistSession type
├── admin-auth.ts                  Passcode header check for /api/admin/**
├── types.ts                       Artist / Release / Track / Ticket types
└── utils.ts                       cn, dates, slugify, getDaysUntil, formatBytes

supabase/
├── schema.sql                                    Fresh-install schema (new projects only)
├── migration-ep-album.sql                        Upgrade: Release+Track structure
├── migration-profile-uid-scheduled-delete.sql    Upgrade: UID, social links, scheduled delete
└── migration-draft-status.sql                    Upgrade: allows Draft as a release status
```

## 4. Set up Supabase

**Brand-new project:**
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
3. Go to **Settings → API** and copy the values described below.

**Existing project:** run both migration scripts in order — see the warning
at the top of this README.

Either way, you'll need from **Settings → API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret —
  never prefix it with `NEXT_PUBLIC_`, never commit it)

## 5. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_PASSCODE=choose-a-long-random-passcode
STORAGE_LIMIT_GB=1
```

Add the same variables in **Vercel → Project → Settings → Environment
Variables** before deploying.

## 6. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. The admin panel is at
`http://localhost:3000/spilrix-admin`.

## 7. Deploy to Vercel

```bash
npm i -g vercel   # if you don't have it
vercel
```

Or connect the repo in the Vercel dashboard. Set the environment variables
there, then deploy — `next build` runs clean with no required build-time
secrets (everything Supabase-related is read lazily at request time, never
at build time).

---

## Artist dashboard

Sidebar tabs: **Home** (welcome + quick stats), **Upload**, **Status**,
**Support**, **Analytics** (release counts by type/status + a submission
timeline), plus **Royalties** and **Notifications** as disabled "Coming
soon" entries (click shows a brief toast, doesn't navigate).

**Upload** can save as a **Draft** (visible only to the artist — admins never
see drafts) or submit straight to Pending Review. From **Status**, every
release gets contextual actions based on its state:
- **Draft / Pending Review** — Edit (full form, including swapping audio
  files) or Delete outright, no admin involvement needed.
- **Rejected** — Resubmit (same as Edit, but resets status to Pending Review)
  alongside the rejection reason the admin left.
- **Any status** — Duplicate, which copies the release (and makes
  independent copies of its cover art + audio files in Storage, so deleting
  the original later doesn't break the copy) into a fresh Draft.

Clicking the profile photo/name in the top bar opens the **Profile panel**:
your UID (with a copy button), name, photo, "member since" date, social
links (Instagram/YouTube/Spotify), an edit mode for all of the above, and
Sign out.

## Admin panel features

- **Drafts are invisible to admins** — `GET /api/admin/releases` explicitly
  excludes them. A release only enters the admin's world once the artist
  submits it (Pending Review or later).
- **Click an artist card** to open a panel scoped to just that artist —
  their releases and support tickets, all in one place. Each artist's card
  shows their **UID**, and the search box matches on UID as well as name.
- **Full release lifecycle controls**: Approve, Reject (with a reason the
  artist will see), Mark Sent, Mark Live (attach Spotify/Apple Music/YouTube
  links), and **Delete** — which opens a reason + 24h/48h window picker
  rather than deleting immediately (see "Deletion is scheduled, not
  instant" above). A scheduled deletion can be cancelled any time before
  its deadline.
- **Download ZIP** on any release — bundles the cover art and every track's
  audio file into one .zip, built right in your browser (no server-side
  size/time limits to worry about). This is the file you'd hand off for
  manual upload to Spotify/Apple Music/etc.
- **Days-until-release badge** on every release, and the list is sorted by
  urgency (soonest release date first).
- **Support tickets** show up inside each artist's panel with a
  Resolve/Reopen toggle, and a **show/hide** button to collapse that section.
  Artist cards show a small blue "N open" badge.
- **Storage usage meter** at the top of the page, color-coded as it fills up.
  Defaults to the 1 GB free-tier allowance — set `STORAGE_LIMIT_GB` if you've
  upgraded plans.

## Security notes — read this before going to production

Artist identity is backed by real **Supabase Auth** (email + password, with
email verification). Every artist-scoped API route re-derives the caller's
identity server-side from their session token — a browser can never simply
claim someone else's `artist_id` and have it trusted (see `requireArtist`
in `lib/api-auth.ts`). A few trade-offs are still worth knowing before you
launch publicly:

- **`/spilrix-admin` is hidden, not authenticated** in the traditional sense.
  The passcode check happens server-side (`ADMIN_PASSCODE` is never sent to
  the browser bundle), which is meaningfully better than a client-only check
  — but it's still a single shared secret with no audit trail, per-admin
  accountability, or rate limiting on login attempts. If more than one person
  needs admin access, consider swapping this for real per-user auth.
- **Storage uploads are open to anyone** who can reach the site. The
  `profiles`, `songs`, and `covers` buckets accept inserts from any visitor,
  signed in or not (no update/delete), which is what keeps direct-to-storage
  uploads simple and avoids Vercel's request body size limits — but it also
  means someone could script uploads directly against your Supabase Storage
  API, bypassing the app entirely and the app's own file-type/size checks.
  If abuse becomes a problem, move uploads through a signed-URL flow that's
  scoped to the requesting artist's session instead.
- **Payment verification needs a real gateway before launch.** The
  `/api/payments/verify` route currently activates a plan as soon as it's
  called by an authenticated artist — there's no actual charge, and no
  signature/webhook verification against a payment gateway (Razorpay,
  Stripe, etc.). Wire up real gateway verification (or webhook-based
  confirmation) before accepting real payments in production.

## Design notes

The UI is neobrutalist: thick black borders, hard offset shadows (no blur),
flat poster colors, and a tactile "press down" interaction on every button —
the shadow collapses and the element shifts down-right on click. It leans
into a punk-flyer/zine energy, which fits an indie music distributor better
than a slick SaaS look. `Archivo Black` carries the wordmark and headlines;
`Space Grotesk` handles UI text; `JetBrains Mono` is used for anything
catalog-like — status stamps, timestamps, UIDs — echoing a cassette tape's
printed labeling. The signature motif is the **status badge**: a slightly
rotated rubber stamp whose color tracks the release lifecycle (canary →
cobalt → ink → lime, with punch as the rejected branch).

The dashboard and admin panel also use a **custom reticle cursor** (a thick
black-and-white crosshair with a canary center dot, defined in `globals.css`
via the `.brutal-cursor` class) instead of the default arrow — text fields
keep the normal text caret so typing isn't affected. The dashboard header has
a small **animated equalizer** next to the wordmark (`EqualizerAnimation`
component), bouncing in the brand's four accent colors. Both respect
`prefers-reduced-motion`.
