'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { servicesApi, serviceRequestsApi } from '@/lib/api';
import IntakeFormRenderer from '@/components/services/IntakeFormRenderer';
import type { ServiceDetail, IntakePayload } from '@/lib/services-types';

export default function ServiceIntakePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'patient' || !slug) return;
    servicesApi.getBySlug(slug)
      .then(({ data }) => setService(data))
      .catch(() => router.push('/patient/services'))
      .finally(() => setLoading(false));
  }, [user, slug, router]);

  const handleSubmit = async (payload: IntakePayload) => {
    if (!service) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: sr } = await serviceRequestsApi.create({
        serviceId: service.id,
        intakePayload: payload,
      });
      // Hand off to doctor booking — booking page reads serviceRequestId from query
      router.push(`/patient/services/${service.slug}/book?sr=${sr.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not submit intake. Please try again.');
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><div className="spinner" /></div>
      </DashboardLayout>
    );
  }

  if (!service) return null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/patient/services/${service.slug}`}
          className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to {service.name}
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Tell us a bit about you
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            These details help your doctor prepare for the {service.name} consultation.
          </p>
        </header>

        {error && (
          <div className="card mb-4" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'var(--error)' }}>
            <div className="text-sm" style={{ color: 'var(--error)' }}>{error}</div>
          </div>
        )}

        <div className="card">
          <IntakeFormRenderer
            fields={service.intakeFields}
            submitting={submitting}
            submitLabel="Continue to booking"
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
