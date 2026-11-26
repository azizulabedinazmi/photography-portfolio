# ⚡ Admin Panel & Decap CMS Setup Guide
**Azizul Abedin Azmi — Photography & Visual Art Portfolio**

This guide provides step-by-step instructions for activating and configuring your **Decap CMS Admin Panel**, managing photo uploads and using the **Studio Suite**.

---

## 📑 Table of Contents
1. [Overview of the Admin Ecosystem](#1-overview-of-the-admin-ecosystem)
2. [Setting Up Netlify Identity & Decap CMS](#2-setting-up-netlify-identity--decap-cms)
3. [Logging Into Decap CMS (/admin/)](#3-logging-into-decap-cms-admin)
4. [Using the Studio Suite (/admin/studio.html)](#4-using-the-studio-suite-adminstudiohtml)
5. [Google Drive & Google Photos Live Sync](#5-google-drive--google-photos-live-sync)
6. [Troubleshooting & FAQs](#6-troubleshooting--faqs)

---

## 1. Overview of the Admin Ecosystem

Your portfolio features a dual-tier administration suite:

| Interface | URL | Purpose |
|---|---|---|
| **Decap CMS** | `https://azmi.is-cool.dev/admin/` | Form-based content manager. Add new photos, change titles, update camera gear, and publish directly to GitHub without code. |
| **Studio Suite** | `https://azmi.is-cool.dev/admin/studio.html` | Client-side power tools: Visual drag-and-drop gallery reordering, auto-EXIF camera metadata extractor, and in-browser WebP compressor. |

---

## 2. Setting Up Netlify Identity & Decap CMS

Decap CMS uses **Netlify Identity** and **Git Gateway** to securely authenticate you and commit changes directly to your GitHub repository.

### Step 1: Enable Netlify Identity
1. Log into your [Netlify Dashboard](https://app.netlify.com/).
2. Select your portfolio site: **`azmi-gallery`**.
3. In the left navigation, click **Site configuration** (or **Settings**) → **Identity**.
4. Click the **Enable Identity** button.

### Step 2: Restrict Registration to "Invite Only" (Important!)
To ensure random visitors cannot sign up for admin access:
1. Under **Identity** → **Registration preferences**, click **Edit settings**.
2. Change registration from *Open* to **Invite only**.
3. Click **Save**.

### Step 3: Enable Git Gateway
Git Gateway allows Decap CMS to create Git commits using your GitHub credentials behind the scenes:
1. In the same Identity settings page, scroll down to **Services** → **Git Gateway**.
2. Click **Enable Git Gateway**.
3. When prompted, authorize Netlify to connect to your GitHub account (`azizulabedinazmi`).

### Step 4: Invite Your Admin Email & Set Your Password
1. In the main top tabs of your Netlify site dashboard, click **Identity**.
2. Click the **Invite users** button.
3. Enter your own email address.
4. Click **Send**.
5. Check your email inbox for an invitation from Netlify:
   - Subject: *"You've been invited to join azmi-gallery"*
   - Click the **Accept the invite** link in the email.
6. A popup will open on your website asking you to **Choose a Password**.
7. Enter a strong password and complete registration.

---

## 3. Logging Into Decap CMS (/admin/)

1. Open your browser and navigate to:
   ```
   https://azmi.is-cool.dev/admin/
   ```
2. The Netlify Identity login modal will appear.
3. Enter your email and the password you created.
4. You will be greeted by the **Decap CMS Dashboard**:
   - **Gallery Collection**: View and edit all 55+ photo records.
   - **New Entry (+)**: Upload a new photo, select category (*Portraits, Digital Art, Street, Nature*), enter camera body, lens, exposure, and story.
   - **Publish Button**: Click **Publish** at the top right. Netlify will commit the changes to GitHub and automatically redeploy your live site in ~15-20 seconds.

---

## 4. Using the Studio Suite (/admin/studio.html)

Open `https://azmi.is-cool.dev/admin/studio.html` and log in with your Netlify Identity account (the same one as Decap CMS).

### Dashboard
- **Live site** tells you whether your last change is live yet, still publishing, or stuck (then check Netlify deploys).
- Counts of shown / hidden / featured photos, photos vs. digital art, and originals in R2.
- **Needs attention**: problems found by the last build (an image missing from R2, missing alt text, duplicate IDs, unused originals). Click a title to fix it. **Check every image loads** tests each image in your browser.

### Gallery
- **Drag** cards to reorder (in the *All* view).
- **👁** hides a photo from the site without deleting it; **★** puts it in the homepage filmstrip.
- **Click** a photo to edit title, alt text, category, tags or series name, move it to the top, or remove it.
- Changes collect in the yellow bar. Press **Save & publish**: the Studio commits `dist/gallery-data.json` to GitHub and the site is live in 1–2 minutes.

### Upload
1. Drop one or more photos (JPG, PNG, WebP, TIFF, HEIC; up to 80 MB each).
2. Fill in title, alt text (who/what is in it), category and tags. The camera details are read from the photo automatically when the site builds.
3. Press **Upload & publish**. Originals go straight to your private R2 bucket (not GitHub), and the gallery is saved.

**One-time setup:** uploads need a CORS rule on the R2 bucket (Cloudflare → R2 → bucket → Settings → CORS policy):

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

### Drive & Photos
Convert Google Drive share links to direct image URLs, and list photos from a public Google Photos album.

---

## 5. Google Drive & Google Photos Live Sync

### Google Drive Direct Linking
You can host full-resolution images on Google Drive without backend storage:
1. In Google Drive, right-click any photo → **Share** → Set to **"Anyone with the link can view"**.
2. Copy the share link: `https://drive.google.com/file/d/1AbC.../view`.
3. In Decap CMS or `dist/gallery-data.json`, paste either the full link or the file ID.
4. The site's universal resolver automatically converts it to Google's high-speed global CDN:
   ```
   https://lh3.googleusercontent.com/d/1AbC...=w1600
   ```

### Google Photos Album Import (admin only)
1. In Google Photos, open any album → click **Share** → **Create link**.
2. Open the Studio Suite (`/admin/studio.html`) → **Google Drive & Google Photos** tab.
3. Paste the public album link and click **Fetch Album Photos**.
4. Click **Copy As Gallery JSON**, keep the photos you want, and add them to `dist/gallery-data.json` (or via Decap CMS).

The public homepage has no sync button, so visitors can't load other albums into your gallery. The serverless function (`/.netlify/functions/google-photos-album`) only accepts Google Photos share links.

---

## 6. Troubleshooting & FAQs

### Q: Decap CMS says "API_ERROR: Git Gateway Error: [404]"
**Solution**: Make sure **Git Gateway** is enabled in Netlify Site Settings → Identity → Services → Git Gateway, and that you have authorized GitHub permissions.

### Q: I forgot my Decap CMS password
**Solution**: Go to Netlify Dashboard → Identity tab → Find your email → Click **"Send password recovery email"**.

### Q: How do I invite a secondary assistant or collaborator?
**Solution**: In Netlify Dashboard → Identity → Click **"Invite user"** and enter their email address. They will receive their own private login credentials.

---

*Authored for Azizul Abedin Azmi · Portfolio v2.0*
