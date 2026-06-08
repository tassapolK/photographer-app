import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  Camera, Download, CheckSquare, Square, X, Scan, Loader,
  Images, ChevronLeft, ChevronRight, Share2, AlertCircle,
} from 'lucide-react';
import api from '../utils/api';
import { useFaceApi } from '../hooks/useFaceApi';
import { downloadSingle, downloadMultiple, isIOS, isAndroid } from '../utils/download';

// ─── Cloudinary URL helper ────────────────────────────────────────────────────
function cdnUrl(url, transform) {
  if (!url?.includes('res.cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/${transform}/`);
}
const T_GRID = 'c_fill,w_300,h_300,q_55,f_webp'; // grid thumbnail – ~5-15 KB

// ─── Progressive image for Lightbox ──────────────────────────────────────────
function ProgressiveImage({ thumbSrc, fullSrc, className }) {
  const [fullLoaded, setFullLoaded] = useState(false);
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <img
        src={thumbSrc}
        aria-hidden="true"
        className={`absolute max-w-full max-h-full object-contain rounded-lg
          blur-md scale-105 transition-opacity duration-500
          ${fullLoaded ? 'opacity-0' : 'opacity-80'}`}
      />
      <img
        src={fullSrc}
        alt=""
        onLoad={() => setFullLoaded(true)}
        className={`relative max-w-full max-h-full object-contain rounded-lg
          transition-opacity duration-500
          ${fullLoaded ? 'opacity-100' : 'opacity-0'} ${className ?? ''}`}
      />
      {!fullLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader size={28} className="animate-spin text-white/30" />
        </div>
      )}
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ photos, index, onClose, onSelect, selected }) {
  const [current, setCurrent] = useState(index);
  const photo = photos[current];

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft' && current > 0) setCurrent(c => c - 1);
      if (e.key === 'ArrowRight' && current < photos.length - 1) setCurrent(c => c + 1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, photos.length]);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col safe-top safe-bottom">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="p-2"><X size={22} /></button>
        <span className="text-white/50 text-sm">{current + 1} / {photos.length}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(photo._id)}
            className={`p-2 ${selected.has(photo._id) ? 'text-primary' : 'text-white/50'}`}
          >
            {selected.has(photo._id) ? <CheckSquare size={22} /> : <Square size={22} />}
          </button>
          <button
            onClick={() => downloadSingle(photo.url, photo.originalName || `photo_${current + 1}.jpg`)}
            className="p-2 text-white/70"
          >
            <Download size={22} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative px-12 overflow-hidden">
        {current > 0 && (
          <button onClick={() => setCurrent(c => c - 1)} className="absolute left-2 z-10 p-2 bg-white/10 rounded-full">
            <ChevronLeft size={22} />
          </button>
        )}
        <ProgressiveImage
          key={photo._id}
          thumbSrc={cdnUrl(photo.url, T_GRID)}
          fullSrc={photo.url}
        />
        {current < photos.length - 1 && (
          <button onClick={() => setCurrent(c => c + 1)} className="absolute right-2 z-10 p-2 bg-white/10 rounded-full">
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Face Scanner ─────────────────────────────────────────────────────────────
function FaceScanner({ eventSlug, onMatch, onClose }) {
  const [mode, setMode] = useState('camera');
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();
  const fileInputRef = useRef();
  const [status, setStatus] = useState('starting');
  const [uploadedImg, setUploadedImg] = useState(null);
  const { loading: modelsLoading, detectSingleDescriptor } = useFaceApi();

  useEffect(() => {
    if (mode !== 'camera') {
      streamRef.current?.getTracks().forEach(t => t.stop());
      return;
    }
    setStatus('starting');
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    })();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, [mode]);

  const switchMode = (m) => {
    setMode(m);
    setStatus(m === 'camera' ? 'starting' : 'ready');
    setUploadedImg(null);
  };

  const handleCameraScan = useCallback(async () => {
    if (modelsLoading || status !== 'ready') return;
    setStatus('scanning');
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const imgEl = new Image();
      imgEl.src = canvas.toDataURL('image/jpeg');
      await new Promise(r => { imgEl.onload = r; });
      const descriptor = await detectSingleDescriptor(imgEl);
      if (!descriptor) { setStatus('no_face'); return; }
      const { matchedIds } = await api.post(`/photos/event/${eventSlug}/face-match`, { descriptor });
      streamRef.current?.getTracks().forEach(t => t.stop());
      onMatch(matchedIds);
    } catch { setStatus('error'); }
  }, [modelsLoading, status, eventSlug, detectSingleDescriptor]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imgEl = new Image();
      imgEl.onload = () => setUploadedImg({ src: ev.target.result, el: imgEl });
      imgEl.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    setStatus('ready');
  };

  const handleUploadScan = useCallback(async () => {
    if (!uploadedImg || modelsLoading) return;
    setStatus('scanning');
    try {
      const descriptor = await detectSingleDescriptor(uploadedImg.el);
      if (!descriptor) { setStatus('no_face'); return; }
      const { matchedIds } = await api.post(`/photos/event/${eventSlug}/face-match`, { descriptor });
      onMatch(matchedIds);
    } catch { setStatus('error'); }
  }, [uploadedImg, modelsLoading, eventSlug, detectSingleDescriptor]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col safe-top">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="text-lg font-bold">ค้นหารูปตัวเอง</h2>
        <button onClick={onClose} className="p-1"><X size={24} /></button>
      </div>

      <div className="flex mx-4 mb-5 bg-white/10 rounded-xl p-1 gap-1">
        <button
          onClick={() => switchMode('camera')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'camera' ? 'bg-primary text-white' : 'text-white/50'
          }`}
        >
          <Camera size={16} /> ใช้กล้อง
        </button>
        <button
          onClick={() => switchMode('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'upload' ? 'bg-primary text-white' : 'text-white/50'
          }`}
        >
          <Images size={16} /> อัพโหลดรูป
        </button>
      </div>

      {mode === 'camera' && (
        <div className="flex flex-col items-center px-4">
          <p className="text-white/50 text-sm mb-4 text-center">วางใบหน้าให้อยู่กลางกรอบ แล้วกดสแกน</p>
          <div className="relative w-72 h-72 rounded-2xl overflow-hidden bg-dark-card mb-6">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-4 border-2 border-primary rounded-full opacity-60 pointer-events-none" />
            {(status === 'starting' || modelsLoading) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <Loader size={32} className="animate-spin text-primary mb-2" />
                <p className="text-sm text-white/60">{modelsLoading ? 'กำลังโหลดโมเดล...' : 'กำลังเปิดกล้อง...'}</p>
              </div>
            )}
            {status === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader size={40} className="animate-spin text-primary" />
              </div>
            )}
            {status === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                <AlertCircle size={32} className="text-red-400 mb-2" />
                <p className="text-sm text-red-400">ไม่สามารถเข้าถึงกล้องได้</p>
              </div>
            )}
            {status === 'no_face' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                <AlertCircle size={32} className="text-yellow-400 mb-2" />
                <p className="text-sm text-yellow-400 text-center px-4">ไม่พบใบหน้า<br />กรุณาลองใหม่</p>
              </div>
            )}
          </div>
          <button
            onClick={status === 'no_face' ? () => setStatus('ready') : handleCameraScan}
            disabled={(status !== 'ready' && status !== 'no_face') || modelsLoading}
            className="btn-primary px-10 py-3 flex items-center gap-3"
          >
            <Scan size={20} />
            {status === 'no_face' ? 'ลองใหม่' : 'สแกนใบหน้า'}
          </button>
        </div>
      )}

      {mode === 'upload' && (
        <div className="flex flex-col items-center px-4">
          <p className="text-white/50 text-sm mb-4 text-center">
            เลือกรูปที่มีใบหน้าชัดเจน<br />ระบบจะค้นหารูปที่มีคุณโดยอัตโนมัติ
          </p>
          <div
            className="relative w-72 h-72 rounded-2xl overflow-hidden bg-white/5 border-2 border-dashed border-white/20 mb-6 flex items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current.click()}
          >
            {uploadedImg ? (
              <>
                <img src={uploadedImg.src} alt="uploaded" className="w-full h-full object-cover" />
                {status === 'scanning' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                    <Loader size={40} className="animate-spin text-primary mb-2" />
                    <p className="text-sm text-white/70">กำลังค้นหาใบหน้า...</p>
                  </div>
                )}
                {status === 'no_face' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                    <AlertCircle size={32} className="text-yellow-400 mb-2" />
                    <p className="text-sm text-yellow-400 text-center px-4">ไม่พบใบหน้าในรูปนี้<br />กรุณาเลือกรูปอื่น</p>
                  </div>
                )}
                {status === 'ready' && (
                  <div className="absolute bottom-2 right-2 bg-black/60 rounded-full px-2 py-1 text-xs text-white/60">
                    กดเพื่อเปลี่ยนรูป
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/40">
                <Images size={48} />
                <p className="text-sm text-center">กดเพื่อเลือกรูปจากแกลลอรี</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button
            onClick={status === 'no_face' ? () => fileInputRef.current.click() : handleUploadScan}
            disabled={!uploadedImg || status === 'scanning' || modelsLoading}
            className="btn-primary px-10 py-3 flex items-center gap-3 disabled:opacity-40"
          >
            {modelsLoading ? (
              <><Loader size={20} className="animate-spin" /> กำลังโหลดโมเดล...</>
            ) : status === 'scanning' ? (
              <><Loader size={20} className="animate-spin" /> กำลังค้นหา...</>
            ) : status === 'no_face' ? (
              <><Images size={20} /> เลือกรูปใหม่</>
            ) : (
              <><Scan size={20} /> ค้นหารูปของฉัน</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Multi Save Panel ─────────────────────────────────────────────────────────
function MultiSavePanel({ photos, onClose }) {
  const ios = isIOS();
  const [saved, setSaved] = useState(new Set());

  const handleTap = async (photo) => {
    if (ios) return;
    await downloadSingle(photo.url, photo.originalName || 'photo.jpg');
    setSaved(prev => new Set([...prev, photo._id]));
  };

  const instruction = ios
    ? { icon: '👆', text: 'กดค้างที่รูป', sub: 'แล้วเลือก "เพิ่มในภาพ"' }
    : { icon: '⬇️', text: 'กดที่รูปเพื่อดาวน์โหลด', sub: 'รูปจะบันทึกลงแกลลอรีอัตโนมัติ' };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col safe-top safe-bottom">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onClose} className="p-1"><X size={22} /></button>
        <div className="flex-1">
          <p className="font-semibold text-sm">บันทึกรูปลงคลัง ({photos.length} รูป)</p>
          <p className="text-white/40 text-xs">
            {ios ? 'กดค้างที่รูป → "เพิ่มในภาพ"' : `บันทึกแล้ว ${saved.size}/${photos.length} รูป`}
          </p>
        </div>
      </div>
      <div className="mx-3 mt-3 flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-xl px-3 py-2.5">
        <span className="text-2xl">{instruction.icon}</span>
        <p className="text-sm text-white/80">
          <strong className="text-white">{instruction.text}</strong><br />
          <span className="text-white/50 text-xs">{instruction.sub}</span>
        </p>
      </div>
      <div className="flex-1 overflow-y-auto py-3 px-3">
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo, i) => (
            <div key={photo._id} className="relative cursor-pointer active:opacity-70" onClick={() => handleTap(photo)}>
              <img
                src={photo.url}
                alt={`รูปที่ ${i + 1}`}
                className="w-full aspect-square object-cover rounded-xl"
                loading="lazy"
                decoding="async"
              />
              {saved.has(photo._id) && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <div className="bg-green-500 rounded-full p-2">
                    <CheckSquare size={20} className="text-white" />
                  </div>
                </div>
              )}
              {!saved.has(photo._id) && (
                <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-white/30 text-xs mt-4 pb-2">
          {ios
            ? `บันทึกครบ ${photos.length} รูปแล้วปิดหน้านี้ได้เลย`
            : saved.size === photos.length
              ? '✅ บันทึกครบแล้ว ปิดหน้านี้ได้เลย'
              : `กดทีละรูปจนครบ ${photos.length} รูป`
          }
        </p>
      </div>
    </div>
  );
}

// ─── Main Gallery ─────────────────────────────────────────────────────────────
export default function CustomerGallery() {
  const { slug } = useParams();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [matchedIds, setMatchedIds] = useState(null);      // null = show all; array = face-match active
  const [matchedPhotos, setMatchedPhotos] = useState([]);  // photo objects for face-match results
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [iosSavePhotos, setIosSavePhotos] = useState(null);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['public-event', slug],
    queryFn: () => api.get(`/events/public/${slug}`),
  });

  // ── Paginated photo loading (30 per page) ──────────────────────────────────
  const {
    data: photosData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: photosLoading,
  } = useInfiniteQuery({
    queryKey: ['public-photos', slug],
    queryFn: ({ pageParam }) => api.get(`/photos/event/${slug}?page=${pageParam}&limit=30`),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!slug,
  });

  // All photos loaded so far (accumulated from all pages)
  const allPhotos = useMemo(
    () => photosData?.pages.flatMap(p => p.photos) ?? [],
    [photosData]
  );

  // Total count from server (first page carries the full total)
  const totalCount = photosData?.pages[0]?.total ?? allPhotos.length;

  // When face match is active, show matched photos; otherwise show paginated
  const displayPhotos = matchedIds !== null ? matchedPhotos : allPhotos;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayPhotos.map(p => p._id)));
    }
  };

  // ── Face match: fetch actual photo objects by ID (across all pages) ────────
  const handleFaceMatch = useCallback(async (ids) => {
    setShowFaceScanner(false);
    setSelectedIds(new Set());
    setMatchedIds(ids);        // set early so banner shows immediately

    if (!ids || ids.length === 0) {
      setMatchedPhotos([]);
      return;
    }

    try {
      // Fetch the matched photos directly from backend — bypasses pagination
      const result = await api.get(`/photos/event/${slug}?ids=${ids.join(',')}`);
      setMatchedPhotos(result.photos ?? []);
    } catch {
      // Fallback: filter from already-loaded photos
      setMatchedPhotos(allPhotos.filter(p => ids.includes(p._id)));
    }
  }, [slug, allPhotos]);

  const handleDownload = async () => {
    const toDownload = selectMode && selectedIds.size > 0
      ? displayPhotos.filter(p => selectedIds.has(p._id))
      : displayPhotos;

    if (!toDownload.length) return;

    if ((isIOS() || isAndroid()) && toDownload.length > 1) {
      setIosSavePhotos(toDownload);
      return;
    }

    setDownloading(true);
    try {
      if (toDownload.length === 1) {
        await downloadSingle(toDownload[0].url, toDownload[0].originalName || 'photo.jpg');
      } else {
        await downloadMultiple(toDownload, event?.title || 'photos');
      }
    } finally {
      setDownloading(false);
    }
  };

  const isLoading = eventLoading || photosLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle size={48} className="text-red-400 mb-3" />
        <h2 className="text-xl font-bold">ไม่พบ Event</h2>
        <p className="text-white/40 mt-2">ลิงก์นี้อาจหมดอายุหรือไม่ถูกต้อง</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto pb-24">
      {/* Hero Header */}
      <div className="relative">
        {event.coverPhoto ? (
          <img src={cdnUrl(event.coverPhoto, 'c_fill,w_800,h_400,q_70,f_auto')} alt="" className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-48 bg-dark-surface flex items-center justify-center">
            <Images size={48} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h1 className="text-xl font-bold">{event.title}</h1>
          <p className="text-white/50 text-sm">
            {new Date(event.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}โดย {event.photographer?.name}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 space-y-3">
        {/* Face filter banner */}
        {matchedIds !== null && (
          <div className="flex items-center gap-3 bg-primary/15 border border-primary/30 rounded-xl px-4 py-3">
            <Scan size={18} className="text-primary flex-shrink-0" />
            <span className="text-sm flex-1">
              กำลังแสดงรูปของคุณ <strong>{matchedPhotos.length} รูป</strong>
            </span>
            <button
              onClick={() => { setMatchedIds(null); setMatchedPhotos([]); setSelectedIds(new Set()); }}
              className="text-white/50 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Mobile tip when multi-selecting */}
        {(isIOS() || isAndroid()) && selectMode && selectedIds.size > 1 && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-xl px-3 py-2 text-xs text-white/70">
            <span className="text-base">{isIOS() ? '👆' : '⬇️'}</span>
            <span>
              {isIOS()
                ? 'กดปุ่มดาวน์โหลด → ระบบจะเปิดหน้าให้กดค้างบันทึกทีละรูป'
                : 'กดปุ่มดาวน์โหลด → ระบบจะเปิดหน้าให้กดบันทึกทีละรูปลงแกลลอรี'}
            </span>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFaceScanner(true)}
            className="btn-secondary flex items-center gap-2 text-sm py-2.5"
          >
            <Scan size={16} className="text-primary" />
            ค้นหารูปตัวเอง
          </button>

          <div className="flex-1" />

          {selectMode ? (
            <>
              <button onClick={toggleSelectAll} className="btn-secondary text-sm py-2 px-3">
                {selectedIds.size === displayPhotos.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
              <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }} className="p-2 text-white/50">
                <X size={20} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="btn-secondary flex items-center gap-2 text-sm py-2.5"
            >
              <CheckSquare size={16} /> เลือก
            </button>
          )}
        </div>

        <p className="text-white/40 text-xs">
          {matchedIds !== null
            ? `รูปของคุณ ${matchedPhotos.length} รูป`
            : `แสดง ${allPhotos.length} / ${totalCount} รูป`}
        </p>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-0.5 px-0.5">
        {displayPhotos.map((photo, i) => {
          const thumbSrc = cdnUrl(photo.url, T_GRID) || photo.thumbnailUrl;
          return (
            <div
              key={photo._id}
              className={`relative aspect-square cursor-pointer overflow-hidden bg-dark-surface ${
                selectMode && selectedIds.has(photo._id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => selectMode ? toggleSelect(photo._id) : setLightboxIndex(i)}
            >
              <img
                src={thumbSrc}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              {selectMode && (
                <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
                  selectedIds.has(photo._id) ? 'bg-primary/30' : 'bg-transparent'
                }`}>
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                    selectedIds.has(photo._id) ? 'bg-primary border-primary' : 'border-white/60 bg-black/40'
                  }`}>
                    {selectedIds.has(photo._id) && <CheckSquare size={14} className="text-white" />}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load More button (hidden during face match) */}
      {hasNextPage && matchedIds === null && (
        <div className="px-4 pt-5 pb-2">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
          >
            {isFetchingNextPage ? (
              <><Loader size={16} className="animate-spin" /> กำลังโหลด...</>
            ) : (
              `โหลดรูปเพิ่มเติม (${totalCount - allPhotos.length} รูปที่เหลือ)`
            )}
          </button>
        </div>
      )}

      {displayPhotos.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <Images size={48} className="mx-auto mb-3 opacity-30" />
          <p>{matchedIds !== null ? 'ไม่พบรูปของคุณใน Event นี้' : 'ยังไม่มีรูปใน Event นี้'}</p>
        </div>
      )}

      {/* Fixed Download Button */}
      {displayPhotos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-dark to-transparent safe-bottom">
          <button
            onClick={handleDownload}
            disabled={downloading || (selectMode && selectedIds.size === 0)}
            className="btn-primary w-full max-w-2xl mx-auto flex items-center justify-center gap-2 py-3.5"
          >
            {downloading ? (
              <><Loader size={20} className="animate-spin" /> กำลังดาวน์โหลด...</>
            ) : (
              <>
                <Download size={20} />
                {selectMode && selectedIds.size > 0
                  ? `ดาวน์โหลด ${selectedIds.size} รูปที่เลือก`
                  : `ดาวน์โหลดทั้งหมด ${displayPhotos.length} รูป`
                }
              </>
            )}
          </button>
        </div>
      )}

      {/* Modals */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={displayPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onSelect={toggleSelect}
          selected={selectedIds}
        />
      )}
      {showFaceScanner && (
        <FaceScanner
          eventSlug={slug}
          onMatch={handleFaceMatch}
          onClose={() => setShowFaceScanner(false)}
        />
      )}
      {iosSavePhotos && (
        <MultiSavePanel
          photos={iosSavePhotos}
          onClose={() => { setIosSavePhotos(null); setSelectMode(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}
