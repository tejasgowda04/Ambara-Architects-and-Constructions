# Ambara Architects & Construction

Official modern web portal and administrative management suite for **Ambara Architects & Construction**, turnkey residential and commercial builders based in Bengaluru, Karnataka.

---

## 🏛️ Project Overview

- **Landing Page (`index.html`)**: Premium architecture and construction firm showcase with 3D project gallery, smooth animations, customer testimonial carousel, services overview, and interactive enquiry/WhatsApp integration.
- **Admin Dashboard (`admin.html`)**: Real-time business management portal for tracking customer leads, managing project gallery photos, monitoring conversion pipelines, and exporting data.
- **Google Sheets CRM Integration (`js/sheets-api.js` + `google-apps-script.js`)**: Serverless database setup streaming customer enquiries directly into a private Google Spreadsheet.
- **Cloudinary Photo Storage (`js/cloudinary.js`)**: High-performance CDN media uploads with automatic client-side canvas compression fallback.
- **Centralized Configuration (`js/config.js`)**: Single source of truth for all API keys, web app endpoints, and cloud storage credentials.

---

## 📂 File Architecture

```
Ambara/
├── index.html               # Main customer-facing website
├── admin.html               # Administrative dashboard portal
├── google-apps-script.js    # Backend Google Apps Script code for Google Sheets
├── SETUP-GUIDE.md           # Setup instructions for Sheets & Cloudinary
├── README.md                # Repository documentation
├── css/
│   ├── style.css            # Website styles, responsive layouts & animations
│   └── admin.css            # Dark-theme dashboard design system
└── js/
    ├── config.js            # API URLs and cloud credentials
    ├── sheets-api.js        # Google Sheets REST client with offline sync
    ├── cloudinary.js        # Cloudinary CDN uploader & canvas compressor
    ├── main.js              # Website interactions, 3D gallery & form logic
    └── admin.js             # Dashboard controller, analytics & lead drawer
```

---


## 🛠️ Built With

- **HTML5 & CSS3**: Custom design tokens, glassmorphism, responsive grid layouts
- **Modern JavaScript (ES6+)**: Modular architecture, zero heavy external dependencies
- **Google Apps Script**: Serverless HTTP endpoint for Google Sheets CRUD
- **Cloudinary API**: Cloud media storage and responsive image delivery
