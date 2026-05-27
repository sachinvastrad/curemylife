'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, FileText, Calendar, CreditCard, User, LogOut,
  Stethoscope, Users, BarChart3, ClipboardList, PlusCircle, Pill,
  Menu, X, Zap,
} from 'lucide-react';

interface NavItem { href: string; label: string; icon: any; }

const patientNav: NavItem[] = [
  { href: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patient/new-case', label: 'New Case', icon: PlusCircle },
  { href: '/patient/cases', label: 'My Cases', icon: FileText },
  { href: '/patient/appointments', label: 'Appointments', icon: Calendar },
  { href: '/patient/prescriptions', label: 'Prescriptions', icon: Pill },
  { href: '/patient/diet', label: 'Diet Plans', icon: Zap },
  { href: '/patient/profile', label: 'Profile', icon: User },
];

const doctorNav: NavItem[] = [
  { href: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/doctor/queue', label: 'Case Queue', icon: ClipboardList },
  { href: '/doctor/cases', label: 'My Cases', icon: FileText },
  { href: '/doctor/appointments', label: 'Appointments', icon: Calendar },
  { href: '/doctor/diet/generate', label: 'Magic Diet', icon: Zap },
  { href: '/doctor/diet/templates', label: 'Diet Templates', icon: FileText },
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
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes (tap a link → close menu).
  useEffect(() => { setOpen(false); }, [pathname]);

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
      {/* Mobile top bar — visible only below md breakpoint */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 flex items-center justify-between px-4 py-3"
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          zIndex: 50,
        }}
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}>
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">
            Homeo<span style={{ color: 'var(--primary-light)' }}>Opinion</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="p-2 rounded-md"
          style={{ color: 'var(--text-primary)' }}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Dimmer overlay — mobile only, click anywhere outside the drawer to close */}
      {open && (
        <div
          className="md:hidden fixed inset-0"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 30 }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — globals.css translates it off-screen on mobile, .open slides it back in */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
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
              onClick={() => setOpen(false)}
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

      {/* Content — extra top padding on mobile to clear the fixed header */}
      <main className="main-content flex-1 pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
