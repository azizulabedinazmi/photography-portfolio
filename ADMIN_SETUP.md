# ⚡ Admin Panel & Decap CMS Setup Guide
**Azizul Abedin Azmi — Photography & Visual Art Portfolio**

This guide provides step-by-step instructions for activating and configuring your **Decap CMS Admin Panel**, managing photo uploads, configuring the **Studio Suite**, and running private client proofing galleries.

---

## 📑 Table of Contents
1. [Overview of the Admin Ecosystem](#1-overview-of-the-admin-ecosystem)
2. [Setting Up Netlify Identity & Decap CMS](#2-setting-up-netlify-identity--decap-cms)
3. [Logging Into Decap CMS (/admin/)](#3-logging-into-decap-cms-admin)
4. [Using the Studio Suite (/admin/studio.html)](#4-using-the-studio-suite-adminstudiohtml)
5. [Client Proofing Manager](#5-client-proofing-manager)
6. [Google Drive & Google Photos Live Sync](#6-google-drive--google-photos-live-sync)
7. [Troubleshooting & FAQs](#7-troubleshooting--faqs)

---

## 1. Overview of the Admin Ecosystem

Your portfolio features a dual-tier administration suite:

| Interface | URL | Purpose |
|---|---|---|
| **Decap CMS** | `https://azmi.is-cool.dev/admin/` | Form-based content manager. Add new photos, change titles, update camera gear, and publish directly to GitHub without code. |
| **Studio Suite** | `https://azmi.is-cool.dev/admin/studio.html` | Client-side power tools: Visual drag-and-drop gallery reordering, auto-EXIF camera metadata extractor, and in-browser WebP compressor. |
| **Client Proofing Manager** | `https://azmi.is-cool.dev/admin/proofing.html` | Create private galleries for clients from uploads, Google Drive or Google Photos, and see which photos they picked. |
| **Client gallery** | `https://azmi.is-cool.dev/client/<code>` | What your client opens. Needs the session PIN. |

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

Located at `https://azmi.is-cool.dev/admin/studio.html`, this standalone tool runs 100% in your browser:

### 1. Visual Drag-and-Drop Reordering (Tab 1)
- See all current photos in a responsive grid.
- Click and drag any photo card to reposition it.
- Click **"Save / Copy Updated JSON"** to copy the sorted dataset.
- Click **"Download JSON"** to save `gallery-data.json` directly.

### 2. Smart Auto-EXIF Reader (Tab 2)
- Drag and drop any raw camera JPEG (from Canon, Sony, Nikon, etc.).
- The tool automatically parses:
  - **Camera Model**: e.g., *Canon EOS 80D*
  - **Lens**: e.g., *EF 50mm f/1.8 STM*
  - **Focal Length**: e.g., *50mm*
  - **Aperture**: e.g., *f/1.8*
  - **Shutter Speed**: e.g., *1/640s*
  - **ISO**: e.g., *100*
  - **Date Shot**
- Pre-fills all metadata fields for instant one-click copying.

### 3. In-Browser WebP Compressor (Tab 3)
- Drop high-res camera files (up to 25MB).
- Adjust quality slider (default: `82%`, max width `2000px`).
- In-browser HTML5 Canvas compresses large camera files down to ~400–700KB WebP images with zero quality loss.
- Download the compressed WebP file to drop into your `dist/assets/Photography/` folder.

---

## 5. Client Proofing Manager

Open **`https://azmi.is-cool.dev/admin/proofing.html`** and log in with your Netlify Identity account (the same one you use for Decap CMS).

### Where the data lives
Client sessions, PINs, uploaded photos and client picks are stored in **Netlify Blobs**, Netlify's private storage for your site. Nothing is committed to GitHub, so none of it shows up in the public repository. Blobs works on every Netlify plan and needs no setup.

### Create a client gallery
1. Click **+ New client session**.
2. Fill in the title, the client's name, and a message they'll see at the top. A random 6-digit PIN is generated for you; change it if you like.
3. Set **Max selections** (0 = no limit), an optional **expiry date**, and whether the client may **download** uploaded photos.
4. Click **Save session**. The share link and photo tools appear.

### Add photos (mix any of these)
- **Upload**: drop photos on the upload box. Each one is resized to 2400px WebP in your browser (usually 200–500 KB) and stored privately. Uploaded photos can only be viewed through a short-lived link the client gets after entering the PIN.
- **Google Drive**: paste file links or IDs, one per line. Each file must be shared as *Anyone with the link*. To import a whole folder, add a `GDRIVE_API_KEY` environment variable in Netlify (Site settings → Environment variables) and paste the folder link.
- **Google Photos**: in Google Photos open the album → **Share** → **Create link**, then paste it and click **Import album**.

Drag thumbnails to change the order. Frame numbers (#1, #2…) follow this order.

Drive and Google Photos images are loaded straight from Google, so anyone who has the exact image URL can open it. Use **Upload** for anything that must stay fully private.

### Share it
- **Copy invite message** gives you a ready-to-send text with the link and PIN.
- Links look like `https://azmi.is-cool.dev/client/sarah-graduation-7k2qp`. The random ending means links can't be guessed.
- If you can, send the PIN in a different message from the link.

### What the client sees
They enter the PIN, browse the photos (tap for full screen, swipe or arrow keys to move), tap ♡ on their favourites, add an optional note, and press **Submit picks**. They can change and resubmit until the gallery closes. After 8 wrong PINs, the gallery locks for 15 minutes.

### See the picks
Open the session in the manager. **Client's picks** shows the chosen frames, the note and when they submitted. Use **Copy list** or **Download .txt** to work from it, or **Clear** to let them start over.

### Close or delete
- Set **Status → Closed** (or an expiry date) to stop the client opening the gallery.
- **Delete session** permanently removes the gallery, its uploaded photos and the picks.

---

## 6. Google Drive & Google Photos Live Sync

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

## 7. Troubleshooting & FAQs

### Q: Decap CMS says "API_ERROR: Git Gateway Error: [404]"
**Solution**: Make sure **Git Gateway** is enabled in Netlify Site Settings → Identity → Services → Git Gateway, and that you have authorized GitHub permissions.

### Q: I forgot my Decap CMS password
**Solution**: Go to Netlify Dashboard → Identity tab → Find your email → Click **"Send password recovery email"**.

### Q: How do I invite a secondary assistant or collaborator?
**Solution**: In Netlify Dashboard → Identity → Click **"Invite user"** and enter their email address. They will receive their own private login credentials.

---

*Authored for Azizul Abedin Azmi · Portfolio v2.0*
