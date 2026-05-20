'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Stethoscope, Mail, Lock, User, Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { authApi, specialitiesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  const initialRole = searchParams.get('role') || 'patient';
  const initialTab = searchParams.get('tab') || 'login';

  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>(initialRole as any);
  const [tab, setTab] = useState<'login' | 'signup' | 'otp'>(initialTab as any);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Patient OTP
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Doctor
  const [doctorForm, setDoctorForm] = useState({
    email: '', password: '', name: '', phone: '', cchRegistrationNo: '', qualifications: '',
  });

  // Admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Doctor registration: speciality picker
  const [specialities, setSpecialities] = useState<{ id: number; name: string }[]>([]);
  const [selectedSpecialityIds, setSelectedSpecialityIds] = useState<number[]>([]);

  // Load specialities once when register tab opens (doctor role + signup tab)
  useEffect(() => {
    if (role === 'doctor' && tab === 'signup' && specialities.length === 0) {
      specialitiesApi.listPublic()
        .then(({ data }) => setSpecialities(data))
        .catch(() => { /* leave empty; UI will show a hint */ });
    }
  }, [role, tab]);

  const handlePatientOtpRequest = async () => {
    setLoading(true); setError('');
    try {
      await authApi.patientRequestOtp({ email: otpEmail });
      setOtpSent(true);
      setSuccess('OTP sent to your email. Check console for dev OTP.');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handlePatientOtpVerify = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await authApi.patientVerifyOtp({ email: otpEmail, otp });
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      router.push(data.isNewUser ? '/patient/profile' : '/patient/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleDoctorLogin = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await authApi.doctorLogin({ email: doctorForm.email, password: doctorForm.password });
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      router.push('/doctor/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleDoctorRegister = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await authApi.doctorRegister({ ...doctorForm, specialityIds: selectedSpecialityIds });
      setSuccess(data.message);
      setTab('login');
      setSelectedSpecialityIds([]);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const toggleSpeciality = (id: number) => {
    setSelectedSpecialityIds(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  };

  const handleAdminLogin = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await authApi.adminLogin({ email: adminEmail, password: adminPassword });
      if (data.requireMfa) {
        setError('MFA required (not implemented in dev)');
        return;
      }
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      router.push('/admin/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-dark)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}>
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">
            Homeo<span style={{ color: 'var(--primary-light)' }}>Opinion</span>
          </span>
        </Link>

        {/* Role Tabs */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--bg-card)' }}>
          {(['patient', 'doctor', 'admin'] as const).map((r) => (
            <button key={r} onClick={() => { setRole(r); setError(''); setSuccess(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize"
              style={{
                background: role === r ? 'var(--primary)' : 'transparent',
                color: role === r ? 'white' : 'var(--text-muted)',
              }}>
              {r}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="card animate-in">
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
              {success}
            </div>
          )}

          {/* PATIENT */}
          {role === 'patient' && (
            <div>
              <h2 className="text-xl font-semibold mb-1">Patient Login</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Enter your email to receive a one-time password
              </p>
              <div className="mb-4">
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input type="email" className="input pl-10" placeholder="you@example.com"
                    value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} />
                </div>
              </div>
              {otpSent && (
                <div className="mb-4">
                  <label className="label">Enter OTP</label>
                  <input type="text" className="input text-center text-lg tracking-widest" placeholder="• • • • • •"
                    maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
                </div>
              )}
              <button className="btn btn-primary w-full" disabled={loading}
                onClick={otpSent ? handlePatientOtpVerify : handlePatientOtpRequest}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {otpSent ? 'Verify OTP & Login' : 'Send OTP'}
              </button>
              {otpSent && (
                <button className="btn btn-ghost w-full mt-2" onClick={() => { setOtpSent(false); setOtp(''); }}>
                  <ArrowLeft className="w-4 h-4" /> Change email
                </button>
              )}
            </div>
          )}

          {/* DOCTOR */}
          {role === 'doctor' && (
            <div>
              <div className="flex gap-4 mb-6">
                <button className={`text-sm font-medium pb-1 ${tab === 'login' ? '' : 'opacity-50'}`}
                  style={{ borderBottom: tab === 'login' ? '2px solid var(--primary)' : 'none' }}
                  onClick={() => setTab('login')}>Login</button>
                <button className={`text-sm font-medium pb-1 ${tab === 'signup' ? '' : 'opacity-50'}`}
                  style={{ borderBottom: tab === 'signup' ? '2px solid var(--primary)' : 'none' }}
                  onClick={() => setTab('signup')}>Register</button>
              </div>

              {tab === 'login' ? (
                <>
                  <div className="mb-4">
                    <label className="label">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <input type="email" className="input pl-10" placeholder="doctor@example.com"
                        value={doctorForm.email} onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="label">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <input type="password" className="input pl-10" placeholder="••••••••"
                        value={doctorForm.password} onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })} />
                    </div>
                  </div>
                  <button className="btn btn-primary w-full" disabled={loading} onClick={handleDoctorLogin}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Login
                  </button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="label">Full Name</label>
                      <input type="text" className="input" placeholder="Dr. Name"
                        value={doctorForm.name} onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input type="tel" className="input" placeholder="+91..."
                        value={doctorForm.phone} onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="label">Email</label>
                    <input type="email" className="input" placeholder="doctor@example.com"
                      value={doctorForm.email} onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="label">Password (min 8 characters)</label>
                    <input type="password" className="input" placeholder="••••••••"
                      value={doctorForm.password} onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="label">CCH Registration Number</label>
                    <input type="text" className="input" placeholder="CCH-XX-12345"
                      value={doctorForm.cchRegistrationNo}
                      onChange={(e) => setDoctorForm({ ...doctorForm, cchRegistrationNo: e.target.value })} />
                  </div>
                  <div className="mb-4">
                    <label className="label">Qualifications</label>
                    <input type="text" className="input" placeholder="BHMS, MD(Hom.)"
                      value={doctorForm.qualifications}
                      onChange={(e) => setDoctorForm({ ...doctorForm, qualifications: e.target.value })} />
                  </div>

                  {/* Speciality tags — required, at least one */}
                  <div className="mb-4">
                    <label className="label">Specialities * <span style={{ color: 'var(--text-muted)' }} className="font-normal text-xs">(tap to select one or more)</span></label>
                    {specialities.length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading specialities…</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {specialities.map(s => (
                          <button type="button" key={s.id}
                            onClick={() => toggleSpeciality(s.id)}
                            className={`badge cursor-pointer transition-all ${selectedSpecialityIds.includes(s.id) ? 'badge-primary' : 'badge-neutral'}`}>
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {(() => {
                    const missing: string[] = [];
                    if (!doctorForm.name) missing.push('Full Name');
                    if (!doctorForm.email) missing.push('Email');
                    if (!doctorForm.password || doctorForm.password.length < 8) missing.push('Password (min 8 chars)');
                    if (!doctorForm.cchRegistrationNo) missing.push('CCH Registration Number');
                    if (selectedSpecialityIds.length === 0) missing.push('at least one Speciality');
                    return missing.length > 0 ? (
                      <div className="mb-3 p-3 rounded-lg text-xs" style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--warning, #d97706)' }}>
                        To register, please fill: {missing.join(', ')}.
                      </div>
                    ) : null;
                  })()}

                  <button className="btn btn-primary w-full"
                    disabled={loading || !doctorForm.name || !doctorForm.email || !doctorForm.password || doctorForm.password.length < 8 || !doctorForm.cchRegistrationNo || selectedSpecialityIds.length === 0}
                    onClick={handleDoctorRegister}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Register & Await Verification
                  </button>
                </>
              )}
            </div>
          )}

          {/* ADMIN */}
          {role === 'admin' && (
            <div>
              <h2 className="text-xl font-semibold mb-1">Admin Login</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Platform administration access</p>
              <div className="mb-4">
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input type="email" className="input pl-10" placeholder="admin@homeopinion.com"
                    value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                </div>
              </div>
              <div className="mb-4">
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input type="password" className="input pl-10" placeholder="••••••••"
                    value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary w-full" disabled={loading} onClick={handleAdminLogin}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Login
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
