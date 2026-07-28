import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { database } from "../firebase/firebaseConfig";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  X,
  Save,
  Paperclip,
  Image as ImageIcon,
  Upload,
  Maximize2,
  Minimize2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Minus,
  Square,
  GripHorizontal,
} from "lucide-react";
import { useUpload } from "../hooks/useUpload";
import { useClipboard } from "../hooks/useClipboard";
import { useTheme } from "../hooks/useTheme";
import MediaDropzone from "./shared/MediaDropzone";
import OutlookAttachmentTile from "./shared/OutlookAttachmentTile";
import { isImage } from "../utils/fileHelpers";
import { downloadAllAttachments } from "../utils/downloadHelpers";

/* ── Note accent colors ─────────────────────────────────── */
const NOTE_COLORS = [
  { name: "default", swatch: "#ffffff", darkSwatch: "#1c1e28", label: "Default" },
  { name: "yellow",  swatch: "#fef9c3", darkSwatch: "#262014", label: "Yellow"  },
  { name: "green",   swatch: "#dcfce7", darkSwatch: "#162519", label: "Green"   },
  { name: "blue",    swatch: "#dbeafe", darkSwatch: "#152033", label: "Blue"    },
  { name: "pink",    swatch: "#fce7f3", darkSwatch: "#291624", label: "Pink"    },
  { name: "purple",  swatch: "#f3e8ff", darkSwatch: "#1e1633", label: "Purple"  },
  { name: "orange",  swatch: "#ffedd5", darkSwatch: "#291b10", label: "Orange"  },
  { name: "teal",    swatch: "#ccfbf1", darkSwatch: "#102522", label: "Teal"    },
];

/* ── Teams / Outlook Style Full Quill Toolbar ──────────── */
const quillModules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
      [{ align: [] }],
      ["blockquote", "code-block"],
      ["link"],
      ["clean"],
    ],
  },
  clipboard: { matchVisual: false },
};

const quillFormats = [
  "header", "bold", "italic", "underline", "strike",
  "color", "background", "list", "align",
  "blockquote", "code-block", "link", "image",
];

/* ── Main Component ─────────────────────────────────────── */
const EditNote = ({ id, onClose }) => {
  const [title, setTitle]             = useState("");
  const [content, setContent]         = useState("");
  const [color, setColor]             = useState("default");
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [previewImg, setPreviewImg]   = useState(null);
  const [copiedText, setCopiedText]   = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ width: 880, height: 640 });
  const [isResizing, setIsResizing]   = useState(false);

  const isLoadedRef    = useRef(false);
  const hasUserEdited  = useRef(false);
  const saveTimer      = useRef(null);
  const quillRef       = useRef(null);
  const editorWrapRef  = useRef(null);
  const fileInputRef   = useRef(null);

  const collectionRef = collection(database, "docsData");
  const { uploadFile, uploading, progress } = useUpload();
  const { isDark } = useTheme();

  /* ── 8-Directional Mouse Drag-to-Resize Handler (Windows App Style) ── */
  const handleMouseDownEdge = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = windowDimensions.width;
    const startHeight = windowDimensions.height;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction.includes("right")) {
        newWidth = Math.max(420, Math.min(window.innerWidth - 32, startWidth + deltaX * 2));
      } else if (direction.includes("left")) {
        newWidth = Math.max(420, Math.min(window.innerWidth - 32, startWidth - deltaX * 2));
      }

      if (direction.includes("bottom")) {
        newHeight = Math.max(400, Math.min(window.innerHeight - 32, startHeight + deltaY * 2));
      } else if (direction.includes("top")) {
        newHeight = Math.max(400, Math.min(window.innerHeight - 32, startHeight - deltaY * 2));
      }

      setWindowDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  /* ── 1-Click Copy Text & Code Handler (Excludes Title) ──── */
  const handleCopyContent = useCallback(() => {
    let textToCopy = "";
    // Prefer Quill editor's getText() to preserve code block formatting and linebreaks exactly
    const editor = quillRef.current?.getEditor();
    if (editor) {
      textToCopy = editor.getText().trim();
    } else {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content || "";
      textToCopy = (tempDiv.innerText || tempDiv.textContent || "").trim();
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  }, [content]);

  /* ── Attach Tooltips to Quill Toolbar Buttons ─────────── */
  useEffect(() => {
    const timer = setTimeout(() => {
      const toolbar = editorWrapRef.current?.querySelector(".ql-toolbar");
      if (!toolbar) return;

      const tooltips = {
        ".ql-header": "Text Formatting (Heading 1, 2, 3, Normal)",
        ".ql-bold": "Bold Text (Ctrl+B)",
        ".ql-italic": "Italic Text (Ctrl+I)",
        ".ql-underline": "Underline Text (Ctrl+U)",
        ".ql-strike": "Strikethrough",
        ".ql-color": "Text Font Color",
        ".ql-background": "Highlight / Background Color",
        '.ql-list[value="ordered"]': "Numbered List",
        '.ql-list[value="bullet"]': "Bulleted List",
        '.ql-list[value="check"]': "Checklist / Task List",
        ".ql-align": "Text Alignment",
        ".ql-blockquote": "Quote Callout Box",
        ".ql-code-block": "Code Block (Terminal Highlighting)",
        ".ql-link": "Insert / Edit Web Link",
        ".ql-clean": "Clear Formatting",
      };

      Object.entries(tooltips).forEach(([selector, label]) => {
        const el = toolbar.querySelector(selector);
        if (el) {
          el.setAttribute("title", label);
          el.setAttribute("aria-label", label);
        }
      });
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  /* ── Load Note Data ───────────────────────────────────── */
  useEffect(() => {
    isLoadedRef.current = false;
    hasUserEdited.current = false;
    const docRef = doc(collectionRef, id);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTitle(data.title || "");
        setContent(data.docsDesc || "");
        setColor(data.color || "default");
        setAttachments(data.attachments || []);
        setTimeout(() => {
          isLoadedRef.current = true;
          hasUserEdited.current = false;
        }, 100);
      }
    });
    return () => unsubscribe();
  }, [id]);

  /* ── Instant Direct Save Function ─────────────────────── */
  const saveImmediately = useCallback(async (customAttachments = null) => {
    if (!id) return;
    clearTimeout(saveTimer.current);
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const attList = customAttachments ?? attachments;
    const safeAttachments = (attList || []).map((att) => {
      if (att.url && att.url.length > 700000) {
        return {
          ...att,
          url: att.url.substring(0, 50000) + "...(compressed)",
        };
      }
      return att;
    });

    try {
      await updateDoc(doc(collectionRef, id), {
        title,
        docsDesc: content,
        color,
        attachments: safeAttachments,
        updatedAt: new Date(),
      });
      setSaving(false);
      setSaved(true);
      hasUserEdited.current = false;
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaving(false);
      setSaveError("Error saving note");
    }
  }, [id, title, content, color, attachments]);

  /* ── Save-on-Close & Manual Save Handler (Zero Quota Burn) ── */
  const handleSafeClose = useCallback(() => {
    if (previewImg) {
      setPreviewImg(null);
      return;
    }
    // Close modal IMMEDIATELY (0ms) so user never waits!
    onClose();

    // Single atomic write ONLY if user made edits
    if (hasUserEdited.current) {
      saveImmediately();
    }
  }, [previewImg, saveImmediately, onClose]);

  /* ── Keyboard Shortcuts (Esc to Close & Ctrl+S to Save) ───── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        handleSafeClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveImmediately();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleSafeClose, saveImmediately]);

  /* ── Insert Image Into Editor ─────────────────────────── */
  const insertImageIntoEditor = useCallback((url) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = editor.getSelection(true) ?? { index: editor.getLength() - 1 };
    editor.insertEmbed(range.index, "image", url, "user");
    editor.setSelection(range.index + 1, 0, "user");
    hasUserEdited.current = true;
  }, []);

  /* ── Handle Instant Files Upload & Immediate Save ─────── */
  const handleFiles = useCallback(async (files) => {
    setSaveError(null);
    const newResults = [];

    for (const file of files) {
      try {
        const result = await uploadFile(file, id);
        newResults.push(result);
      } catch (err) {
        setSaveError(err?.message || "Upload failed");
      }
    }

    if (newResults.length > 0) {
      hasUserEdited.current = true;
      setAttachments((prev) => {
        const updated = [...prev, ...newResults];
        saveImmediately(updated);
        return updated;
      });
    }
  }, [uploadFile, id, saveImmediately]);

  /* ── Clipboard Listener (Ctrl+V) ─────────────────────── */
  useClipboard({
    onImagePaste: (file) => handleFiles([file]),
    containerRef: null,
    enabled: true,
  });

  /* ── Remove Attachment & Immediate Save ──────────────── */
  const removeAttachment = useCallback((toRemove) => {
    hasUserEdited.current = true;
    setAttachments((prev) => {
      const updated = prev.filter((a) => a.url !== toRemove.url);
      saveImmediately(updated);
      return updated;
    });
  }, [saveImmediately]);

  // Calculate word and character count
  const { wordCount, charCount } = useMemo(() => {
    const plainText = content.replace(/<[^>]+>/g, " ").trim();
    const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
    return { wordCount: words, charCount: plainText.length };
  }, [content]);

  const selectedColor = NOTE_COLORS.find((c) => c.name === color) ?? NOTE_COLORS[0];
  const modalBg = isDark ? (selectedColor.darkSwatch || "#1c1e28") : (selectedColor.swatch || "#ffffff");

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-[#1c1e28] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl animate-fade-in text-xs font-semibold text-gray-800 dark:text-gray-100">
        <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse shrink-0" />
        <span className="max-w-[150px] sm:max-w-[200px] truncate">{title || "Untitled draft"}</span>
        <div className="flex items-center gap-1 border-l border-gray-200 dark:border-white/10 pl-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/15 dark:hover:bg-brand-500/25 text-brand-600 dark:text-brand-300 transition-all font-semibold cursor-pointer"
            title="Restore window"
          >
            Restore
          </button>
          <button
            onClick={handleSafeClose}
            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
            title="Close window"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={handleSafeClose}
      />

      {/* Modal Window */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <div
          ref={editorWrapRef}
          className={`relative rounded-2xl shadow-modal flex flex-col pointer-events-auto transition-all ${
            isResizing ? "transition-none select-none" : "duration-200"
          } overflow-hidden ${
            isMaximized ? "w-full h-full max-w-full max-h-full rounded-none" : ""
          }`}
          style={{
            backgroundColor: modalBg,
            width: isMaximized ? "100%" : `${windowDimensions.width}px`,
            height: isMaximized ? "100%" : `${windowDimensions.height}px`,
            maxWidth: isMaximized ? "100%" : "96vw",
            maxHeight: isMaximized ? "100%" : "94vh",
          }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── 1. Top Header Bar ──────────────────────────── */}
          <div className="relative flex items-center justify-between px-5 pt-3.5 pb-2.5 shrink-0 border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
            
            {/* Left Slot: Save Button & Status Indicator */}
            <div className="flex items-center gap-2 min-w-[140px] sm:min-w-[180px]">
              <button
                onClick={() => saveImmediately()}
                disabled={saving}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                  saved
                    ? "bg-emerald-600 text-white"
                    : "bg-brand-500 hover:bg-brand-600 text-white active:scale-95 disabled:opacity-50"
                }`}
                title="Save changes to cloud (Ctrl+S)"
              >
                {saving ? (
                  <AppleSpinner className="w-3.5 h-3.5 text-white" />
                ) : saved ? (
                  <Check size={13} className="text-white" />
                ) : (
                  <Save size={13} />
                )}
                <span>{saving ? "Saving…" : saved ? "Saved ✓" : "Save"}</span>
              </button>

              {saveError && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md">
                  <AlertCircle size={12} /> {saveError}
                </span>
              )}
            </div>

            {/* Note Color Swatches (Centered Absolutely — Never Moves!) */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/80 dark:bg-black/40 px-3 py-1 rounded-full border border-black/[0.05] dark:border-white/[0.08] shadow-xs">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mr-1 uppercase">Color</span>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.name}
                  title={`Color: ${c.label}`}
                  onClick={() => {
                    setColor(c.name);
                    hasUserEdited.current = true;
                  }}
                  className="w-4 h-4 rounded-full border transition-transform hover:scale-125 focus:outline-none"
                  style={{
                    backgroundColor: isDark ? c.darkSwatch : c.swatch,
                    borderColor: color === c.name ? "#7c3aed" : "rgba(0,0,0,0.15)",
                    transform: color === c.name ? "scale(1.25)" : undefined,
                  }}
                />
              ))}
            </div>

            {/* Header Right Window Control Buttons (Windows OS Style) */}
            <div className="flex items-center gap-1 min-w-[120px] justify-end">
              {/* Minimize */}
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                title="Minimize window"
              >
                <Minus size={15} />
              </button>

              {/* Maximize / Restore */}
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                title={isMaximized ? "Restore window size" : "Maximize window"}
              >
                {isMaximized ? <Minimize2 size={15} /> : <Square size={14} />}
              </button>

              {/* Close */}
              <button
                onClick={handleSafeClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
                title="Close editor (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── 2. Compact Title Section ──────────────────── */}
          <div className="px-5 pt-3 pb-1 shrink-0">
            <div className="bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2 flex items-center gap-3 transition-all duration-200 focus-within:border-brand-500/80 dark:focus-within:border-brand-400/80 focus-within:ring-2 focus-within:ring-brand-500/15 focus-within:bg-white dark:focus-within:bg-[#181a24]">
              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/20 border border-brand-200/50 dark:border-brand-500/30 px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0 select-none">
                TITLE
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (isLoadedRef.current) hasUserEdited.current = true;
                }}
                placeholder="Enter title…"
                className="w-full text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none shadow-none transition-colors"
                style={{ outline: "none", boxShadow: "none" }}
              />
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) handleFiles(files);
              e.target.value = "";
            }}
          />

          {/* ── 3. Drag Zone & Unified Quill Editor + Attachments Box ── */}
          <MediaDropzone onFiles={handleFiles} disabled={uploading}>
            <div className="flex-1 flex flex-col min-h-0 px-5 py-2">
              <div className="relative flex-1 flex flex-col min-h-0 rounded-xl border border-gray-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#151720]/70 overflow-hidden shadow-sm">
                
                {/* 1-Click Copy Code / Text Button (Secondary Glass Utility Button Style) */}
                <div className="absolute top-2 right-3 z-20">
                  <button
                    onClick={handleCopyContent}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95 ${
                      copiedText
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500"
                        : "bg-white/90 hover:bg-white dark:bg-[#222533] dark:hover:bg-[#2a2e3f] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10"
                    }`}
                    title="1-Click Copy text & code to clipboard (excluding title)"
                  >
                    {copiedText ? <Check size={13} className="text-white" /> : <Copy size={13} className="text-brand-500" />}
                    <span>{copiedText ? "Copied! ✓" : "Copy Code / Text"}</span>
                  </button>
                </div>

                {/* Text Area */}
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={content}
                  onChange={(val) => {
                    setContent(val);
                    if (isLoadedRef.current && val !== content) {
                      hasUserEdited.current = true;
                    }
                  }}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Start typing here… hover toolbar options for tooltips, add code blocks, lists, or paste images with Ctrl+V"
                  className="flex-1 flex flex-col h-full"
                />

                {/* Subtle Background Watermark / Placeholder Hint inside Text Area */}
                {attachments.length === 0 && (
                  <div className="absolute bottom-3 right-4 pointer-events-none select-none z-10 opacity-40">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.1] font-mono text-[10px] font-bold">
                        Ctrl + V
                      </span>
                      <span>Paste Image</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.1] font-mono text-[10px] font-bold">
                        <Upload size={10} /> Drag &amp; Drop
                      </span>
                    </div>
                  </div>
                )}

                {/* Attachments Area INSIDE the Editor Container Box at Bottom */}
                {attachments.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] shrink-0 overflow-visible z-20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        <Paperclip size={12} className="text-brand-500" />
                        <span>Attachments ({attachments.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadAllAttachments(attachments)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-500/30 transition-all cursor-pointer"
                          title="Download all attachments"
                        >
                          <Download size={12} /> Download All
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/15 dark:hover:bg-brand-500/25 text-brand-600 dark:text-brand-300 border border-brand-200/50 dark:border-brand-500/30 transition-all cursor-pointer"
                        >
                          <Paperclip size={12} />
                          <span>+ Add files</span>
                        </button>
                      </div>
                    </div>

                    {/* Outlook Attachment Tiles Grid */}
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att, idx) => (
                        <OutlookAttachmentTile
                          key={`${att.url}-${idx}`}
                          attachment={att}
                          onRemove={removeAttachment}
                          onInsertInline={insertImageIntoEditor}
                          onPreview={(a) => {
                            if (isImage({ type: a.type, name: a.name })) {
                              setPreviewImg(a);
                            } else {
                              window.open(a.url, "_blank");
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </MediaDropzone>

          {/* ── 5. Bottom Status Bar & Upload Progress Dock ── */}
          <div className="px-6 py-2.5 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between shrink-0 text-xs text-gray-400 dark:text-gray-500 bg-black/[0.01] dark:bg-white/[0.01]">
            
            {/* Word / Char Counter */}
            <div className="flex items-center gap-3 font-medium">
              <span>{wordCount} words</span>
              <span>·</span>
              <span>{charCount} characters</span>
            </div>

            {/* Center / Right: Upload Progress Dock & Styled Attach Button */}
            <div className="flex items-center gap-3">
              {/* Docked Upload Progress Indicator */}
              {uploading && (
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 rounded-full text-brand-600 dark:text-brand-400 animate-fade-in font-semibold text-xs">
                  <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Uploading {progress}%</span>
                  <div className="w-16 h-1 bg-brand-200 dark:bg-brand-500/30 rounded-full overflow-hidden ml-1">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Styled Attach Button */}
              {!uploading && attachments.length === 0 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  title="Attach document, image or code file"
                >
                  <Paperclip size={13} />
                  <span>Attach File</span>
                </button>
              )}
            </div>
          </div>

          {/* Edge & Corner Resizers (Windows OS style 8-Directional Handles) */}
          {!isMaximized && (
            <>
              {/* 4 Outer Edges */}
              <div onMouseDown={(e) => handleMouseDownEdge(e, "right")} className="absolute top-0 right-0 w-2 h-full cursor-e-resize z-40" title="Resize width" />
              <div onMouseDown={(e) => handleMouseDownEdge(e, "left")} className="absolute top-0 left-0 w-2 h-full cursor-w-resize z-40" title="Resize width" />
              <div onMouseDown={(e) => handleMouseDownEdge(e, "top")} className="absolute top-0 left-0 w-full h-2 cursor-n-resize z-40" title="Resize height" />
              <div onMouseDown={(e) => handleMouseDownEdge(e, "bottom")} className="absolute bottom-0 left-0 w-full h-2 cursor-s-resize z-40" title="Resize height" />

              {/* 4 Outer Corners */}
              <div onMouseDown={(e) => handleMouseDownEdge(e, "top-left")} className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50" title="Resize corner" />
              <div onMouseDown={(e) => handleMouseDownEdge(e, "top-right")} className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-50" title="Resize corner" />
              <div onMouseDown={(e) => handleMouseDownEdge(e, "bottom-left")} className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50" title="Resize corner" />
              <div
                onMouseDown={(e) => handleMouseDownEdge(e, "bottom-right")}
                className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize z-50 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-brand-500 select-none opacity-60 hover:opacity-100 transition-opacity"
                title="Drag to resize window"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <circle cx="8" cy="8" r="1" />
                  <circle cx="8" cy="4" r="1" />
                  <circle cx="4" cy="8" r="1" />
                </svg>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Image Preview Modal Overlay ─────────────────── */}
      {previewImg && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors p-2"
              title="Close image preview"
            >
              <X size={24} />
            </button>
            <img
              src={previewImg.url}
              alt={previewImg.name}
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            <p className="text-white text-xs mt-3 font-medium bg-black/50 px-3 py-1 rounded-full">
              {previewImg.name}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default EditNote;
