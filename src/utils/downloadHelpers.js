/**
 * Triggers a browser download for a given URL or Data URL
 */
export function downloadFile(url, fileName = "download") {
  if (!url) return;

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "attachment";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads multiple attachment objects sequentially with a slight delay
 */
export function downloadAllAttachments(attachments = []) {
  if (!attachments || attachments.length === 0) return;

  attachments.forEach((att, index) => {
    setTimeout(() => {
      downloadFile(att.url, att.name || `attachment_${index + 1}`);
    }, index * 300); // 300ms gap between downloads to avoid browser block
  });
}
