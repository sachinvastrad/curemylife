'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Power, PowerOff, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { servicesApi } from '@/lib/api';
import type { ServiceDetail } from '@/lib/services-types';

export default function AdminServicesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<ServiceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/login');
  }, [authLoading, user, router]);

  const load = () =>
    servicesApi.adminList()
      .then(({ data }) => setServices(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));

  useEffect(() => { if (user?.role === 'admin') load(); }, [user]);

  const toggle = async (s: ServiceDetail) => {
    setActionId(s.id);
    setError(null);
    try {
      await servicesApi.adminToggle(s.id, !s.isEnabled);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Toggle failed');
    } finally {
      setActionId(null);
    }
  };

  const remove = async (s: ServiceDetail) => {
    if (!confirm(`Delete "${s.name}"? This soft-deletes the service; historical bookings remain.`)) return;
    setActionId(s.id);
    try {
      await servicesApi.adminDelete(s.id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Delete failed');
    } finally {
      setActionId(null);
    }
  };

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
        <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Service Catalog</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Create, enable, and edit patient-facing services without a deploy.
            </p>
          </div>
          <Link href="/admin/services/new" className="btn btn-primary inline-flex">
            <Plus className="w-4 h-4" /> New service
          </Link>
        </header>

        {error && (
          <div className="card mb-4" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'var(--error)' }}>
            <div className="text-sm" style={{ color: 'var(--error)' }}>{error}</div>
          </div>
        )}

        {services.length === 0 ? (
          <div className="card text-center py-12">
            <p style={{ color: 'var(--text-secondary)' }} className="mb-4">
              No services yet. Create your first one to populate the patient catalog.
            </p>
            <Link href="/admin/services/new" className="btn btn-primary inline-flex">
              <Plus className="w-4 h-4" /> Create a service
            </Link>
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th className="p-3" style={{ color: 'var(--text-muted)' }}>Order</th>
                  <th className="p-3" style={{ color: 'var(--text-muted)' }}>Name</th>
                  <th className="p-3" style={{ color: 'var(--text-muted)' }}>Slug</th>
                  <th className="p-3" style={{ color: 'var(--text-muted)' }}>Specialities</th>
                  <th className="p-3" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="p-3 text-right" style={{ color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{s.displayOrder}</td>
                    <td className="p-3" style={{ color: 'var(--text-primary)' }}>{s.name}</td>
                    <td className="p-3" style={{ color: 'var(--text-muted)' }}><code>{s.slug}</code></td>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>
                      {s.specialities.map((sp) => sp.name).join(', ') || '—'}
                    </td>
                    <td className="p-3">
                      <span className={`badge ${s.isEnabled ? 'badge-success' : 'badge-neutral'}`}>
                        {s.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => toggle(s)}
                          disabled={actionId === s.id}
                          className="btn btn-ghost btn-sm"
                          title={s.isEnabled ? 'Disable' : 'Enable'}
                        >
                          {s.isEnabled
                            ? <PowerOff className="w-3.5 h-3.5" />
                            : <Power className="w-3.5 h-3.5" style={{ color: 'var(--primary-light)' }} />}
                        </button>
                        <Link href={`/admin/services/${s.id}/edit`} className="btn btn-ghost btn-sm" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => remove(s)}
                          disabled={actionId === s.id}
                          className="btn btn-ghost btn-sm"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--error)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
