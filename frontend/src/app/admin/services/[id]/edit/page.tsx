'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { servicesApi } from '@/lib/api';
import ServiceForm, { ServiceFormPayload } from '@/components/services/ServiceForm';
import type { ServiceDetail } from '@/lib/services-types';

export default function EditServicePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin' || !id) return;
    servicesApi.adminGet(id)
      .then(({ data }) => setService(data))
      .catch(() => router.push('/admin/services'))
      .finally(() => setLoading(false));
  }, [user, id, router]);

  const handleSubmit = async (data: ServiceFormPayload) => {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    try {
      await servicesApi.adminUpdate(id, data);
      router.push('/admin/services');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not save changes');
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
      <div className="max-w-3xl mx-auto">
        <Link
          href="/admin/services"
          className="inline-flex items-center gap-1 text-sm mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to services
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Edit: {service.name}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Status: <strong>{service.isEnabled ? 'Enabled' : 'Disabled'}</strong> · /patient/services/<code>{service.slug}</code>
        </p>

        {error && (
          <div className="card mb-4" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'var(--error)' }}>
            <div className="text-sm" style={{ color: 'var(--error)' }}>{error}</div>
          </div>
        )}

        <ServiceForm
          initial={service}
          submitting={submitting}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
        />
      </div>
    </DashboardLayout>
  );
}
