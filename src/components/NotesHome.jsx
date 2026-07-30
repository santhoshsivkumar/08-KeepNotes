import { useState, useEffect, useRef } from "react";
import { Plus, FileText, Paperclip, Sun, Moon, Copy, Check, Download } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { database } from "../firebase/firebaseConfig";
import EditNote from "./EditNote";
import { useTheme } from "../hooks/useTheme";
import { downloadAllAttachments } from "../utils/downloadHelpers";

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

// Note accent color options — includes a CSS class for dark mode override
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


const NotesHome = () => {
  const [open, setOpen]               = useState(false);
  const [quickTitle, setQuickTitle]   = useState("");
  const [openEditor, setOpenEditor]   = useState(false);
  const [docId, setDocId]             = useState("");
  const [docsData, setDocsData]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [isCreating, setIsCreating]   = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [copiedNoteId, setCopiedNoteId]   = useState(null);

  const { toggle, isDark } = useTheme();
  const isMounted      = useRef(false);
  const quickInputRef  = useRef(null);
  const quickCaptureRef = useRef(null);

  const collectionRef = collection(database, "docsData");

  /* ── 1-Click Copy Text & Code Handler (Excludes Title) ──── */
  const handleCopyNote = (e, note) => {
    e.stopPropagation();
    // Exclude title completely — parse HTML to clean formatted plain text/code
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = note.docsDesc || "";
    const textToCopy = (tempDiv.innerText || tempDiv.textContent || "").trim();

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
    }
  };

  // Click outside quick capture to collapse
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (quickCaptureRef.current && !quickCaptureRef.current.contains(e.target)) {
        if (open) {
          if (quickTitle.trim()) addData();
          else setOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, quickTitle]);

  // Focus input when expanded
  useEffect(() => {
    if (open && quickInputRef.current) quickInputRef.current.focus();
  }, [open]);

  /* ── Instant Create Item Handler (0ms UI Collapse) ───── */
  const addData = () => {
    const titleToSave = quickTitle.trim();
    if (!titleToSave || isCreating) return;

    // 1. Clear input & collapse box INSTANTLY (0ms) so user never waits
    setQuickTitle("");
    setOpen(false);

    // 2. Fire addDoc in background asynchronously
    setIsCreating(true);
    addDoc(collectionRef, {
      title:       titleToSave,
      docsDesc:    "",
      color:       "default",
      attachments: [],
      createdAt:   new Date(),
      updatedAt:   new Date(),
    })
      .catch(() => alert("Could not create item. Please try again."))
      .finally(() => setIsCreating(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") addData();
    if (e.key === "Escape") { setOpen(false); setQuickTitle(""); }
  };

  /* ── Realtime Snapshot Listener (Newest Added at Very End / Last) ─── */
  useEffect(() => {
    const q = query(collectionRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
        // Sort chronologically (oldest first, new notes appended at very end)
        items.sort((a, b) => {
          const getMs = (item) => {
            if (item.createdAt?.toMillis) return item.createdAt.toMillis();
            if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
            if (item.updatedAt?.toMillis) return item.updatedAt.toMillis();
            if (item.updatedAt?.seconds) return item.updatedAt.seconds * 1000;
            return Date.now();
          };
          return getMs(a) - getMs(b);
        });
        setDocsData(items);
        setLoading(false);
      },
      () => {
        // Fallback: manual sort by oldest first
        onSnapshot(collectionRef, (snap) => {
          const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          items.sort((a, b) => {
            const getMs = (item) => {
              if (item.createdAt?.toMillis) return item.createdAt.toMillis();
              if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
              if (item.updatedAt?.toMillis) return item.updatedAt.toMillis();
              if (item.updatedAt?.seconds) return item.updatedAt.seconds * 1000;
              return Date.now();
            };
            return getMs(a) - getMs(b);
          });
          setDocsData(items);
          setLoading(false);
        });
      }
    );
    return () => unsubscribe();
  }, []);

  /* ── Delete Item Handler with Async Await & Apple Spinner ── */
  const deleteItem = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    setDeleteConfirm(null);
    try {
      // Await Firestore document deletion so it persists on reload
      await deleteDoc(doc(collectionRef, id));
    } catch (err) {
      alert("Failed to delete item. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const openNote = (id) => { setDocId(id); setOpenEditor(true); };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111318] font-sans transition-colors duration-300">

      {/* ── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/85 dark:bg-[#111318]/90 border-b border-gray-100 dark:border-white/[0.06] shadow-sm transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {/* Logo + name */}
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-brand shrink-0">
              <FileText size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">ThoughtPad</span>
          </div>

          {/* Count pill badge */}
          {!loading && docsData.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] px-2.5 py-1 rounded-full animate-fade-in">
              {docsData.length} {docsData.length === 1 ? "item" : "items"}
            </span>
          )}

          {/* Dark / Light toggle */}
          <button
            onClick={toggle}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all duration-200"
          >
            {isDark
              ? <Sun size={18} />
              : <Moon size={18} />
            }
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Quick Capture ──────────────────────────────── */}
        <div ref={quickCaptureRef} className="mb-8 max-w-2xl mx-auto">
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-[#1c1e28] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-card text-gray-400 dark:text-gray-500 hover:shadow-card-hover hover:border-gray-300 dark:hover:border-white/[0.14] transition-all duration-200 text-left cursor-text"
            >
              <Plus size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
              <span className="text-sm font-medium">Type something…</span>
            </button>
          ) : (
            <div className="bg-white dark:bg-[#1c1e28] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-card-hover animate-scale-in overflow-hidden">
              <input
                ref={quickInputRef}
                type="text"
                value={quickTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuickTitle(val.length > 1000 ? val.slice(0, 1000) : val);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Title"
                disabled={isCreating}
                className="w-full px-5 pt-4 pb-2 text-base font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 outline-none bg-transparent"
              />
              <div className="px-5 py-3 flex items-center justify-between border-t border-gray-50 dark:border-white/[0.05]">
                <span className="text-xs text-gray-400 dark:text-gray-600">Enter to save · Esc to cancel</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setOpen(false); setQuickTitle(""); }}
                    disabled={isCreating}
                    className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addData}
                    disabled={!quickTitle.trim() || isCreating}
                    className="px-4 py-1.5 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
                  >
                    {isCreating ? <AppleSpinner className="w-4 h-4 text-white" /> : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Loading Spinner ──────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-28 animate-fade-in">
            <AppleSpinner className="w-8 h-8 text-brand-500 mb-3" />
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              Loading…
            </span>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────── */}
        {!loading && docsData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-5 shadow-sm">
              <FileText size={36} className="text-brand-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No items yet</h2>
            <p className="text-gray-400 dark:text-gray-600 text-sm">Click "Type something…" above to get started</p>
          </div>
        )}

        {/* ── Workspace Grid ─────────────────────────────── */}
        {!loading && docsData.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docsData.map((note) => {
              const colors     = getColorClasses(note.color);
              const isDeleting = deleteConfirm === note.id;
              const isDeletingInProgress = deletingId === note.id;
              const coverImg   = extractCoverImage(note.docsDesc);
              const attCount   = (note.attachments || []).length;
              const noteLines  = note.docsDesc
                ? (note.docsDesc.includes("<p>")
                    ? (note.docsDesc.match(/<p>/gi) || []).length
                    : Math.max(1, (note.docsDesc.match(/\n/g) || []).length + 1))
                : 0;
              return (
                <div key={note.id} className="group animate-fade-up">
                  <div className={`relative h-[240px] flex flex-col justify-between rounded-xl border ${colors.border} ${colors.bg} shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 cursor-pointer`}>

                    {/* Cover image */}
                    {coverImg && (
                      <div
                        className="w-full h-24 rounded-t-xl overflow-hidden cursor-pointer shrink-0"
                        onClick={() => openNote(note.id)}
                      >
                        <img src={coverImg} alt="cover" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}

                    {/* Card body */}
                    <div className="p-4 pb-2 flex-1 overflow-hidden" onClick={() => openNote(note.id)}>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug mb-1 pr-4 truncate">
                        {note.title || "Untitled"}
                      </h3>
                      {note.docsDesc ? (
                        <div
                          className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-7 [&_p]:m-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_ul]:pl-4 [&_ol]:pl-4 [&_img]:hidden"
                          dangerouslySetInnerHTML={{
                            __html: note.docsDesc.length > 2500 ? note.docsDesc.slice(0, 2500) + "..." : note.docsDesc
                          }}
                        />
                      ) : (
                        <p className="text-gray-400 dark:text-gray-600 text-xs italic mt-1">No additional text</p>
                      )}
                    </div>

                    {/* Actions row (Always Visible) */}
                    <div className="px-4 py-2 flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.05] shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                          {note.updatedAt?.toDate
                            ? new Date(note.updatedAt.toDate()).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                            : ""}
                        </span>
                        {noteLines > 0 && (
                          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] rounded-full px-1.5 py-0.5 font-mono">
                            {noteLines.toLocaleString()} {noteLines === 1 ? "line" : "lines"}
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
                              deleteItem(note.id);
                            }}
                          >
                            Click again to delete
                          </span>
                        )}

                        {!isDeleting && (
                          <>
                            {/* 1-Click Copy Text & Code */}
                            <button
                              onClick={(e) => handleCopyNote(e, note)}
                              disabled={isDeletingInProgress}
                              className={`p-1.5 rounded-lg transition-all ${
                                copiedNoteId === note.id
                                  ? "text-green-600 bg-green-50 dark:bg-green-500/20 dark:text-green-400"
                                  : "text-gray-400 dark:text-gray-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                              }`}
                              title={copiedNoteId === note.id ? "Copied! ✓" : "1-Click Copy text & code"}
                            >
                              {copiedNoteId === note.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>

                            {/* 1-Click Download All Attachments */}
                            {attCount > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadAllAttachments(note.attachments);
                                }}
                                disabled={isDeletingInProgress}
                                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                                title={`Download all ${attCount} ${attCount === 1 ? "attachment" : "attachments"}`}
                              >
                                <Download size={14} />
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={(e) => { e.stopPropagation(); openNote(note.id); }}
                              disabled={isDeletingInProgress}
                              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all disabled:opacity-40"
                              title="Edit item"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                          </>
                        )}

                        {/* Delete with Apple Spinner */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDeletingInProgress) return;
                            if (isDeleting) deleteItem(note.id);
                            else { setDeleteConfirm(note.id); setTimeout(() => setDeleteConfirm(null), 2500); }
                          }}
                          disabled={isDeletingInProgress}
                          className={`p-1.5 rounded-lg transition-all ${isDeletingInProgress ? "text-red-500 bg-red-50 dark:bg-red-500/10" : isDeleting ? "text-red-500 bg-red-50 dark:bg-red-500/10 scale-105" : "text-gray-400 dark:text-gray-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"}`}
                          title={isDeletingInProgress ? "Deleting item…" : isDeleting ? "Click to confirm delete" : "Delete item"}
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
            })}
          </div>
        )}
      </main>

      {/* ── Note Editor ──────────────────────────────────── */}
      {openEditor && <EditNote id={docId} onClose={() => setOpenEditor(false)} />}
    </div>
  );
};

export default NotesHome;
