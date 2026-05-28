'use client';
import Link from 'next/link';
import { ArrowRight, Shield, Stethoscope, Clock, Users, ClipboardList } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-dark)' }}>
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}>
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Homeo<span style={{ color: 'var(--primary-light)' }}>Opinion</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Features</a>
            <a href="#how-it-works" className="text-sm" style={{ color: 'var(--text-secondary)' }}>How it Works</a>
            <a href="#specialities" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Specialities</a>
            <Link href="/login" className="btn btn-ghost btn-sm">Log In</Link>
            <Link href="/login?tab=signup" className="btn btn-primary btn-sm">Get Started</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-in">
            <div className="badge badge-primary mb-4">🌿 Expert Homoeopathic Second Opinion</div>
            <h1 className="text-4xl md:text-5xl font-800 leading-tight mb-6" style={{ color: 'var(--text-primary)' }}>
              Expert Homoeopathic{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--primary-light), var(--secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Second Opinion</span>
              <br />From Verified Doctors
            </h1>
            <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Upload your reports, describe your symptoms through our structured homoeopathic intake form,
              and get a thorough second opinion reviewed by licensed BHMS/MD(Hom.) practitioners.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/login?tab=signup" className="btn btn-primary btn-lg">
                Get Your Second Opinion <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login?role=doctor" className="btn btn-secondary btn-lg">
                Join as Doctor
              </Link>
            </div>
            <div className="flex items-center gap-8 mt-10" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--primary-light)' }}>200+</div>
                <div className="text-xs">Verified Doctors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--primary-light)' }}>5,000+</div>
                <div className="text-xs">Cases Analysed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--primary-light)' }}>&lt;48h</div>
                <div className="text-xs">Avg Turnaround</div>
              </div>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="relative">
              <div className="w-80 h-80 rounded-3xl pulse-glow"
                style={{
                  background: 'linear-gradient(135deg, rgba(14,124,107,0.2), rgba(99,102,241,0.2))',
                  border: '1px solid var(--border)'
                }}>
                <div className="absolute inset-6 rounded-2xl glass flex flex-col items-center justify-center gap-4 p-6">
                  <ClipboardList className="w-12 h-12" style={{ color: 'var(--primary-light)' }} />
                  <div className="text-sm font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
                    Structured Case Taking
                  </div>
                  <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    Chief complaint • Constitutional profile<br />
                    Modalities • Reviewed by verified doctors
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20" style={{ background: 'var(--bg-card)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Purpose-Built for Homoeopathy</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Not a generic telemedicine platform — every feature is designed for homoeopathic case analysis
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Verified Doctors', desc: 'Every doctor verified against CCH/State Board records. Only licensed BHMS/MD(Hom.) practitioners review your case' },
              { icon: Clock, title: 'Fast Turnaround', desc: 'Expert doctor review within 24-48 hours of submission' },
              { icon: Stethoscope, title: 'Full Case Taking', desc: 'Structured intake capturing constitutional profile, mental-emotional symptoms, modalities, and food preferences' },
              { icon: Users, title: 'Live Consultations', desc: 'Book video/audio consultations with your reviewing doctor for deeper case discussion and follow-ups' },
            ].map((f, i) => (
              <div key={i} className="card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <f.icon className="w-8 h-8 mb-4" style={{ color: 'var(--primary-light)' }} />
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Simple 4-step process to get your homoeopathic second opinion</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Submit Case', desc: 'Fill the structured homoeopathic intake form and upload lab reports' },
              { step: '02', title: 'Case Prepared', desc: 'Your structured case is organised and queued for expert review' },
              { step: '03', title: 'Doctor Review', desc: 'A verified BHMS/MD(Hom.) doctor reviews and adds expert commentary' },
              { step: '04', title: 'Consultation', desc: 'Book a live consultation with your doctor for deeper case discussion and follow-up guidance' },
            ].map((s, i) => (
              <div key={i} className="text-center animate-in" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-lg font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    color: 'white'
                  }}>
                  {s.step}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialities */}
      <section id="specialities" className="py-20" style={{ background: 'var(--bg-card)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Specialities Covered</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Aligned with MD(Hom.) specialisations recognised by the Central Council of Homoeopathy</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              'General / Constitutional', 'Skin & Dermatology', 'Paediatrics',
              'Mental Health / Psychiatry', "Women's Health", 'Respiratory',
              'Gastroenterology', 'Musculoskeletal', 'Autoimmune Disorders', 'Oncology Support'
            ].map((s, i) => (
              <div key={i} className="card text-center py-4 px-3">
                <div className="text-sm font-medium">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Your Second Opinion?</h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Join thousands of patients who trust HomeoOpinion for qualified homoeopathic consultations
          </p>
          <Link href="/login?tab=signup" className="btn btn-primary btn-lg">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            © 2026 HomeoOpinion. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
