'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { adminApi } from '@/lib/api';
import { Search } from 'lucide-react';

export default function AdminPatientsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>({ patients: [], total: 0 });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && (!user || user.role !== 'admin')) router.push('/login?role=admin'); }, [authLoading, user]);
  useEffect(() => { if (user?.role === 'admin') loadPatients(); }, [user, query]);

  const loadPatients = async () => {
    setLoading(true);
    try { const { data } = await adminApi.getPatients(1, 50, query || undefined); setData(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try { await adminApi.togglePatient(id, !isActive); loadPatients(); }
    catch (e) { console.error(e); }
  };

  if (authLoading) return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-in">
        <h1 className="text-2xl font-bold mb-2">Patient Management</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>View and manage registered patients — Total: {data.total}</p>

        <form className="flex gap-2 mb-6" onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }}>
          <input className="input flex-1 max-w-sm" placeholder="Search by name, email or city"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            <Search className="w-4 h-4" /> Search
          </button>
          {query && (
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setQuery(''); }}>Clear</button>
          )}
        </form>

        {loading ? <div className="flex justify-center py-10"><div className="spinner" /></div> : (
          data.patients?.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-lg font-medium mb-1">No patients found</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {query ? `No results for "${query}"` : 'No patients have registered yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.patients?.map((p: any) => (
                <div key={p.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{p.name || 'Unnamed'}</span>
                        <span className={`badge ${p.isActive ? 'badge-success' : 'badge-error'}`}>
                          {p.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {p.email || '—'}{p.phone ? ` • ${p.phone}` : ''}{p.city ? ` • ${p.city}` : ''}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Cases: {p._count?.cases ?? 0} • Appointments: {p._count?.appointments ?? 0} •
                        Joined {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      className={`btn btn-sm ${p.isActive ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => handleToggle(p.id, p.isActive)}>
                      {p.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
