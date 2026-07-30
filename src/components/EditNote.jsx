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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Clipboard,
  Type,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useUpload } from "../hooks/useUpload";
import { useClipboard } from "../hooks/useClipboard";
import { useTheme } from "../hooks/useTheme";
import MediaDropzone from "./shared/MediaDropzone";
import OutlookAttachmentTile from "./shared/OutlookAttachmentTile";
import { isImage } from "../utils/fileHelpers";
import { downloadAllAttachments } from "../utils/downloadHelpers";

/* ── Apple-style micro spinner ───────────────────────────── */
const AppleSpinner = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

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
  const [copiedText, setCopiedText]   = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ width: 880, height: 640 });
  const [isResizing, setIsResizing]   = useState(false);
  const [zoomLevel, setZoomLevelRaw]     = useState(() => {
    const v = localStorage.getItem("kn_zoomLevel");
    return v ? Number(v) : 100;
  });
  const setZoomLevel = (val) => {
    const next = typeof val === "function" ? val(zoomLevel) : val;
    setZoomLevelRaw(next);
    localStorage.setItem("kn_zoomLevel", String(next));
  };

  const [pasteMenuOpen, setPasteMenuOpen] = useState(false);
  const [isPastingLarge, setIsPastingLarge] = useState(false);

  const [toolbarCollapsed, setToolbarCollapsedRaw] = useState(() =>
    localStorage.getItem("kn_toolbarCollapsed") !== "false"
  );
  const setToolbarCollapsed = (val) => {
    const next = typeof val === "function" ? val(toolbarCollapsed) : val;
    setToolbarCollapsedRaw(next);
    localStorage.setItem("kn_toolbarCollapsed", String(next));
  };

  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false);

  const [pasteMode, setPasteModeRaw] = useState(() =>
    localStorage.getItem("kn_pasteMode") || "formatted"
  );
  const setPasteMode = (val) => {
    setPasteModeRaw(val);
    localStorage.setItem("kn_pasteMode", val);
  };

  const [statusBarWidth, setStatusBarWidth] = useState(600);

  const isLoadedRef    = useRef(false);
  const hasUserEdited  = useRef(false);
  const saveTimer      = useRef(null);
  const quillRef       = useRef(null);
  const editorWrapRef  = useRef(null);
  const fileInputRef   = useRef(null);
  const pasteMenuRef   = useRef(null);
  const attachmentPanelRef = useRef(null);
  const statusBarRef   = useRef(null);

  const collectionRef = collection(database, "docsData");
  const { uploadFile, uploading, progress } = useUpload();
  const { isDark } = useTheme();

  // Measure status bar width in real-time
  useEffect(() => {
    if (!statusBarRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStatusBarWidth(entry.contentRect.width);
      }
    });
    observer.observe(statusBarRef.current);
    return () => observer.disconnect();
  }, []);

  // Dynamically calculate max visible attachment tiles based on container width
  const maxVisibleTiles = useMemo(() => {
    const available = statusBarWidth - 240;
    if (available <= 0) return 1;
    return Math.max(1, Math.floor(available / 215));
  }, [statusBarWidth]);

  // Close paste dropdown on click outside (attachment panel only closes on explicit X button click)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pasteMenuRef.current && !pasteMenuRef.current.contains(e.target)) {
        setPasteMenuOpen(false);
      }
    };
    if (pasteMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pasteMenuOpen]);

  /* ── Intercept Large Pastes (85k+ lines) to prevent DOM/Quill freeze ── */
  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor || !editor.root) return;
    const root = editor.root;

    const handlePaste = (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      // If pasting images or explicit files, let image handler take care of it
      const files = Array.from(clipboardData.files || []);
      if (files.some((f) => f.type.startsWith("image/"))) return;

      const plainText = clipboardData.getData("text/plain");
      if (!plainText) return;

      const lineCount = (plainText.match(/\n/g) || []).length;
      const isLarge = plainText.length > 20000 || lineCount > 300;

      if (isLarge) {
        e.preventDefault();
        e.stopPropagation();

        setIsPastingLarge(true);
        setTimeout(() => {
          try {
            const range = editor.getSelection(true) || { index: editor.getLength() };
            const escaped = plainText
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");

            // Wrap in single pre-formatted element (1 DOM node instead of 85,000 <p> DOM nodes)
            const htmlSnippet = `<pre style="white-space: pre-wrap; word-break: break-word; font-family: inherit; margin: 0; padding: 0;">${escaped}</pre>`;
            editor.clipboard.dangerouslyPasteHTML(range.index, htmlSnippet, "user");
            editor.setSelection(range.index + plainText.length, 0);
            hasUserEdited.current = true;
          } catch (err) {
            console.error("Large paste processing error:", err);
          } finally {
            setIsPastingLarge(false);
          }
        }, 15);
      }
    };

    root.addEventListener("paste", handlePaste, { capture: true });
    return () => root.removeEventListener("paste", handlePaste, { capture: true });
  }, []);

  /* ── MS Word Style Paste Handlers ── */
  const handlePastePlainText = async () => {
    setPasteMenuOpen(false);
    setPasteMode("plain");
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const editor = quillRef.current?.getEditor();
      if (!editor) return;

      const range = editor.getSelection(true) || { index: editor.getLength() };
      const lineCount = (text.match(/\n/g) || []).length;

      if (text.length > 20000 || lineCount > 300) {
        setIsPastingLarge(true);
        setTimeout(() => {
          try {
            const escaped = text
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            const htmlSnippet = `<pre style="white-space: pre-wrap; word-break: break-word; font-family: inherit; margin: 0; padding: 0;">${escaped}</pre>`;
            editor.clipboard.dangerouslyPasteHTML(range.index, htmlSnippet, "user");
            editor.setSelection(range.index + text.length, 0);
            hasUserEdited.current = true;
          } finally {
            setIsPastingLarge(false);
          }
        }, 15);
      } else {
        editor.insertText(range.index, text, "user");
        editor.setSelection(range.index + text.length, 0);
        hasUserEdited.current = true;
      }
    } catch {
      // Ignore
    }
  };

  const handlePasteFormatted = async () => {
    setPasteMenuOpen(false);
    setPasteMode("formatted");
    const editor = quillRef.current?.getEditor();
    if (editor) {
      editor.focus();
      document.execCommand("paste");
    }
  };

  /* ── Direct Copy Handler (Copies HTML Formatting & Plain Text Fallback) ── */
  const handleCopy = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const html = editor.root.innerHTML;
    const text = editor.getText().trim();
    try {
      const blobHtml = new Blob([html], { type: "text/html" });
      const blobText = new Blob([text], { type: "text/plain" });
      navigator.clipboard.write([
        new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })
      ]).then(() => {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      }).catch(() => {
        navigator.clipboard.writeText(text);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      });
    } catch {
      navigator.clipboard.writeText(text);
      setCopiedText(true);
    }
  };

  /* ── Editor Zoom Handlers (Scale 50% to 150%) ─────────── */
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(150, prev + 10));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(50, prev - 10));
  const handleResetZoom = () => setZoomLevel(100);
  const handleResetWindowSize = () => {
    setIsMaximized(false);
    setWindowDimensions({ width: 880, height: 640 });
  };

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

    // Safeguard for Firestore document size limit (1MB max per document)
    let docsDescToSave = content;
    const contentBytes = new Blob([content || ""]).size;
    if (contentBytes > 800000) {
      const mbSize = (contentBytes / (1024 * 1024)).toFixed(2);
      docsDescToSave = content.substring(0, 700000) +
        `<p style="color: #854d0e; background: #fef9c3; padding: 8px 12px; border-radius: 6px; margin-top: 12px; font-size: 12px; font-weight: 600;">⚡ Large Note Mode: Cloud sync saved first 700KB (${mbSize}MB total preserved in editor). Full text active in editor.</p>`;
    }

    try {
      await updateDoc(doc(collectionRef, id), {
        title,
        docsDesc: docsDescToSave,
        color,
        attachments: safeAttachments,
        updatedAt: new Date(),
      });
      setSaving(false);
      setSaved(true);
      hasUserEdited.current = false;
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save error:", err);
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
        if (updated.length > maxVisibleTiles) {
          setShowAttachmentPanel(true);
        }
        return updated;
      });
    }
  }, [uploadFile, id, maxVisibleTiles]);

  /* ── Clipboard Listener (Ctrl+V) ─────────────────────── */
  useClipboard({
    onImagePaste: (file) => handleFiles([file]),
    containerRef: null,
    enabled: true,
  });

  /* ── Remove Attachment (In-Memory, Saved on Explicit Save/Close) ── */
  const removeAttachment = useCallback((toRemove) => {
    hasUserEdited.current = true;
    setAttachments((prev) => {
      return prev.filter((a) => {
        if (a.url && toRemove.url) return a.url !== toRemove.url;
        return a.name !== toRemove.name;
      });
    });
  }, []);

  // Fast line, word and character count calculation (Zero memory spike for 85k+ lines)
  const { lineCount, wordCount, charCount } = useMemo(() => {
    if (!content) return { lineCount: 0, wordCount: 0, charCount: 0 };

    // Fast line count calculation (handles <p> tags, <br> tags, and plain \n breaks)
    let lines = 1;
    if (content.includes("<p>")) {
      const matches = content.match(/<p>/gi);
      lines = matches ? matches.length : 1;
    } else {
      let nlCount = 0;
      for (let i = 0; i < content.length; i++) {
        if (content.charCodeAt(i) === 10) nlCount++;
      }
      lines = Math.max(1, nlCount + (content.length > 0 ? 1 : 0));
    }

    if (content.length > 50000) {
      let inWord = false, words = 0, chars = 0, inTag = false;
      for (let i = 0; i < content.length; i++) {
        const ch = content.charCodeAt(i);
        if (ch === 60 /* < */) { inTag = true; continue; }
        if (inTag) { if (ch === 62 /* > */) inTag = false; continue; }
        chars++;
        if (ch !== 32 && ch !== 9 && ch !== 10 && ch !== 13) {
          if (!inWord) { words++; inWord = true; }
        } else {
          inWord = false;
        }
      }
      return { lineCount: lines, wordCount: words, charCount: chars };
    }
    const plainText = content.replace(/<[^>]+>/g, " ").trim();
    const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
    return { lineCount: lines, wordCount: words, charCount: plainText.length };
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
            "--editor-zoom-scale": zoomLevel / 100,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Large Paste Indicator Toast */}
          {isPastingLarge && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-brand-600 dark:bg-brand-500 text-white text-xs px-4 py-2 rounded-full shadow-2xl font-medium animate-fade-in pointer-events-none">
              <AppleSpinner />
              <span>Formatting and pasting large document (85,000+ lines)…</span>
            </div>
          )}
          {/* ── 1. Top Header Bar (Wireframe Layout: Left Title Area, Center Controls/Options, Right Window Options) ── */}
          <div className="relative flex items-center justify-between px-4 py-2 shrink-0 border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] gap-3">
            {/* Left: Title Area (Truncates with ... before centered color swatches) */}
            <div className="min-w-[100px] max-w-[160px] sm:max-w-[220px] md:max-w-[260px] shrink-0">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (isLoadedRef.current) hasUserEdited.current = true;
                }}
                placeholder="Title..."
                title={title || "Title"}
                className="w-full text-left text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 bg-transparent outline-none rounded-md px-2 py-0.5 focus:bg-black/5 dark:focus:bg-white/5 border-b border-transparent focus:border-brand-500/40 transition-all truncate"
              />
            </div>

            {/* Center: Absolutely Centered Color Swatches Panel */}
            <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1.5 bg-white/80 dark:bg-black/40 px-3 py-1 rounded-full border border-black/[0.05] dark:border-white/[0.08] shadow-xs pointer-events-auto">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mr-1 uppercase">Color</span>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.name}
                  title={`Color: ${c.label}`}
                  onClick={() => {
                    setColor(c.name);
                    hasUserEdited.current = true;
                  }}
                  className="w-4 h-4 rounded-full border transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: isDark ? c.darkSwatch : c.swatch,
                    borderColor: color === c.name ? "#7c3aed" : "rgba(0,0,0,0.15)",
                    transform: color === c.name ? "scale(1.25)" : undefined,
                  }}
                />
              ))}
            </div>

            {/* Far Right: Window Options (Reset Size, Maximize/Restore, Close) */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Reset Window Size (Shown when resized or maximized) */}
              {(isMaximized || windowDimensions.width !== 880 || windowDimensions.height !== 640) && (
                <button
                  onClick={handleResetWindowSize}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                  title="Reset window size to default (880x640)"
                >
                  <RotateCcw size={14} />
                </button>
              )}

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

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar,.7z,.gz,.tar"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) handleFiles(files);
              e.target.value = "";
            }}
          />

          {/* ── 3. Drag Zone & Main Text Editor Canvas ── */}
          <MediaDropzone onFiles={handleFiles} disabled={uploading}>
            <div className="flex-1 flex flex-col min-h-0 px-1 py-2">
              <div className={`relative flex-1 flex flex-col min-h-0 rounded-xl border border-gray-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#151720]/70 overflow-hidden shadow-sm${toolbarCollapsed ? " quill-toolbar-collapsed" : ""}`}>
                
                {/* Integrated Tools on Far-Right of Quill Toolbar Ribbon */}
                <div className="absolute top-1.5 right-2.5 z-30 flex items-center gap-1.5">
                  {/* Paste Options Dropdown Menu */}
                  <div ref={pasteMenuRef} className="relative">
                    <button
                      onClick={() => setPasteMenuOpen(!pasteMenuOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white dark:bg-[#222533] hover:bg-gray-100 dark:hover:bg-[#2a2e3f] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 shadow-xs transition-all cursor-pointer"
                      title="Select Paste Options"
                    >
                      <Clipboard size={14} className="text-brand-500" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">Paste options</span>
                      <ChevronDown size={11} className={`transition-transform text-gray-400 ${pasteMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {pasteMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 z-[999] w-60 rounded-lg bg-white dark:bg-[#1c1e28] border border-gray-200 dark:border-white/10 shadow-2xl py-1 animate-scale-in text-xs font-medium text-gray-700 dark:text-gray-200">
                        <button
                          onClick={handlePasteFormatted}
                          className={`w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer ${
                            pasteMode === "formatted" ? "bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 font-semibold" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Clipboard size={14} className="text-brand-500" />
                            <span>Paste with Formatting</span>
                          </div>
                          {pasteMode === "formatted" && <Check size={14} className="text-brand-500 shrink-0" />}
                        </button>
                        <button
                          onClick={handlePastePlainText}
                          className={`w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer ${
                            pasteMode === "plain" ? "bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 font-semibold" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Type size={14} className="text-emerald-500" />
                            <span>Paste Plain Text (Keep Text Only)</span>
                          </div>
                          {pasteMode === "plain" && <Check size={14} className="text-brand-500 shrink-0" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Toolbar Toggle Button (T) */}
                  <button
                    onClick={() => setToolbarCollapsed((v) => !v)}
                    className={`p-1 w-[26px] h-[26px] flex items-center justify-center rounded-md border text-xs font-bold shadow-xs transition-all cursor-pointer ${
                      toolbarCollapsed
                        ? "bg-white dark:bg-[#222533] hover:bg-gray-100 dark:hover:bg-[#2a2e3f] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10"
                        : "bg-brand-500 hover:bg-brand-600 text-white border-brand-500"
                    }`}
                    title={toolbarCollapsed ? "Show formatting toolbar" : "Hide formatting toolbar"}
                  >
                    T
                  </button>

                  {/* Attach File Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 rounded-md bg-white dark:bg-[#222533] hover:bg-gray-100 dark:hover:bg-[#2a2e3f] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    title="Attach document, image or code file"
                  >
                    <Paperclip size={14} className="text-brand-500" />
                  </button>
                </div>

                {/* Fixed Width Zoom Controls relative to Bottom-Right of Text Area */}
                <div className="absolute bottom-3 right-4 z-20 flex items-center justify-between w-[110px] bg-white/90 dark:bg-[#222533] border border-gray-200 dark:border-white/10 px-1.5 py-1 rounded-lg shadow-xs select-none">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 50}
                    className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-colors cursor-pointer shrink-0"
                    title="Zoom Out text size (down to 50%)"
                  >
                    <ZoomOut size={12} />
                  </button>

                  <button
                    onClick={handleResetZoom}
                    className="w-10 text-center font-mono text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:text-brand-500 transition-colors cursor-pointer shrink-0"
                    title="Click to reset Zoom to 100%"
                  >
                    {zoomLevel}%
                  </button>

                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 150}
                    className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 disabled:opacity-30 transition-colors cursor-pointer shrink-0"
                    title="Zoom In text size (up to 150%)"
                  >
                    <ZoomIn size={12} />
                  </button>

                  <button
                    onClick={handleResetZoom}
                    disabled={zoomLevel === 100}
                    className={`p-0.5 rounded transition-colors cursor-pointer shrink-0 ${
                      zoomLevel === 100
                        ? "opacity-0 pointer-events-none"
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    }`}
                    title="Reset to 100%"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>

                {/* Text Area (Takes 100% Full Height, flex-col so container scrolls) */}
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
                  placeholder="Start typing here…"
                  className="flex-1 flex flex-col min-h-0"
                />

                {/* Subtle Background Watermark / Placeholder Hint inside Text Area (Bottom-Left) */}
                {attachments.length === 0 && (
                  <div className="absolute bottom-3 left-4 pointer-events-none select-none z-10 opacity-40">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.1] font-mono text-[10px] font-bold">
                        Ctrl + V
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.1] font-mono text-[10px] font-bold">
                        <Upload size={10} /> Drag &amp; Drop
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </MediaDropzone>

          {/* ── 4. Bottom Action Footer (Dynamic Responsive Attachments Bar Left, Copy & Save Far Right) ── */}
          <div ref={statusBarRef} className="relative px-4 py-2 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between shrink-0 text-xs text-gray-400 dark:text-gray-500 bg-black/[0.01] dark:bg-white/[0.01] gap-2">
            
            {/* Expandable Attachments Popover Panel above Bottom Status Bar */}
            {showAttachmentPanel && attachments.length > maxVisibleTiles && (
              <div ref={attachmentPanelRef} className="absolute left-4 bottom-full mb-2 z-50 p-3 rounded-xl bg-white dark:bg-[#1c1e28] border border-gray-200 dark:border-white/10 shadow-2xl animate-scale-in max-w-md w-80 sm:w-96">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">
                    <Paperclip size={13} className="text-brand-500" />
                    <span>Additional Files ({attachments.length - maxVisibleTiles})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => downloadAllAttachments(attachments)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-500/30 transition-all cursor-pointer"
                      title="Download all attachments"
                    >
                      <Download size={11} /> Download All
                    </button>
                    <button
                      onClick={() => setShowAttachmentPanel(false)}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      title="Close panel"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Additional Files Only (beyond maxVisibleTiles) */}
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {attachments.slice(maxVisibleTiles).map((att, idx) => (
                    <OutlookAttachmentTile
                      key={`panel-${att.url}-${idx}`}
                      attachment={att}
                      onRemove={removeAttachment}
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

            {/* Left: Bottom Attachments Bar (Dynamic capacity based on window width) */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden py-0.5">
              {uploading && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 rounded-full text-brand-600 dark:text-brand-400 font-semibold text-xs shrink-0">
                  <AppleSpinner className="w-3.5 h-3.5 text-brand-500" />
                  <span>Uploading {progress}%</span>
                </div>
              )}

              {/* Display Attachment Items inline up to maxVisibleTiles capacity */}
              {attachments.slice(0, maxVisibleTiles).map((att, idx) => (
                <OutlookAttachmentTile
                  key={`footer-${att.url}-${idx}`}
                  attachment={att}
                  onRemove={removeAttachment}
                  onPreview={(a) => {
                    if (isImage({ type: a.type, name: a.name })) {
                      setPreviewImg(a);
                    } else {
                      window.open(a.url, "_blank");
                    }
                  }}
                />
              ))}

              {/* Expand Popover Panel Button (Shown ONLY if attachments.length > maxVisibleTiles) */}
              {attachments.length > maxVisibleTiles && (
                <button
                  onClick={() => setShowAttachmentPanel(!showAttachmentPanel)}
                  className="p-1.5 rounded-lg bg-white/90 hover:bg-white dark:bg-[#222533] dark:hover:bg-[#2a2e3f] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1 text-xs font-semibold"
                  title="View all overflow attachments"
                >
                  <ChevronUp size={13} className={`transition-transform ${showAttachmentPanel ? "rotate-180" : ""}`} />
                  <span className="text-[10px] text-brand-500 font-bold">+{attachments.length - maxVisibleTiles}</span>
                </button>
              )}
            </div>

            {/* Far Right: Line/Word/Char Count Badge, Direct Copy Button & Save Button */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Line Count, Word Count & Character Count Pill */}
              <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-[#222533] border border-gray-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-xs shrink-0 select-none">
                <span title="Total lines in note">
                  <strong className="text-brand-600 dark:text-brand-400 font-bold">{lineCount.toLocaleString()}</strong> lines
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span title="Total words in note">
                  <strong className="text-gray-700 dark:text-gray-200 font-semibold">{wordCount.toLocaleString()}</strong> words
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span title="Total characters in note">
                  <strong className="text-gray-700 dark:text-gray-200 font-semibold">{charCount.toLocaleString()}</strong> chars
                </span>
              </div>

              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95 ${
                  copiedText
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500"
                    : "bg-white/90 hover:bg-white dark:bg-[#222533] dark:hover:bg-[#2a2e3f] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10"
                }`}
                title="Copy note content to clipboard as-is"
              >
                {copiedText ? <Check size={13} className="text-white" /> : <Copy size={13} className="text-brand-500" />}
                <span>{copiedText ? "Copied! ✓" : "Copy"}</span>
              </button>

              {/* Primary Save Button */}
              <button
                onClick={async () => { await saveImmediately(); onClose(); }}
                disabled={saving}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
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
