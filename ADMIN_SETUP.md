# ⚡ Admin Guide
**Azizul Abedin Azmi — Photography & Digital Art Portfolio**

Everything is managed from one place: **https://azmi.is-cool.dev/admin/**

---

## 1. One-time setup (Netlify)

1. **Identity**: Netlify → *Site configuration → Identity* → **Enable Identity**.
2. **Invite only**: *Identity → Registration* → **Invite only**, so nobody else can sign up.
3. **Git Gateway**: *Identity → Services → Git Gateway* → **Enable**. This lets the admin save to GitHub.
4. **Invite yourself**: *Identity → Invite users* → your email. The email link opens the admin, where you set your password.
5. **R2 variables**: the four `R2_*` variables must be set in *Environment variables* (see README → Photo Storage).
6. **R2 CORS rule** (needed for uploads): Cloudflare → R2 → your bucket → *Settings* → *CORS policy*:

```json
[
  {
    "AllowedOrigins": ["https://azmi.is-cool.dev"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 2. Using the admin

Log in at `/admin/`. Changes collect in a yellow bar at the top; **Save & publish** commits them to GitHub and the site is live in 1–2 minutes. **Discard** throws them away.

### 📊 Dashboard
- **Live site**: whether your last change is live, still publishing, or stuck (then open *Netlify deploys*).
- Counts: shown, hidden, featured, photos, digital art, originals in R2.
- **Needs attention**: problems found by the last build (an image missing from R2, missing alt text, duplicate IDs, unused originals). Click a title to fix it. **Check every image loads** tests every image in your browser.
- Quick links: Netlify deploys, contact-form messages, R2, Search Console, Analytics, admin users.

### 🖼️ Gallery
- **Drag** to reorder (in the *All* view). Filter by Photos, Art, Series, Featured or Hidden, or search.
- **👁 Hide** takes a photo off the site but keeps it in the list. **★ Feature** puts it in the homepage filmstrip (with none featured, the first 18 are shown).
- **Select** → pick several → Hide, Show, Feature, Unfeature, Move to top or Remove them at once.
- **Click a photo** to edit everything: title, alt text, category, tags, series name, hidden/featured, and under *Advanced* the ID, image path and camera line.
  - **Series photos**: add photos (uploaded to R2), reorder, remove, or make one the cover (★).
  - **Digital art**: shows its Replay steps and edit details (refreshed with `npm run sync-art`).
  - Move to top, Duplicate (the copy starts hidden), View on site, Remove.

### ⬆️ Add
- **Upload**: drop photos, give each a title, alt text (who / what is in it), category and tags. Originals go straight to private R2, never GitHub. The build makes the web copies and reads the real camera EXIF.
- **Upload as one series**: tick it before uploading several photos; the first one becomes the cover.
- **Add by link**: add an image that's already online (e.g. a digital artwork). The build copies it into R2 and serves it from your site.

### 🕘 History
Every save is a version. **Bring back this version** loads an older gallery as unsaved changes: check it, then Save & publish (or Discard).

### ☁️ Drive & Photos
Turn a Google Drive share link into a direct image link (use it in *Add by link*), or list the photos in a public Google Photos album.

---

## 3. Troubleshooting

- **Log in does nothing / no login window**: reload the page; check that Identity is enabled.
- **“GitHub request failed (404/401)” when saving**: Git Gateway is off or your login expired. Enable Git Gateway, log out and in again.
- **“The gallery changed elsewhere”**: someone (or another tab) saved in the meantime. Reload and redo your change.
- **“Upload blocked”**: the R2 CORS rule from step 1.6 is missing.
- **Forgot your password**: on the login window click *Forgot password?*; the email link brings you back to the admin.
- **Add another admin**: Netlify → Identity → *Invite users*.
