import DOMPurify from "dompurify";

/**
 * Sanitize an HTML string to prevent XSS attacks.
 * @param {string} dirty - Raw HTML string (e.g. from Quill editor)
 * @returns {string} - Safe HTML string
 */
export function sanitizeHTML(dirty) {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3",
      "ul", "ol", "li", "blockquote", "pre", "code",
      "a", "img",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
  });
}
