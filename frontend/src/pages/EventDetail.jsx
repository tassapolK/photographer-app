import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Upload, QrCode, Scan, Trash2,
  CheckSquare, Square, X, Loader, AlertCircle,
  FolderOpen, RefreshCw,
} from 'lucide-react';
import api from '../utils/api';
import { useFaceApi } from '../hooks/useFaceApi';

// ── localStorage helpers for folder-watch duplicate tracking ─────────────────
// Each event gets its own "already uploaded" set, keyed by event._id.
function getWatchUploaded(eventId) {
  try { return new Set(JSON.parse(localStorage.getItem(`wf_${eventId}`) || '[]')); }
  catch { return new Set(); }
}
function addWatchUploaded(eventId, names) {
  const s = getWatchUploaded(eventId);
  names.forEach(n => s.add(n));
  localStorage.setItem(`wf_${eventId}`, JSON.stringify([...s]));
}

function QRModal({ eventId, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    api.get(`/events/${eventId}/qr`).then(setQrData).finally(() => setLoading(false));
  }, [eventId]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">QR Code สำหรับลูกค้า</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><Loader size={32} className="animate-spin text-primary" /></div>
        ) : qrData ? (
          <>
            <img src={qrData.qr} alt="QR Code" className="w-full rounded-xl bg-white p-3" />
            <p className="text-white/40 text-xs mt-3 break-all">{qrData.url}</p>
            <button
              className="btn-primary w-full mt-4"
              onClick={() => {
                const a = document.createElement('a');
                a.href = qrData.qr;
                a.download = 'qr-code.png';
                a.click();
              }}
            >
              ดาวน์โหลด QR Code
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInput = useRef();
  const [showQR, setShowQR] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadErrors, setUploadErrors] = useState([]); // file names that failed
  const [failedFiles, setFailedFiles] = useState([]);   // actual File objects for retry
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const { loading: faceLoading, detectDescriptors } = useFaceApi();

  // ── Folder watch state ────────────────────────────────────────────────────
  const [watchDir, setWatchDir] = useState(null);       // FileSystemDirectoryHandle
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle' | 'scanning'
  const [lastScan, setLastScan] = useState(null);       // Date of last scan
  const [countdown, setCountdown] = useState(0);        // seconds until next auto-scan

  // Refs keep interval callbacks free of stale closures
  const watchIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const handleUploadRef = useRef(null);  // always points to latest handleUpload
  const eventRef = useRef(null);         // latest event data
  const uploadingRef = useRef(false);    // latest uploading state

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`),
  });

  // Use ?all=true to get flat array (backward-compatible with admin view)
  const { data: photos = [] } = useQuery({
    queryKey: ['photos', id],
    queryFn: () => api.get(`/photos/event/${event?.slug}?all=true`),
    enabled: !!event?.slug,
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId) => api.delete(`/photos/${photoId}`),
    onSuccess: () => qc.invalidateQueries(['photos', id]),
  });

  // ── Face detection helper ─────────────────────────────────────────────────
  // Downscales to 640px — used ONLY for face-api.js, not for upload.
  const prepareForFaceDetection = (file) => new Promise((resolve) => {
    const MAX = 640;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const small = new Image();
        small.src = canvas.toDataURL('image/jpeg', 0.8);
        small.onload = () => resolve(small);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ── Upload one file to Cloudinary using a signed token ───────────────────
  // signData comes from GET /api/photos/event/:slug/save
  const uploadToCloudinary = async (file, signData) => {
    const faceImgPromise = faceLoading ? Promise.resolve(null) : prepareForFaceDetection(file);

    const formData = new FormData();
    formData.append('file', file);                  // original file — no re-encoding
    formData.append('api_key', signData.api_key);
    formData.append('timestamp', signData.timestamp);
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`,
      { method: 'POST', body: formData }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Upload failed (${res.status})`);
    }
    const data = await res.json();

    const thumbUrl = data.secure_url.replace(
      '/upload/',
      '/upload/c_fill,w_400,h_300,q_auto,f_auto/'
    );

    let faceDescriptors = [];
    try {
      const faceImg = await faceImgPromise;
      if (faceImg) faceDescriptors = await detectDescriptors(faceImg);
    } catch { /* skip if face detection fails */ }

    return {
      url: data.secure_url,
      thumbnailUrl: thumbUrl,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      name: file.name,
      faceDescriptors,
    };
  };

  // ── Upload handler: 3 concurrent, signed, with error tracking ────────────
  const handleUpload = useCallback(async (files) => {
    const fileArray = Array.from(files);
    if (!fileArray.length || !event?.slug) return;

    setUploading(true);
    setUploadErrors([]);
    setFailedFiles([]);
    setUploadProgress({ done: 0, total: fileArray.length });

    const CONCURRENCY = 3;
    const errorNames = [];
    const errorFiles = []; // keep File objects for retry
    let done = 0;

    for (let i = 0; i < fileArray.length; i += CONCURRENCY) {
      const chunk = fileArray.slice(i, i + CONCURRENCY);

      // Refresh signature for each batch (signatures expire after ~60s)
      let signData;
      try {
        signData = await api.get(`/photos/event/${event.slug}/save`);
      } catch (e) {
        console.error('Could not get upload signature:', e.message);
        errorNames.push(...chunk.map(f => f.name));
        errorFiles.push(...chunk);
        done += chunk.length;
        setUploadProgress({ done, total: fileArray.length });
        continue;
      }

      await Promise.all(chunk.map(async (file) => {
        try {
          const photoInfo = await uploadToCloudinary(file, signData);
          await api.post(`/photos/event/${event.slug}/save`, { photos: [photoInfo] });
        } catch (e) {
          console.error(`Failed: ${file.name}`, e.message);
          errorNames.push(file.name);
          errorFiles.push(file);
        }
        done++;
        setUploadProgress({ done, total: fileArray.length });
      }));
    }

    setUploading(false);
    if (errorNames.length > 0) {
      setUploadErrors([...errorNames]);
      setFailedFiles([...errorFiles]);
    }
    qc.invalidateQueries(['photos', id]);
    qc.invalidateQueries(['event', id]);
    if (fileInput.current) fileInput.current.value = '';

    return { failedList: errorFiles }; // used by doScan to track which files succeeded
  }, [event, faceLoading, detectDescriptors, id]);

  // ── Keep refs in sync so interval callbacks always see latest values ──────
  useEffect(() => { handleUploadRef.current = handleUpload; }, [handleUpload]);
  useEffect(() => { eventRef.current = event; }, [event]);
  useEffect(() => { uploadingRef.current = uploading; }, [uploading]);

  // ── Scan folder: enumerate directory → find new images → upload ───────────
  // Safe to use in setInterval — reads all state via refs, never captures stale closures.
  const doScan = useCallback(async (dir) => {
    const evt = eventRef.current;
    if (!evt?._id || uploadingRef.current) return; // skip if no event or already uploading

    setScanStatus('scanning');
    const IMAGE_RE = /\.(jpe?g|png|webp|heic?|tiff?|bmp|gif)$/i;
    const alreadyDone = getWatchUploaded(evt._id);
    const newFiles = [];

    try {
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'file' && IMAGE_RE.test(name) && !alreadyDone.has(name))
          newFiles.push(await handle.getFile());
      }
    } catch (err) {
      console.error('Folder scan error:', err);
      setScanStatus('idle');
      return;
    }

    setScanStatus('idle');
    setLastScan(new Date()); // triggers countdown reset via useEffect

    if (newFiles.length) {
      const result = await handleUploadRef.current(newFiles);
      // Mark only successfully uploaded files (not the ones that failed)
      const failedNames = new Set((result?.failedList ?? []).map(f => f.name));
      const okNames = newFiles.filter(f => !failedNames.has(f.name)).map(f => f.name);
      if (okNames.length) addWatchUploaded(evt._id, okNames);
    }
  }, []); // [] — stable, uses refs only

  // ── Link a local folder ───────────────────────────────────────────────────
  const handleSelectFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('ฟีเจอร์นี้ใช้ได้กับ Chrome หรือ Edge บนคอมพิวเตอร์เท่านั้นครับ');
      return;
    }
    try {
      const dir = await window.showDirectoryPicker({ mode: 'read' });
      setWatchDir(dir);
      // Pre-mark photos already in this event so they don't get re-uploaded
      if (event?._id && photos.length)
        addWatchUploaded(event._id, photos.map(p => p.name).filter(Boolean));
      await doScan(dir); // run first scan immediately
    } catch (e) {
      if (e.name !== 'AbortError') console.error('showDirectoryPicker:', e);
    }
  };

  const stopWatching = () => {
    clearInterval(watchIntervalRef.current);
    clearInterval(countdownIntervalRef.current);
    setWatchDir(null);
    setScanStatus('idle');
    setCountdown(0);
  };

  // Start / restart the 5-min interval whenever a folder is linked
  useEffect(() => {
    if (!watchDir) return;
    const INTERVAL = 5 * 60 * 1000;
    setCountdown(INTERVAL / 1000);
    watchIntervalRef.current = setInterval(() => doScan(watchDir), INTERVAL);
    countdownIntervalRef.current = setInterval(() => setCountdown(s => Math.max(0, s - 1)), 1000);
    return () => {
      clearInterval(watchIntervalRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, [watchDir, doScan]);

  // Reset countdown to 5:00 after every scan (auto or manual)
  useEffect(() => { if (lastScan) setCountdown(300); }, [lastScan]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(watchIntervalRef.current);
    clearInterval(countdownIntervalRef.current);
  }, []);

  const fmtCountdown = (sec) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  const toggleSelect = (photoId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(photoId) ? next.delete(photoId) : next.add(photoId);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`ลบ ${selectedIds.size} รูปที่เลือก?`)) return;
    await Promise.all([...selectedIds].map(pid => deleteMutation.mutateAsync(pid)));
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 py-5 safe-top">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate">{event?.title}</h1>
          <p className="text-white/40 text-xs">{photos.length} รูป</p>
        </div>
        <button onClick={() => setShowQR(true)} className="p-2 hover:bg-white/5 rounded-xl text-primary">
          <QrCode size={22} />
        </button>
      </div>

      {/* Action Bar */}
      <div className="flex gap-3 mb-3">
        <button
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          onClick={() => fileInput.current.click()}
          disabled={uploading}
        >
          <Upload size={18} />
          {uploading
            ? `อัพโหลด ${uploadProgress.done}/${uploadProgress.total}`
            : 'อัพโหลดรูป'}
        </button>
        <button
          className={`btn-secondary px-4 flex items-center gap-2 ${selectMode ? 'border-primary/50' : ''}`}
          onClick={() => { setSelectMode(s => !s); setSelectedIds(new Set()); }}
        >
          <CheckSquare size={18} />
        </button>
        <input ref={fileInput} type="file" multiple accept="image/*" className="hidden"
          onChange={e => handleUpload(e.target.files)} />
      </div>

      {/* ── Folder Auto-Watch ──────────────────────────────────────────────── */}
      {'showDirectoryPicker' in window && (
        <div className="mb-4">
          {!watchDir ? (
            /* Link folder button */
            <button
              onClick={handleSelectFolder}
              disabled={uploading}
              className="w-full py-2.5 rounded-xl border border-dashed border-white/10 hover:border-primary/30 hover:text-primary text-white/35 text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-40"
            >
              <FolderOpen size={15} className="group-hover:scale-110 transition-transform" />
              ผูกโฟลเดอร์อัตโนมัติ
            </button>
          ) : (
            /* Active watch panel */
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
              {/* Folder name + live status dot */}
              <div className="flex items-center gap-2 mb-1.5">
                <FolderOpen size={15} className="text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-white truncate flex-1">
                  {watchDir.name}
                </span>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                  scanStatus === 'scanning' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
                }`} />
              </div>

              {/* Status text */}
              <p className="text-xs text-white/45 mb-2.5">
                {scanStatus === 'scanning' ? (
                  '🔍 กำลังสแกนโฟลเดอร์...'
                ) : lastScan ? (
                  `สแกนล่าสุด ${lastScan.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` +
                  (countdown > 0 ? ` · ครั้งถัดไปในอีก ${fmtCountdown(countdown)} น.` : '')
                ) : (
                  'รอสแกนครั้งแรก...'
                )}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => doScan(watchDir)}
                  disabled={scanStatus === 'scanning' || uploading}
                  className="flex-1 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={12} className={scanStatus === 'scanning' ? 'animate-spin' : ''} />
                  สแกนตอนนี้
                </button>
                <button
                  onClick={stopWatching}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 text-xs transition-colors"
                >
                  หยุด
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ──────────────────────────────────────────────────────────────────── */}

      {/* Delete selected */}
      {selectMode && selectedIds.size > 0 && (
        <button onClick={handleDeleteSelected} className="w-full mb-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
          <Trash2 size={16} /> ลบที่เลือก ({selectedIds.size} รูป)
        </button>
      )}

      {/* Face detection hint */}
      {!faceLoading && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 mb-4 text-sm">
          <Scan size={16} className="text-primary flex-shrink-0" />
          <span className="text-white/70">ระบบจะตรวจจับใบหน้าอัตโนมัติขณะอัพโหลด</span>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="mb-4">
          <div className="bg-dark-surface rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-white/40 text-xs mt-1 text-center">
            อัพโหลดแล้ว {uploadProgress.done} / {uploadProgress.total} รูป
            {uploadProgress.total > 3 && ' (3 รูปพร้อมกัน)'}
          </p>
        </div>
      )}

      {/* Upload errors */}
      {uploadErrors.length > 0 && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">อัพโหลดไม่สำเร็จ {uploadErrors.length} รูป</span>
            <button
              onClick={() => { setUploadErrors([]); setFailedFiles([]); }}
              className="ml-auto text-white/30 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <ul className="space-y-0.5 mb-3">
            {uploadErrors.map((name, i) => (
              <li key={i} className="text-xs text-red-300/70 truncate">• {name}</li>
            ))}
          </ul>
          {/* Retry button — re-uploads only the failed files, no re-select needed */}
          <button
            onClick={() => handleUpload(failedFiles)}
            disabled={uploading}
            className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={14} />
            ลองใหม่ {uploadErrors.length} รูปนี้
          </button>
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-1">
        {photos.map(photo => (
          <div
            key={photo._id}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-lg"
            onClick={() => selectMode ? toggleSelect(photo._id) : window.open(photo.url, '_blank')}
          >
            <img
              src={photo.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {selectMode && (
              <div className={`absolute inset-0 flex items-center justify-center ${
                selectedIds.has(photo._id) ? 'bg-primary/40' : 'bg-black/20'
              }`}>
                {selectedIds.has(photo._id)
                  ? <CheckSquare size={24} className="text-white" />
                  : <Square size={24} className="text-white/50" />
                }
              </div>
            )}
            {photo.hasFaces && (
              <div className="absolute top-1 right-1 bg-primary/80 rounded-full p-0.5">
                <Scan size={10} className="text-white" />
              </div>
            )}
          </div>
        ))}
      </div>

      {photos.length === 0 && !uploading && (
        <div className="text-center text-white/30 py-16">
          <Upload size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีรูปใน Event นี้</p>
          <p className="text-sm mt-1">กดปุ่ม "อัพโหลดรูป" หรือ "ผูกโฟลเดอร์อัตโนมัติ" เพื่อเริ่มต้น</p>
        </div>
      )}

      {showQR && event && <QRModal eventId={event._id} onClose={() => setShowQR(false)} />}
    </div>
  );
}
