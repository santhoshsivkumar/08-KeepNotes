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
} from "lucide-react";
import { useUpload } from "../hooks/useUpload";
import { useClipboard } from "../hooks/useClipboard";
import { useTheme } from "../hooks/useTheme";
import MediaDropzone from "./shared/MediaDropzone";
import OutlookAttachmentTile from "./shared/OutlookAttachmentTile";
import { isImage } from "../utils/fileHelpers";

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
  const [previewImg, setPreviewImg]   = useState(null);

  const isLoadedRef    = useRef(false);
  const hasUserEdited  = useRef(false);
  const saveTimer      = useRef(null);
  const quillRef       = useRef(null);
  const editorWrapRef  = useRef(null);
  const fileInputRef   = useRef(null);

  const collectionRef = collection(database, "docsData");
  const { uploadFile, uploading, progress } = useUpload();
  const { isDark } = useTheme();

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

  /* ── Instant Non-Blocking Close Handler (0ms delay) ────── */
  const handleSafeClose = useCallback(() => {
    if (previewImg) {
      setPreviewImg(null);
      return;
    }
    // Close modal IMMEDIATELY (0ms) so user never waits!
    onClose();

    // If user edited, save asynchronously in background
    if (hasUserEdited.current) {
      saveImmediately();
    }
  }, [previewImg, saveImmediately, onClose]);

  /* ── Debounced Auto-Save for Text Typing ──────────────── */
  useEffect(() => {
    if (!isLoadedRef.current || !hasUserEdited.current) return;

    clearTimeout(saveTimer.current);
    setSaving(true);
    setSaved(false);

    saveTimer.current = setTimeout(() => {
      saveImmediately();
    }, 150);

    return () => clearTimeout(saveTimer.current);
  }, [title, content, color, attachments, saveImmediately]);

  /* ── Keyboard Shortcuts ───────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        handleSafeClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleSafeClose]);

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={handleSafeClose}
      />

      {/* Modal Window */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-none">
        <div
          ref={editorWrapRef}
          className={`relative w-full rounded-2xl shadow-modal flex flex-col pointer-events-auto transition-all duration-300 overflow-hidden ${
            isMaximized
              ? "h-full max-h-full max-w-full rounded-none"
              : "max-w-4xl max-h-[92vh] h-[85vh]"
          }`}
          style={{ backgroundColor: modalBg }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── 1. Top Header Bar ──────────────────────────── */}
          <div className="relative flex items-center justify-between px-5 pt-3.5 pb-2.5 shrink-0 border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
            
            {/* Status indicator badge (Fixed Left Slot) */}
            <div className="flex items-center gap-2 min-w-[100px] sm:min-w-[120px]">
              {saving && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  Saving…
                </span>
              )}
              {!saving && saved && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-full animate-fade-in">
                  <Save size={12} /> Saved ✓
                </span>
              )}
              {!saving && !saved && saveError && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-full">
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

            {/* Header Right Actions (Fixed Right Slot) */}
            <div className="flex items-center gap-1 min-w-[100px] sm:min-w-[120px] justify-end">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                title={isMaximized ? "Restore window size" : "Maximize editor window"}
              >
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={handleSafeClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                title="Close editor (Esc)"
              >
                <X size={18} />
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
              <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-gray-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#151720]/70 overflow-hidden shadow-sm">
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

                {/* Attachments Area INSIDE the Editor Container Box at Bottom */}
                {attachments.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] shrink-0 overflow-visible">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        <Paperclip size={12} className="text-brand-500" />
                        <span>Attachments ({attachments.length})</span>
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                      >
                        + Add files
                      </button>
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

            {/* Center / Right: Upload Progress Dock or Attach shortcut */}
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

              {/* Show attach shortcut ONLY when attachments array is empty to prevent duplicates */}
              {!uploading && attachments.length === 0 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="hover:text-brand-500 flex items-center gap-1 font-medium transition-colors"
                  title="Attach document or image file"
                >
                  <Paperclip size={12} /> Attach file
                </button>
              )}

              {!uploading && (
                <>
                  <span>·</span>
                  <span className="hidden sm:inline">Ctrl+V paste image · Drag &amp; drop files</span>
                </>
              )}
            </div>
          </div>

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
