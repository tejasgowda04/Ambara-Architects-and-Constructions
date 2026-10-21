/**
 * =========================================================================
 * AMBARA ARCHITECTS & CONSTRUCTION — GOOGLE SHEETS DATABASE SCRIPT
 * =========================================================================
 * 
 * HOW TO SET THIS UP (Takes 2 minutes):
 * 1. Open Google Sheets (https://sheets.new) and name it "Ambara Customer Enquiries".
 * 2. Click "Extensions" > "Apps Script" in the top menu.
 * 3. Delete any code in the editor, and paste THIS ENTIRE FILE.
 * 4. Click the blue "Deploy" button at top-right > "New deployment".
 * 5. Under "Select type" (gear icon), select "Web app".
 * 6. Set Description: "Ambara Enquiries API"
 * 7. Set "Execute as": "Me" (your email)
 * 8. Set "Who has access": "Anyone"  <-- CRITICAL for the website & admin to communicate
 * 9. Click "Deploy", authorize Google account permissions.
 * 10. Copy the "Web app URL" (looks like https://script.google.com/macros/s/AKfycb.../exec).
 * 11. Open your Ambara Admin Dashboard > Settings > paste the URL and click Save!
 * =========================================================================
 */

var SHEET_NAME = "Enquiries";

// Headers for the spreadsheet table
var HEADERS = [
  "ID",
  "Date & Time",
  "Customer Name",
  "Phone Number",
  "Email",
  "Service Requested",
  "Message / Requirements",
  "Status",
  "Internal Notes"
];

/**
 * Handle POST request — adds a new enquiry to the spreadsheet
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Wait up to 10s for lock
    
    var sheet = getOrCreateSheet();
    var data = {};
    
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    // Support update action via POST
    if (data.action === "update") {
      return handleUpdate(sheet, data);
    }
    
    var id = data.id || Date.now().toString();
    var date = data.date || new Date().toISOString();
    var name = data.name || "Unknown";
    var phone = data.phone || "";
    var email = data.email || "";
    var service = data.service || "General enquiry";
    var msg = data.msg || "";
    var status = data.status || "New";
    var notes = data.notes || "";
    
    // Append the row
    sheet.appendRow([
      id,
      date,
      name,
      "'" + phone, // Prefix with apostrophe to keep leading zeros intact
      email,
      service,
      msg,
      status,
      notes
    ]);
    
    return jsonResponse({
      status: "success",
      message: "Enquiry saved successfully to Google Sheets",
      id: id
    });
    
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle GET request — fetch all enquiries or test ping
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params ? params.action : "get";
    
    if (action === "ping") {
      return jsonResponse({
        status: "ok",
        message: "Ambara Google Sheets API is connected and online!",
        timestamp: new Date().toISOString()
      });
    }

    if (action === "update" && params.id) {
      var sheet = getOrCreateSheet();
      return handleUpdate(sheet, params);
    }
    
    // Default action: return all enquiries
    var sheet = getOrCreateSheet();
    var rows = sheet.getDataRange().getValues();
    
    if (rows.length <= 1) {
      return jsonResponse({ status: "success", data: [] });
    }
    
    var enquiries = [];
    // Skip header row at index 0
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0] && !row[2]) continue; // Skip empty rows
      
      enquiries.push({
        id: String(row[0] || ""),
        date: row[1] || "",
        name: String(row[2] || ""),
        phone: String(row[3] || "").replace(/^'/, ''),
        email: String(row[4] || ""),
        service: String(row[5] || ""),
        msg: String(row[6] || ""),
        status: String(row[7] || "New"),
        notes: String(row[8] || "")
      });
    }
    
    // Return sorted newest first
    enquiries.reverse();
    
    return jsonResponse({
      status: "success",
      count: enquiries.length,
      data: enquiries
    });
    
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Handle updating an existing enquiry status or notes
 */
function handleUpdate(sheet, data) {
  var rows = sheet.getDataRange().getValues();
  var targetId = String(data.id);
  var found = false;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === targetId) {
      if (data.status !== undefined) {
        sheet.getRange(i + 1, 8).setValue(data.status); // Column H: Status
      }
      if (data.notes !== undefined) {
        sheet.getRange(i + 1, 9).setValue(data.notes);  // Column I: Notes
      }
      found = true;
      break;
    }
  }

  if (found) {
    return jsonResponse({ status: "success", message: "Enquiry updated" });
  } else {
    return jsonResponse({ status: "error", message: "Enquiry ID not found" });
  }
}

/**
 * Helper to get the active sheet or create it with formatted headers
 */
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // If first row is empty, insert and style headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#c9a24b");
    headerRange.setFontColor("#0b0e13");
    headerRange.setFontFamily("Outfit");
    sheet.setFrozenRows(1);
    
    // Set friendly column widths
    sheet.setColumnWidth(1, 140); // ID
    sheet.setColumnWidth(2, 170); // Date
    sheet.setColumnWidth(3, 160); // Name
    sheet.setColumnWidth(4, 130); // Phone
    sheet.setColumnWidth(5, 180); // Email
    sheet.setColumnWidth(6, 180); // Service
    sheet.setColumnWidth(7, 260); // Message
    sheet.setColumnWidth(8, 110); // Status
    sheet.setColumnWidth(9, 220); // Notes
  }
  
  return sheet;
}

/**
 * Helper to format JSON response with CORS support
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
