'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Video, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { servicesApi, doctorsApi, appointmentsApi, serviceRequestsApi } from '@/lib/api';
import type { ServiceDetail } from '@/lib/services-types';

interface Doctor {
  id: string;
  name: string;
  qualifications?: string;
  initialFee?: string | number;
  photoUrl?: string | null;
}
interface Slot { start: string; end: string }

export default function ServiceBookingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const slug = params?.slug;
  const serviceRequestId = search?.get('sr');

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [assignedDoctor, setAssignedDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [apptType, setApptType] = useState<'video' | 'audio' | 'in_clinic'>('video');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !slug || !serviceRequestId) {
      if (user && !serviceRequestId) router.push(`/patient/services/${slug}`);
      return;
    }
    (async () => {
      try {
        // Fetch service + the service-request in parallel so we can check
        // whether a doctor has already accepted (in which case the patient
        // must book with THAT doctor, not pick freely from the full list).
        const [svcRes, srRes] = await Promise.all([
          servicesApi.getBySlug(slug),
          serviceRequestsApi.getById(serviceRequestId),
        ]);
        const svc = svcRes.data;
        const sr = srRes.data;
        setService(svc);

        if (sr.assignedDoctor) {
          // Doctor has claimed this request → restrict to that doctor.
          setAssignedDoctor(sr.assignedDoctor);
          setSelectedDoctor(sr.assignedDoctor);
          setDoctors([sr.assignedDoctor]);
        } else {
          const primarySpeciality = svc.specialities?.[0]?.id;
          const { data: docs } = await doctorsApi.getPublicList(primarySpeciality);
          setDoctors(docs);
        }
      } catch (e) {
        console.error(e);
        router.push(`/patient/services/${slug}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, slug, serviceRequestId, router]);

  useEffect(() => {
    if (!selectedDoctor) { setSlots([]); return; }
    doctorsApi.getPublicSlots(selectedDoctor.id, date)
      .then(({ data }) => setSlots(data ?? []))
      .catch(() => setSlots([]));
    setSelectedSlot(null);
  }, [selectedDoctor, date]);

  const handleBook = async () => {
    if (!selectedDoctor || !selectedSlot || !serviceRequestId) return;
    setBooking(true);
    setError(null);
    try {
      await appointmentsApi.create({
        serviceRequestId,
        doctorId: selectedDoctor.id,
        appointmentType: apptType,
        scheduledDate: date,
        scheduledStart: selectedSlot.start,
        scheduledEnd: selectedSlot.end,
      });
      setBooked(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Booking failed. Try another slot.');
    } finally {
      setBooking(false);
    }
  };

  const bookDisabledReason = useMemo(() => {
    if (!selectedDoctor) return 'Choose a doctor first';
    if (!selectedSlot) return 'Pick a time slot';
    return undefined;
  }, [selectedDoctor, selectedSlot]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><div className="spinner" /></div>
      </DashboardLayout>
    );
  }

  if (!service) return null;

  if (booked) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto card text-center py-12">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--success)' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            You&rsquo;re booked!
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Your {service.name} consultation with {selectedDoctor?.name} is confirmed for {date} at {selectedSlot?.start}.
          </p>
          <Link href="/patient/appointments" className="btn btn-primary inline-flex">
            View my appointments
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/patient/services/${service.slug}`}
          className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to {service.name}
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Book your {service.name} consultation
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          {assignedDoctor
            ? `Dr. ${assignedDoctor.name} accepted your request — pick a time that works.`
            : 'Choose a doctor and a time that works for you.'}
        </p>

        {error && (
          <div className="card mb-4" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'var(--error)' }}>
            <div className="text-sm" style={{ color: 'var(--error)' }}>{error}</div>
          </div>
        )}

        {assignedDoctor && (
          <div
            className="card mb-4 flex items-start gap-3"
            style={{ background: 'rgba(14,124,107,0.1)', borderColor: 'var(--primary)' }}
          >
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--primary-light)' }} />
            <div className="text-sm">
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Dr. {assignedDoctor.name} accepted your request
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                {assignedDoctor.qualifications}
                {assignedDoctor.qualifications ? ' · ' : ''}
                Pick a time below to confirm.
              </div>
            </div>
          </div>
        )}

        {/* Doctor list */}
        <section className="card mb-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {assignedDoctor ? 'Your doctor' : 'Select a doctor'}
          </h2>
          {doctors.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)' }}>
              <p>No doctors are currently available for this service.</p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Your request is in the queue — a matching doctor will accept it shortly.
                You&rsquo;ll be able to book a slot once that happens.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {doctors.map((d) => {
                const on = selectedDoctor?.id === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDoctor(d)}
                    className="text-left p-3 rounded-lg transition"
                    style={{
                      border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                      background: on ? 'rgba(14,124,107,0.08)' : 'transparent',
                    }}
                  >
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.name}</div>
                    {d.qualifications && (
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {d.qualifications}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Slot picker */}
        {selectedDoctor && (
          <section className="card mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Pick a date and time
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </div>

            {slots.length === 0 ? (
              <div
                className="p-3 rounded-lg"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  No slots open on {new Date(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}.
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Dr. {selectedDoctor?.name} hasn&rsquo;t opened any booking times for this day of the week.
                  Try another date, or pick a different doctor.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => {
                  const on = selectedSlot?.start === s.start;
                  return (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className="px-3 py-1.5 rounded-md text-sm"
                      style={{
                        border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                        background: on ? 'rgba(14,124,107,0.12)' : 'transparent',
                        color: on ? 'var(--primary-light)' : 'var(--text-primary)',
                      }}
                    >
                      {s.start}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mode */}
            <div className="mt-6">
              <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Mode
              </div>
              <div className="flex gap-2">
                {([
                  { v: 'video' as const, label: 'Video', Icon: Video },
                  { v: 'audio' as const, label: 'Audio', Icon: Phone },
                  { v: 'in_clinic' as const, label: 'In Clinic', Icon: MapPin },
                ]).map(({ v, label, Icon }) => {
                  const on = apptType === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setApptType(v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm"
                      style={{
                        border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                        background: on ? 'rgba(14,124,107,0.12)' : 'transparent',
                        color: on ? 'var(--primary-light)' : 'var(--text-primary)',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <button
          type="button"
          disabled={!!bookDisabledReason || booking}
          title={bookDisabledReason}
          onClick={handleBook}
          className="btn btn-primary btn-lg"
        >
          {booking ? 'Booking…' : 'Confirm booking'}
        </button>
        {bookDisabledReason && (
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {bookDisabledReason}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
