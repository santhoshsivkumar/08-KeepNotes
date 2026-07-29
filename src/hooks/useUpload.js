import { useState, useCallback } from "react";
import { isWithinSizeLimit } from "../utils/fileHelpers";

const BUCKET_NAME = "docs-app-270e7.appspot.com";

/**
 * Fast FileReader: Converts file to Data URL for instant local fallback preview.
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload file to Firebase via Netlify Proxy (/firebasestorage-proxy) to bypass CORS completely.
 */
function uploadViaProxy(file, noteId, onProgress) {
  return new Promise((resolve, reject) => {
    const ts = Date.now();
    const safeName = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `notes/${noteId || "quick"}/${ts}_${safeName}`;
    const encodedPath = encodeURIComponent(path);

    // Use Netlify/Vite proxy route to bypass browser preflight CORS checks
    const uploadEndpoint = `/firebasestorage-proxy/v0/b/${BUCKET_NAME}/o?name=${encodedPath}`;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadEndpoint, true);
    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          const token = res.downloadTokens;
          // Public HTTPS cloud download URL accessible on any device
          const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(res.name)}?alt=media${token ? `&token=${token}` : ''}`;
          resolve({
            name: file.name || "Attachment",
            url: downloadUrl,
            size: file.size || 0,
            type: file.type || "application/octet-stream",
            uploadedAt: new Date().toISOString(),
          });
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

/**
 * Hook: uploadFile(file, noteId) → Promise<{ name, url, size, type, uploadedAt }>
 */
export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState(null);

  const uploadFile = useCallback((file, noteId) => {
    return new Promise(async (resolve, reject) => {
      // 1. Size guard check
      if (!isWithinSizeLimit(file)) {
        const msg = `"${file.name}" exceeds the allowed file limit.`;
        setError(msg);
        reject(new Error(msg));
        return;
      }

      setUploading(true);
      setError(null);
      setProgress(5);

      try {
        // Attempt cloud upload via Netlify proxy (supports cross-device download)
        const cloudResult = await uploadViaProxy(file, noteId, (pct) => setProgress(pct));
        setUploading(false);
        setProgress(100);
        resolve(cloudResult);
      } catch (proxyErr) {
        console.warn("Proxy upload failed, falling back to local preview:", proxyErr);
        try {
          // Fallback to local Data URL preview if offline
          const localDataUrl = await readFileAsDataURL(file);
          setUploading(false);
          setProgress(100);
          resolve({
            name: file.name || "Attachment",
            url: localDataUrl,
            size: file.size || 0,
            type: file.type || "application/octet-stream",
            uploadedAt: new Date().toISOString(),
          });
        } catch (err) {
          setUploading(false);
          setError(err.message || "Failed to process file");
          reject(err);
        }
      }
    });
  }, []);

  return { uploadFile, uploading, progress, error };
}
