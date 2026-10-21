# Ambara Architects & Construction — Setup & User Guide

Welcome to the organized, production-ready codebase for **Ambara Architects & Construction**.

---

## 📁 Clean Codebase Structure

```text
Ambara/
├── admin.html               # Admin Dashboard (KPIs, enquiries, gallery & settings)
├── ambara-arcon.html        # Public Website (Hero, 3D carousel, bento, contact form)
├── google-apps-script.js    # Backend script for Google Sheets database
├── SETUP-GUIDE.md           # This step-by-step setup guide
├── css/
│   ├── admin.css            # Clean, modular stylesheet for the Admin Panel
│   └── style.css            # Responsive, luxury aesthetic stylesheet for Website
└── js/
    ├── admin.js             # Admin dashboard controller (views, status, drawer)
    ├── cloudinary.js        # Cloudinary CDN photo upload manager & fallback
    ├── main.js              # Website interactions (3D carousel, lightbox, form)
    └── sheets-api.js        # Google Sheets API connector & synchronization
```

---

## 1. Setting up Google Sheets as Customer Database

You get a free, unlimited Google Sheets database where all enquiries from the website automatically sync in real-time.

### Step 1: Create your Google Sheet
1. Go to [sheets.new](https://sheets.new) in your browser.
2. Title the sheet: **Ambara Customer Enquiries**.

### Step 2: Paste the Apps Script
1. In Google Sheets, click **Extensions** > **Apps Script** in the top menu bar.
2. Delete any boilerplate code in the script editor.
3. Open `google-apps-script.js` from this project folder, copy everything, and paste it into the editor.
4. Click the disk icon (💾 **Save**) or press `Ctrl + S`.

### Step 3: Deploy as Web App
1. Click the blue **Deploy** button (top right) > **New deployment**.
2. Click the gear icon (⚙️ *Select type*) and choose **Web app**.
3. Fill in:
   - **Description**: `Ambara Enquiries API`
   - **Execute as**: `Me (<your-email>)`
   - **Who has access**: `Anyone` *(Crucial: This enables the website and admin dashboard to save enquiries)*
4. Click **Deploy**.
5. When prompted, click **Authorize access**, select your Google account, click **Advanced**, and proceed to grant permissions.
6. Copy the **Web app URL** (starts with `https://script.google.com/macros/s/.../exec`).

### Step 4: Connect to Admin Dashboard
1. Open `admin.html` in your browser.
2. Sign in with password: `ambara123`.
3. In the left navigation, click **Settings**.
4. Under **Google Spreadsheet Database**, paste your Web app URL.
5. Click **Save & Test Connection**. You will see:
   > `✓ Connected to Google Sheet successfully!`

*From now on, whenever a customer fills out the contact form on `ambara-arcon.html`, it is automatically added to your Google Sheet AND appears in your Admin Dashboard!*

---

## 2. Setting up Cloudinary for Photo Storage (Recommended)

Cloudinary provides **25GB of free cloud storage**, automatic WebP/AVIF compression, and ultra-fast worldwide CDN delivery.

### Step 1: Create a Free Cloudinary Account
1. Sign up free at [cloudinary.com](https://cloudinary.com) (no credit card required).
2. On your Cloudinary Dashboard, note your **Cloud name** (e.g., `ambara-builds`).

### Step 2: Create an Unsigned Upload Preset (Takes 60 seconds)
1. In Cloudinary, click the **Settings gear icon** (bottom left).
2. Go to the **Upload** tab.
3. Scroll down to **Upload presets** and click **Add upload preset**.
4. Set:
   - **Upload preset name**: e.g., `ambara_uploads`
   - **Signing Mode**: Change from *Signed* to **Unsigned** *(Crucial)*
   - **Folder**: `ambara_projects`
5. Click **Save** (top right).

### Step 3: Paste into Admin Settings
1. Go to `admin.html` > **Settings**.
2. Under **Cloudinary Photo Storage**:
   - Enter your **Cloud Name**
   - Enter your **Upload Preset**
3. Click **Save Cloudinary Settings**.

### Step 4: Uploading Photos
- Go to the **Projects** tab in `admin.html`.
- Drag and drop your project photos or click the box to select files.
- Photos are uploaded directly to Cloudinary and instantly appear on `ambara-arcon.html` in the 3D gallery and fullscreen lightbox.
- You can change titles, assign categories (*Completed, Ongoing, Elevation, Interior*), reorder with arrows, or hide/show anytime!

*(Note: Even if you don't configure Cloudinary right away, the dashboard includes an automatic smart canvas compressor that lets you upload photos locally!)*

---

## 3. Features & Admin Capabilities

- **Real-Time Synchronisation**: Click **Sync Google Sheets** in the Enquiries tab anytime to pull the latest entries.
- **Client Detail Drawer**: Click any customer row to view details, one-click WhatsApp, call, or email, update lead stages (*New, Contacted, Site visit, Quotation, Won, Lost*), and write internal notes.
- **CSV Export**: Click **Export CSV** in the Enquiries tab to download spreadsheet reports for offline use or accounting.
- **Password Protection**: Update your admin password anytime from the **Settings** view.
