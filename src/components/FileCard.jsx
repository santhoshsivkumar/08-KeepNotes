import { Star, MoreHorizontal, FileText, Download, ExternalLink, Link2, File, Eye } from "lucide-react";
import { formatFileSize } from "../utils/fileHelpers";

const FileCard = ({
  file,
  onPreview,
  onOpenNote,
}) => {
  const getExtension = (name) => {
    if (!name) return "";
    const parts = name.split(".");
    return parts.length > 1 ? parts.pop().toUpperCase() : "";
  };

  const getTypeStyle = (ext) => {
    const map = {
      PDF:  { bg: "bg-red-500/15", text: "text-red-400" },
      PNG:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
      JPG:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
      JPEG: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
      GIF:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
      WEBP: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
      SVG:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
      DOC:  { bg: "bg-blue-500/15", text: "text-blue-400" },
      DOCX: { bg: "bg-blue-500/15", text: "text-blue-400" },
      XLS:  { bg: "bg-green-500/15", text: "text-green-400" },
      XLSX: { bg: "bg-green-500/15", text: "text-green-400" },
      MP4:  { bg: "bg-purple-500/15", text: "text-purple-400" },
      MOV:  { bg: "bg-purple-500/15", text: "text-purple-400" },
      AVI:  { bg: "bg-purple-500/15", text: "text-purple-400" },
      ZIP:  { bg: "bg-amber-500/15", text: "text-amber-400" },
      RAR:  { bg: "bg-amber-500/15", text: "text-amber-400" },
      "7Z": { bg: "bg-amber-500/15", text: "text-amber-400" },
      PPTX: { bg: "bg-orange-500/15", text: "text-orange-400" },
      PPT:  { bg: "bg-orange-500/15", text: "text-orange-400" },
      TXT:  { bg: "bg-gray-500/15", text: "text-gray-400" },
    };
    return map[ext] || { bg: "bg-gray-500/15", text: "text-gray-400" };
  };

  const ext = getExtension(file?.name);
  const typeStyle = getTypeStyle(ext);
  const sizeFormatted = file?.size ? formatFileSize(file.size) : "File";
  const isImage = ["PNG", "JPG", "JPEG", "GIF", "WEBP", "SVG"].includes(ext);
  const isAttached = Boolean(file?.noteId && file?.noteTitle);

  return (
    <div
      className="group bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.06] rounded-2xl hover:border-brand-500/50 transition-all duration-200 p-3 sm:p-4 flex flex-col justify-between h-full hover:-translate-y-0.5 shadow-sm min-w-0 max-w-full overflow-hidden"
    >
      <div>
        {/* Top row icon & actions (Eye Preview + Download) */}
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeStyle.bg}`}>
            <span className={`text-[10px] font-bold uppercase ${typeStyle.text}`}>
              {ext || "FILE"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Eye Icon for Side Preview Pane */}
            <button
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-brand-500/10 transition-all cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (onPreview) onPreview(file);
              }}
              title="Preview File in Side Pane"
            >
              <Eye size={15} />
            </button>

            {/* Download Button */}
            <button
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (file?.url) {
                  const a = document.createElement("a");
                  a.href = file.url;
                  a.download = file.name || "download";
                  a.target = "_blank";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }
              }}
              title="Download File"
            >
              <Download size={15} />
            </button>
          </div>
        </div>

        {/* Thumbnail preview for images if URL exists */}
        {isImage && file?.url && (
          <div className="w-full h-24 rounded-xl overflow-hidden mb-3 bg-black/10 dark:bg-black/30">
            <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}

        {/* Filename */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1" title={file?.name}>
          {file?.name || "Unnamed file"}
        </h3>

        {/* Size & Extension */}
        <div className="text-xs text-gray-500 mb-3">
          {sizeFormatted} · {ext || "File"}
        </div>
      </div>

      <div>
        {/* Relationship Indicator: Attached vs Independent */}
        {isAttached ? (
          <div
            className="mb-3 p-2 bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 rounded-xl transition-all cursor-pointer group/link"
            onClick={(e) => {
              if (onOpenNote && file?.noteId) {
                e.stopPropagation();
                onOpenNote(file.noteId);
              }
            }}
            title={`Click to open note: ${file.noteTitle}`}
          >
            <div className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 mb-0.5 flex items-center gap-1">
              <Link2 size={10} className="text-brand-500" /> Attached to
            </div>
            <div className="text-xs font-semibold text-gray-900 dark:text-white group-hover/link:text-brand-400 truncate">
              {file.noteTitle}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
              <File size={10} /> Independent file
            </span>
          </div>
        )}

        {/* Footer date */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/[0.04]">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {file?.date
              ? typeof file.date === "string"
                ? file.date
                : file.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FileCard;
