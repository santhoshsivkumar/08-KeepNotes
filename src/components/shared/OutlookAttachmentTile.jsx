import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Eye,
  Download,
  Trash2,
  Image as ImageIcon,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { getFileIcon, formatFileSize, isImage } from "../../utils/fileHelpers";

/**
 * OutlookAttachmentTile — Exact replica of Microsoft Outlook attachment tile & dropdown menu.
 *
 * Props:
 *   attachment: { name, url, size, type }
 *   onRemove(attachment): callback when "Remove Attachment" is clicked
 *   onInsertInline(attachment): callback when "Insert Inline into Text" is clicked
 *   onPreview(attachment): callback when "Preview" is clicked
 */
const OutlookAttachmentTile = ({
  attachment,
  onRemove,
  onInsertInline,
  onPreview,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied]     = useState(false);
  const tileRef                 = useRef(null);

  const isImg = isImage({ type: attachment.type, name: attachment.name });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tileRef.current && !tileRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleCopyLink = (e) => {
    e.stopPropagation();
    if (attachment.url) {
      navigator.clipboard.writeText(attachment.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setMenuOpen(false);
  };

  return (
    <div ref={tileRef} className="relative inline-block select-none">
      {/* ── Outlook Attachment Box / Tile ───────────────────── */}
      <div
        onClick={() => setMenuOpen(!menuOpen)}
        className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left cursor-pointer transition-all duration-150 max-w-[240px] sm:max-w-[280px] ${
          menuOpen
            ? "bg-[#dbeafe] border-brand-400 dark:bg-brand-500/20 dark:border-brand-400 shadow-sm"
            : "bg-[#f0f4f9] hover:bg-[#e4ebf5] border-[#d0d8e5] dark:bg-[#202330] dark:hover:bg-[#282c3d] dark:border-white/10"
        }`}
      >
        {/* File Icon or Image Thumbnail */}
        <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center overflow-hidden bg-white/80 dark:bg-black/40 border border-black/5 dark:border-white/10">
          {isImg ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg select-none">
              {getFileIcon({ type: attachment.type })}
            </span>
          )}
        </div>

        {/* File Name & Size */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate leading-snug">
            {attachment.name}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">
            {formatFileSize(attachment.size)}
          </span>
        </div>

        {/* Outlook Dropdown Chevron Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
          title="Attachment options"
        >
          <ChevronDown size={14} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* ── Outlook Context Dropdown Menu (Pops UPWARDS above tile) ── */}
      {menuOpen && (
        <div className="absolute left-0 bottom-full mb-1.5 z-[999] w-56 rounded-lg bg-white dark:bg-[#1c1e28] border border-gray-200 dark:border-white/10 shadow-2xl py-1 animate-scale-in text-xs font-medium text-gray-700 dark:text-gray-200">
          
          {/* Option: Preview */}
          <button
            onClick={() => {
              setMenuOpen(false);
              if (onPreview) onPreview(attachment);
              else if (attachment.url) window.open(attachment.url, "_blank");
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left"
          >
            <Eye size={14} className="text-gray-500 dark:text-gray-400" />
            <span>Preview</span>
          </button>

          {/* Option: Save / Download */}
          <a
            href={attachment.url}
            download={attachment.name}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left text-gray-700 dark:text-gray-200 no-underline"
          >
            <Download size={14} className="text-gray-500 dark:text-gray-400" />
            <span>Save / Download</span>
          </a>

          {/* Option: Insert Inline (if image) */}
          {isImg && onInsertInline && (
            <button
              onClick={() => {
                setMenuOpen(false);
                onInsertInline(attachment);
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left"
            >
              <ImageIcon size={14} className="text-brand-500" />
              <span>Insert into note text</span>
            </button>
          )}

          {/* Option: Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left"
          >
            {copied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Copy size={14} className="text-gray-500 dark:text-gray-400" />
            )}
            <span>{copied ? "Link copied!" : "Copy link"}</span>
          </button>

          <div className="my-1 border-t border-gray-100 dark:border-white/5" />

          {/* Option: Remove Attachment (Red with X icon, matching Outlook screenshot) */}
          <button
            onClick={() => {
              setMenuOpen(false);
              if (onRemove) onRemove(attachment);
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors text-left font-semibold"
          >
            <Trash2 size={14} className="text-red-500" />
            <span>Remove Attachment</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default OutlookAttachmentTile;
