import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Download,
  Link2,
  File,
  Paperclip,
  PanelRight,
  Maximize2,
  X,
  FileText,
  Upload,
  UploadCloud,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Folder,
  Layers,
  Laptop,
  Eye,
  Loader2,
  Menu,
} from "lucide-react";
import FileCard from "./FileCard";
import { formatFileSize } from "../utils/fileHelpers";
import { extractPlainTextWithControlChars } from "../utils/controlCharHelpers";

/**
 * FilesView — First-class file browser for ThoughtPad.
 * Displays attached & independent files with relationship filters, type filters,
 * search bar, drag-and-drop uploading, Folder grouping, Windows Explorer Path bar, and a live Preview Pane.
 */
const FilesView = ({
  docsData = [],
  independentFiles = [],
  folders = [],
  loading = false,
  isUploadingFiles = false,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onFilePreview,
  onOpenNote,
  onUploadFile,
  onDropFiles,
  onCreateFolder,
}) => {
  const [relFilter, setRelFilter] = useState(() => {
    try {
      return localStorage.getItem("tp-files-relFilter") || "all";
    } catch {
      return "all";
    }
  });

  const [typeFilter, setTypeFilter] = useState(() => {
    try {
      return localStorage.getItem("tp-files-typeFilter") || "all";
    } catch {
      return "all";
    }
  });

  const [searchQuery, setSearchQuery] = useState("");

  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("tp-files-viewMode") || "grid";
    } catch {
      return "grid";
    }
  });

  const [sortBy, setSortBy] = useState(() => {
    try {
      return localStorage.getItem("tp-files-sortBy") || "recent";
    } catch {
      return "recent";
    }
  });

  const [groupBy, setGroupBy] = useState(() => {
    try {
      return localStorage.getItem("tp-files-groupBy") || "none";
    } catch {
      return "none";
    }
  });

  const [activePathFolder, setActivePathFolder] = useState(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Resizable Preview Panel state (Width in X, Height in Y)
  const [paneWidth, setPaneWidth] = useState(480);
  const [paneHeight, setPaneHeight] = useState(null);
  const containerRef = useRef(null);

  const getMaxWidth = () => {
    if (containerRef.current) {
      return Math.floor(containerRef.current.offsetWidth * 0.45);
    }
    return Math.floor(window.innerWidth * 0.45);
  };

  const handleMouseDownX = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = paneWidth;

    const handleMouseMove = (moveEvt) => {
      const deltaX = startX - moveEvt.clientX;
      const maxW = getMaxWidth();
      const newW = Math.min(Math.max(280, startW + deltaX), maxW);
      setPaneWidth(newW);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDownY = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = paneHeight || (window.innerHeight - 160);

    const handleMouseMove = (moveEvt) => {
      const deltaY = moveEvt.clientY - startY;
      const newH = Math.min(Math.max(300, startH + deltaY), 900);
      setPaneHeight(newH);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDownXY = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = paneWidth;
    const startH = paneHeight || (window.innerHeight - 160);

    const handleMouseMove = (moveEvt) => {
      const deltaX = startX - moveEvt.clientX;
      const deltaY = moveEvt.clientY - startY;
      const maxW = getMaxWidth();
      const newW = Math.min(Math.max(280, startW + deltaX), maxW);
      const newH = Math.min(Math.max(300, startH + deltaY), 900);
      setPaneWidth(newW);
      setPaneHeight(newH);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Save selected toolbar values to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem("tp-files-relFilter", relFilter);
      localStorage.setItem("tp-files-typeFilter", typeFilter);
      localStorage.setItem("tp-files-viewMode", viewMode);
      localStorage.setItem("tp-files-sortBy", sortBy);
      localStorage.setItem("tp-files-groupBy", groupBy);
    } catch {
      // ignore
    }
  }, [relFilter, typeFilter, viewMode, sortBy, groupBy]);

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  // Windows Explorer Style Side Preview Pane State (Closed by default)
  const [showPreviewPane, setShowPreviewPane] = useState(false);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState(null);
  const [textContent, setTextContent] = useState("");

  // ── Drag & Drop Event Handlers ──────────
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDraggingOver(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length && onDropFiles) {
      onDropFiles(files);
    }
  };

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

    // 2. Standalone independent files
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

  // ── Filter & Sort ──────────────────────────────────────────
  const filteredFiles = useMemo(() => {
    let result = [...allFiles];

    // Path filter
    if (activePathFolder) {
      result = result.filter(
        (f) => f.folderName === activePathFolder || f.noteTitle === activePathFolder
      );
    }

    // Relationship filter
    if (relFilter === "attached") {
      result = result.filter((f) => f.isAttached);
    } else if (relFilter === "independent") {
      result = result.filter((f) => !f.isAttached);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((f) => {
        const ext = f.extension.toLowerCase();
        if (typeFilter === "pdf") return ext === "pdf";
        if (typeFilter === "image") return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
        if (typeFilter === "document") return ["doc", "docx", "xls", "xlsx", "txt", "csv"].includes(ext);
        if (typeFilter === "video") return ["mp4", "mov", "avi", "webm"].includes(ext);
        if (typeFilter === "archive") return ["zip", "rar", "7z", "tar", "gz"].includes(ext);
        return true;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.extension.toLowerCase().includes(q) ||
          (f.noteTitle && f.noteTitle.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return (b.size || 0) - (a.size || 0);
      if (sortBy === "type") return a.extension.localeCompare(b.extension);
      // recent (default)
      const tA = a.date ? a.date.getTime() : 0;
      const tB = b.date ? b.date.getTime() : 0;
      return tB - tA;
    });

    return result;
  }, [allFiles, relFilter, typeFilter, searchQuery, sortBy, activePathFolder]);

  // ── Group By Calculator ──────────────────────────────────
  const groupLabels = {
    none: "None",
    foldersOnly: "Folders Only",
    folder: "Folders & Notes",
    type: "File Type",
  };

  const groupedFiles = useMemo(() => {
    if (groupBy === "none") return null;

    const map = {};

    if (groupBy === "foldersOnly") {
      // Show independent folders created by user
      if (folders && Array.isArray(folders)) {
        folders.forEach((f) => {
          if (f.name) map[f.name] = [];
        });
      }
      filteredFiles.forEach((file) => {
        let key = "General Files";
        if (file.isAttached) {
          key = file.noteTitle || "Note Folder";
        } else if (file.folderName) {
          key = file.folderName;
        }
        if (!map[key]) map[key] = [];
        map[key].push(file);
      });
      return map;
    }

    // Folders & Notes mode (Independent Folders + Note Folders)
    if (groupBy === "folder" && folders && Array.isArray(folders)) {
      folders.forEach((f) => {
        if (f.name) map[f.name] = [];
      });
    }

    filteredFiles.forEach((file) => {
      let key = "Independent Files";
      if (groupBy === "folder") {
        if (file.isAttached) {
          key = file.noteTitle || "Attached Files";
        } else if (file.folderName) {
          key = file.folderName;
        } else {
          key = "Independent Files";
        }
      } else if (groupBy === "type") {
        const ext = (file.extension || "").toLowerCase();
        if (["pdf"].includes(ext)) key = "PDF Documents";
        else if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) key = "Images";
        else if (["doc", "docx", "txt", "rtf", "md"].includes(ext)) key = "Documents & Text";
        else if (["mp4", "mov", "webm", "avi"].includes(ext)) key = "Videos";
        else if (["zip", "rar", "7z", "gz"].includes(ext)) key = "Archives & Compressed";
        else key = "Other Files";
      }
      if (!map[key]) map[key] = [];
      map[key].push(file);
    });
    return map;
  }, [filteredFiles, groupBy, folders]);

  const toggleGroupCollapse = (key) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Counts for filter pills
  const relCounts = useMemo(() => {
    const attached = allFiles.filter((f) => f.isAttached).length;
    const independent = allFiles.filter((f) => !f.isAttached).length;
    return { all: allFiles.length, attached, independent };
  }, [allFiles]);

  const TYPE_FILTERS = [
    { key: "all", label: "All Types" },
    { key: "pdf", label: "PDFs" },
    { key: "image", label: "Images" },
    { key: "document", label: "Documents" },
    { key: "video", label: "Videos" },
    { key: "archive", label: "Archives" },
  ];

  const typeCounts = useMemo(() => {
    const counts = { all: allFiles.length };
    allFiles.forEach((f) => {
      const ext = f.extension.toLowerCase();
      let key = "other";
      if (ext === "pdf") key = "pdf";
      else if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) key = "image";
      else if (["doc", "docx", "xls", "xlsx", "txt", "csv"].includes(ext)) key = "document";
      else if (["mp4", "mov", "avi", "webm"].includes(ext)) key = "video";
      else if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) key = "archive";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [allFiles]);

  const sortLabels = {
    recent: "Recently added",
    name: "File name",
    size: "File size",
    type: "File type",
  };

  const TEXT_CODE_EXTENSIONS = useMemo(() => new Set([
    "txt", "text", "md", "markdown", "rst", "rtf", "log", "csv", "tsv",
    "html", "htm", "css", "scss", "sass", "less", "js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte", "php",
    "json", "json5", "jsonc", "xml", "yaml", "yml", "toml", "env", "ini", "conf", "config", "properties", "graphql", "gql", "sql",
    "py", "java", "cpp", "c", "h", "hpp", "cc", "cs", "rb", "go", "rs", "sh", "bash", "zsh", "bat", "cmd", "ps1", "swift", "kt", "kts", "scala", "dart", "lua", "r", "perl", "pl", "asm", "dockerfile", "makefile", "gitignore"
  ]), []);

  // ── Eye Icon Preview Handler ──────────────────────
  const handlePreviewFile = (file) => {
    // On smaller/tablet screens (<1024px), open full preview modal directly
    if (window.innerWidth < 1024) {
      if (onFilePreview) onFilePreview(file);
      return;
    }

    setSelectedPreviewFile(file);
    setShowPreviewPane(true);
    setTextContent("");

    if (!file || !file.url) return;

    const ext = (file.extension || (file.name?.includes(".") ? file.name.split(".").pop() : "")).toLowerCase();
    const isText = TEXT_CODE_EXTENSIONS.has(ext) || file.url.startsWith("data:text/") || file.url.startsWith("data:application/json") || file.url.startsWith("data:application/sql") || (file.type && (file.type.startsWith("text/") || file.type.includes("json") || file.type.includes("sql")));

    if (isText) {
      if (file.url.startsWith("data:")) {
        try {
          const parts = file.url.split(",");
          if (parts.length > 1) {
            const isBase64 = file.url.includes(";base64");
            const decoded = isBase64 ? atob(parts[1]) : decodeURIComponent(parts[1]);
            setTextContent(extractPlainTextWithControlChars(decoded.slice(0, 100000)));
            return;
          }
        } catch (e) {
          console.warn("Failed to decode data URL text:", e);
        }
      }

      fetch(file.url)
        .then((res) => res.text())
        .then((text) => setTextContent(extractPlainTextWithControlChars(text.slice(0, 100000))))
        .catch(() => setTextContent(""));
    }
  };

  // Active preview file category
  const activeExt = (selectedPreviewFile?.extension || "").toLowerCase();
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(activeExt);
  const isPdf = activeExt === "pdf";
  const isVideo = ["mp4", "mov", "webm", "avi"].includes(activeExt);
  const isAudio = ["mp3", "wav", "ogg"].includes(activeExt);

  // Helper to render file list or grid
  const renderFileList = (filesList) => {
    if (viewMode === "grid") {
      return (
        <div
          className={`grid gap-4 ${
            showPreviewPane && selectedPreviewFile
              ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}
        >
          {filesList.map((file, idx) => (
            <div key={`${file.url}-${idx}`}>
              <FileCard file={file} onPreview={handlePreviewFile} onOpenNote={onOpenNote} />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] text-[11px] uppercase tracking-wider font-semibold text-gray-500">
          <div className="col-span-6 md:col-span-5">Name</div>
          <div className="col-span-4 md:col-span-4">Relationship</div>
          <div className="hidden md:block md:col-span-3 text-right">Size</div>
        </div>

        {filesList.map((file, idx) => {
          const ext = file.extension;
          return (
            <div
              key={`${file.url}-${idx}`}
              className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group items-center"
            >
              <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0">
                <button
                  onClick={() => handlePreviewFile(file)}
                  className="p-1 rounded-md text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-brand-500/10 transition-all shrink-0 cursor-pointer"
                  title="Preview in side pane"
                >
                  <Eye size={14} />
                </button>
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
    );
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center -mt-8 animate-fade-in">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
          Loading files…
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[calc(100vh-120px)]"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Drag & Drop Active Overlay (Fixed to current visible screen view) ───── */}
      {isDraggingOver && (
        <div className="fixed inset-0 lg:left-[240px] z-[9999] bg-[#0d0f14]/85 backdrop-blur-sm border-4 border-dashed border-brand-500 flex flex-col items-center justify-center p-6 animate-fade-in pointer-events-none">
          <div className="p-8 bg-[#16181f] border border-brand-500/40 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-md w-full">
            <div className="w-20 h-20 rounded-3xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center animate-bounce shadow-brand shadow-brand-500/20">
              <UploadCloud size={40} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white mb-1">Drop files here to upload</h3>
              <p className="text-xs text-gray-400">PDFs, Images, Code, SQL, Documents, Videos & Archives</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Big Centered Uploading Modal (Fixed to current visible screen view) ───── */}
      {isUploadingFiles && (
        <div className="fixed inset-0 lg:left-[240px] z-[9999] bg-[#0d0f14]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in pointer-events-none">
          <div className="p-8 bg-[#16181f] border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center animate-spin">
              <UploadCloud size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Uploading files…</h3>
              <p className="text-xs text-gray-400">Processing and saving your file</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Context Header + Count Badge & Toolbar ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 shrink-0">
          {isSidebarCollapsed && (
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all cursor-pointer mr-0.5"
              title="Open Sidebar"
            >
              <Menu size={18} />
            </button>
          )}
          Files
          <span className="text-xs font-semibold text-gray-500 bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full font-mono">
            {allFiles.length}
          </span>
        </h2>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Quick Search Input */}
          <div className="relative min-w-[140px] sm:min-w-[160px] flex-1 sm:flex-initial shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.06] rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 transition-colors shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={onUploadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-brand transition-all cursor-pointer shrink-0"
            title="Upload new file"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Upload File</span>
          </button>

          {/* New Independent Folder Button */}
          <button
            onClick={() => {
              const name = prompt("Enter new folder name:");
              if (name && name.trim() && onCreateFolder) {
                onCreateFolder(name.trim());
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#16181f] hover:bg-gray-100 dark:hover:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
            title="Create independent folder"
          >
            <FolderPlus size={14} className="text-amber-400" />
            <span className="hidden sm:inline">New Folder</span>
          </button>

          {/* Grouping Dropdown Trigger */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setShowGroupMenu(!showGroupMenu);
                setShowSortMenu(false);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#16181f] hover:bg-gray-100 dark:hover:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <span className="text-gray-400 font-normal">Group:</span>
              <span className="max-w-[110px] truncate">{groupLabels[groupBy]}</span>
              <ChevronDown size={13} className="text-gray-400 ml-0.5 shrink-0" />
            </button>

            {showGroupMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-xl py-1 z-30 animate-fade-in">
                {Object.entries(groupLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setGroupBy(key);
                      setShowGroupMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                      groupBy === key
                        ? "text-brand-500 dark:text-brand-400 font-semibold"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span>{label}</span>
                    {groupBy === key && <span className="text-brand-500 font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Dropdown Trigger */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                setShowGroupMenu(false);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#16181f] hover:bg-gray-100 dark:hover:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <span className="text-gray-400 font-normal">Sort:</span>
              <span className="max-w-[110px] truncate">{sortLabels[sortBy]}</span>
              <ChevronDown size={13} className="text-gray-400 ml-0.5 shrink-0" />
            </button>

            {showSortMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-xl py-1 z-30 animate-fade-in">
                {Object.entries(sortLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSortBy(key);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                      sortBy === key
                        ? "text-brand-500 dark:text-brand-400 font-semibold"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span>{label}</span>
                    {sortBy === key && <span className="text-brand-500 font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Toggle Switch (Grid vs List) */}
          <div className="flex items-center bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.06] rounded-xl p-0.5 shrink-0 shadow-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-brand-500 text-white shadow-brand"
                  : "text-gray-400 hover:text-gray-700 dark:hover:text-white"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-brand-500 text-white shadow-brand"
                  : "text-gray-400 hover:text-gray-700 dark:hover:text-white"
              }`}
              title="List view"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Windows 11 Explorer Breadcrumb Path Navigation Bar ────── */}
      <div className="mb-4 px-3.5 py-2 bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.06] rounded-xl flex items-center gap-1.5 text-xs text-gray-400 overflow-x-auto sidebar-scroll shadow-xs">
        <div className="w-5 h-5 rounded-md bg-brand-500/10 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
          <Laptop size={13} />
        </div>

        <button
          onClick={() => setActivePathFolder(null)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors cursor-pointer shrink-0 font-medium ${
            !activePathFolder
              ? "bg-black/5 dark:bg-white/[0.06] text-gray-900 dark:text-white"
              : "hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <span>Files</span>
        </button>

        {activePathFolder && (
          <>
            <ChevronRight size={13} className="text-gray-400 dark:text-gray-600 shrink-0" />

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-400 font-semibold shrink-0">
              <Folder size={13} className="fill-amber-400/20" />
              <span>{activePathFolder}</span>
            </div>

            <button
              onClick={() => setActivePathFolder(null)}
              className="ml-auto text-[11px] font-semibold text-brand-500 dark:text-brand-400 hover:underline cursor-pointer shrink-0"
            >
              ← Back to Root
            </button>
          </>
        )}
      </div>

      {/* ── Relationship Category Filter Pills ────── */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto sidebar-scroll pb-1">
        <button
          onClick={() => setRelFilter("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            relFilter === "all"
              ? "bg-brand-500 text-white shadow-brand"
              : "bg-white dark:bg-[#16181f] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/[0.06]"
          }`}
        >
          All Files ({relCounts.all})
        </button>
        <button
          onClick={() => setRelFilter("attached")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            relFilter === "attached"
              ? "bg-brand-500 text-white shadow-brand"
              : "bg-white dark:bg-[#16181f] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/[0.06]"
          }`}
        >
          <Link2 size={13} />
          <span>Attached to Notes ({relCounts.attached})</span>
        </button>
        <button
          onClick={() => setRelFilter("independent")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            relFilter === "independent"
              ? "bg-brand-500 text-white shadow-brand"
              : "bg-white dark:bg-[#16181f] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/[0.06]"
          }`}
        >
          <File size={13} />
          <span>Independent Files ({relCounts.independent})</span>
        </button>
      </div>

      {/* ── File Extension Type Filter Pills ────── */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto sidebar-scroll pb-1">
        {TYPE_FILTERS.map((tf) => {
          const count = typeCounts[tf.key] || 0;
          const isActive = typeFilter === tf.key;
          return (
            <button
              key={tf.key}
              onClick={() => setTypeFilter(tf.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-semibold"
                  : "bg-black/[0.03] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span>{tf.label}</span>
              <span className="text-[10px] opacity-75 font-mono">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main Workspace + Preview Pane Layout ─────────────────── */}
      <div className="flex items-start gap-6 relative" ref={containerRef}>
        {/* Files Grid / List Container */}
        <div className="flex-1 min-w-0">
          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.06] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto mb-3">
                <Paperclip size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No files match your filter</h3>
              <p className="text-xs text-gray-500 mb-4">Try clearing your search query or selecting a different filter option.</p>
              <button
                onClick={() => {
                  setRelFilter("all");
                  setTypeFilter("all");
                  setSearchQuery("");
                }}
                className="text-xs font-semibold text-brand-500 dark:text-brand-400 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : groupBy !== "none" && groupedFiles && !activePathFolder ? (
            /* Windows File Explorer Style Folder Tree View */
            <div className="space-y-3">
              {Object.entries(groupedFiles).map(([groupName, groupItems]) => {
                const isCollapsed = collapsedGroups.has(groupName);
                const isFolderGroup = groupBy === "folder" || groupBy === "foldersOnly";
                return (
                  <div key={groupName} className="group/folder">
                    {/* Windows Explorer Folder Row */}
                    <div
                      onClick={() => {
                        if (groupBy === "foldersOnly") {
                          setActivePathFolder(groupName);
                        } else {
                          toggleGroupCollapse(groupName);
                        }
                      }}
                      className="px-4 py-3 rounded-xl bg-white dark:bg-[#16181f] hover:bg-gray-100 dark:hover:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] flex items-center justify-between cursor-pointer transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {groupBy !== "foldersOnly" && (
                          <ChevronRight
                            size={15}
                            className={`text-gray-400 transition-transform duration-200 ${!isCollapsed ? "rotate-90" : ""}`}
                          />
                        )}
                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                          {isFolderGroup ? (
                            <Folder size={20} className="text-amber-400 fill-amber-400/20" />
                          ) : (
                            <Layers size={20} className="text-purple-400" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover/folder:text-amber-400 transition-colors">
                          {groupName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 font-mono bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-1 rounded-lg">
                          {groupItems.length} {groupItems.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </div>

                    {/* Indented Contained Files Tree View (Hidden in Folders Only root view) */}
                    {!isCollapsed && groupBy !== "foldersOnly" && (
                      <div className="ml-7 pl-3 border-l-2 border-amber-400/20 dark:border-amber-400/10 space-y-2 pt-2 pb-1 animate-fade-in">
                        {renderFileList(groupItems)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat File Display (Grid vs List) */
            renderFileList(filteredFiles)
          )}
        </div>

        {/* ── Ultra-Clean Pure Resizable Preview Side Panel (X & Y Axis) ── */}
        {showPreviewPane && selectedPreviewFile && (
          <aside
            style={{
              width: `${paneWidth}px`,
              maxWidth: "45%",
              height: paneHeight ? `${paneHeight}px` : "calc(100vh - 160px)",
            }}
            className="relative shrink-0 bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-3 flex flex-col sticky top-4 shadow-xl overflow-hidden animate-fade-in group/pane select-none"
          >
            {/* ── Left Drag Handle (Resize X Width) ────────────────────────── */}
            <div
              onMouseDown={handleMouseDownX}
              className="absolute left-0 top-0 bottom-0 w-2.5 hover:w-3.5 bg-transparent hover:bg-brand-500/30 cursor-col-resize z-30 transition-all flex items-center justify-center group-hover/pane:bg-white/[0.02]"
              title="Drag to resize width (X)"
            >
              <div className="w-0.5 h-8 bg-gray-400/40 rounded-full" />
            </div>

            {/* ── Bottom Drag Handle (Resize Y Height) ──────────────────────── */}
            <div
              onMouseDown={handleMouseDownY}
              className="absolute bottom-0 left-0 right-0 h-2.5 hover:h-3.5 bg-transparent hover:bg-brand-500/30 cursor-row-resize z-30 transition-all flex items-center justify-center group-hover/pane:bg-white/[0.02]"
              title="Drag to resize height (Y)"
            >
              <div className="h-0.5 w-8 bg-gray-400/40 rounded-full" />
            </div>

            {/* ── Bottom-Left Corner Drag Handle (Resize Both X & Y) ───────── */}
            <div
              onMouseDown={handleMouseDownXY}
              className="absolute bottom-0 left-0 w-4 h-4 hover:w-5 hover:h-5 bg-brand-500/30 hover:bg-brand-500/60 cursor-nwse-resize z-40 transition-all rounded-tr-lg flex items-center justify-center"
              title="Drag to resize width & height (X & Y)"
            />

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
                  <X size={16} />
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
