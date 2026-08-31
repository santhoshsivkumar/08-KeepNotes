import { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus,
  FileText,
  Paperclip,
  Copy,
  Check,
  Download,
  Star,
  RotateCcw,
  Trash2,
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  Clock,
  ExternalLink,
  X,
  Menu,
  Upload,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { database } from "../firebase/firebaseConfig";
import EditNote from "./EditNote";
import Sidebar from "./layout/Sidebar";
import MainHeader from "./layout/MainHeader";
import FilesView from "./FilesView";
import SettingsModal from "./settings/SettingsModal";
import FilePreviewModal from "./files/FilePreviewModal";
import { useTheme } from "../hooks/useTheme";
import { useUpload } from "../hooks/useUpload";
import { downloadAllAttachments } from "../utils/downloadHelpers";
import {
  extractPlainTextWithControlChars,
} from "../utils/controlCharHelpers";

/** Extract the first <img src="..."> from an HTML string for card cover */
function extractCoverImage(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// Apple-style micro spinner
const AppleSpinner = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// Note accent color options
const NOTE_COLORS = [
  { name: "default", bg: "bg-white dark:bg-[#1c1e28]",       border: "border-gray-200 dark:border-white/[0.08]", darkClass: "" },
  { name: "yellow",  bg: "bg-note-yellow note-card-yellow",   border: "border-yellow-200",                        darkClass: "note-card-yellow" },
  { name: "green",   bg: "bg-note-green  note-card-green",    border: "border-green-200",                         darkClass: "note-card-green" },
  { name: "blue",    bg: "bg-note-blue   note-card-blue",     border: "border-blue-200",                          darkClass: "note-card-blue" },
  { name: "pink",    bg: "bg-note-pink   note-card-pink",     border: "border-pink-200",                          darkClass: "note-card-pink" },
  { name: "purple",  bg: "bg-note-purple note-card-purple",   border: "border-purple-200",                        darkClass: "note-card-purple" },
  { name: "orange",  bg: "bg-note-orange note-card-orange",   border: "border-orange-200",                        darkClass: "note-card-orange" },
  { name: "teal",    bg: "bg-note-teal   note-card-teal",     border: "border-teal-200",                          darkClass: "note-card-teal" },
];

const getColorClasses = (colorName) =>
  NOTE_COLORS.find((c) => c.name === colorName) || NOTE_COLORS[0];

const INITIAL_NOTEBOOKS = [
  { id: "System Design", name: "System Design", color: "bg-blue-500" },
  { id: "TCS Docs", name: "TCS Docs", color: "bg-green-500" },
  { id: "Certifications", name: "Certifications", color: "bg-yellow-500" },
  { id: "Web Concepts", name: "Web Concepts", color: "bg-purple-500" },
];

const NotesHome = () => {
  const [open, setOpen]               = useState(false);
  const [quickTitle, setQuickTitle]   = useState("");
  const [selectedNotebookForNew, setSelectedNotebookForNew] = useState(null);
  const [openEditor, setOpenEditor]   = useState(false);
  const [docId, setDocId]             = useState("");
  const [docsData, setDocsData]       = useState([]);
  const [independentFiles, setIndependentFiles] = useState([]);
  const [folders, setFolders]         = useState([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [isCreating, setIsCreating]   = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [copiedNoteId, setCopiedNoteId]   = useState(null);

  // Navigation & Sidebar state
  const [activeNav, setActiveNav]         = useState("home");
  const [activeNotebook, setActiveNotebook] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notebookToDeleteModal, setNotebookToDeleteModal] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  // All Notes toolbar state
  const [notesSearch, setNotesSearch] = useState("");
  const [notesSort, setNotesSort] = useState(() => {
    try {
      return localStorage.getItem("tp-notes-sort") || "updated";
    } catch {
      return "updated";
    }
  });

  const [notesViewMode, setNotesViewMode] = useState(() => {
    try {
      return localStorage.getItem("tp-notes-viewMode") || "grid";
    } catch {
      return "grid";
    }
  });

  const [showNotesSortMenu, setShowNotesSortMenu] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("tp-notes-sort", notesSort);
      localStorage.setItem("tp-notes-viewMode", notesViewMode);
    } catch {
      // ignore
    }
  }, [notesSort, notesViewMode]);

  // Notebooks list
  const [notebooks, setNotebooks] = useState(() => {
    try {
      const saved = localStorage.getItem("tp-notebooks");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return INITIAL_NOTEBOOKS;
  });

  const { toggle, isDark } = useTheme();
  const { uploadFile } = useUpload();
  const quickInputRef  = useRef(null);
  const globalFileInputRef = useRef(null);

  const notesCollectionRef = collection(database, "docsData");
  const filesCollectionRef = collection(database, "filesData");
  const foldersCollectionRef = collection(database, "foldersData");

  // Save notebooks to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem("tp-notebooks", JSON.stringify(notebooks));
    } catch (e) {
      // ignore
    }
  }, [notebooks]);

  // Open New Note Modal with optional preselected notebook
  const handleOpenNewNoteModal = (preselectedNotebook = null) => {
    setSelectedNotebookForNew(preselectedNotebook || activeNotebook || null);
    setQuickTitle("");
    setOpen(true);
  };

  // Focus input when modal opens
  useEffect(() => {
    if (open && quickInputRef.current) {
      setTimeout(() => quickInputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Derived note lists ────────────────────────────────────
  const activeNotes = useMemo(() => {
    return docsData.filter((note) => !note.deleted);
  }, [docsData]);

  const deletedNotes = useMemo(() => {
    return docsData.filter((note) => note.deleted);
  }, [docsData]);

  // ── All attached files array across active notes ──────────
  const attachedFiles = useMemo(() => {
    const files = [];
    activeNotes.forEach((note) => {
      if (!note.attachments || !Array.isArray(note.attachments)) return;
      note.attachments.forEach((att) => {
        const name = att.name || att.fileName || "Unnamed file";
        const ext = name.includes(".") ? name.split(".").pop().toUpperCase() : "";
        const dateObj = note.updatedAt?.toDate
          ? note.updatedAt.toDate()
          : note.updatedAt?.seconds
          ? new Date(note.updatedAt.seconds * 1000)
          : null;

        files.push({
          ...att,
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
    return files;
  }, [activeNotes]);

  // Total combined files count (attached + independent)
  const totalFilesCount = attachedFiles.length + independentFiles.length;

  // ── Filtered & Sorted displayed notes ─────────────────────
  const displayedNotes = useMemo(() => {
    let list = [];

    if (activeNav === "trash") {
      list = [...deletedNotes];
    } else if (activeNav === "starred") {
      list = activeNotes.filter((note) => note.starred);
    } else if (activeNotebook) {
      list = activeNotes.filter((note) => note.notebook === activeNotebook);
    } else {
      list = [...activeNotes];
    }

    // Search filter for All Notes view
    if (notesSearch.trim()) {
      const q = notesSearch.toLowerCase();
      list = list.filter((n) => {
        const titleMatch = (n.title || "").toLowerCase().includes(q);
        const textMatch = extractPlainTextWithControlChars(n.docsDesc || "").toLowerCase().includes(q);
        return titleMatch || textMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (notesSort === "name") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (notesSort === "created") {
        const getMs = (item) => item.createdAt?.toDate?.()?.getTime() || item.createdAt?.seconds * 1000 || 0;
        return getMs(b) - getMs(a);
      }
      // default: updated
      const getMs = (item) => item.updatedAt?.toDate?.()?.getTime() || item.updatedAt?.seconds * 1000 || item.createdAt?.seconds * 1000 || Date.now();
      return getMs(b) - getMs(a);
    });

    return list;
  }, [activeNav, activeNotebook, activeNotes, deletedNotes, notesSearch, notesSort]);

  /* ── 1-Click Copy Text Handler ──── */
  const handleCopyNote = (e, note) => {
    e.stopPropagation();
    const textToCopy = extractPlainTextWithControlChars(note.docsDesc);

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
    }
  };

  /* ── Instant Create Note Handler (Optional Title like Google Keep) ───── */
  const addData = () => {
    if (isCreating) return;

    setIsCreating(true);
    const docObj = {
      title: quickTitle.trim(),
      docsDesc: "",
      color: "default",
      attachments: [],
      starred: false,
      deleted: false,
      notebook: activeNotebook || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addDoc(notesCollectionRef, docObj)
      .then((res) => {
        setDocId(res.id);
        setOpenEditor(true);
        setQuickTitle("");
      })
      .catch(() => {
        alert("Error creating note. Please try again.");
      })
      .finally(() => setIsCreating(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") addData();
    if (e.key === "Escape") { setOpen(false); setQuickTitle(""); }
  };

  /* ── Upload Standalone File (Does NOT create a Note!) ────────── */
  const handleGlobalFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const file = files[0];
    setIsUploadingFiles(true);
    try {
      let uploaded;
      try {
        uploaded = await uploadFile(file);
      } catch (err) {
        uploaded = {
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          type: file.type,
        };
      }

      let safeUrl = uploaded?.url || "";
      if (safeUrl.startsWith("data:") && safeUrl.length > 500000) {
        safeUrl = URL.createObjectURL(file);
      }

      await addDoc(filesCollectionRef, {
        name: uploaded?.name || file.name,
        url: safeUrl,
        size: uploaded?.size || file.size || 0,
        type: uploaded?.type || file.type || "",
        noteId: null,
        noteTitle: null,
        createdAt: new Date(),
      });

      setActiveNav("files");
      setActiveNotebook(null);
    } catch (err) {
      console.error("Upload file error:", err);
    } finally {
      setIsUploadingFiles(false);
    }
    e.target.value = "";
  };

  /* ── Direct Drag & Drop Handler for Files Page ────────────── */
  const handleDropFiles = async (filesList, targetFolder = null) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;
    setIsUploadingFiles(true);
    try {
      for (const file of files) {
        let uploaded;
        try {
          uploaded = await uploadFile(file);
        } catch (e) {
          uploaded = {
            name: file.name,
            url: URL.createObjectURL(file),
            size: file.size,
            type: file.type,
          };
        }

        let safeUrl = uploaded?.url || "";
        if (safeUrl.startsWith("data:") && safeUrl.length > 500000) {
          safeUrl = URL.createObjectURL(file);
        }

        await addDoc(filesCollectionRef, {
          name: uploaded?.name || file.name,
          url: safeUrl,
          size: uploaded?.size || file.size || 0,
          type: uploaded?.type || file.type || "",
          noteId: null,
          noteTitle: null,
          folderId: targetFolder ? targetFolder.id : null,
          folderName: targetFolder ? targetFolder.name : null,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error("Drop files upload error:", err);
    } finally {
      setIsUploadingFiles(false);
    }
  };

  /* ── Realtime Snapshot Listener for Notes ─── */
  useEffect(() => {
    const q = query(notesCollectionRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
        items.sort((a, b) => {
          const getMs = (item) => {
            if (item.createdAt?.toMillis) return item.createdAt.toMillis();
            if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
            if (item.updatedAt?.toMillis) return item.updatedAt.toMillis();
            if (item.updatedAt?.seconds) return item.updatedAt.seconds * 1000;
            return Date.now();
          };
          return getMs(b) - getMs(a);
        });
        setDocsData(items);
        setLoading(false);
      },
      () => {
        onSnapshot(notesCollectionRef, (snap) => {
          const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          setDocsData(items);
          setLoading(false);
        });
      }
    );
    return () => unsubscribe();
  }, []);

  /* ── Realtime Snapshot Listener for Independent Files ─── */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      filesCollectionRef,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
        setIndependentFiles(items);
      },
      (err) => {
        console.warn("Could not listen to filesData collection:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  /* ── Realtime Snapshot Listener for Folders ─────────────── */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      foldersCollectionRef,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
        setFolders(items);
      },
      (err) => {
        console.warn("Could not listen to foldersData collection:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleCreateFolder = () => {
    const name = prompt("Enter folder name:");
    if (name && name.trim()) {
      addDoc(foldersCollectionRef, {
        name: name.trim(),
        createdAt: new Date(),
      }).catch((err) => {
        console.error("Failed to create folder:", err);
        alert("Failed to create folder.");
      });
    }
  };

  /* ── Toggle Star Handler ───────────────────────────────── */
  const handleToggleStar = async (e, note) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(notesCollectionRef, note.id), {
        starred: !note.starred,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error("Failed to update star state:", err);
    }
  };

  /* ── Soft Delete Handler (Move to Trash) ──────────────── */
  const handleSoftDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(notesCollectionRef, id), {
        deleted: true,
        updatedAt: new Date(),
      });
    } catch (err) {
      alert("Failed to move note to trash.");
    }
  };

  /* ── Restore Handler (From Trash) ──────────────────────── */
  const handleRestore = async (e, id) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(notesCollectionRef, id), {
        deleted: false,
        updatedAt: new Date(),
      });
    } catch (err) {
      alert("Failed to restore note.");
    }
  };

  /* ── Permanent Delete Handler ─────────────────────────── */
  const handlePermanentDelete = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    setDeleteConfirm(null);
    try {
      await deleteDoc(doc(notesCollectionRef, id));
    } catch (err) {
      alert("Failed to permanently delete item. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Add Notebook Handler ─────────────────────────────── */
  const handleAddNotebook = () => {
    const name = prompt("Enter new notebook name:");
    if (!name || !name.trim()) return;

    const trimmed = name.trim();
    if (notebooks.some((n) => n.name.toLowerCase() === trimmed.toLowerCase())) {
      alert("A notebook with this name already exists.");
      return;
    }

    const colors = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-teal-500", "bg-orange-500"];
    const randomColor = colors[notebooks.length % colors.length];

    const newNb = {
      id: trimmed,
      name: trimmed,
      color: randomColor,
    };

    setNotebooks((prev) => [...prev, newNb]);
    setActiveNotebook(trimmed);
    setActiveNav(null);
  };

  /* ── Delete Notebook Handler with Safe Options ─────────── */
  const handleDeleteNotebook = (notebook) => {
    const matchingCount = activeNotes.filter(
      (n) => n.notebook === notebook.id || n.notebook === notebook.name
    ).length;

    if (matchingCount === 0) {
      setNotebooks((prev) => prev.filter((n) => n.id !== notebook.id));
      if (activeNotebook === notebook.id || activeNotebook === notebook.name) {
        setActiveNotebook(null);
        setActiveNav("home");
      }
    } else {
      setNotebookToDeleteModal({ notebook, count: matchingCount });
    }
  };

  const handleConfirmDeleteNotebook = async (action) => {
    if (!notebookToDeleteModal) return;
    const { notebook } = notebookToDeleteModal;
    const matchingNotes = activeNotes.filter(
      (n) => n.notebook === notebook.id || n.notebook === notebook.name
    );

    try {
      if (action === "unassign") {
        await Promise.all(
          matchingNotes.map((n) =>
            updateDoc(doc(notesCollectionRef, n.id), { notebook: null, updatedAt: new Date() })
          )
        );
      } else if (action === "trash") {
        await Promise.all(
          matchingNotes.map((n) =>
            updateDoc(doc(notesCollectionRef, n.id), { deleted: true, updatedAt: new Date() })
          )
        );
      }
    } catch (err) {
      alert("Failed to update notes during notebook deletion.");
    }

    setNotebooks((prev) => prev.filter((n) => n.id !== notebook.id));
    if (activeNotebook === notebook.id || activeNotebook === notebook.name) {
      setActiveNotebook(null);
      setActiveNav("home");
    }
    setNotebookToDeleteModal(null);
  };

  const openNote = (id) => { setDocId(id); setOpenEditor(true); };

  const sortLabels = {
    updated: "Recently updated",
    created: "Recently created",
    name: "Name",
  };

  /* ── Render Note Card Helper ──────────────────────────── */
  const renderNoteCard = (note) => {
    const colors = getColorClasses(note.color);
    const isDeleting = deleteConfirm === note.id;
    const isDeletingInProgress = deletingId === note.id;
    const coverImg = extractCoverImage(note.docsDesc);
    const attCount = (note.attachments || []).length;
    const isStarred = Boolean(note.starred);
    const isTrash = Boolean(note.deleted);
    const plainText = extractPlainTextWithControlChars(note.docsDesc);
    const noteLines = plainText
      ? Math.max(1, (plainText.match(/\n/g) || []).length + 1)
      : 0;

    return (
      <div key={note.id} className="group animate-fade-up">
        <div className={`relative h-[240px] flex flex-col justify-between rounded-2xl border ${colors.border} ${colors.bg} shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 cursor-pointer overflow-hidden`}>

          {/* Cover image */}
          {coverImg && (
            <div
              className="w-full h-24 rounded-t-xl overflow-hidden cursor-pointer shrink-0"
              onClick={() => openNote(note.id)}
            >
              <img src={coverImg} alt="cover" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}

          {/* Card body — Plain text preview with zero raw HTML tags or &nbsp; */}
          <div className="p-4 pb-2 flex-1 overflow-hidden" onClick={() => openNote(note.id)}>
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug truncate pr-2" title={note.title || "Untitled"}>
                {note.title || "Untitled"}
              </h3>
              {/* Star button */}
              {!isTrash && (
                <button
                  onClick={(e) => handleToggleStar(e, note)}
                  className={`p-1 rounded-md transition-all shrink-0 cursor-pointer ${
                    isStarred
                      ? "text-yellow-400 hover:text-yellow-500"
                      : "text-gray-400 hover:text-yellow-400 opacity-0 group-hover:opacity-100"
                  }`}
                  title={isStarred ? "Unstar note" : "Star note"}
                >
                  <Star size={14} className={isStarred ? "fill-yellow-400" : ""} />
                </button>
              )}
            </div>

            {plainText ? (
              <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-5 whitespace-pre-wrap select-none">
                {plainText}
              </p>
            ) : (
              <p className="text-gray-400 dark:text-gray-600 text-xs italic mt-1">No additional text</p>
            )}
          </div>

          {/* Actions row */}
          <div className="px-4 py-2.5 flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.05] shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {note.notebook && (
                <span className="text-[10px] font-semibold text-brand-500 dark:text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md truncate max-w-[90px]">
                  {note.notebook}
                </span>
              )}
              {noteLines > 0 && (
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 font-mono">
                  {noteLines} {noteLines === 1 ? "line" : "lines"}
                </span>
              )}
              {attCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/[0.06] rounded-full px-1.5 py-0.5">
                  <Paperclip size={8} /> {attCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-100">
              {/* Delete Confirm inline pill */}
              {isDeleting && !isDeletingInProgress && (
                <span
                  className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/15 border border-red-200/60 dark:border-red-500/30 px-2 py-0.5 rounded-md animate-fade-in cursor-pointer select-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePermanentDelete(note.id);
                  }}
                >
                  Confirm
                </span>
              )}

              {!isDeleting && isTrash && (
                <button
                  onClick={(e) => handleRestore(e, note.id)}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all cursor-pointer"
                  title="Restore note"
                >
                  <RotateCcw size={14} />
                </button>
              )}

              {!isDeleting && !isTrash && (
                <>
                  {/* Copy */}
                  <button
                    onClick={(e) => handleCopyNote(e, note)}
                    disabled={isDeletingInProgress}
                    className={`p-1.5 rounded-lg transition-all ${
                      copiedNoteId === note.id
                        ? "text-green-600 bg-green-50 dark:bg-green-500/20 dark:text-green-400"
                        : "text-gray-400 dark:text-gray-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                    }`}
                    title="Copy note text"
                  >
                    {copiedNoteId === note.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>

                  {/* Download Attachments */}
                  {attCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadAllAttachments(note.attachments);
                      }}
                      disabled={isDeletingInProgress}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                      title="Download attachments"
                    >
                      <Download size={14} />
                    </button>
                  )}
                </>
              )}

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDeletingInProgress) return;
                  if (isTrash) {
                    if (isDeleting) handlePermanentDelete(note.id);
                    else { setDeleteConfirm(note.id); setTimeout(() => setDeleteConfirm(null), 2500); }
                  } else {
                    handleSoftDelete(e, note.id);
                  }
                }}
                disabled={isDeletingInProgress}
                className={`p-1.5 rounded-lg transition-all ${isDeletingInProgress ? "text-red-500 bg-red-50 dark:bg-red-500/10" : isDeleting ? "text-red-500 bg-red-50 dark:bg-red-500/10 scale-105" : "text-gray-400 dark:text-gray-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"}`}
                title={isTrash ? "Permanently delete" : "Move to trash"}
              >
                {isDeletingInProgress ? (
                  <AppleSpinner className="text-red-500 w-3.5 h-3.5" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#111318] font-sans transition-colors duration-300">
      {/* Hidden File Input for Standalone File Upload */}
      <input
        ref={globalFileInputRef}
        type="file"
        className="hidden"
        onChange={handleGlobalFileUpload}
      />

      {/* ── Sidebar Navigation ───────────────────────────── */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        activeNav={activeNav}
        onNavChange={(nav) => {
          setActiveNav(nav);
          setActiveNotebook(null);
        }}
        notebooks={notebooks}
        activeNotebook={activeNotebook}
        onNotebookSelect={(id) => {
          setActiveNotebook(id);
          setActiveNav(null);
        }}
        onAddNotebook={handleAddNotebook}
        onDeleteNotebook={handleDeleteNotebook}
        onNewNote={() => handleOpenNewNoteModal()}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onToggleTheme={toggle}
        isDark={isDark}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* ── Main Workspace Content ──────────────────────── */}
      <div className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${
        isSidebarCollapsed ? "ml-0" : "ml-0 lg:ml-[240px]"
      }`}>

        {/* ── Mobile-Only Top Navigation Bar ────────────────────────── */}
        <div className="lg:hidden px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-200/60 dark:border-white/[0.05]">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shadow-brand shrink-0">
              <FileText size={14} className="text-white" />
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
              ThoughtPad
            </span>
          </div>

          <div className="w-9" />
        </div>

        {/* ── Main View Container ────────────────────────── */}
        <main className="px-4 sm:px-8 py-6 flex-1">
          {/* ── GLOBAL LOADING SPINNER FOR ALL NON-FILES TABS ──── */}
          {loading && activeNav !== "files" && (
            <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center -mt-8 animate-fade-in">
              <AppleSpinner className="w-8 h-8 text-brand-500 mb-3" />
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
                Loading workspace…
              </span>
            </div>
          )}

          {/* ── 1. FILES DESTINATION PAGE ───────────────── */}
          {activeNav === "files" && (
            <FilesView
              docsData={activeNotes}
              independentFiles={independentFiles}
              folders={folders}
              loading={loading}
              isUploadingFiles={isUploadingFiles}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onFilePreview={(file) => setPreviewFile(file)}
              onOpenNote={openNote}
              onUploadFile={() => globalFileInputRef.current?.click()}
              onDropFiles={handleDropFiles}
              onCreateFolder={handleCreateFolder}
            />
          )}

          {/* ── 2. HOME DASHBOARD VIEW ───────────────── */}

          {activeNav === "home" && !activeNotebook && !loading && (
            <div>
              {/* Section 1: Recent Notes */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {isSidebarCollapsed && (
                      <button
                        onClick={() => setIsSidebarCollapsed(false)}
                        className="hidden lg:flex p-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all cursor-pointer mr-0.5"
                        title="Open Sidebar"
                      >
                        <Menu size={18} />
                      </button>
                    )}
                    <Clock size={16} className="text-brand-500" />
                    Recent Notes
                  </h2>
                  <button
                    onClick={() => setActiveNav("allNotes")}
                    className="text-xs font-semibold text-brand-500 dark:text-brand-400 hover:underline cursor-pointer"
                  >
                    View all ({activeNotes.length}) →
                  </button>
                </div>

                {activeNotes.length === 0 ? (
                  <div className="p-8 text-center bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] rounded-2xl">
                    <p className="text-sm text-gray-400 mb-3">No notes created yet.</p>
                    <button
                      onClick={() => handleOpenNewNoteModal()}
                      className="px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 shadow-brand transition-all cursor-pointer"
                    >
                      + Create first note
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeNotes.slice(0, 6).map((note) => renderNoteCard(note))}
                  </div>
                )}
              </div>

              {/* Section 2: Recent Files */}
              {(attachedFiles.length > 0 || independentFiles.length > 0) && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Paperclip size={16} className="text-emerald-400" />
                      Recent Files
                    </h2>
                    <button
                      onClick={() => setActiveNav("files")}
                      className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
                    >
                      View all ({totalFilesCount}) →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...attachedFiles, ...independentFiles].slice(0, 4).map((file, idx) => (
                      <div
                        key={`${file.url}-${idx}`}
                        onClick={() => setPreviewFile(file)}
                        className="p-3 bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.06] rounded-xl hover:border-brand-500/50 transition-all cursor-pointer flex items-center gap-3 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-400 font-mono text-[10px] font-bold uppercase flex items-center justify-center shrink-0">
                          {file.extension || "FILE"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:text-brand-400 transition-colors">
                            {file.name}
                          </h4>
                          <p className="text-[10px] text-gray-500 truncate">
                            {file.noteTitle ? file.noteTitle : "Independent file"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 3. ALL NOTES / STARRED / TRASH / NOTEBOOK VIEWS ── */}
          {activeNav !== "home" && activeNav !== "files" && !loading && (
            <div>
              {/* Context Header + Count Badge & Toolbar */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {isSidebarCollapsed && (
                    <button
                      onClick={() => setIsSidebarCollapsed(false)}
                      className="hidden lg:flex p-1 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all cursor-pointer mr-0.5"
                      title="Open Sidebar"
                    >
                      <Menu size={18} />
                    </button>
                  )}
                  {activeNav === "starred" && <Star size={18} className="text-yellow-400 fill-yellow-400" />}
                  {activeNav === "trash" && <Trash2 size={18} className="text-red-400" />}
                  {activeNav === "starred"
                    ? "Starred"
                    : activeNav === "trash"
                    ? "Trash"
                    : activeNav === "allNotes"
                    ? "All Notes"
                    : activeNotebook}
                  <span className="text-xs font-semibold text-gray-500 bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full font-mono">
                    {displayedNotes.length}
                  </span>
                </h2>

                {/* Toolbar for All Notes View & Notebook Views (Only shown if notes exist or user is searching) */}
                {(activeNav === "allNotes" || activeNotebook) && (displayedNotes.length > 0 || notesSearch.trim()) && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Search Input */}
                    <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={notesSearch}
                        onChange={(e) => setNotesSearch(e.target.value)}
                        placeholder="Search notes..."
                        className="w-full pl-8 pr-3 py-1.5 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:border-brand-500/50 transition-colors"
                      />
                    </div>

                    {/* + Create Note Button */}
                    <button
                      onClick={() => handleOpenNewNoteModal()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-brand transition-all cursor-pointer shrink-0"
                    >
                      <Plus size={14} />
                      <span>Create Note</span>
                    </button>

                    {/* Sort Dropdown */}
                    <div className="relative">
                          <button
                            onClick={() => setShowNotesSortMenu(!showNotesSortMenu)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
                          >
                        <span className="text-gray-500">Sort:</span>
                        <span className="font-semibold">{sortLabels[notesSort]}</span>
                        <ChevronDown size={13} className="text-gray-500" />
                      </button>
                      {showNotesSortMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowNotesSortMenu(false)} />
                          <div className="absolute right-0 top-full mt-1 z-50 py-1 bg-white dark:bg-[#1a1c24] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-xl min-w-[160px] animate-scale-in">
                            {Object.entries(sortLabels).map(([key, label]) => (
                              <button
                                key={key}
                                onClick={() => { setNotesSort(key); setShowNotesSortMenu(false); }}
                                className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                                  notesSort === key
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

                    {/* Grid/List Toggle */}
                    <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setNotesViewMode("grid")}
                        className={`p-1.5 transition-all cursor-pointer ${
                          notesViewMode === "grid" ? "bg-brand-500 text-white" : "text-gray-400 hover:text-white"
                        }`}
                        title="Grid View"
                      >
                        <LayoutGrid size={14} />
                      </button>
                      <button
                        onClick={() => setNotesViewMode("list")}
                        className={`p-1.5 transition-all cursor-pointer ${
                          notesViewMode === "list" ? "bg-brand-500 text-white" : "text-gray-400 hover:text-white"
                        }`}
                        title="List View"
                      >
                        <List size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>



              {/* Empty State (Vertically & Horizontally Centered in Right Panel) */}
              {!loading && displayedNotes.length === 0 && (
                <div className="min-h-[calc(100vh-220px)] flex flex-col items-center justify-center -mt-12 animate-fade-up">
                  <div className="w-20 h-20 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-5 shadow-sm">
                    {activeNav === "starred" ? (
                      <Star size={36} className="text-yellow-400" />
                    ) : activeNav === "trash" ? (
                      <Trash2 size={36} className="text-gray-500" />
                    ) : (
                      <FileText size={36} className="text-brand-500" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                    {activeNav === "starred"
                      ? "No starred notes yet"
                      : activeNav === "trash"
                      ? "Trash is empty"
                      : activeNotebook
                      ? `No notes in "${activeNotebook}"`
                      : "No notes found"}
                  </h2>
                  <p className="text-gray-400 dark:text-gray-600 text-sm mb-4">
                    {activeNav === "starred"
                      ? "Click the star icon on any note card to add it here"
                      : activeNav === "trash"
                      ? "Deleted notes will appear here before permanent removal"
                      : activeNotebook
                      ? "Create a note in this notebook to get started"
                      : "Click '+ New' to create your first note"}
                  </p>
                  {(activeNotebook || activeNav === "allNotes") && (
                    <button
                      onClick={() => handleOpenNewNoteModal(activeNotebook)}
                      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-brand"
                    >
                      + Create note
                    </button>
                  )}
                </div>
              )}

              {/* Notes Grid vs List Display */}
              {!loading && displayedNotes.length > 0 && (
                notesViewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayedNotes.map((note) => renderNoteCard(note))}
                  </div>
                ) : (
                  /* Table List View */
                  <div className="bg-white dark:bg-[#16181f] border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                      <div className="col-span-5 md:col-span-4">Title</div>
                      <div className="col-span-4 md:col-span-4">Preview</div>
                      <div className="hidden md:block md:col-span-2">Notebook</div>
                      <div className="col-span-3 md:col-span-2 text-right">Actions</div>
                    </div>
                    {displayedNotes.map((note) => {
                      const plainText = extractPlainTextWithControlChars(note.docsDesc);
                      const isStarred = Boolean(note.starred);
                      const isTrash = Boolean(note.deleted);
                      return (
                        <div
                          key={note.id}
                          onClick={() => openNote(note.id)}
                          className="grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-gray-100 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer items-center"
                        >
                          <div className="col-span-5 md:col-span-4 flex items-center gap-2.5 min-w-0">
                            <FileText size={16} className="text-brand-500 shrink-0" />
                            <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                              {note.title || "Untitled"}
                            </span>
                          </div>
                          <div className="col-span-4 md:col-span-4 text-xs text-gray-500 truncate">
                            {plainText || <span className="italic text-gray-400">Empty note</span>}
                          </div>
                          <div className="hidden md:block md:col-span-2 text-xs text-gray-400 truncate">
                            {note.notebook || "—"}
                          </div>
                          <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-1">
                            {!isTrash && (
                              <button
                                onClick={(e) => handleToggleStar(e, note)}
                                className={`p-1 rounded-md transition-all cursor-pointer ${
                                  isStarred ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"
                                }`}
                              >
                                <Star size={14} className={isStarred ? "fill-yellow-400" : ""} />
                              </button>
                            )}
                            {!isTrash ? (
                              <button
                                onClick={(e) => handleSoftDelete(e, note.id)}
                                className="p-1 rounded-md text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleRestore(e, note.id)}
                                className="p-1 rounded-md text-gray-400 hover:text-green-500 transition-colors"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── New Note Popup Modal ──────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
          onClick={() => { setOpen(false); setQuickTitle(""); }}
        >
          <div
            className="w-full max-w-lg bg-[#16181f] border border-white/[0.08] rounded-2xl shadow-2xl p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Note</h3>
                  <p className="text-xs text-gray-400">Add a new note to your ThoughtPad</p>
                </div>
              </div>
              <button
                onClick={() => { setOpen(false); setQuickTitle(""); }}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Title Input */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Note Title
              </label>
              <input
                ref={quickInputRef}
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Title (optional)..."
                disabled={isCreating}
                autoFocus
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] focus:border-brand-500/60 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-all"
              />
            </div>

            {/* Notebook Selector */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Notebook Category
              </label>
              <select
                value={selectedNotebookForNew || ""}
                onChange={(e) => setSelectedNotebookForNew(e.target.value || null)}
                className="w-full px-4 py-2.5 bg-[#1a1c24] border border-white/[0.08] focus:border-brand-500/60 rounded-xl text-sm text-white outline-none transition-all cursor-pointer"
              >
                <option value="">No notebook (All Notes)</option>
                {notebooks.map((nb) => (
                  <option key={nb.id} value={nb.name || nb.id}>
                    {nb.name || nb.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => { setOpen(false); setQuickTitle(""); }}
                disabled={isCreating}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={addData}
                disabled={isCreating}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-brand transition-all cursor-pointer"
              >
                {isCreating ? <AppleSpinner className="w-4 h-4 text-white" /> : "Create & Edit Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Note Editor ──────────────────────────────────── */}
      {openEditor && <EditNote id={docId} notebooks={notebooks} onClose={() => setOpenEditor(false)} />}

      {/* ── Settings Modal ───────────────────────────────── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        docsData={docsData}
      />

      {/* ── File Preview Modal ─────────────────────────────── */}
      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        onOpenNote={openNote}
      />

      {/* ── Safe Delete Notebook Confirmation Modal ─────────── */}
      {notebookToDeleteModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
          onClick={() => setNotebookToDeleteModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#16181f] border border-white/[0.08] rounded-2xl shadow-2xl p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white mb-2">
              Delete Notebook "{notebookToDeleteModal.notebook?.name}"?
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-5">
              This notebook currently contains <strong className="text-white">{notebookToDeleteModal.count}</strong> {notebookToDeleteModal.count === 1 ? "active note" : "active notes"}. Choose what to do with the notes:
            </p>

            <div className="space-y-2.5 mb-5">
              <button
                onClick={() => handleConfirmDeleteNotebook("unassign")}
                className="w-full text-left p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-white group-hover:text-brand-400">Keep Notes (Unassign Notebook Label)</div>
                <div className="text-[11px] text-gray-500">Notes remain in All Notes, but the notebook category label is removed.</div>
              </button>

              <button
                onClick={() => handleConfirmDeleteNotebook("trash")}
                className="w-full text-left p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-red-400">Move All {notebookToDeleteModal.count} {notebookToDeleteModal.count === 1 ? "Note" : "Notes"} to Trash</div>
                <div className="text-[11px] text-gray-500">Soft-delete all notes inside this notebook.</div>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setNotebookToDeleteModal(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesHome;
