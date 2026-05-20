'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi, appointmentsApi, doctorsApi } from '@/lib/api';
import { caseStatusLabel } from '@/lib/caseStatus';
import { Loader2, FileText, Calendar, Clock, ArrowLeft, X, Video, Phone, Building2 } from 'lucide-react';
import Link from 'next/link';

const APPOINTMENT_TYPES = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'audio', label: 'Audio', icon: Phone },
  { value: 'in_clinic', label: 'In Clinic', icon: Building2 },
];

export default function PatientCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [bookDate, setBookDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [apptType, setApptType] = useState('video');
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'patient') loadCase();
  }, [user, params.id]);

  useEffect(() => {
    if (showBooking && caseData?.assignedDoctorId) fetchSlots();
  }, [showBooking, bookDate, caseData?.assignedDoctorId]);

  const loadCase = async () => {
    try {
      const { data } = await casesApi.getMyCases();
      const found = data.find((c: any) => c.id === params.id);
      if (found) setCaseData(found);
      else router.push('/patient/cases');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const { data } = await doctorsApi.getPublicSlots(caseData.assignedDoctorId, bookDate);
      setSlots(data || []);
    } catch (e) {
      console.error(e);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBookConsultation = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    try {
      await appointmentsApi.create({
        caseId: caseData.id,
        doctorId: caseData.assignedDoctorId,
        appointmentType: apptType,
        scheduledDate: bookDate,
        scheduledStart: selectedSlot.start,
        scheduledEnd: selectedSlot.end,
      });
      setShowBooking(false);
      await loadCase();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Booking failed. Please try another slot.');
    } finally {
      setBooking(false);
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

  if (!caseData) return null;

  const doctorReport = caseData.doctorReports?.[0];
  const canBook = ['report_ready'].includes(caseData.status) && caseData.assignedDoctorId;

  return (
    <DashboardLayout>
      <div className="max-w-4xl animate-in">
        <Link href="/patient/cases" className="btn btn-ghost btn-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Case {caseData.caseNumber}</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Submitted on {new Date(caseData.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className="badge badge-primary capitalize text-sm px-3 py-1">
            {caseStatusLabel(caseData.status)}
          </span>
        </div>

        {/* Case Details */}
        <div className="card mb-6">
          <h2 className="font-semibold text-lg mb-4">Chief Complaint</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{caseData.chiefComplaint}</p>
          {(caseData.durationValue || caseData.previousTreatments) && (
            <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              {caseData.durationValue && (
                <div>
                  <h3 className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Duration</h3>
                  <p className="text-sm">{caseData.durationValue} {caseData.durationUnit}</p>
                </div>
              )}
              {caseData.previousTreatments && (
                <div>
                  <h3 className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Previous Treatments</h3>
                  <p className="text-sm">{caseData.previousTreatments}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Doctor's Report */}
        {caseData.status === 'report_ready' || doctorReport ? (
          <div className="card mb-6 border-l-4" style={{ borderColor: 'var(--primary)', background: 'var(--bg-dark)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Doctor's Second Opinion Report</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Reviewed by Dr. {caseData.assignedDoctor?.name} •{' '}
                  {new Date(doctorReport?.createdAt || caseData.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {doctorReport?.additionalObservations && (
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Clinical Observations:</strong>
                  <p className="mt-1">{doctorReport.additionalObservations}</p>
                </div>
              )}
              {doctorReport?.recommendedRemedies?.length > 0 && (
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Suggested Remedies:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {doctorReport.recommendedRemedies.map((r: any, idx: number) => (
                      <li key={idx}>
                        <span className="font-medium text-white">{r.remedy}</span>
                        {r.potency && ` — ${r.potency}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {doctorReport?.lifestyleModifications && (
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Lifestyle & Diet:</strong>
                  <p className="mt-1">{doctorReport.lifestyleModifications}</p>
                </div>
              )}
            </div>

            {canBook && (
              <div className="mt-6 pt-4 border-t flex flex-col md:flex-row items-center gap-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  For a detailed discussion and official prescription, please book a consultation.
                </div>
                <button className="btn btn-primary w-full md:w-auto" onClick={() => setShowBooking(true)}>
                  <Calendar className="w-4 h-4" /> Book Consultation
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card mb-6 text-center py-10" style={{ background: 'var(--bg-dark)' }}>
            <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--warning)' }} />
            <h3 className="font-medium text-lg mb-1">Under Review</h3>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              Your case is being reviewed by our homoeopathic experts. You will be notified once the second opinion report is ready.
            </p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Book Consultation</h2>
              <button onClick={() => setShowBooking(false)} className="btn btn-ghost btn-sm w-8 h-8 p-0 justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Date */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Select Date</label>
              <input
                type="date"
                className="input w-full"
                value={bookDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setBookDate(e.target.value)}
              />
            </div>

            {/* Appointment Type */}
            <div className="mb-6">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Consultation Type</label>
              <div className="grid grid-cols-3 gap-2">
                {APPOINTMENT_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setApptType(value)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border text-sm font-medium transition-colors"
                    style={{
                      borderColor: apptType === value ? 'var(--primary)' : 'var(--border)',
                      background: apptType === value ? 'rgba(37,99,235,0.1)' : 'transparent',
                      color: apptType === value ? 'var(--primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slots */}
            <div className="mb-6">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Available Slots</label>
              {slotsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  No available slots for this date. Try another day.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSlot(slot)}
                      className="p-2 rounded-lg border text-sm font-medium transition-colors"
                      style={{
                        borderColor: selectedSlot === slot ? 'var(--primary)' : 'var(--border)',
                        background: selectedSlot === slot ? 'rgba(37,99,235,0.1)' : 'transparent',
                        color: selectedSlot === slot ? 'var(--primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!selectedSlot && (
              <div className="mb-3 p-3 rounded-lg text-xs" style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--warning, #d97706)' }}>
                Select an available time slot above to confirm your booking.
              </div>
            )}
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setShowBooking(false)}>Cancel</button>
              <button
                className="btn btn-primary flex-1"
                disabled={!selectedSlot || booking}
                onClick={handleBookConsultation}
              >
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
