import { useState, useMemo, useEffect } from "react";
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronDown,
  Download,
  Link2,
  File,
  Paperclip,
  PanelRight,
  Maximize2,
  X,
  FileText,
  Upload,
} from "lucide-react";
import FileCard from "./FileCard";
import { formatFileSize } from "../utils/fileHelpers";
import { extractPlainTextWithControlChars } from "../utils/controlCharHelpers";

/**
 * FilesView — First-class file browser for ThoughtPad.
 * Displays attached & independent files with relationship filters, type filters,
 * search bar, and a live Windows Explorer-style Preview Pane.
 */
const FilesView = ({
  docsData = [],
  independentFiles = [],
  onFilePreview,
  onOpenNote,
  onUploadFile,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [relFilter, setRelFilter] = useState("all"); // "all" | "attached" | "independent"
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "pdf" | "image" | "document" | "video" | "archive" | "other"
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [sortBy, setSortBy] = useState("recent");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Windows Explorer Style Side Preview Pane State (Closed by default)
  const [showPreviewPane, setShowPreviewPane] = useState(false);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
  const [textContent, setTextContent] = useState("");

  // ── Extract all files (Attached from notes + Independent) ────
  const allFiles = useMemo(() => {
    const files = [];

    // 1. Attached files from active non-deleted notes
    docsData.forEach((note) => {
      if (note.deleted) return;
      if (!note.attachments || !Array.isArray(note.attachments)) return;
      note.attachments.forEach((att) => {
        const name = att.name || att.fileName || "Unnamed file";
        const ext = name.includes(".") ? name.split(".").pop().toUpperCase() : "";
        const dateObj = note.updatedAt?.toDate
          ? note.updatedAt.toDate()
          : note.updatedAt?.seconds
          ? new Date(note.updatedAt.seconds * 1000)
          : note.createdAt?.toDate
          ? note.createdAt.toDate()
          : null;

        files.push({
          ...att,
          id: att.id || att.url || `${note.id}-${name}`,
          name,
          extension: ext,
          noteTitle: note.title || "Untitled",
          noteId: note.id,
          date: dateObj,
          size: att.size || 0,
          type: att.type || "",
          url: att.url || "",
          isAttached: true,
        });
      });
    });

    // 2. Independent files (noteId === null)
    independentFiles.forEach((file) => {
      const name = file.name || "Unnamed file";
      const ext = name.includes(".") ? name.split(".").pop().toUpperCase() : "";
      const dateObj = file.createdAt?.toDate
        ? file.createdAt.toDate()
        : file.createdAt?.seconds
        ? new Date(file.createdAt.seconds * 1000)
        : null;

      files.push({
        ...file,
        id: file.id || file.url || name,
        name,
        extension: ext,
        noteTitle: null,
        noteId: null,
        date: dateObj,
        size: file.size || 0,
        type: file.type || "",
        url: file.url || "",
        isAttached: false,
      });
    });

    return files;
  }, [docsData, independentFiles]);

  // ── Categorize file extensions ─────────────────────────────
  const categorize = (ext) => {
    const lExt = (ext || "").toLowerCase();
    if (["pdf"].includes(lExt)) return "pdf";
    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "tiff"].includes(lExt)) return "image";
    if (["doc", "docx", "txt", "rtf", "odt", "csv", "xls", "xlsx", "pptx", "ppt"].includes(lExt)) return "document";
    if (["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "mp3", "wav"].includes(lExt)) return "video";
    if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(lExt)) return "archive";
    return "other";
  };

  // Relationship counts
  const relCounts = useMemo(() => {
    const attached = allFiles.filter((f) => f.isAttached).length;
    const independent = allFiles.filter((f) => !f.isAttached).length;
    return { all: allFiles.length, attached, independent };
  }, [allFiles]);

  // Type counts
  const typeCounts = useMemo(() => {
    const counts = { all: allFiles.length, pdf: 0, image: 0, document: 0, video: 0, archive: 0, other: 0 };
    allFiles.forEach((f) => {
      const cat = categorize(f.extension);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allFiles]);

  // ── Filter + Search + Sort ────────────────────────────────
  const filteredFiles = useMemo(() => {
    let result = [...allFiles];

    if (relFilter === "attached") {
      result = result.filter((f) => f.isAttached);
    } else if (relFilter === "independent") {
      result = result.filter((f) => !f.isAttached);
    }

    if (typeFilter !== "all") {
      result = result.filter((f) => categorize(f.extension) === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          (f.name || "").toLowerCase().includes(q) ||
          (f.extension || "").toLowerCase().includes(q) ||
          (f.noteTitle || "").toLowerCase().includes(q)
      );
    }

    if (sortBy === "recent" || sortBy === "modified") {
      result.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "size") {
      result.sort((a, b) => (b.size || 0) - (a.size || 0));
    }

    return result;
  }, [allFiles, relFilter, typeFilter, searchQuery, sortBy]);

  // Default selection for Preview Side Pane
  useEffect(() => {
    if (filteredFiles.length > 0 && !selectedPreviewFile) {
      setSelectedPreviewFile(filteredFiles[0]);
    }
  }, [filteredFiles, selectedPreviewFile]);

  // Fetch text file content for text files in preview pane
  useEffect(() => {
    if (!selectedPreviewFile || !selectedPreviewFile.url) {
      setTextContent("");
      return;
    }
    const ext = (selectedPreviewFile.extension || "").toLowerCase();
    if (["txt", "md", "json", "js", "html", "css", "py", "csv", "xml", "bat", "sh"].includes(ext)) {
      fetch(selectedPreviewFile.url)
        .then((res) => res.text())
        .then((text) => setTextContent(extractPlainTextWithControlChars(text.slice(0, 4000))))
        .catch(() => setTextContent("Could not load preview text."));
    } else {
      setTextContent("");
    }
  }, [selectedPreviewFile]);

  const handleCardClick = (file) => {
    setSelectedPreviewFile(file);
    if (!showPreviewPane) {
      setShowPreviewPane(true);
    }
  };

  const sortLabels = {
    recent: "Recently added",
    modified: "Recently modified",
    name: "Name",
    size: "Size",
  };

  const TYPE_FILTERS = [
    { key: "all", label: "All Types" },
    { key: "pdf", label: "PDFs" },
    { key: "image", label: "Images" },
    { key: "document", label: "Documents" },
    { key: "video", label: "Videos" },
    { key: "archive", label: "Archives" },
    { key: "other", label: "Others" },
  ];

  if (allFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-up">
        <div className="w-20 h-20 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-5">
          <Paperclip size={36} className="text-brand-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No files yet</h2>
        <p className="text-gray-400 dark:text-gray-600 text-sm">
          Click "+ New → Upload File" or attach files inside notes to see them here.
        </p>
      </div>
    );
  }

  // Active preview file category
  const activeExt = (selectedPreviewFile?.extension || "").toLowerCase();
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(activeExt);
  const isPdf = activeExt === "pdf";
  const isVideo = ["mp4", "mov", "webm", "avi"].includes(activeExt);
  const isAudio = ["mp3", "wav", "ogg"].includes(activeExt);

  return (
    <div>
      {/* ── Context Header + Count Badge & Toolbar (Matches All Notes Layout) ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 shrink-0">
          Files
          <span className="text-xs font-semibold text-gray-500 bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full font-mono">
            {allFiles.length}
          </span>
        </h2>

        {/* Toolbar aligned right */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-3 py-1.5 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          {/* Upload File Button */}
          {onUploadFile && (
            <button
              onClick={onUploadFile}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-brand transition-all cursor-pointer shrink-0"
              title="Upload standalone file"
            >
              <Upload size={14} />
              <span>Upload File</span>
            </button>
          )}

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <span className="text-gray-500">Sort:</span>
              <span className="font-semibold">{sortLabels[sortBy]}</span>
              <ChevronDown size={13} className="text-gray-500" />
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 py-1 bg-white dark:bg-[#1a1c24] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-xl min-w-[160px] animate-scale-in">
                  {Object.entries(sortLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        sortBy === key
                          ? "text-brand-500 dark:text-brand-400 bg-brand-500/10 font-bold"
                          : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* View Mode Toggle Switch (Grid | List) */}
          <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl overflow-hidden p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="List view"
            >
              <List size={14} />
            </button>
          </div>

          {/* Windows Preview Pane Toggle */}
          <button
            onClick={() => setShowPreviewPane(!showPreviewPane)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showPreviewPane
                ? "bg-brand-500/15 border-brand-500/50 text-brand-500 dark:text-brand-400 shadow-brand"
                : "bg-black/[0.04] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
            title="Toggle Side Preview Pane"
          >
            <PanelRight size={14} />
            <span className="hidden md:inline">Preview Pane</span>
          </button>
        </div>
      </div>

      {/* ── Relationship Filter Pills ──── */}
      <div className="mb-4 flex items-center gap-2 flex-wrap border-b border-black/[0.04] dark:border-white/[0.05] pb-3">
        <button
          onClick={() => setRelFilter("all")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            relFilter === "all"
              ? "bg-brand-500 text-white shadow-brand"
              : "bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          All Files ({relCounts.all})
        </button>

        <button
          onClick={() => setRelFilter("attached")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            relFilter === "attached"
              ? "bg-brand-500 text-white shadow-brand"
              : "bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Link2 size={13} /> Attached to Notes ({relCounts.attached})
        </button>

        <button
          onClick={() => setRelFilter("independent")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            relFilter === "independent"
              ? "bg-brand-500 text-white shadow-brand"
              : "bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <File size={13} /> Independent Files ({relCounts.independent})
        </button>
      </div>

      {/* ── Secondary File Type Filter Pills ───────────────── */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {TYPE_FILTERS.map((filter) => {
          const count = typeCounts[filter.key] || 0;
          if (count === 0 && filter.key !== "all") return null;
          const isActive = typeFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => setTypeFilter(filter.key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-black/[0.03] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {filter.label}
              <span className={`text-[10px] font-mono ${isActive ? "opacity-90" : "text-gray-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Split Workspace: Left Grid/List + Right Windows Preview Pane ──────── */}
      <div className="flex gap-6 items-start">
        {/* Left Files List / Grid */}
        <div className="flex-1 min-w-0">
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <p className="text-gray-500 text-sm mb-2">No files match your search or filter.</p>
              <button
                onClick={() => { setRelFilter("all"); setTypeFilter("all"); setSearchQuery(""); }}
                className="text-xs font-semibold text-brand-500 dark:text-brand-400 hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className={`grid gap-4 ${
              showPreviewPane && selectedPreviewFile
                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            }`}>
              {filteredFiles.map((file, idx) => (
                <div
                  key={`${file.url}-${idx}`}
                  onClick={() => handleCardClick(file)}
                  className={selectedPreviewFile?.id === file.id ? "ring-2 ring-brand-500 rounded-xl" : ""}
                >
                  <FileCard
                    file={file}
                    onPreview={handleCardClick}
                    onOpenNote={onOpenNote}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                <div className="col-span-6 md:col-span-5">Name</div>
                <div className="col-span-4 md:col-span-4">Relationship</div>
                <div className="hidden md:block md:col-span-3 text-right">Size</div>
              </div>

              {filteredFiles.map((file, idx) => {
                const ext = file.extension;
                const isSelected = selectedPreviewFile?.id === file.id;
                return (
                  <div
                    key={`${file.url}-${idx}`}
                    onClick={() => handleCardClick(file)}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 dark:border-white/[0.04] transition-colors cursor-pointer group items-center ${
                      isSelected
                        ? "bg-brand-500/10 text-brand-400 font-semibold"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 font-mono text-[9px] font-bold uppercase flex items-center justify-center shrink-0">
                        {ext || "FILE"}
                      </div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                    <div className="col-span-4 md:col-span-4 text-xs text-gray-500 truncate">
                      {file.isAttached ? (
                        <span
                          className="text-brand-500 dark:text-brand-400 hover:underline cursor-pointer flex items-center gap-1"
                          onClick={(e) => {
                            if (onOpenNote && file.noteId) {
                              e.stopPropagation();
                              onOpenNote(file.noteId);
                            }
                          }}
                        >
                          <Link2 size={12} /> {file.noteTitle}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Independent file</span>
                      )}
                    </div>
                    <div className="hidden md:block md:col-span-3 text-right text-xs text-gray-400">
                      {file.size ? formatFileSize(file.size) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Ultra-Clean Pure Preview Side Panel ─────────────────── */}
        {showPreviewPane && selectedPreviewFile && (
          <aside className="w-80 lg:w-[420px] xl:w-[480px] shrink-0 bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-3 flex flex-col h-[calc(100vh-160px)] sticky top-4 shadow-xl overflow-hidden animate-fade-in">
            {/* Minimal Header: "Preview" label + Maximize & Close controls */}
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-gray-100 dark:border-white/[0.06] shrink-0 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white tracking-tight">Preview</span>
                <span className="px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-400 font-mono text-[10px] font-bold uppercase">
                  {selectedPreviewFile.extension || "FILE"}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Maximize to full modal */}
                <button
                  onClick={() => onFilePreview?.(selectedPreviewFile)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                  title="Expand to full screen"
                >
                  <Maximize2 size={14} />
                </button>

                {/* Close Pane */}
                <button
                  onClick={() => setShowPreviewPane(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                  title="Close preview pane"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Pure Live Preview Canvas (Full Height & Width) */}
            <div className="flex-1 w-full bg-black/[0.03] dark:bg-[#0d0f14] rounded-xl border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center overflow-hidden min-h-0 relative">
              {isImage && selectedPreviewFile.url && (
                <img
                  src={selectedPreviewFile.url}
                  alt={selectedPreviewFile.name}
                  className="w-full h-full object-contain p-2 rounded-xl"
                />
              )}

              {isPdf && selectedPreviewFile.url && (
                <iframe
                  src={selectedPreviewFile.url}
                  title={selectedPreviewFile.name}
                  className="w-full h-full rounded-xl border-0 bg-white"
                />
              )}

              {isVideo && selectedPreviewFile.url && (
                <video
                  src={selectedPreviewFile.url}
                  controls
                  className="w-full h-full max-h-full rounded-xl object-contain"
                />
              )}

              {isAudio && selectedPreviewFile.url && (
                <div className="w-full text-center p-6">
                  <audio src={selectedPreviewFile.url} controls className="w-full" />
                </div>
              )}

              {textContent && (
                <pre className="w-full h-full p-4 text-xs font-mono text-gray-800 dark:text-gray-300 whitespace-pre-wrap overflow-y-auto sidebar-scroll select-text">
                  {textContent}
                </pre>
              )}

              {!isImage && !isPdf && !isVideo && !isAudio && !textContent && (
                <div className="text-center p-6">
                  <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-500 font-mono text-lg font-bold flex items-center justify-center mx-auto mb-3">
                    {selectedPreviewFile.extension || "FILE"}
                  </div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate max-w-[200px] mx-auto">
                    {selectedPreviewFile.name}
                  </p>
                  <p className="text-[11px] text-gray-500">Binary preview not supported</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default FilesView;
