import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Camera, Calendar, Images, LogOut, Trash2, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../store/auth';

function CreateEventModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', date: '' });
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/events', form);
      qc.invalidateQueries(['events']);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">สร้าง Event ใหม่</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <input className="input" placeholder="ชื่องาน เช่น งานแต่งงาน คุณA × คุณB" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <input className="input" placeholder="รายละเอียด (ไม่บังคับ)" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <input className="input" type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'กำลังสร้าง...' : 'สร้าง Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { photographer, logout } = useAuthStore();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries(['events']),
  });

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('ลบ Event นี้? รูปทั้งหมดจะถูกลบด้วย')) deleteMutation.mutate(id);
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between py-5 safe-top">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Camera size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-bold">PhotoPro</h1>
            <p className="text-white/40 text-xs">สวัสดี, {photographer?.name}</p>
          </div>
        </div>
        <button onClick={logout} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
          <LogOut size={20} className="text-white/50" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-white/40 text-xs mb-1">Events ทั้งหมด</p>
          <p className="text-2xl font-bold text-primary">{events.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-white/40 text-xs mb-1">รูปทั้งหมด</p>
          <p className="text-2xl font-bold text-primary">
            {events.reduce((s, e) => s + (e.photoCount || 0), 0)}
          </p>
        </div>
      </div>

      {/* Events */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white/80">Events</h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
          <Plus size={16} /> สร้าง Event
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-white/30 py-16">กำลังโหลด...</div>
      ) : events.length === 0 ? (
        <div className="text-center text-white/30 py-16">
          <Camera size={48} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มี Event</p>
          <p className="text-sm mt-1">กดปุ่ม "สร้าง Event" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div
              key={event._id}
              className="card p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99]"
              onClick={() => navigate(`/dashboard/events/${event._id}`)}
            >
              {event.coverPhoto ? (
                <img src={event.coverPhoto} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-dark-surface flex items-center justify-center flex-shrink-0">
                  <Images size={24} className="text-white/20" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{event.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-white/40 text-xs flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(event.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-white/40 text-xs">{event.photoCount || 0} รูป</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleDelete(e, event._id)}
                  className="p-2 hover:text-red-400 text-white/20 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <ChevronRight size={18} className="text-white/20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
