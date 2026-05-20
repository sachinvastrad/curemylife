'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { doctorsApi, specialitiesApi } from '@/lib/api';
import { User, Save, Loader2, Star, Plus, X } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'availability'>('profile');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    prescribingApproach: '',
    experienceYears: '',
    languages: '',
    clinicAddress: '',
    initialFee: '',
    followupFee: '',
  });
  const [allSpecialities, setAllSpecialities] = useState<{ id: number; name: string }[]>([]);
  const [selectedSpecialityIds, setSelectedSpecialityIds] = useState<number[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login?role=doctor');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'doctor') loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const [profileRes, availRes, specRes] = await Promise.all([
        doctorsApi.getProfile(),
        doctorsApi.getAvailability(),
        specialitiesApi.listPublic(),
      ]);
      setProfile(profileRes.data);
      setAvailability(availRes.data);
      setAllSpecialities(specRes.data);
      const p = profileRes.data;
      setForm({
        name: p.name || '',
        phone: p.phone || '',
        prescribingApproach: p.prescribingApproach || '',
        experienceYears: p.experienceYears?.toString() || '',
        languages: (p.languages || []).join(', '),
        clinicAddress: p.clinicAddress || '',
        initialFee: p.initialFee?.toString() || '',
        followupFee: p.followupFee?.toString() || '',
      });
      setSelectedSpecialityIds((p.specialities || []).map((s: any) => s.specialityId ?? s.speciality?.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeciality = (id: number) => {
    setSelectedSpecialityIds(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await doctorsApi.updateProfile({
        name: form.name,
        phone: form.phone,
        prescribingApproach: form.prescribingApproach,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
        languages: form.languages.split(',').map((l) => l.trim()).filter(Boolean),
        clinicAddress: form.clinicAddress,
        initialFee: form.initialFee ? parseFloat(form.initialFee) : undefined,
        followupFee: form.followupFee ? parseFloat(form.followupFee) : undefined,
        specialityIds: selectedSpecialityIds,
      });
      await loadProfile();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const addAvailabilitySlot = () => {
    setAvailability([...availability, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMin: 30, bufferMin: 10 }]);
  };

  const removeSlot = (idx: number) => {
    setAvailability(availability.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, field: string, value: any) => {
    setAvailability(availability.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      await doctorsApi.setAvailability(availability);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-in max-w-3xl">
        <h1 className="text-2xl font-bold mb-2">Doctor Profile</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Manage your profile, specialities, availability and fees
        </p>

        {/* Profile header */}
        <div className="card mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
            style={{ background: 'var(--bg-surface)' }}>
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-lg">{profile?.name}</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{profile?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: profile?.status === 'approved' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                  color: profile?.status === 'approved' ? '#22c55e' : '#ca8a04' }}>
                {profile?.status}
              </span>
              {profile?.avgRating > 0 && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--warning)' }}>
                  <Star className="w-3 h-3 fill-current" /> {Number(profile.avgRating).toFixed(1)} ({profile.totalReviews} reviews)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['profile', 'availability'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="pb-3 px-1 text-sm font-medium capitalize transition-colors"
              style={{
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
              }}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Full Name', field: 'name' as const },
                { label: 'Phone', field: 'phone' as const },
                { label: 'Years of Experience', field: 'experienceYears' as const },
                { label: 'Initial Consultation Fee (₹)', field: 'initialFee' as const },
                { label: 'Follow-up Fee (₹)', field: 'followupFee' as const },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input
                    className="input w-full"
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Prescribing Approach</label>
                <select className="input w-full" value={form.prescribingApproach}
                  onChange={(e) => setForm({ ...form, prescribingApproach: e.target.value })}>
                  <option value="">Select approach</option>
                  {['classical', 'pluralist', 'complex', 'organ-specific'].map((a) => (
                    <option key={a} value={a} className="capitalize">{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Languages (comma-separated)
              </label>
              <input className="input w-full" value={form.languages}
                onChange={(e) => setForm({ ...form, languages: e.target.value })}
                placeholder="e.g. English, Hindi, Kannada" />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Specialities (tap to select / unselect)
              </label>
              {allSpecialities.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {allSpecialities.map(s => (
                    <button type="button" key={s.id}
                      onClick={() => toggleSpeciality(s.id)}
                      className={`badge cursor-pointer transition-all ${selectedSpecialityIds.includes(s.id) ? 'badge-primary' : 'badge-neutral'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              {selectedSpecialityIds.length === 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--warning, #d97706)' }}>
                  Select at least one speciality so cases can be routed to you.
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Clinic Address</label>
              <textarea className="input w-full" rows={3} value={form.clinicAddress}
                onChange={(e) => setForm({ ...form, clinicAddress: e.target.value })} />
            </div>

            <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
              <h3 className="text-sm font-medium mb-2">Qualifications & Registration</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{profile?.qualifications || '-'}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                CCH Reg. No: {profile?.cchRegistrationNo}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                To update qualifications or CCH registration, contact admin.
              </p>
            </div>

            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Weekly Availability</h2>
              <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={addAvailabilitySlot}>
                <Plus className="w-4 h-4" /> Add Slot
              </button>
            </div>

            {availability.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                No availability slots set. Add your first slot.
              </p>
            ) : (
              <div className="space-y-3 mb-6">
                {availability.map((slot, idx) => (
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center p-3 rounded-lg"
                    style={{ background: 'var(--bg-surface)' }}>
                    <select className="input text-sm" value={slot.dayOfWeek}
                      onChange={(e) => updateSlot(idx, 'dayOfWeek', parseInt(e.target.value))}>
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                    <input type="time" className="input text-sm" value={slot.startTime}
                      onChange={(e) => updateSlot(idx, 'startTime', e.target.value)} />
                    <input type="time" className="input text-sm" value={slot.endTime}
                      onChange={(e) => updateSlot(idx, 'endTime', e.target.value)} />
                    <input type="number" className="input text-sm" placeholder="Slot (min)"
                      value={slot.slotDurationMin}
                      onChange={(e) => updateSlot(idx, 'slotDurationMin', parseInt(e.target.value))} />
                    <button onClick={() => removeSlot(idx)} className="btn btn-ghost btn-sm w-8 h-8 p-0 justify-center">
                      <X className="w-4 h-4" style={{ color: 'var(--error, #ef4444)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-primary" onClick={saveAvailability} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Availability
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
