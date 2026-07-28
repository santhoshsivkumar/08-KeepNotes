import React, { useState } from "react";
import {
  Eye,
  Download,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { getFileIcon, formatFileSize, isImage } from "../../utils/fileHelpers";
import { downloadFile } from "../../utils/downloadHelpers";

/**
 * OutlookAttachmentTile — Ultra-compact attachment tile card with exposed action icons.
 */
const OutlookAttachmentTile = ({
  attachment,
  onRemove,
  onPreview,
}) => {
  const [copied, setCopied] = useState(false);
  const isImg = isImage({ type: attachment.type, name: attachment.name });

  const handleCopyLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (attachment.url) {
      navigator.clipboard.writeText(attachment.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group relative flex items-center justify-between gap-2 px-2 py-1 rounded-md border text-left transition-all duration-150 bg-[#f0f4f9] hover:bg-[#e4ebf5] border-[#d0d8e5] dark:bg-[#202330] dark:hover:bg-[#282c3d] dark:border-white/10 shadow-xs max-w-[210px] sm:max-w-[230px]">
      
      {/* Thumbnail + Name */}
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onPreview) onPreview(attachment);
          else if (attachment.url) window.open(attachment.url, "_blank");
        }}
        className="flex items-center gap-1.5 min-w-0 cursor-pointer flex-1"
        title={`Click to preview ${attachment.name}`}
      >
        <div className="w-5 h-5 rounded shrink-0 flex items-center justify-center overflow-hidden bg-white/80 dark:bg-black/40 border border-black/5 dark:border-white/10">
          {isImg ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs select-none">
              {getFileIcon({ type: attachment.type })}
            </span>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
            {attachment.name}
          </span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-none mt-0.5">
            {formatFileSize(attachment.size)}
          </span>
        </div>
      </div>

      {/* Exposed Action Icons directly on Card */}
      <div className="flex items-center gap-0.5 shrink-0 z-30">
        {/* Preview */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onPreview) onPreview(attachment);
            else if (attachment.url) window.open(attachment.url, "_blank");
          }}
          className="p-0.5 rounded text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Preview attachment"
        >
          <Eye size={11} />
        </button>

        {/* Download */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            downloadFile(attachment.url, attachment.name);
          }}
          className="p-0.5 rounded text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Download file"
        >
          <Download size={11} />
        </button>

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="p-0.5 rounded text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title={copied ? "Link Copied! ✓" : "Copy attachment link"}
        >
          {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
        </button>

        {/* Remove / Delete */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(attachment);
            }}
            className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Remove attachment"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
};

export default OutlookAttachmentTile;
