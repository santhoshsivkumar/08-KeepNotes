/**
 * controlCharHelpers.js — Utilities for detecting, formatting, displaying,
 * and preserving ASCII control characters (e.g. \x00-\x1F, \x7F).
 * Designed to mirror VS Code control character representation ([NAK], [SO], [ETB], [BEL], etc.)
 * while preserving raw data integrity when stored, copied, or downloaded.
 */

// Full map of ASCII control characters to abbreviation and descriptive name
export const CONTROL_CHAR_MAP = {
  0:   { abbr: "NUL", name: "Null" },
  1:   { abbr: "SOH", name: "Start of Heading" },
  2:   { abbr: "STX", name: "Start of Text" },
  3:   { abbr: "ETX", name: "End of Text" },
  4:   { abbr: "EOT", name: "End of Transmission" },
  5:   { abbr: "ENQ", name: "Enquiry" },
  6:   { abbr: "ACK", name: "Acknowledge" },
  7:   { abbr: "BEL", name: "Bell" },
  8:   { abbr: "BS",  name: "Backspace" },
  // 9: HT (\t), 10: LF (\n) kept as standard whitespace
  11:  { abbr: "VT",  name: "Vertical Tab" },
  12:  { abbr: "FF",  name: "Form Feed" },
  // 13: CR (\r) kept as standard whitespace
  14:  { abbr: "SO",  name: "Shift Out" },
  15:  { abbr: "SI",  name: "Shift In" },
  16:  { abbr: "DLE", name: "Data Link Escape" },
  17:  { abbr: "DC1", name: "Device Control 1" },
  18:  { abbr: "DC2", name: "Device Control 2" },
  19:  { abbr: "DC3", name: "Device Control 3" },
  20:  { abbr: "DC4", name: "Device Control 4" },
  21:  { abbr: "NAK", name: "Negative Acknowledge" },
  22:  { abbr: "SYN", name: "Synchronous Idle" },
  23:  { abbr: "ETB", name: "End of Transmission Block" },
  24:  { abbr: "CAN", name: "Cancel" },
  25:  { abbr: "EM",  name: "End of Medium" },
  26:  { abbr: "SUB", name: "Substitute" },
  27:  { abbr: "ESC", name: "Escape" },
  28:  { abbr: "FS",  name: "File Separator" },
  29:  { abbr: "GS",  name: "Group Separator" },
  30:  { abbr: "RS",  name: "Record Separator" },
  31:  { abbr: "US",  name: "Unit Separator" },
  127: { abbr: "DEL", name: "Delete" },
};

// Regex matching unprintable ASCII control characters (excluding \t, \n, \r)
export const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Check if a string contains any unprintable control characters.
 * @param {string} str 
 * @returns {boolean}
 */
export function hasControlChars(str) {
  if (!str || typeof str !== "string") return false;
  CONTROL_CHAR_REGEX.lastIndex = 0;
  return CONTROL_CHAR_REGEX.test(str);
}

/**
 * Escape HTML special characters for safe insertion.
 * @param {string} str 
 * @returns {string}
 */
export function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Convert raw text containing unprintable control characters into HTML with visual badges (VS Code style).
 * Preserves normal text, HTML entities, and standard newlines/tabs.
 * @param {string} text 
 * @returns {string}
 */
export function formatControlCharsToHTML(text) {
  if (!text) return "";

  // If text already contains badge HTML elements, avoid double wrapping
  if (text.includes("control-char-badge") || text.includes("data-cc=")) {
    return text;
  }

  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const info = CONTROL_CHAR_MAP[code];

    if (info) {
      const hex = code.toString(16).padStart(2, "0").toUpperCase();
      result += `<span class="control-char-badge" data-cc="${code}" title="${info.name} (0x${hex})" contenteditable="false">${info.abbr}</span>`;
    } else {
      const char = text[i];
      if (char === "&") result += "&amp;";
      else if (char === "<") result += "&lt;";
      else if (char === ">") result += "&gt;";
      else if (char === "\n") result += "<br>";
      else result += char;
    }
  }

  return result;
}

/**
 * Decode HTML with control character badges back into raw text/bytes.
 * Used for copying to clipboard, downloading note, or saving raw text.
 * @param {string} htmlOrText 
 * @returns {string}
 */
export function restoreRawControlChars(htmlOrText) {
  if (!htmlOrText || typeof htmlOrText !== "string") return "";

  // Replace control character badge spans with their actual ASCII character
  let restored = htmlOrText.replace(
    /<span[^>]*data-cc="(\d+)"[^>]*>[^<]*<\/span>/gi,
    (_, charCodeStr) => {
      const code = parseInt(charCodeStr, 10);
      return String.fromCharCode(code);
    }
  );

  return restored;
}

/**
 * Clean plain text extractor that preserves control characters and linebreaks without DOM parsing loss.
 * @param {string} htmlOrText 
 * @returns {string}
 */
export function extractPlainTextWithControlChars(htmlOrText) {
  if (!htmlOrText) return "";

  // Restore any control character badges first
  let str = restoreRawControlChars(htmlOrText);

  // Convert line-breaking HTML tags to newlines
  str = str
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n");

  // Strip remaining HTML tags
  str = str.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  str = str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");

  return str;
}
