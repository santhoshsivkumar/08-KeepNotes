import { useState } from "react";
import { X, Sun, Moon, Download, Upload, Trash2, ShieldAlert, Check, FileText, Info } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

const SettingsModal = ({ isOpen, onClose, docsData = [], onImportNotes }) => {
  const { toggle, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("appearance"); // "appearance" | "editor" | "files" | "data" | "about"

  // Settings preferences stored in localStorage
  const [pasteMode, setPasteMode] = useState(() => localStorage.getItem("kn_pasteMode") || "formatted");
  const [defaultFileView, setDefaultFileView] = useState(() => localStorage.getItem("tp_defaultFileView") || "grid");
  const [importStatus, setImportStatus] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handlePasteModeChange = (mode) => {
    setPasteMode(mode);
    localStorage.setItem("kn_pasteMode", mode);
  };

  const handleFileViewChange = (mode) => {
    setDefaultFileView(mode);
    localStorage.setItem("tp_defaultFileView", mode);
  };

  // Export Notes Data as JSON Backup
  const handleExportData = () => {
    const backupData = {
      app: "ThoughtPad",
      version: "1.0",
      exportDate: new Date().toISOString(),
      notesCount: docsData.length,
      notes: docsData,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ThoughtPad_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup File
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result || "{}");
        if (parsed.notes && Array.isArray(parsed.notes)) {
          if (onImportNotes) onImportNotes(parsed.notes);
          setImportStatus(`Successfully imported ${parsed.notes.length} notes!`);
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          alert("Invalid backup file format. Expected a ThoughtPad JSON file with 'notes' array.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Clear Local App Storage
  const handleClearLocalData = () => {
    try {
      localStorage.removeItem("tp-notebooks");
      localStorage.removeItem("kn_zoomLevel");
      localStorage.removeItem("kn_toolbarCollapsed");
      localStorage.removeItem("kn_pasteMode");
      localStorage.removeItem("tp_defaultFileView");
      setShowClearConfirm(false);
      alert("Local preferences cleared successfully.");
      window.location.reload();
    } catch (e) {
      alert("Failed to clear local data.");
    }
  };

  const TABS = [
    { id: "appearance", label: "Appearance", icon: Sun },
    { id: "editor", label: "Editor", icon: FileText },
    { id: "files", label: "Files", icon: Download },
    { id: "data", label: "Data & Storage", icon: Upload },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-[540px] max-h-[90vh] bg-[#16181f] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shadow-brand">
              <FileText size={14} className="text-white" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Horizontal Tabs (< sm screens) */}
        <div className="flex sm:hidden flex-wrap items-center gap-1.5 p-2 bg-[#0d0f14] border-b border-white/[0.06] shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-brand-500 text-white shadow-brand"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden flex-col sm:flex-row">
          {/* Desktop Left Tab List (>= sm screens) */}
          <div className="hidden sm:flex w-44 border-r border-white/[0.06] p-3 flex-col gap-1 shrink-0 bg-[#0d0f14]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    isActive
                      ? "bg-brand-500 text-white shadow-brand"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto sidebar-scroll">
            {/* ── APPEARANCE TAB ── */}
            {activeTab === "appearance" && (
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Theme Preference</h3>
                <p className="text-xs text-gray-400 mb-4">Choose how ThoughtPad looks on your device.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => { if (isDark) toggle(); }}
                    className={`p-4 rounded-xl border flex flex-row sm:flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                      !isDark
                        ? "bg-brand-500/10 border-brand-500 text-white"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white"
                    }`}
                  >
                    <Sun size={24} className={!isDark ? "text-amber-400" : ""} />
                    <span className="text-xs font-semibold">Light Mode</span>
                  </button>

                  <button
                    onClick={() => { if (!isDark) toggle(); }}
                    className={`p-4 rounded-xl border flex flex-row sm:flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                      isDark
                        ? "bg-brand-500/10 border-brand-500 text-white"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white"
                    }`}
                  >
                    <Moon size={24} className={isDark ? "text-brand-400" : ""} />
                    <span className="text-xs font-semibold">Dark Mode</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── EDITOR TAB ── */}
            {activeTab === "editor" && (
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Paste Behavior</h3>
                <p className="text-xs text-gray-400 mb-4">Default behavior when pasting text into notes.</p>

                <div className="space-y-2 mb-6">
                  <label
                    onClick={() => handlePasteModeChange("formatted")}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      pasteMode === "formatted"
                        ? "bg-brand-500/10 border-brand-500 text-white"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">Keep Formatting</div>
                      <div className="text-[11px] text-gray-400">Preserve fonts, colors, and structure when pasting.</div>
                    </div>
                    {pasteMode === "formatted" && <Check size={16} className="text-brand-400 shrink-0" />}
                  </label>

                  <label
                    onClick={() => handlePasteModeChange("plain")}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      pasteMode === "plain"
                        ? "bg-brand-500/10 border-brand-500 text-white"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">Paste as Plain Text</div>
                      <div className="text-[11px] text-gray-400">Strip all formatting and insert text cleanly.</div>
                    </div>
                    {pasteMode === "plain" && <Check size={16} className="text-brand-400 shrink-0" />}
                  </label>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-xs font-bold text-white mb-0.5">Autosave</div>
                  <div className="text-[11px] text-gray-400">Notes automatically save in real-time as you type.</div>
                </div>
              </div>
            )}

            {/* ── FILES TAB ── */}
            {activeTab === "files" && (
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Default View</h3>
                <p className="text-xs text-gray-400 mb-4">Select default layout mode for Files tab.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => handleFileViewChange("grid")}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      defaultFileView === "grid"
                        ? "bg-brand-500/10 border-brand-500 text-white"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white"
                    }`}
                  >
                    <span className="text-xs font-semibold">Grid View (Cards)</span>
                  </button>

                  <button
                    onClick={() => handleFileViewChange("list")}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      defaultFileView === "list"
                        ? "bg-brand-500/10 border-brand-500 text-white"
                        : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white"
                    }`}
                  >
                    <span className="text-xs font-semibold">List View (Table)</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── DATA TAB ── */}
            {activeTab === "data" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Export Backup</h3>
                  <p className="text-xs text-gray-400 mb-3">Download a local JSON backup of all your notes & attachments.</p>
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-brand"
                  >
                    <Download size={14} />
                    <span>Export Notes JSON</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <h3 className="text-sm font-bold text-white mb-1">Import Backup</h3>
                  <p className="text-xs text-gray-400 mb-3">Restore notes from a previously exported ThoughtPad JSON backup.</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-200 border border-white/[0.08] text-xs font-semibold rounded-xl transition-all cursor-pointer">
                    <Upload size={14} />
                    <span>Import JSON File</span>
                    <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                  </label>
                  {importStatus && (
                    <div className="text-xs text-green-400 font-semibold mt-2 animate-fade-in">{importStatus}</div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <h3 className="text-sm font-bold text-red-400 mb-1">Clear Local Preferences</h3>
                  <p className="text-xs text-gray-400 mb-3">Reset local window sizes, notebooks cache, and user preferences.</p>
                  {!showClearConfirm ? (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Reset Preferences</span>
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl animate-fade-in">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={16} className="text-red-400 shrink-0" />
                        <span className="text-xs text-red-300 font-medium">Clear local settings?</span>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={handleClearLocalData}
                          className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all cursor-pointer"
                        >
                          Confirm Reset
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ABOUT TAB ── */}
            {activeTab === "about" && (
              <div className="text-center py-4 sm:py-6">
                <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-brand">
                  <FileText size={28} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">ThoughtPad</h3>
                <p className="text-xs text-gray-400 mb-4">Version 1.0.0</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed mb-6">
                  A universal, local-first personal note taking application designed for instant productivity without accounts, logins, or tracking.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-[10px] sm:text-[11px] text-gray-400 font-mono">
                  <span>Privacy-First · Local Storage · Firebase Realtime</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
