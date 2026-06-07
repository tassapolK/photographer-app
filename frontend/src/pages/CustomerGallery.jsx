import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Camera, Download, CheckSquare, Square, X, Scan, Loader,
  Images, ChevronLeft, ChevronRight, Share2, AlertCircle,
} from 'lucide-react';
import api from '../utils/api';
import { useFaceApi } from '../hooks/useFaceApi';
import { downloadSingle, downloadMultiple, isIOS } from '../utils/download';

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
          <button onClick={() => downloadSingle(photo.url, photo.originalName || `photo_${current + 1}.jpg`)} className="p-2 text-white/70">
            <Download size={22} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative px-12">
        {current > 0 && (
          <button onClick={() => setCurrent(c => c - 1)} className="absolute left-2 p-2 bg-white/10 rounded-full">
            <ChevronLeft size={22} />
          </button>
        )}
        <img src={photo.url} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        {current < photos.length - 1 && (
          <button onClick={() => setCurrent(c => c + 1)} className="absolute right-2 p-2 bg-white/10 rounded-full">
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Face Scanner ─────────────────────────────────────────────────────────────
function FaceScanner({ eventSlug, onMatch, onClose }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();
  const [status, setStatus] = useState('starting'); // starting | ready | scanning | done | error
  const { loading: modelsLoading, detectSingleDescriptor } = useFaceApi();

  useEffect(() => {
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
  }, []);

  const handleScan = useCallback(async () => {
    if (modelsLoading) return;
    setStatus('scanning');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imgEl = new Image();
      imgEl.src = canvas.toDataURL('image/jpeg');
      await new Promise(r => { imgEl.onload = r; });

      const descriptor = await detectSingleDescriptor(imgEl);
      if (!descriptor) {
        setStatus('ready');
        alert('ไม่พบใบหน้า กรุณาลองใหม่อีกครั้ง');
        return;
      }

      const { matchedIds } = await api.post(`/photos/event/${eventSlug}/face-match`, { descriptor });
      streamRef.current?.getTracks().forEach(t => t.stop());
      setStatus('done');
      onMatch(matchedIds);
    } catch {
      setStatus('error');
    }
  }, [modelsLoading, eventSlug, detectSingleDescriptor]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 safe-top">
      <button onClick={onClose} className="absolute top-5 right-5 p-2"><X size={24} /></button>
      <h2 className="text-xl font-bold mb-2">สแกนใบหน้า</h2>
      <p className="text-white/50 text-sm mb-6 text-center">วางใบหน้าของคุณให้อยู่กลางกรอบ<br />แล้วกดปุ่มสแกน</p>

      <div className="relative w-72 h-72 rounded-2xl overflow-hidden bg-dark-card mb-6">
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
        <canvas ref={canvasRef} className="hidden" />
        {/* Face frame overlay */}
        <div className="absolute inset-4 border-2 border-primary rounded-full opacity-60 pointer-events-none" />
        {(status === 'starting' || modelsLoading) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <Loader size={32} className="animate-spin text-primary mb-2" />
            <p className="text-sm text-white/60">
              {modelsLoading ? 'กำลังโหลดโมเดล...' : 'กำลังเปิดกล้อง...'}
            </p>
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
      </div>

      <button
        onClick={handleScan}
        disabled={status !== 'ready' || modelsLoading}
        className="btn-primary px-10 py-3 flex items-center gap-3"
      >
        <Scan size={20} />
        สแกนใบหน้า
      </button>
    </div>
  );
}

// ─── Main Gallery ─────────────────────────────────────────────────────────────
export default function CustomerGallery() {
  const { slug } = useParams();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [matchedIds, setMatchedIds] = useState(null); // null = show all
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['public-event', slug],
    queryFn: () => api.get(`/events/public/${slug}`),
  });

  const { data: allPhotos = [], isLoading: photosLoading } = useQuery({
    queryKey: ['public-photos', slug],
    queryFn: () => api.get(`/photos/event/${slug}`),
    enabled: !!slug,
  });

  const displayPhotos = matchedIds
    ? allPhotos.filter(p => matchedIds.includes(p._id))
    : allPhotos;

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

  const handleDownload = async () => {
    const toDownload = selectMode && selectedIds.size > 0
      ? allPhotos.filter(p => selectedIds.has(p._id))
      : displayPhotos;

    if (!toDownload.length) return;

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

  const handleFaceMatch = (ids) => {
    setMatchedIds(ids);
    setShowFaceScanner(false);
    setSelectedIds(new Set());
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
          <img src={event.coverPhoto} alt="" className="w-full h-48 object-cover" />
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
              กำลังแสดงรูปของคุณ <strong>{matchedIds.length} รูป</strong>
            </span>
            <button
              onClick={() => { setMatchedIds(null); setSelectedIds(new Set()); }}
              className="text-white/50 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* iOS download tip */}
        {isIOS() && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 text-xs text-yellow-400">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>iOS: กดค้างที่รูปแล้วเลือก "เพิ่มในภาพ" เพื่อบันทึกลงคลัง หรือดาวน์โหลดทั้งหมดเป็น ZIP</span>
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
          {matchedIds !== null ? `รูปของคุณ ${displayPhotos.length} รูป` : `รูปทั้งหมด ${displayPhotos.length} รูป`}
        </p>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-0.5 px-0.5">
        {displayPhotos.map((photo, i) => (
          <div
            key={photo._id}
            className={`relative aspect-square cursor-pointer overflow-hidden ${
              selectMode && selectedIds.has(photo._id) ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => selectMode ? toggleSelect(photo._id) : setLightboxIndex(i)}
          >
            <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
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
        ))}
      </div>

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
    </div>
  );
}
