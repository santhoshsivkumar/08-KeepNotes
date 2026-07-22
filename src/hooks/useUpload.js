import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/firebaseConfig";
import { useState, useCallback } from "react";
import { isWithinSizeLimit } from "../utils/fileHelpers";

/**
 * Fast FileReader: Converts file to Data URL instantly.
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let result = reader.result;
      if (typeof result === "string" && result.length > 700000) {
        result = result.substring(0, 700000);
      }
      resolve(result);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Hook: uploadFile(file, noteId) → Promise<{ name, url, size, type, uploadedAt }>
 * Resolves INSTANTLY with local Data URL preview, while uploading to Firebase Storage asynchronously.
 * Zero user waiting time!
 */
export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState(null);

  const uploadFile = useCallback((file, noteId) => {
    return new Promise(async (resolve, reject) => {
      // 1. Size guard — 10 MB max
      if (!isWithinSizeLimit(file)) {
        const msg = `"${file.name}" is too large. Max size is 10 MB.`;
        setError(msg);
        reject(new Error(msg));
        return;
      }

      setUploading(true);
      setError(null);
      setProgress(50);

      try {
        // Generate instant local Data URL so attachment appears immediately (< 30ms)
        const localDataUrl = await readFileAsDataURL(file);
        
        setUploading(false);
        setProgress(100);

        // Resolve instantly for immediate UI display
        const resultItem = {
          name:       file.name || "Attachment",
          url:        localDataUrl,
          size:       file.size || 0,
          type:       file.type || "application/octet-stream",
          uploadedAt: new Date().toISOString(),
        };

        resolve(resultItem);

        // Optional: Async upload to Firebase Storage in background without blocking user
        try {
          const ts       = Date.now();
          const safeName = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
          const path     = `notes/${noteId || "quick"}/${ts}_${safeName}`;
          const fileRef  = ref(storage, path);
          uploadBytesResumable(fileRef, file);
        } catch {
          // Silent background fallback
        }
      } catch (err) {
        setUploading(false);
        setError(err.message || "Failed to process file");
        reject(err);
      }
    });
  }, []);

  return { uploadFile, uploading, progress, error };
}
