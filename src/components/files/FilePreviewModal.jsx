import { useState, useEffect } from "react";
import { X, Download, ExternalLink, FileText, ZoomIn, ZoomOut, RotateCcw, AlertCircle, File, Image as ImageIcon, Video, Music, Code, ArrowLeft } from "lucide-react";
import { formatFileSize } from "../../utils/fileHelpers";

const TEXT_CODE_EXTENSIONS = new Set([
  "txt", "text", "md", "markdown", "rst", "rtf", "log", "csv", "tsv",
  "html", "htm", "css", "scss", "sass", "less", "js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte", "php",
  "json", "json5", "jsonc", "xml", "yaml", "yml", "toml", "env", "ini", "conf", "config", "properties", "graphql", "gql", "sql",
  "py", "java", "cpp", "c", "h", "hpp", "cc", "cs", "rb", "go", "rs", "sh", "bash", "zsh", "bat", "cmd", "ps1", "swift", "kt", "kts", "scala", "dart", "lua", "r", "perl", "pl", "asm", "dockerfile", "makefile", "gitignore"
]);

/**
 * FilePreviewModal — High performance, real file preview modal for ThoughtPad.
 * Supports PDFs (iframe/embed), Images (zoom/fit), Videos, Audio, Text/Code files,
 * and graceful fallback for binary formats.
 */
const FilePreviewModal = ({ file, isOpen, onClose, onOpenNote }) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [textContent, setTextContent] = useState(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState(false);

  useEffect(() => {
    // Reset state when file changes
    setZoomLevel(100);
    setTextContent(null);
    setTextError(false);

    if (!file || !file.url) return;

    const extLower = (file.extension || (file.name?.includes(".") ? file.name.split(".").pop() : "")).toLowerCase();
    const isText = TEXT_CODE_EXTENSIONS.has(extLower) || file.url.startsWith("data:text/") || file.url.startsWith("data:application/json") || file.url.startsWith("data:application/sql") || (file.type && (file.type.startsWith("text/") || file.type.includes("json") || file.type.includes("sql")));

    if (isText) {
      if (file.url.startsWith("data:")) {
        try {
          const parts = file.url.split(",");
          if (parts.length > 1) {
            const isBase64 = file.url.includes(";base64");
            const decoded = isBase64 ? atob(parts[1]) : decodeURIComponent(parts[1]);
            setTextContent(decoded.slice(0, 100000));
            return;
          }
        } catch (e) {
          console.warn("Failed to decode data URL text:", e);
        }
      }

      setLoadingText(true);
      fetch(file.url)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.text();
        })
        .then((text) => {
          setTextContent(text.slice(0, 100000)); // cap at 100k chars for performance
          setLoadingText(false);
        })
        .catch(() => {
          setTextError(true);
          setLoadingText(false);
        });
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const ext = (file.extension || (file.name?.includes(".") ? file.name.split(".").pop() : "")).toUpperCase();
  const isImage = ["PNG", "JPG", "JPEG", "GIF", "WEBP", "SVG", "BMP", "ICO"].includes(ext);
  const isPdf = ext === "PDF";
  const isVideo = ["MP4", "WEBM", "MOV", "MKV", "AVI"].includes(ext);
  const isAudio = ["MP3", "WAV", "OGG", "M4A", "AAC"].includes(ext);
  const isCodeOrText = TEXT_CODE_EXTENSIONS.has(ext.toLowerCase()) || (file.url && (file.url.startsWith("data:text/") || file.url.startsWith("data:application/json") || file.url.startsWith("data:application/sql"))) || (file.type && (file.type.startsWith("text/") || file.type.includes("json") || file.type.includes("sql")));

  const handleDownload = (e) => {
    e?.stopPropagation();
    if (!file.url) return;
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name || "download";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenExternal = (e) => {
    e?.stopPropagation();
    if (file.url) window.open(file.url, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col bg-black/90 backdrop-blur-md animate-fade-in text-white select-none overflow-hidden"
      onClick={onClose}
    >
      {/* ── Top Header Bar ──────────────────────────────────────── */}
      <div
        className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-[#0d0f14]/80 shrink-0 gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Back to Preview button + Filename & Meta */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all cursor-pointer shrink-0 border border-white/10 shadow-sm"
            title="Back to side preview pane"
          >
            <ArrowLeft size={14} />
            <span>Back to Preview</span>
          </button>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md" title={file.name}>
              {file.name}
            </h2>
            <p className="text-[11px] text-gray-400">
              {formatFileSize(file.size)} · {ext || "File"}
            </p>
          </div>
        </div>

        {/* Center: Image Zoom Controls */}
        {isImage && (
          <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded-xl">
            <button
              onClick={() => setZoomLevel((z) => Math.max(30, z - 15))}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-mono font-bold w-10 text-center text-gray-300">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(250, z + 15))}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            {zoomLevel !== 100 && (
              <button
                onClick={() => setZoomLevel(100)}
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer ml-1"
                title="Reset Zoom"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Parent Note vs Independent Badge */}
          {file.noteTitle ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                if (onOpenNote && file.noteId) onOpenNote(file.noteId);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-[11px] sm:text-xs text-brand-400 hover:text-white hover:bg-brand-500/20 transition-all cursor-pointer truncate max-w-[130px] sm:max-w-[220px]"
              title={`Go to parent note: ${file.noteTitle}`}
            >
              <FileText size={13} className="text-brand-400 shrink-0" />
              <span className="truncate">{file.noteTitle}</span>
            </button>
          ) : (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400">
              <File size={13} className="text-gray-400 shrink-0" />
              <span>Independent file</span>
            </span>
          )}


          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-brand transition-all cursor-pointer"
            title="Download file"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* ── Main Preview Content Canvas ────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-4 sm:p-8 min-h-0 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. IMAGE PREVIEW */}
        {isImage && file.url && (
          <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
            <img
              src={file.url}
              alt={file.name}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-150"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            />
          </div>
        )}

        {/* 2. PDF PREVIEW */}
        {isPdf && file.url && (
          <div className="w-full h-full max-w-5xl max-h-[84vh] bg-[#1a1c24] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
            <iframe
              src={`${file.url}#toolbar=1`}
              title={file.name}
              className="w-full flex-1 border-none bg-white"
            />
          </div>
        )}

        {/* 3. VIDEO PREVIEW */}
        {isVideo && file.url && (
          <div className="max-w-4xl max-h-[80vh] flex items-center justify-center">
            <video
              src={file.url}
              controls
              autoPlay
              className="max-h-[80vh] max-w-full rounded-2xl border border-white/10 shadow-2xl bg-black"
            />
          </div>
        )}

        {/* 4. AUDIO PREVIEW */}
        {isAudio && file.url && (
          <div className="p-8 bg-[#16181f] border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-md w-full">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center">
              <Music size={32} className="text-brand-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">{file.name}</h3>
              <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
            </div>
            <audio src={file.url} controls className="w-full mt-2" />
          </div>
        )}

        {/* 5. CODE / TEXT FILE PREVIEW */}
        {isCodeOrText && (
          <div className="w-full h-full max-w-4xl max-h-[80vh] bg-[#0d0f14] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs text-gray-400">
              <span className="font-mono">{file.name}</span>
              <span>{textContent ? `${textContent.length} chars` : ""}</span>
            </div>
            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-gray-200 leading-relaxed whitespace-pre-wrap selection:bg-brand-500/30 select-text">
              {loadingText ? (
                <div className="flex items-center justify-center py-20 text-gray-400">Loading document content...</div>
              ) : textContent !== null ? (
                textContent
              ) : textError ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="mb-3">Could not load text stream directly.</p>
                  <button onClick={handleOpenExternal} className="px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold">
                    Open in browser
                  </button>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">Processing file preview...</div>
              )}
            </div>
          </div>
        )}

        {/* 6. UNSUPPORTED / BINARY FORMAT FALLBACK */}
        {!isImage && !isPdf && !isVideo && !isAudio && !isCodeOrText && (
          <div className="p-8 bg-[#16181f] border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-md w-full animate-scale-in">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <File size={32} className="text-gray-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">{file.name}</h3>
              <p className="text-xs text-gray-400 mb-2">
                {formatFileSize(file.size)} · {ext || "File"}
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400">
                <AlertCircle size={13} /> Direct preview unavailable for this format
              </span>
            </div>
            <div className="flex items-center gap-3 w-full mt-2">
              <button
                onClick={handleOpenExternal}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Open File
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-brand transition-all cursor-pointer"
              >
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreviewModal;
