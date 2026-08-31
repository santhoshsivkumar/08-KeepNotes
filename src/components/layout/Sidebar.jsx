import { useEffect } from "react";
import { Home, FileText, Paperclip, Star, Trash2, Plus, X, Sun, Moon, Settings, Lock, PanelLeftClose } from "lucide-react";

/**
 * Sidebar — Left navigation panel for ThoughtPad.
 * Supports light & dark mode themes, desktop collapsible state, and mobile slide-over drawer mode.
 */
const Sidebar = ({
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  activeNav = "home",
  onNavChange,
  notebooks = [],
  activeNotebook = null,
  onNotebookSelect,
  onAddNotebook,
  onDeleteNotebook,
  onToggleTheme,
  isDark,
  onOpenSettings,
}) => {
  // Handle ESC key on mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleNavClick = (navId) => {
    onNavChange?.(navId);
    if (isOpen && onClose) onClose();
  };

  const handleNotebookClick = (nbId) => {
    onNotebookSelect?.(nbId);
    if (isOpen && onClose) onClose();
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[90] lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`w-[240px] bg-white dark:bg-[#0d0f14] h-screen fixed left-0 top-0 border-r border-gray-200 dark:border-white/[0.06] flex flex-col transition-all duration-300 ${
          isOpen
            ? "translate-x-0 shadow-2xl z-[100]"
            : isCollapsed
            ? "-translate-x-full z-30"
            : "-translate-x-full lg:translate-x-0 z-30"
        }`}
      >
        {/* 1. Logo Area */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-brand shrink-0">
              <FileText size={16} className="text-white" />
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">ThoughtPad</span>
          </div>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
            title="Collapse Sidebar"
            aria-label="Collapse Sidebar"
          >
            <PanelLeftClose size={18} />
          </button>

          {/* Close button for mobile drawer only */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Middle scrollable area */}
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          {/* 2. Navigation */}
          <nav className="px-3 flex flex-col gap-0.5" role="navigation" aria-label="Main navigation">
            <div
              onClick={() => handleNavClick("home")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNavClick("home")}
              role="button"
              tabIndex={0}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-all cursor-pointer ${
                activeNav === "home"
                  ? "bg-brand-500 text-white font-semibold shadow-brand"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <Home size={16} />
              <span>Home</span>
            </div>

            <div
              onClick={() => handleNavClick("allNotes")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNavClick("allNotes")}
              role="button"
              tabIndex={0}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-all cursor-pointer ${
                activeNav === "allNotes"
                  ? "bg-brand-500 text-white font-semibold shadow-brand"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <FileText size={16} />
              <span>All Notes</span>
            </div>

            <div
              onClick={() => handleNavClick("files")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNavClick("files")}
              role="button"
              tabIndex={0}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-all cursor-pointer ${
                activeNav === "files"
                  ? "bg-brand-500 text-white font-semibold shadow-brand"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <Paperclip size={16} />
              <span>Files</span>
            </div>

            <div
              onClick={() => handleNavClick("starred")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNavClick("starred")}
              role="button"
              tabIndex={0}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-all cursor-pointer ${
                activeNav === "starred"
                  ? "bg-brand-500 text-white font-semibold shadow-brand"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <Star size={16} />
              <span>Starred</span>
            </div>

            <div
              onClick={() => handleNavClick("trash")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNavClick("trash")}
              role="button"
              tabIndex={0}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-3 transition-all cursor-pointer ${
                activeNav === "trash"
                  ? "bg-brand-500 text-white font-semibold shadow-brand"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <Trash2 size={16} />
              <span>Trash</span>
            </div>
          </nav>

          {/* 3. Notebooks Section */}
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between px-3">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500">
                NOTEBOOKS
              </span>
              <button
                onClick={onAddNotebook}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] cursor-pointer transition-all"
                aria-label="Add notebook"
                title="Add notebook"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="mt-1.5 flex flex-col gap-0.5">
              {notebooks.map((notebook) => (
                <div
                  key={notebook.id}
                  onClick={() => handleNotebookClick(notebook.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNotebookClick(notebook.id)}
                  role="button"
                  tabIndex={0}
                  className={`group px-3 py-2 rounded-lg text-sm flex items-center justify-between cursor-pointer transition-all ${
                    activeNotebook === notebook.id
                      ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-white/[0.06] font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: notebook.color || "#8b5cf6" }}
                    />
                    <span className="truncate">{notebook.name}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteNotebook) onDeleteNotebook(notebook.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                    title="Delete notebook"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              <div
                onClick={onAddNotebook}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onAddNotebook()}
                role="button"
                tabIndex={0}
                className="px-3 py-2 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-3 cursor-pointer transition-all"
              >
                <Plus size={16} />
                <span>Add Notebook</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sidebar Footer Controls */}
        <div className="px-3 py-3 border-t border-gray-200 dark:border-white/[0.06] shrink-0 flex items-center justify-between gap-1.5">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.05] dark:border-white/[0.06] transition-all cursor-pointer select-none min-w-0"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={15} className="text-amber-400 shrink-0" /> : <Moon size={15} className="text-brand-500 shrink-0" />}
            <span className="truncate">{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>

          {/* Lock App Button */}
          <button
            onClick={() => {
              try { sessionStorage.removeItem("tp_authenticated"); } catch (e) {}
              window.location.reload();
            }}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-red-400 bg-black/[0.03] dark:bg-white/[0.04] hover:bg-red-500/10 border border-black/[0.05] dark:border-white/[0.06] transition-all cursor-pointer shrink-0"
            title="Lock ThoughtPad Workspace"
          >
            <Lock size={16} />
          </button>

          {/* Settings Gear Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.05] dark:border-white/[0.06] transition-all cursor-pointer shrink-0"
            title="Open Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
