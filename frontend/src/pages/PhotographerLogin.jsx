import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mail, Lock, User } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export default function PhotographerLogin() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-2xl mb-4">
            <Camera size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold">PhotoPro</h1>
          <p className="text-white/50 text-sm mt-1">ระบบจัดการรูปภาพสำหรับช่างภาพ</p>
        </div>

        {/* Tab */}
        <div className="flex bg-dark-card rounded-xl p-1 mb-6">
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? 'bg-primary text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {m === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input className="input pl-10" placeholder="ชื่อช่างภาพ" value={form.name} onChange={set('name')} required />
            </div>
          )}
          <div className="relative">
            <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input className="input pl-10" type="email" placeholder="อีเมล" value={form.email} onChange={set('email')} required />
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input className="input pl-10" type="password" placeholder="รหัสผ่าน" value={form.password} onChange={set('password')} required minLength={6} />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>
      </div>
    </div>
  );
}
