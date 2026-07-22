import { getFileIcon, formatFileSize } from "../../utils/fileHelpers";

/**
 * FileAttachment — displays a file as a downloadable pill chip.
 *
 * Props:
 *   attachment: { name, url, size, type }
 *   onRemove(attachment) — optional remove callback
 */
const FileAttachment = ({ attachment, onRemove }) => {
  const icon = getFileIcon({ type: attachment.type });

  return (
    <div className="group flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-150 max-w-xs">
      {/* Icon */}
      <span className="text-base shrink-0 select-none">{icon}</span>

      {/* Name + size */}
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col min-w-0 no-underline"
        title={attachment.name}
      >
        <span className="text-xs font-medium text-gray-700 truncate leading-tight max-w-[140px]">
          {attachment.name}
        </span>
        <span className="text-[10px] text-gray-400 leading-tight">
          {formatFileSize(attachment.size)}
        </span>
      </a>

      {/* Download button */}
      <a
        href={attachment.url}
        download={attachment.name}
        className="ml-auto shrink-0 text-gray-300 hover:text-brand-500 transition-colors"
        title="Download"
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </a>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(attachment); }}
          className="shrink-0 text-gray-200 hover:text-red-400 transition-colors"
          title="Remove attachment"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default FileAttachment;
