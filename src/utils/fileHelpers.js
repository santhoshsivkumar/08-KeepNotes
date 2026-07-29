/**
 * fileHelpers.js — Utilities for file type detection and formatting
 */

/** Max file size allowed for upload (10 MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Accepted MIME types */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
export const ACCEPTED_ARCHIVE_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "application/octet-stream", // some browsers report zip as this
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/gzip",
  "application/x-tar",
];
export const ACCEPTED_FILE_TYPES  = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_ARCHIVE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

/**
 * Check if a file is an image.
 * @param {File} file
 * @returns {boolean}
 */
export function isImage(file) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Check if a file's size is within the allowed limit.
 * @param {File} file
 * @returns {boolean}
 */
export function isWithinSizeLimit(file) {
  return file.size <= MAX_FILE_SIZE_BYTES;
}

/**
 * Format a byte count as a human-readable string (e.g. "2.4 MB").
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Get a display-friendly file type label.
 * @param {File} file
 * @returns {string}
 */
export function getFileTypeLabel(file) {
  if (isImage(file)) return "Image";
  if (file.type === "application/pdf") return "PDF";
  if (file.type.includes("word")) return "Word";
  if (file.type.includes("excel") || file.type.includes("spreadsheet")) return "Excel";
  if (file.type === "text/plain") return "Text";
  if (file.type === "text/csv") return "CSV";
  if (
    file.type.includes("zip") || file.type.includes("rar") ||
    file.type.includes("7z") || file.type.includes("gzip") ||
    file.type.includes("tar")
  ) return "Archive";
  return "File";
}

/**
 * Get a file icon emoji based on type.
 * @param {File|{type:string}} file
 * @returns {string}
 */
export function getFileIcon(file) {
  const type = typeof file === "string" ? file : file.type;
  if (type.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  if (type.includes("word")) return "📝";
  if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
  if (type === "text/plain" || type === "text/csv") return "📃";
  if (
    type.includes("zip") || type.includes("rar") ||
    type.includes("7z") || type.includes("gzip") ||
    type.includes("tar")
  ) return "🗜️";
  return "📎";
}
