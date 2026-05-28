'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi, specialitiesApi } from '@/lib/api';
import { Loader2, Upload, X, Info } from 'lucide-react';

export default function NewCasePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [specialities, setSpecialities] = useState<any[]>([]);

  // Step 1: Chief Complaint
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [durationValue, setDurationValue] = useState<number | ''>('');
  const [durationUnit, setDurationUnit] = useState('months');
  const [previousTreatments, setPreviousTreatments] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [pastIllnesses, setPastIllnesses] = useState('');
  const [selectedSpecialities, setSelectedSpecialities] = useState<number[]>([]);

  // Step 2: Documents
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    loadSpecialities();
  }, []);

  const loadSpecialities = async () => {
    try {
      const { data } = await specialitiesApi.listPublic();
      setSpecialities(data);
    } catch {
      // Fallback specialities
      setSpecialities([
        { id: 1, name: 'General / Constitutional' },
        { id: 2, name: 'Skin & Dermatology' },
        { id: 3, name: 'Paediatrics' },
        { id: 4, name: 'Mental Health / Psychiatry' },
        { id: 5, name: "Women's Health / Gynaecology" },
        { id: 6, name: 'Respiratory' },
        { id: 7, name: 'Gastroenterology' },
        { id: 8, name: 'Musculoskeletal / Rheumatology' },
        { id: 9, name: 'Autoimmune Disorders' },
        { id: 10, name: 'Oncology Support' },
      ]);
    }
  };

  const handleCreateCase = async () => {
    // Case already created (user went Back then forward) — don't duplicate.
    if (caseId) { setStep(2); return; }
    setLoading(true); setError('');
    try {
      const { data } = await casesApi.create({
        chiefComplaint,
        durationValue: durationValue || undefined,
        durationUnit,
        previousTreatments: previousTreatments || undefined,
        familyHistory: familyHistory || undefined,
        pastIllnesses: pastIllnesses || undefined,
        specialityIds: selectedSpecialities,
      });
      setCaseId(data.id);
      setStep(2); // Go to document upload
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create case');
    } finally { setLoading(false); }
  };

  const handleUpload = async () => {
    if (!caseId || files.length === 0) return;
    setUploading(true);
    try {
      const { data } = await casesApi.uploadDocuments(caseId, files);
      setUploadedDocs([...uploadedDocs, ...data]);
      setFiles([]);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      await casesApi.submit(caseId);
      router.push(`/patient/cases/${caseId}?submitted=true`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto animate-in">
        <h1 className="text-2xl font-bold mb-2">Create New Case</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Fill in your symptoms and medical history for a thorough homoeopathic case analysis
        </p>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {['Chief Complaint', 'Documents'].map((s, i) => (
            <div key={i} className="flex-1">
              <div className="h-1.5 rounded-full" style={{
                background: i + 1 <= step ? 'var(--primary)' : 'var(--bg-surface)',
                transition: 'background 0.3s'
              }} />
              <div className="text-xs mt-1" style={{
                color: i + 1 <= step ? 'var(--primary-light)' : 'var(--text-muted)'
              }}>{s}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}>
            {error}
          </div>
        )}

        {/* STEP 1: Chief Complaint */}
        {step === 1 && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">Chief Complaint & History</h2>

            <div className="mb-4">
              <label className="label">Describe your current problem *</label>
              <textarea className="input" rows={4}
                placeholder="What is your main health concern? When did it start? How has it progressed?"
                value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
              <p className="text-xs mt-1" style={{ color: chiefComplaint.length >= 50 ? 'var(--success)' : 'var(--text-muted)' }}>
                {chiefComplaint.length}/50 characters {chiefComplaint.length >= 50 ? '✓' : 'minimum'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Duration</label>
                <input type="number" className="input" placeholder="e.g. 6"
                  value={durationValue} onChange={(e) => setDurationValue(parseInt(e.target.value) || '')} />
              </div>
              <div>
                <label className="label">Unit</label>
                <select className="input" value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)}>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Previous treatments (allopathic / homoeopathic / ayurvedic)</label>
              <textarea className="input" rows={2} placeholder="Any medications or treatments tried and their effects"
                value={previousTreatments} onChange={(e) => setPreviousTreatments(e.target.value)} />
            </div>

            <div className="mb-4">
              <label className="label">Family medical history</label>
              <textarea className="input" rows={2} placeholder="Any hereditary conditions in the family"
                value={familyHistory} onChange={(e) => setFamilyHistory(e.target.value)} />
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Info className="w-3 h-3" /> Relevant for miasmatic assessment
              </p>
            </div>

            <div className="mb-6">
              <label className="label">Past significant illnesses, surgeries, vaccinations</label>
              <textarea className="input" rows={2} placeholder="Major health events in your past"
                value={pastIllnesses} onChange={(e) => setPastIllnesses(e.target.value)} />
            </div>

            <div className="mb-6">
              <label className="label">Speciality Tags * (select at least one)</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {specialities.map((s) => (
                  <button key={s.id}
                    className={`badge cursor-pointer transition-all ${selectedSpecialities.includes(s.id) ? 'badge-primary' : 'badge-neutral'}`}
                    onClick={() => setSelectedSpecialities(
                      selectedSpecialities.includes(s.id)
                        ? selectedSpecialities.filter(id => id !== s.id)
                        : [...selectedSpecialities, s.id]
                    )}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const missing: string[] = [];
              if (chiefComplaint.length < 50) missing.push(`describe your problem in at least 50 characters (currently ${chiefComplaint.length})`);
              if (selectedSpecialities.length === 0) missing.push('tap at least one Speciality Tag above');
              return missing.length > 0 ? (
                <div className="mb-3 p-3 rounded-lg text-xs flex items-start gap-2"
                  style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--warning, #d97706)' }}>
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>To continue, please: {missing.join(' and ')}.</span>
                </div>
              ) : null;
            })()}

            <div className="flex justify-end">
              <button className="btn btn-primary"
                disabled={chiefComplaint.length < 50 || selectedSpecialities.length === 0 || loading}
                onClick={handleCreateCase}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save & Continue to Documents
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Documents */}
        {step === 2 && (
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">Upload Documents</h2>
              <span className="badge badge-info text-xs">Optional — you can skip this</span>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Upload lab reports, imaging, previous medical records. PDF, JPEG, PNG — max 25 MB each.
              Documents improve the analysis but are not required to submit.
            </p>

            {/* Upload Area */}
            <label className="block p-8 rounded-xl border-2 border-dashed text-center cursor-pointer mb-4 transition-colors"
              style={{ borderColor: 'var(--border)' }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--border)';
                const droppedFiles = Array.from(e.dataTransfer.files);
                setFiles([...files, ...droppedFiles]);
              }}>
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Drag & drop files here or click to browse
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PDF, JPEG, PNG — Max 25 MB per file</p>
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={(e) => { if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]); }} />
            </label>

            {/* Pending files */}
            {files.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Files to upload:</p>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded mb-1" style={{ background: 'var(--bg-dark)' }}>
                    <span className="text-sm truncate">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm mt-2" disabled={uploading} onClick={handleUpload}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload {files.length} file(s)
                </button>
              </div>
            )}

            {/* Uploaded docs */}
            {uploadedDocs.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--success)' }}>
                  ✓ {uploadedDocs.length} document(s) uploaded
                </p>
                {uploadedDocs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded mb-1" style={{ background: 'var(--bg-dark)' }}>
                    <span className="text-sm">{d.fileName}</span>
                    <span className="badge badge-success text-xs">Uploaded</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary btn-lg" disabled={loading}
                onClick={handleSubmit}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploadedDocs.length === 0 ? 'Skip & Submit Case for Analysis' : 'Submit Case for Analysis'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
