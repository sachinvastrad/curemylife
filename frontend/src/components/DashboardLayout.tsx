'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, FileText, Calendar, CreditCard, User, LogOut,
  Stethoscope, Users, BarChart3, ClipboardList, Settings, PlusCircle, Pill
} from 'lucide-react';

interface NavItem { href: string; label: string; icon: any; }

const patientNav: NavItem[] = [
  { href: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patient/new-case', label: 'New Case', icon: PlusCircle },
  { href: '/patient/cases', label: 'My Cases', icon: FileText },
  { href: '/patient/appointments', label: 'Appointments', icon: Calendar },
  { href: '/patient/prescriptions', label: 'Prescriptions', icon: Pill },
  { href: '/patient/profile', label: 'Profile', icon: User },
];

const doctorNav: NavItem[] = [
  { href: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/doctor/queue', label: 'Case Queue', icon: ClipboardList },
  { href: '/doctor/cases', label: 'My Cases', icon: FileText },
  { href: '/doctor/appointments', label: 'Appointments', icon: Calendar },
  { href: '/doctor/earnings', label: 'Earnings', icon: CreditCard },
  { href: '/doctor/profile', label: 'Profile', icon: User },
];

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/admin/patients', label: 'Patients', icon: Users },
  { href: '/admin/cases', label: 'Cases', icon: FileText },
  { href: '/admin/revenue', label: 'Revenue', icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getNav = (): NavItem[] => {
    if (pathname.startsWith('/patient')) return patientNav;
    if (pathname.startsWith('/doctor')) return doctorNav;
    if (pathname.startsWith('/admin')) return adminNav;
    return [];
  };

  const nav = getNav();
  const roleLabel = pathname.startsWith('/admin') ? 'Admin' : pathname.startsWith('/doctor') ? 'Doctor' : 'Patient';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-dark)' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="px-6 mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}>
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">
              Homeo<span style={{ color: 'var(--primary-light)' }}>Opinion</span>
            </span>
          </Link>
        </div>

        <div className="px-6 mb-6">
          <div className="badge badge-primary text-xs">{roleLabel} Portal</div>
        </div>

        <nav className="flex-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          {user && (
            <div className="px-6 mb-3">
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
          )}
          <button onClick={logout} className="sidebar-link w-full" style={{ color: 'var(--error)' }}>
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="main-content flex-1">
        {children}
      </main>
    </div>
  );
}
