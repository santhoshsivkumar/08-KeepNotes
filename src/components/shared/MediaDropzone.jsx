import { useState, useCallback, useRef } from "react";
import { isImage, ACCEPTED_FILE_TYPES } from "../../utils/fileHelpers";

/**
 * MediaDropzone — wraps any content and adds drag-and-drop file support.
 *
 * Props:
 *   onFiles(fileList: File[])  - called when files are dropped
 *   children                   - content to wrap
 *   disabled                   - disable drop handling
 */
const MediaDropzone = ({ onFiles, children, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0); // track nested dragenter/leave

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, [disabled]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    // Signal that drop is accepted
    e.dataTransfer.dropEffect = "copy";
  }, [disabled]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounterRef.current = 0;
    setIsDragging(false);

    const items = e.dataTransfer.files;
    if (!items || items.length === 0) return;

    const accepted = Array.from(items).filter((f) =>
      ACCEPTED_FILE_TYPES.includes(f.type)
    );

    if (accepted.length > 0 && onFiles) onFiles(accepted);
  }, [onFiles, disabled]);

  return (
    <div
      className={`relative flex flex-col flex-1 min-h-0 transition-all duration-200 ${
        isDragging ? "ring-2 ring-brand-500 ring-inset rounded-b-2xl" : ""
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-b-2xl pointer-events-none"
          style={{ background: "rgba(109,40,217,0.07)" }}
        >
          <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-white/90 shadow-lg border-2 border-dashed border-brand-500 animate-scale-in">
            {/* Upload icon */}
            <svg className="text-brand-500 animate-bounce" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            <p className="text-brand-600 font-semibold text-sm">Drop to upload</p>
            <p className="text-gray-400 text-xs">Images, PDF, Word, Excel, Text</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaDropzone;
