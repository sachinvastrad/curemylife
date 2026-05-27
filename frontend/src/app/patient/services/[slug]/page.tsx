'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { servicesApi } from '@/lib/api';
import type { ServiceDetail } from '@/lib/services-types';

export default function ServiceLandingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'patient' || !slug) return;
    servicesApi.getBySlug(slug)
      .then(({ data }) => setService(data))
      .catch((e) => {
        if (e?.response?.status === 404) setNotFound(true);
        else console.error(e);
      })
      .finally(() => setLoading(false));
  }, [user, slug]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><div className="spinner" /></div>
      </DashboardLayout>
    );
  }

  if (notFound || !service) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto card text-center py-16">
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            This service is no longer available
          </h2>
          <p style={{ color: 'var(--text-secondary)' }} className="mb-6">
            It may have been disabled or removed. Browse the catalog for current offerings.
          </p>
          <Link href="/patient/services" className="btn btn-primary inline-flex">
            <ArrowLeft className="w-4 h-4" /> Back to Services
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const Icon = (service.iconName && (Icons as any)[service.iconName]) || Icons.Stethoscope;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Link
          href="/patient/services"
          className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" /> All services
        </Link>

        {/* Hero */}
        <div className="card mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
            >
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {service.name}
              </h1>
              {service.tagline && (
                <p style={{ color: 'var(--text-secondary)' }}>{service.tagline}</p>
              )}
            </div>
          </div>

          {service.description && (
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {service.description}
            </p>
          )}

          <div className="mt-6">
            <Link
              href={`/patient/services/${service.slug}/intake`}
              className="btn btn-primary btn-lg inline-flex"
            >
              Opt for this service <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* How it works */}
        {Array.isArray(service.howItWorks) && service.howItWorks.length > 0 && (
          <section className="card mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              How it works
            </h2>
            <ol className="space-y-4">
              {service.howItWorks.map((s) => (
                <li key={s.step} className="flex gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ background: 'rgba(14,124,107,0.15)', color: 'var(--primary-light)' }}
                  >
                    {s.step}
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</div>
                    {s.body && (
                      <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {s.body}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Inclusions */}
        {Array.isArray(service.inclusions) && service.inclusions.length > 0 && (
          <section className="card mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              What&rsquo;s included
            </h2>
            <ul className="space-y-2">
              {service.inclusions.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--primary-light)' }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
