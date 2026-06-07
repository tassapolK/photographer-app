import JSZip from 'jszip';

// Download a single image — works on iOS and Android
export async function downloadSingle(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    // Web Share API — iOS 14+ can save directly to Photos
    if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: blob.type })] })) {
      await navigator.share({
        files: [new File([blob], filename, { type: blob.type })],
        title: filename,
      });
      return;
    }

    // Standard download link (Android + Desktop)
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (err) {
    // Last resort: open in new tab (user long-presses on iOS to Save to Photos)
    window.open(url, '_blank');
  }
}

// Download multiple images as ZIP
export async function downloadMultiple(photos, eventTitle = 'photos') {
  const zip = new JSZip();
  const folder = zip.folder(eventTitle);

  await Promise.all(
    photos.map(async (photo, i) => {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const name = photo.originalName || `photo_${String(i + 1).padStart(3, '0')}.${ext}`;
      folder.file(name, blob);
    })
  );

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

  // Web Share API for ZIP
  if (navigator.share && navigator.canShare?.({ files: [new File([zipBlob], `${eventTitle}.zip`, { type: 'application/zip' })] })) {
    await navigator.share({
      files: [new File([zipBlob], `${eventTitle}.zip`, { type: 'application/zip' })],
      title: `${eventTitle} Photos`,
    });
    return;
  }

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${eventTitle}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// iOS tip: show instruction for saving from browser
export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
