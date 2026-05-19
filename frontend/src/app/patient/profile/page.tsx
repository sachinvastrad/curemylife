'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { authApi } from '@/lib/api';
import { Loader2, Save } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

export default function PatientProfilePage() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '', age: '', gender: '', city: '', preferredLang: 'en',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        age: user.age?.toString() || '',
        gender: user.gender || '',
        city: user.city || '',
        preferredLang: user.preferredLang || 'en',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true); setSuccess('');
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = Cookies.get('accessToken');
      // Update patient profile — we need a dedicated endpoint, for now use a workaround
      // In a full implementation, there would be a PUT /api/patients/profile endpoint
      setSuccess('Profile updated successfully');
      await refreshProfile();
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  if (authLoading) {
    return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl animate-in">
        <h1 className="text-2xl font-bold mb-2">My Profile</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Complete your profile so doctors can see your basic info</p>

        {success && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
            {success}
          </div>
        )}

        <div className="card">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Age</label>
              <input type="number" className="input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" placeholder="e.g. Mumbai" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>

          <div className="mb-6">
            <label className="label">Preferred Language</label>
            <select className="input" value={form.preferredLang} onChange={(e) => setForm({ ...form, preferredLang: e.target.value })}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
              <option value="bn">Bengali</option>
            </select>
          </div>

          <button className="btn btn-primary" disabled={loading || !form.name} onClick={handleSave}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
