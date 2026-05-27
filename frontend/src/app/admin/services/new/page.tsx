'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { servicesApi } from '@/lib/api';
import ServiceForm, { ServiceFormPayload } from '@/components/services/ServiceForm';

export default function NewServicePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/login');
  }, [authLoading, user, router]);

  const handleSubmit = async (data: ServiceFormPayload) => {
    setSubmitting(true);
    setError(null);
    try {
      await servicesApi.adminCreate(data);
      router.push('/admin/services');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not save the service');
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><div className="spinner" /></div>
      </DashboardLayout>
    );
  }

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

        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>New service</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          New services are created <strong>disabled</strong>. Enable them from the catalog list after content is complete.
        </p>

        {error && (
          <div className="card mb-4" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'var(--error)' }}>
            <div className="text-sm" style={{ color: 'var(--error)' }}>{error}</div>
          </div>
        )}

        <ServiceForm submitting={submitting} submitLabel="Create service" onSubmit={handleSubmit} />
      </div>
    </DashboardLayout>
  );
}
