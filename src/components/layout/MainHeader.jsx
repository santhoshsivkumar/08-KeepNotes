import { FileText, Menu } from "lucide-react";

/**
 * MainHeader — Minimal workspace header with sidebar toggle button and location breadcrumb badge.
 */
const MainHeader = ({
  onOpenMobileMenu,
  activeNav = "home",
  activeNotebook = null,
}) => {
  const locationLabel = activeNotebook
    ? activeNotebook
    : activeNav === "allNotes"
    ? "All Notes"
    : activeNav === "files"
    ? "Files"
    : activeNav === "starred"
    ? "Starred"
    : activeNav === "trash"
    ? "Trash"
    : "Home";

  return (
    <header className="px-4 sm:px-8 pt-4 sm:pt-5 pb-3 flex items-center justify-between w-full border-b border-gray-200/60 dark:border-white/[0.05]">
      {/* Left: Sidebar Toggle Button + Workspace Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle Button (visible on ALL screens) */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
          aria-label="Toggle navigation menu"
          title="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Mobile-only compact branding */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shadow-brand shrink-0">
            <FileText size={14} className="text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
            ThoughtPad
          </span>
        </div>

        {/* Workspace Breadcrumb */}
        <div className="hidden lg:flex items-center gap-2.5 text-xs select-none">
          <span className="font-semibold text-gray-400 dark:text-gray-500">Workspace</span>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="font-bold text-gray-900 dark:text-white bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] px-2.5 py-1 rounded-lg">
            {locationLabel}
          </span>
        </div>
      </div>
    </header>
  );
};

export default MainHeader;
