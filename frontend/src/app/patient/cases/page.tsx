'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import {
  FileText, PlusCircle, Sparkles, ClipboardList, Clock, CheckCircle2,
  CalendarCheck, ArrowRight, UserCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi, serviceRequestsApi } from '@/lib/api';
import { caseStatusLabel } from '@/lib/caseStatus';

type Tab = 'cases' | 'services';

const caseStatusColors: Record<string, string> = {
  draft: 'badge-neutral', submitted: 'badge-info', ai_processing: 'badge-warning',
  awaiting_doctor: 'badge-primary', report_ready: 'badge-success',
  consultation_booked: 'badge-info', consultation_done: 'badge-success', closed: 'badge-neutral',
};

export default function PatientCasesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('cases');
  const [cases, setCases] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [caseFilter, setCaseFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => { if (user?.role === 'patient') loadAll(); }, [user, caseFilter]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [casesRes, srsRes] = await Promise.allSettled([
        casesApi.getMyCases(caseFilter || undefined),
        serviceRequestsApi.getMine(),
      ]);
      if (casesRes.status === 'fulfilled') setCases(casesRes.value.data);
      if (srsRes.status === 'fulfilled') setServiceRequests(srsRes.value.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (authLoading) {
    return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="animate-in">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <h1 className="text-2xl font-bold">My Cases &amp; Services</h1>
          <div className="flex gap-2">
            {tab === 'cases' && (
              <Link href="/patient/new-case" className="btn btn-primary inline-flex">
                <PlusCircle className="w-4 h-4" /> New Case
              </Link>
            )}
            {tab === 'services' && (
              <Link href="/patient/services" className="btn btn-primary inline-flex">
                <Sparkles className="w-4 h-4" /> Browse Services
              </Link>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div
          className="inline-flex p-1 rounded-xl mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <TabButton active={tab === 'cases'}    onClick={() => setTab('cases')}    Icon={ClipboardList} label="Cases"           count={cases.length} />
          <TabButton active={tab === 'services'} onClick={() => setTab('services')} Icon={Sparkles}      label="Service Requests" count={serviceRequests.length} />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="spinner" /></div>
        ) : tab === 'cases' ? (
          <CasesTab
            cases={cases}
            filter={caseFilter}
            setFilter={setCaseFilter}
          />
        ) : (
          <ServiceRequestsTab requests={serviceRequests} />
        )}
      </div>
    </DashboardLayout>
  );
}

/* ===================== TAB SWITCHER ===================== */

function TabButton({
  active, onClick, Icon, label, count,
}: { active: boolean; onClick: () => void; Icon: any; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition"
      style={{
        background: active ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      <span
        className="text-xs px-1.5 py-0.5 rounded-full"
        style={{
          background: active ? 'rgba(255,255,255,0.22)' : 'var(--bg-surface)',
          color: active ? '#fff' : 'var(--text-muted)',
        }}
      >
        {count}
      </span>
    </button>
  );
}

/* ===================== CASES TAB ===================== */

function CasesTab({
  cases, filter, setFilter,
}: { cases: any[]; filter: string; setFilter: (s: string) => void }) {
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'draft', 'submitted', 'awaiting_doctor', 'report_ready', 'consultation_booked'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`badge cursor-pointer ${filter === s ? 'badge-primary' : 'badge-neutral'}`}
          >
            {s ? caseStatusLabel(s) : 'All'}
          </button>
        ))}
      </div>

      {cases.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="text-lg font-medium mb-2">No cases found</p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            {filter ? `No cases with status "${caseStatusLabel(filter)}"` : 'Create your first case to get started'}
          </p>
          <Link href="/patient/new-case" className="btn btn-primary inline-flex">
            <PlusCircle className="w-4 h-4" /> Create Case
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link href={`/patient/cases/${c.id}`} key={c.id} className="card block hover:border-primary-light">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold">{c.caseNumber}</span>
                    <span className={`badge ${caseStatusColors[c.status] || 'badge-neutral'} capitalize`}>
                      {caseStatusLabel(c.status)}
                    </span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {c.chiefComplaint?.substring(0, 150) || 'Draft — incomplete'}
                    {(c.chiefComplaint?.length || 0) > 150 ? '...' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.specialities?.map((s: any) => (
                      <span key={s.specialityId} className="badge badge-neutral text-xs">{s.speciality.name}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div>{new Date(c.createdAt).toLocaleDateString()}</div>
                  {c.assignedDoctor && (
                    <div className="mt-1" style={{ color: 'var(--primary-light)' }}>
                      Dr. {c.assignedDoctor.name}
                    </div>
                  )}
                  <div className="mt-1">{c.documents?.length || 0} doc(s)</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

/* ===================== SERVICE REQUESTS TAB ===================== */

function ServiceRequestsTab({ requests }: { requests: any[] }) {
  if (requests.length === 0) {
    return (
      <div className="card text-center py-16">
        <Sparkles className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <p className="text-lg font-medium mb-2">No service requests yet</p>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Browse our service catalog and choose one that suits you.
        </p>
        <Link href="/patient/services" className="btn btn-primary inline-flex">
          <Sparkles className="w-4 h-4" /> Browse Services
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((sr) => <ServiceRequestCard key={sr.id} sr={sr} />)}
    </div>
  );
}

interface StatusMeta {
  badgeClass: string;
  label: string;
  Icon: any;
  iconColor: string;
  description: string;
}

function statusMeta(sr: any): StatusMeta {
  switch (sr.status) {
    case 'submitted':
      return {
        badgeClass: 'badge-info', label: 'In doctor queue', Icon: Clock,
        iconColor: 'var(--info)',
        description: 'Waiting for a matching doctor to accept your request.',
      };
    case 'accepted':
      return {
        badgeClass: 'badge-primary', label: 'Doctor accepted', Icon: UserCheck,
        iconColor: 'var(--primary-light)',
        description: sr.assignedDoctor
          ? `Dr. ${sr.assignedDoctor.name} is ready — pick a time slot to confirm.`
          : 'A doctor has accepted — pick a time slot to confirm.',
      };
    case 'booked':
      return {
        badgeClass: 'badge-info', label: 'Slot booked', Icon: CalendarCheck,
        iconColor: 'var(--info)',
        description: 'Your consultation is scheduled.',
      };
    case 'completed':
      return {
        badgeClass: 'badge-success', label: 'Completed', Icon: CheckCircle2,
        iconColor: 'var(--success)',
        description: 'This consultation has been completed.',
      };
    case 'cancelled':
      return {
        badgeClass: 'badge-neutral', label: 'Cancelled', Icon: Clock,
        iconColor: 'var(--text-muted)',
        description: 'This request was cancelled.',
      };
    default:
      return {
        badgeClass: 'badge-neutral', label: sr.status, Icon: Clock,
        iconColor: 'var(--text-muted)',
        description: '',
      };
  }
}

function ServiceRequestCard({ sr }: { sr: any }) {
  const meta = statusMeta(sr);
  const ServiceIcon = (sr.service?.iconName && (Icons as any)[sr.service.iconName]) || Icons.Sparkles;
  const nextAppt = sr.appointments?.[0];

  const ctaHref = sr.status === 'accepted' || (sr.status === 'submitted' && !sr.assignedDoctor)
    ? `/patient/services/${sr.service.slug}/book?sr=${sr.id}`
    : sr.status === 'booked' || sr.status === 'completed'
      ? '/patient/appointments'
      : `/patient/services/${sr.service.slug}`;

  const ctaLabel = sr.status === 'accepted'
    ? 'Book a slot'
    : sr.status === 'submitted'
      ? 'View / book a slot'
      : sr.status === 'booked' || sr.status === 'completed'
        ? 'View appointment'
        : 'View service';

  return (
    <div className="card">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
        >
          <ServiceIcon className="w-5 h-5 text-white" />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {sr.service?.name}
            </span>
            <span className={`badge ${meta.badgeClass} inline-flex items-center gap-1 text-xs`}>
              <meta.Icon className="w-3 h-3" /> {meta.label}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{meta.description}</p>

          {/* Doctor + appointment chip row */}
          <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {sr.assignedDoctor && (
              <span className="inline-flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" style={{ color: 'var(--primary-light)' }} />
                Dr. {sr.assignedDoctor.name}
              </span>
            )}
            {nextAppt && (
              <span className="inline-flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5" />
                {new Date(nextAppt.scheduledDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                {nextAppt.scheduledStart ? ` at ${nextAppt.scheduledStart}` : ''}
              </span>
            )}
            <span>
              Submitted {sr.submittedAt
                ? new Date(sr.submittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                : new Date(sr.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={ctaHref}
          className={`btn ${sr.status === 'accepted' ? 'btn-primary' : 'btn-secondary'} btn-sm inline-flex shrink-0`}
        >
          {ctaLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
