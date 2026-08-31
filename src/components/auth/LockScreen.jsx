import { useState } from "react";
import { Lock } from "lucide-react";

/**
 * LockScreen — Classic, minimalist password protection modal for ThoughtPad.
 * Default Password: "0909"
 */
const LockScreen = ({ onUnlock }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleUnlock = (e) => {
    e?.preventDefault();
    if (password === "0909") {
      try {
        sessionStorage.setItem("tp_authenticated", "true");
      } catch (e) {
        // ignore
      }
      onUnlock();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0d0f14] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#16181f] border border-white/10 rounded-2xl p-6 shadow-2xl">
        {/* Simple Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white shrink-0 shadow-brand">
            <Lock size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">ThoughtPad</h2>
            <p className="text-xs text-gray-400">Enter password to continue</p>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setError(false);
                setPassword(e.target.value);
              }}
              placeholder="Enter password"
              className={`w-full px-4 py-2.5 bg-black/40 border rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-colors ${
                error
                  ? "border-red-500 focus:border-red-500"
                  : "border-white/10 focus:border-brand-500"
              }`}
            />
            {error && (
              <p className="text-xs text-red-400 mt-1.5 font-medium">
                Incorrect password. Please try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-brand transition-all cursor-pointer"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

export default LockScreen;
