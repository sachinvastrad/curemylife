'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { appointmentsApi, reviewsApi } from '@/lib/api';
import { Calendar, Video, Clock, Star, X, Loader2 } from 'lucide-react';
import Link from 'next/link';

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="p-0.5"
        >
          <Star
            className="w-7 h-7 transition-colors"
            style={{ color: star <= (hovered || value) ? '#f59e0b' : 'var(--text-muted)' }}
            fill={star <= (hovered || value) ? '#f59e0b' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}

export default function PatientAppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'patient') loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    try {
      const { data } = await appointmentsApi.getPatientAppointments();
      setAppointments(data);
      // Check which completed appointments already have a review
      const completed = data.filter((a: any) => a.status === 'completed');
      const checked = await Promise.allSettled(
        completed.map((a: any) => reviewsApi.getMyReview(a.id))
      );
      const alreadyReviewed = new Set<string>();
      checked.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.data) {
          alreadyReviewed.add(completed[idx].id);
        }
      });
      setReviewedIds(alreadyReviewed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openReview = (appointment: any) => {
    setReviewTarget(appointment);
    setReviewRating(0);
    setReviewText('');
  };

  const submitReview = async () => {
    if (!reviewRating) return;
    setSubmittingReview(true);
    try {
      await reviewsApi.create(reviewTarget.id, { rating: reviewRating, reviewText: reviewText || undefined });
      setReviewedIds((prev) => new Set([...prev, reviewTarget.id]));
      setReviewTarget(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
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
      <div className="animate-in max-w-4xl">
        <h1 className="text-2xl font-bold mb-2">My Appointments</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>View and manage your consultation appointments</p>

        {appointments.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-medium mb-2">No appointments yet</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Book a consultation after receiving your case report
            </p>
            <Link href="/patient/cases" className="btn btn-primary">View Cases</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((a) => (
              <div key={a.id} className="card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">Dr. {a.doctor?.name}</h3>
                      <span className={`badge ${a.status === 'booked' ? 'badge-primary' : a.status === 'completed' ? 'badge-success' : 'badge-neutral'} capitalize`}>
                        {a.status}
                      </span>
                    </div>
                    <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {new Date(a.scheduledDate).toDateString()}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" /> {a.scheduledStart} - {a.scheduledEnd}
                      </p>
                      <p className="flex items-center gap-2">
                        <Video className="w-4 h-4" /> {a.appointmentType} Consultation
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[150px]">
                    {a.status === 'booked' && (
                      <a href={a.meetingLink || '#'} target="_blank" rel="noreferrer" className="btn btn-primary w-full text-center">
                        Join Meeting
                      </a>
                    )}
                    {a.status === 'completed' && (
                      <>
                        <Link href="/patient/prescriptions" className="btn btn-secondary w-full text-center">
                          View Prescription
                        </Link>
                        {reviewedIds.has(a.id) ? (
                          <p className="text-xs text-center flex items-center justify-center gap-1" style={{ color: '#f59e0b' }}>
                            <Star className="w-3 h-3 fill-current" /> Reviewed
                          </p>
                        ) : (
                          <button className="btn btn-ghost w-full" onClick={() => openReview(a)}>
                            <Star className="w-4 h-4" /> Leave Review
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="card w-full max-w-md" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Rate Your Consultation</h2>
              <button onClick={() => setReviewTarget(null)} className="btn btn-ghost btn-sm w-8 h-8 p-0 justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              How was your consultation with Dr. {reviewTarget.doctor?.name}?
            </p>

            <div className="flex justify-center mb-4">
              <StarRating value={reviewRating} onChange={setReviewRating} />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Share your experience (optional)
              </label>
              <textarea
                className="input w-full"
                rows={3}
                placeholder="Tell others about your experience..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
            </div>

            {!reviewRating && (
              <div className="mb-3 p-3 rounded-lg text-xs" style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--warning, #d97706)' }}>
                Tap a star above to rate your consultation before submitting.
              </div>
            )}
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setReviewTarget(null)}>Cancel</button>
              <button
                className="btn btn-primary flex-1"
                disabled={!reviewRating || submittingReview}
                onClick={submitReview}
              >
                {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
