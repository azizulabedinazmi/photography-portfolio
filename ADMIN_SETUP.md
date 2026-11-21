# ⚡ Admin Panel & Decap CMS Setup Guide
**Azizul Abedin Azmi — Photography & Visual Art Portfolio**

This guide provides step-by-step instructions for activating and configuring your **Decap CMS Admin Panel**, managing photo uploads, configuring the **Studio Suite**, and setting custom password/PIN protection for private client proofing galleries.

---

## 📑 Table of Contents
1. [Overview of the Admin Ecosystem](#1-overview-of-the-admin-ecosystem)
2. [Setting Up Netlify Identity & Decap CMS](#2-setting-up-netlify-identity--decap-cms)
3. [Logging Into Decap CMS (/admin/)](#3-logging-into-decap-cms-admin)
4. [Using the Studio Suite (/admin/studio.html)](#4-using-the-studio-suite-adminstudiohtml)
5. [Private Client Proofing Room & PIN Setup](#5-private-client-proofing-room--pin-setup)
6. [Google Drive & Google Photos Live Sync](#6-google-drive--google-photos-live-sync)
7. [Troubleshooting & FAQs](#7-troubleshooting--faqs)

---

## 1. Overview of the Admin Ecosystem

Your portfolio features a dual-tier administration suite:

| Interface | URL | Purpose |
|---|---|---|
| **Decap CMS** | `https://azmi-gallery.netlify.app/admin/` | Form-based content manager. Add new photos, change titles, update camera gear, and publish directly to GitHub without code. |
| **Studio Suite** | `https://azmi-gallery.netlify.app/admin/studio.html` | Client-side power tools: Visual drag-and-drop gallery reordering, auto-EXIF camera metadata extractor, in-browser WebP compressor, and Client Session generator. |
| **Client Proofing Room** | `https://azmi-gallery.netlify.app/client/` | Private client area for photo review and frame hearting with PIN protection. |

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
3. Enter your email address: `azmi00121@gmail.com`.
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
   https://azmi-gallery.netlify.app/admin/
   ```
2. The Netlify Identity login modal will appear.
3. Enter your email (`azmi00121@gmail.com`) and the password you created.
4. You will be greeted by the **Decap CMS Dashboard**:
   - **Gallery Collection**: View and edit all 55+ photo records.
   - **New Entry (+)**: Upload a new photo, select category (*Portraits, Digital Art, Street, Nature*), enter camera body, lens, exposure, and story.
   - **Publish Button**: Click **Publish** at the top right. Netlify will commit the changes to GitHub and automatically redeploy your live site in ~15-20 seconds.

---

## 4. Using the Studio Suite (/admin/studio.html)

Located at `https://azmi-gallery.netlify.app/admin/studio.html`, this standalone tool runs 100% in your browser:

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

## 5. Private Client Proofing Room & PIN Setup

The Client Proofing Room is located at:
```
https://azmi-gallery.netlify.app/client/
```

### Option A: Create Client Sessions via Studio (Recommended)
1. Open `https://azmi-gallery.netlify.app/admin/studio.html` and switch to **Tab 4: 🔒 Client Proofing**.
2. Enter the details:
   - **Client / Project Name**: e.g. `Farhan & Sarah Engagement`
   - **Session URL Slug**: e.g. `farhan-engagement`
   - **4-Digit Access PIN**: e.g. `7842` (or client's choice)
   - **Max Selections**: e.g. `20`
   - **Photo URLs**: Paste the paths or CDN links of the proofs.
3. Click **"Generate Client Session Link"**.
4. The studio produces a direct link:
   ```
   https://azmi-gallery.netlify.app/client/index.html?session=farhan-engagement&pin=7842
   ```
5. Send this link to the client via WhatsApp or Email. When they open it, it authenticates automatically!

### Option B: Changing the Default Fallback PIN
If a client visits `https://azmi-gallery.netlify.app/client/` without a custom session:
- The default demo PIN is **`2026`**.
- To change this globally, open `client/index.html` line 170:
  ```javascript
  const sessionData = storedSession || {
    name: 'Azmi Editorial Portrait Session',
    pin: '2026', // <-- Change this 4-digit code
    maxSelections: 20,
    photos: (window.GALLERY_DATA || []).slice(0, 16).map(p => p.src)
  };
  ```
- Commit and push to update the fallback PIN.

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

### Google Photos Live Album Sync
1. In Google Photos, open any album → click **Share** → **Create public link**.
2. On your live portfolio homepage, click the **"📸 Sync Google Photos"** button in the gallery filter bar.
3. Paste the public album link and click **Sync Stream**.
4. The serverless function (`/.netlify/functions/google-photos-album`) fetches the album frames and streams them directly into your masonry grid.

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
