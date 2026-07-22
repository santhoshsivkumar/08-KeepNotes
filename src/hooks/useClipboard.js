import { useEffect, useCallback } from "react";

/**
 * useClipboard — reliable paste event handler.
 * Listens for Ctrl+V / Cmd+V image pastes (Snipping Tool, Win+Shift+S, Copy Image, or copied image files).
 * Triggers onImagePaste(file) and prevents default raw image dumping.
 */
export function useClipboard({ onImagePaste, containerRef, enabled = true }) {
  const handlePaste = useCallback(
    (e) => {
      if (!enabled) return;

      // 1. Check explicit files array (e.g. copied files from Explorer)
      const files = Array.from(e.clipboardData?.files || []);
      const imageFiles = files.filter(
        (f) => f.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name)
      );

      if (imageFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        imageFiles.forEach((file) => {
          if (onImagePaste) onImagePaste(file);
        });
        return;
      }

      // 2. Check items array (e.g. Snipping Tool / Win+Shift+S / Right-click Copy Image)
      const items = Array.from(e.clipboardData?.items || []);
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && (file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name))) {
            e.preventDefault();
            e.stopPropagation();
            if (onImagePaste) onImagePaste(file);
            return;
          }
        }
      }
    },
    [onImagePaste, enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef?.current ?? document;
    // Capture phase ensures we intercept before Quill or browser default
    el.addEventListener("paste", handlePaste, { capture: true });
    return () => el.removeEventListener("paste", handlePaste, { capture: true });
  }, [handlePaste, containerRef, enabled]);
}
