'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { servicesApi } from '@/lib/api';
import type { ServiceCard } from '@/lib/services-types';

export default function PatientServicesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<ServiceCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role === 'patient') {
      servicesApi.listEnabled()
        .then(({ data }) => setServices(data))
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><div className="spinner" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="badge badge-primary mb-3 inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Services
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            What can we help you with today?
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Browse our offerings and choose a service to get started.
          </p>
        </header>

        {services.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s) => <ServiceCardItem key={s.id} service={s} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ServiceCardItem({ service }: { service: ServiceCard }) {
  const Icon = (service.iconName && (Icons as any)[service.iconName]) || Icons.Stethoscope;

  return (
    <Link
      href={`/patient/services/${service.slug}`}
      className="card group flex flex-col h-full"
      style={{ textDecoration: 'none' }}
    >
      {service.cardImageUrl ? (
        <div
          className="w-full h-32 rounded-lg mb-4 bg-center bg-cover"
          style={{ backgroundImage: `url(${service.cardImageUrl})` }}
        />
      ) : (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {service.name}
      </h3>
      {service.tagline && (
        <p className="text-sm mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>
          {service.tagline}
        </p>
      )}
      <span
        className="inline-flex items-center gap-1 text-sm font-medium mt-auto"
        style={{ color: 'var(--primary-light)' }}
      >
        Learn more <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card text-center py-16">
      <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        No services available right now
      </h3>
      <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
        We&rsquo;re curating our catalog. In the meantime you can still start a new case for a homoeopathic second opinion.
      </p>
      <Link href="/patient/new-case" className="btn btn-primary mt-6 inline-flex">
        Start a new case
      </Link>
    </div>
  );
}
