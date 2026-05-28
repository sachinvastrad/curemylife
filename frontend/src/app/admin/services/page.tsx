'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, AlertTriangle, X,
} from 'lucide-react';
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
  const [deleteTarget, setDeleteTarget] = useState<ServiceDetail | null>(null);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const s = deleteTarget;
    setActionId(s.id);
    setError(null);
    try {
      await servicesApi.adminDelete(s.id);
      setDeleteTarget(null);
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
              Create, publish (enable/disable), edit, and remove services.
              Enable = visible to patients · Disable = hidden but kept · Delete = soft-removed (history preserved).
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
                {services.map((s) => {
                  const busy = actionId === s.id;
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{s.displayOrder}</td>
                      <td className="p-3" style={{ color: 'var(--text-primary)' }}>
                        <div className="font-medium">{s.name}</div>
                        {s.tagline && (
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.tagline}</div>
                        )}
                      </td>
                      <td className="p-3" style={{ color: 'var(--text-muted)' }}><code>{s.slug}</code></td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>
                        {s.specialities.map((sp) => sp.name).join(', ') || '—'}
                      </td>
                      <td className="p-3">
                        <StatusBadge enabled={s.isEnabled} />
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-2 flex-wrap justify-end">
                          {s.isEnabled ? (
                            <button
                              type="button"
                              onClick={() => toggle(s)}
                              disabled={busy}
                              className="btn btn-secondary btn-sm inline-flex"
                              title="Hide this service from patients (keeps it for re-enabling later)"
                            >
                              <EyeOff className="w-3.5 h-3.5" /> Disable
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggle(s)}
                              disabled={busy}
                              className="btn btn-primary btn-sm inline-flex"
                              title="Make this service visible to patients"
                            >
                              <Eye className="w-3.5 h-3.5" /> Enable
                            </button>
                          )}

                          {s.isEnabled && (
                            <a
                              href={`/patient/services/${s.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm inline-flex"
                              title="Open the patient-facing landing page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View
                            </a>
                          )}

                          <Link
                            href={`/admin/services/${s.id}/edit`}
                            className="btn btn-ghost btn-sm inline-flex"
                            title="Edit landing content, intake fields, specialities"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            disabled={busy}
                            className="btn btn-ghost btn-sm inline-flex"
                            style={{ color: 'var(--error)' }}
                            title="Remove this service (soft delete — history preserved)"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        {services.length > 0 && (
          <div className="text-xs mt-4 flex flex-wrap gap-4" style={{ color: 'var(--text-muted)' }}>
            <span className="inline-flex items-center gap-1.5">
              <StatusBadge enabled compact /> Visible to patients
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StatusBadge enabled={false} compact /> Hidden from patients (kept for later)
            </span>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          service={deleteTarget}
          busy={actionId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </DashboardLayout>
  );
}

/* ===================== STATUS BADGE ===================== */

function StatusBadge({ enabled, compact }: { enabled: boolean; compact?: boolean }) {
  const colour = enabled ? 'var(--success)' : 'var(--text-muted)';
  const bg = enabled ? 'rgba(16,185,129,0.15)' : 'var(--bg-surface)';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium"
      style={{ background: bg, color: colour, fontSize: compact ? '10px' : '12px' }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 6, height: 6, background: colour,
          boxShadow: enabled ? `0 0 0 3px rgba(16,185,129,0.18)` : 'none',
        }}
      />
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );
}

/* ===================== DELETE CONFIRMATION ===================== */

function DeleteConfirmModal({
  service, busy, onCancel, onConfirm,
}: {
  service: ServiceDetail;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={onCancel}
    >
      <div
        className="card max-w-md w-full"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,68,68,0.15)' }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--error)' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Delete &ldquo;{service.name}&rdquo;?
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              This is a <strong>soft delete</strong>. The service disappears from the catalog
              immediately but historical service requests and appointments tied to it stay intact.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost btn-sm"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="rounded-lg p-3 text-xs mt-4 mb-4"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
        >
          <div>Slug: <code>{service.slug}</code></div>
          <div>Status: {service.isEnabled ? 'Enabled' : 'Disabled'}</div>
          <div>Specialities: {service.specialities.map((sp) => sp.name).join(', ') || '—'}</div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            style={{ background: 'var(--error)', color: '#fff' }}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Delete service'}
          </button>
        </div>
      </div>
    </div>
  );
}
