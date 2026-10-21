/**
 * =========================================================================
 * Ambara Sheets API Client (js/sheets-api.js)
 * Connects frontend form & admin dashboard to Google Sheets via Apps Script
 * =========================================================================
 */

(function (window) {
  'use strict';

  var STORAGE_KEY_ENQ = 'wsite_enq';
  var STORAGE_KEY_PROJ = 'wsite_proj';

  var AmbaraSheets = {
    /**
     * Get the configured Google Apps Script Web App URL from js/config.js
     */
    getUrl: function () {
      if (window.AMBARA_CONFIG && window.AMBARA_CONFIG.GOOGLE_SHEETS_URL) {
        return window.AMBARA_CONFIG.GOOGLE_SHEETS_URL.trim();
      }
      return localStorage.getItem('ambara_sheets_url') || '';
    },

    /**
     * Test connection to the Google Apps Script endpoint
     */
    ping: async function () {
      var url = this.getUrl();
      if (!url) {
        return { ok: false, message: 'No Google Apps Script URL configured in js/config.js.' };
      }

      var pingUrl = url + (url.indexOf('?') === -1 ? '?' : '&') + 'action=ping&_t=' + Date.now();
      try {
        var response = await fetch(pingUrl, { method: 'GET', mode: 'cors' });
        if (response.ok) {
          var data = await response.json();
          return { ok: true, message: data.message || 'Connected successfully!', data: data };
        }
        return { ok: false, message: 'Server returned HTTP status: ' + response.status };
      } catch (err) {
        return { ok: false, message: 'Could not connect. Ensure Apps Script is deployed with "Who has access: Anyone": ' + err.message };
      }
    },

    /**
     * Save a customer enquiry
     * Stores in local storage first for zero latency, then posts to Google Sheets
     */
    saveEnquiry: async function (enquiry) {
      if (!enquiry.id) enquiry.id = Date.now().toString();
      if (!enquiry.date) enquiry.date = new Date().toISOString();
      if (!enquiry.status) enquiry.status = 'New';
      if (!enquiry.notes) enquiry.notes = '';

      // 1. Immediately store in localStorage so Admin sees it locally right away
      try {
        var current = JSON.parse(localStorage.getItem(STORAGE_KEY_ENQ) || '[]');
        var existingIdx = current.findIndex(function (x) { return x.id == enquiry.id; });
        if (existingIdx > -1) {
          current[existingIdx] = Object.assign({}, current[existingIdx], enquiry);
        } else {
          current.unshift(enquiry);
        }
        localStorage.setItem(STORAGE_KEY_ENQ, JSON.stringify(current));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }

      // 2. Dispatch to Google Sheets
      var url = this.getUrl();
      if (!url) {
        return { ok: true, source: 'local', message: 'Saved locally (Google Sheet URL not configured yet).' };
      }

      try {
        var payload = JSON.stringify(enquiry);
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: payload
        });

        return { ok: true, source: 'cloud', message: 'Saved to Google Sheets & locally.' };
      } catch (err) {
        console.warn('Failed to post to Google Sheets, saved locally:', err);
        return { ok: true, source: 'local_fallback', message: 'Saved locally. Sync later.' };
      }
    },

    /**
     * Fetch all enquiries from Google Sheets and merge with local
     */
    fetchEnquiries: async function () {
      var url = this.getUrl();
      if (!url) {
        var localData = JSON.parse(localStorage.getItem(STORAGE_KEY_ENQ) || '[]');
        return { ok: true, data: localData, source: 'local' };
      }

      var fetchUrl = url + (url.indexOf('?') === -1 ? '?' : '&') + 'action=get&_t=' + Date.now();
      try {
        var res = await fetch(fetchUrl, { method: 'GET', mode: 'cors' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        
        var json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          var local = JSON.parse(localStorage.getItem(STORAGE_KEY_ENQ) || '[]');
          var map = new Map();

          // Remote first
          json.data.forEach(function (item) {
            if (item && item.id) map.set(String(item.id), item);
          });

          // Local overlay
          local.forEach(function (item) {
            if (item && item.id && !map.has(String(item.id))) {
              map.set(String(item.id), item);
            }
          });

          var merged = Array.from(map.values()).sort(function (a, b) {
            return new Date(b.date || 0) - new Date(a.date || 0);
          });

          localStorage.setItem(STORAGE_KEY_ENQ, JSON.stringify(merged));
          return { ok: true, data: merged, source: 'cloud' };
        }
        throw new Error(json.message || 'Invalid data returned');
      } catch (err) {
        console.warn('Failed to fetch from Google Sheets:', err);
        var fallback = JSON.parse(localStorage.getItem(STORAGE_KEY_ENQ) || '[]');
        return { ok: false, data: fallback, source: 'local', error: err.message };
      }
    },

    /**
     * Update status or notes for an enquiry
     */
    updateEnquiry: async function (id, updates) {
      // 1. Update locally
      try {
        var list = JSON.parse(localStorage.getItem(STORAGE_KEY_ENQ) || '[]');
        var found = list.find(function (x) { return x.id == id; });
        if (found) {
          Object.assign(found, updates);
          localStorage.setItem(STORAGE_KEY_ENQ, JSON.stringify(list));
        }
      } catch (e) {}

      // 2. Sync to cloud
      var url = this.getUrl();
      if (!url) return;

      try {
        var payload = Object.assign({ action: 'update', id: String(id) }, updates);
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Could not sync update to Google Sheets:', err);
      }
    },

    /**
     * Save a project to Google Sheets & local cache
     */
    saveProject: async function (project) {
      if (!project.id) project.id = Date.now().toString();
      if (!project.cat) project.cat = 'Completed';
      if (project.on === undefined) project.on = true;

      // 1. Immediately store in localStorage
      try {
        var list = JSON.parse(localStorage.getItem(STORAGE_KEY_PROJ) || '[]');
        var idx = list.findIndex(function (x) { return String(x.id) === String(project.id); });
        if (idx > -1) {
          list[idx] = Object.assign({}, list[idx], project);
        } else {
          list.push(project);
        }
        // Ensure no base64
        var clean = list.filter(function (p) { return p.img && !p.img.startsWith('data:'); });
        localStorage.setItem(STORAGE_KEY_PROJ, JSON.stringify(clean));
      } catch (e) {}

      // 2. Sync to Google Sheets
      var url = this.getUrl();
      if (!url) return { ok: true, source: 'local' };

      try {
        var payload = Object.assign({ action: 'save_project' }, project);
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        return { ok: true, source: 'cloud' };
      } catch (err) {
        console.warn('Could not sync project to Google Sheets:', err);
        return { ok: true, source: 'local' };
      }
    },

    /**
     * Fetch projects from Google Sheets
     */
    fetchProjects: async function () {
      var url = this.getUrl();
      if (!url) {
        var localProjects = JSON.parse(localStorage.getItem(STORAGE_KEY_PROJ) || '[]');
        return { ok: true, data: localProjects, source: 'local' };
      }

      var fetchUrl = url + (url.indexOf('?') === -1 ? '?' : '&') + 'action=get_projects&_t=' + Date.now();
      try {
        var res = await fetch(fetchUrl, { method: 'GET', mode: 'cors' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          // Filter valid projects
          var cleanRemote = json.data.filter(function (p) { return p.img && !p.img.startsWith('data:'); });
          if (cleanRemote.length > 0) {
            localStorage.setItem(STORAGE_KEY_PROJ, JSON.stringify(cleanRemote));
            return { ok: true, data: cleanRemote, source: 'cloud' };
          }
        }
        var currentLocal = JSON.parse(localStorage.getItem(STORAGE_KEY_PROJ) || '[]');
        return { ok: true, data: currentLocal, source: 'local' };
      } catch (err) {
        var fallbackProj = JSON.parse(localStorage.getItem(STORAGE_KEY_PROJ) || '[]');
        return { ok: false, data: fallbackProj, source: 'local' };
      }
    },

    /**
     * Delete project from Google Sheets & local cache
     */
    deleteProject: async function (id) {
      try {
        var list = JSON.parse(localStorage.getItem(STORAGE_KEY_PROJ) || '[]');
        var filtered = list.filter(function (x) { return String(x.id) !== String(id); });
        localStorage.setItem(STORAGE_KEY_PROJ, JSON.stringify(filtered));
      } catch (e) {}

      var url = this.getUrl();
      if (!url) return;

      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'delete_project', id: String(id) })
        });
      } catch (e) {}
    }
  };

  window.AmbaraSheets = AmbaraSheets;
})(window);
