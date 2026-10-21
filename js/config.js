/**
 * =========================================================================
 * AMBARA ARCHITECTS & CONSTRUCTION — API & INTEGRATION CONFIGURATION
 * 
 * Edit your API values, URLs, and keys directly in this file.
 * Both the website (index.html) and admin dashboard (admin.html) read from here.
 * =========================================================================
 */

window.AMBARA_CONFIG = {
  /**
   * 1. GOOGLE SPREADSHEET DATABASE (Customer Enquiries)
   * The Google Apps Script Web App URL connected to your Google Sheet:
   */
  GOOGLE_SHEETS_URL: "https://script.google.com/macros/s/AKfycbzfuG3VK5uNyQN66-g0vE0gie-VeAs_FfD1vQJ3vnGLS805qlWeenm-6b9bxscrjQMB3Q/exec",

  /**
   * 2. CLOUDINARY PHOTO STORAGE (Project Gallery)
   * Free 25GB cloud hosting from cloudinary.com:
   */
  CLOUDINARY_CLOUD_NAME: "ambara-builds",      // <-- Paste your Cloud Name here (e.g. "ambara-builds")
  CLOUDINARY_UPLOAD_PRESET: "ambara_projects"    // <-- Paste your Unsigned Upload Preset name here (e.g. "ambara_uploads")
};
