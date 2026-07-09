'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/v\d+\/?$/, '');
const API_URL = `${API_BASE}/api/v1`;

interface Project {
  id: string;
  name: string;
  type: string | null;
  location: string;
  city: string | null;
  totalUnits: number;
  available: number;
  pricePerSqft: number | null;
  priceMin: number | null;
  priceMax: number | null;
  reraNumber: string | null;
  description: string | null;
  amenities: string[];
  highlights: string[];
  images: string[];
  brochureUrl: string | null;
  videoUrl: string | null;
  possession: string | null;
  slug: string;
}

function formatPriceShort(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function getEmbedUrl(url: string): string {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

function autoDescription(p: Project): string {
  const typeLabel = p.type === 'PLOT' ? 'residential plot' : p.type === 'APARTMENT' ? 'apartment' : p.type === 'VILLA' ? 'villa' : 'property';
  const city = p.city || 'the area';
  const priceNote = p.pricePerSqft ? ` at ₹${Number(p.pricePerSqft).toLocaleString('en-IN')} per sq. ft` : '';
  const possessionNote = p.possession ? ` with ${p.possession.toLowerCase()} possession` : '';
  return (
    `${p.name} is a premium ${typeLabel} development strategically located at ${p.location}${p.city ? ', ' + p.city : ''}. ` +
    `This meticulously planned community offers ${p.totalUnits} units${priceNote}${possessionNote}, ensuring a perfect blend of quality infrastructure and convenient living in ${city}.\n\n` +
    `With ${p.available} unit${p.available !== 1 ? 's' : ''} currently available, ${p.name} presents an exceptional investment opportunity. ` +
    `The project is designed to cater to families and investors seeking a well-connected, thoughtfully developed community.`
  );
}

function computeHighlights(p: Project): { title: string; value: string }[] {
  const rows: { title: string; value: string }[] = [];
  if (p.type) rows.push({ title: 'Project Type', value: p.type === 'PLOT' ? 'Residential Plots' : p.type.charAt(0) + p.type.slice(1).toLowerCase() });
  rows.push({ title: 'Total Units', value: `${p.totalUnits} Units` });
  rows.push({ title: 'Available Units', value: `${p.available} Available` });
  if (p.pricePerSqft) rows.push({ title: 'Price per Sq. Ft', value: `₹${Number(p.pricePerSqft).toLocaleString('en-IN')}` });
  if (p.priceMin || p.priceMax) {
    const min = p.priceMin ? formatPriceShort(Number(p.priceMin)) : '';
    const max = p.priceMax ? formatPriceShort(Number(p.priceMax)) : '';
    rows.push({ title: 'Price Range', value: [min, max].filter(Boolean).join(' – ') });
  }
  if (p.possession) rows.push({ title: 'Possession', value: p.possession });
  if (p.reraNumber) rows.push({ title: 'RERA Approved', value: `Reg. No: ${p.reraNumber}` });
  if (p.city) rows.push({ title: 'Location', value: `${p.location}, ${p.city}` });
  return rows;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 'clamp(20px,3vw,30px)', fontWeight: 700, color: '#333', paddingBottom: 10, display: 'inline-block', borderBottom: '4px solid #C8593A', margin: 0 }}>
        {children}
      </h2>
    </div>
  );
}

function GalleryImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ position: 'relative', paddingBottom: '72%', borderRadius: 8, overflow: 'hidden', background: '#E8E8E8' }}>
      {failed ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" fill="#ccc" width="32" height="32"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default function PublicProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', preferredDate: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/public/projects/${slug}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(d => { if (d) setProject(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { toast.error('Name and phone are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/public/projects/${slug}/visit-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined, preferredDate: form.preferredDate || undefined, message: form.message.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
      toast.success('Request submitted! Our team will contact you shortly.');
    } catch { toast.error('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5' }}>
      <div style={{ width: 40, height: 40, border: '4px solid #C8593A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound || !project) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5', gap: 16, fontFamily: 'sans-serif' }}>
      <img src="/logo.png" alt="Nidhivan" style={{ height: 60, marginBottom: 8 }} />
      <p style={{ fontSize: 22, fontWeight: 700, color: '#333', margin: 0 }}>Project not found</p>
      <p style={{ color: '#666', fontSize: 15, margin: 0 }}>This project may have been unpublished or the link is incorrect.</p>
    </div>
  );

  const description = project.description || autoDescription(project);
  const highlights = project.highlights.length > 0
    ? project.highlights.map(h => ({ title: '', value: h }))
    : computeHighlights(project);
  const heroImageSrc = project.images[0] ? `${API_BASE}${project.images[0]}` : null;

  const locationCards = [
    project.reraNumber && { icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z', title: 'RERA Approved', sub: `Reg. No: ${project.reraNumber}` },
    { icon: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z', title: `${project.totalUnits} Total Units`, sub: `${project.available} currently available` },
    project.possession && { icon: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z', title: 'Possession Status', sub: project.possession },
    project.pricePerSqft && { icon: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z', title: 'Price per Sq. Ft', sub: `₹${Number(project.pricePerSqft).toLocaleString('en-IN')} / sq.ft` },
  ].filter(Boolean) as { icon: string; title: string; sub: string }[];

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif", lineHeight: '1.6', color: '#333', background: '#fff' }}>

      {/* HEADER */}
      <header style={{ background: '#1F1F1F', padding: '14px 0', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img src="/logo-white.png" alt="Nidhivan Property Linkers" style={{ height: 50, display: 'block' }} />
          <a href="mailto:nidhivanproperty@gmail.com"
            style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#C8593A')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)')}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            nidhivanproperty@gmail.com
          </a>
        </div>
      </header>

      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#1F1F1F', minHeight: 400 }}>
        {heroImageSrc && (
          <img src={heroImageSrc} alt={project.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(31,31,31,0.96) 40%,rgba(200,89,58,0.12) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: 'clamp(60px,8vw,100px) 40px 80px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {project.type && <span style={{ background: '#C8593A', color: '#fff', padding: '7px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{project.type}</span>}
            {project.reraNumber && <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', padding: '7px 18px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' }}>RERA: {project.reraNumber}</span>}
          </div>
          <h1 style={{ fontSize: 'clamp(36px,5.5vw,64px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 18 }}>{project.name}</h1>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <svg viewBox="0 0 24 24" fill="#C8593A" width="20" height="20" style={{ flexShrink: 0 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            {project.location}{project.city ? `, ${project.city}` : ''}
          </div>
          {project.possession && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, marginBottom: 32 }}>
              <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.45)" width="16" height="16" style={{ flexShrink: 0 }}>
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
              </svg>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Possession:</span>
              <span style={{ fontWeight: 700, color: '#4CAF50' }}>{project.possession}</span>
            </div>
          )}
          {(project.priceMin || project.priceMax || project.pricePerSqft) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,89,58,0.85)', padding: '10px 22px', borderRadius: 10, backdropFilter: 'blur(4px)' }}>
              <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>
                {project.priceMin || project.priceMax
                  ? `${project.priceMin ? formatPriceShort(Number(project.priceMin)) : ''}${project.priceMax ? ' – ' + formatPriceShort(Number(project.priceMax)) : ''}`
                  : `₹${Number(project.pricePerSqft).toLocaleString('en-IN')} / sq.ft`}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ background: '#2A2A2A', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '26px 0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 40px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
          {[
            { val: String(project.totalUnits), lbl: 'Total Units', orange: false },
            { val: String(project.available), lbl: 'Available', orange: true },
            { val: project.pricePerSqft ? `₹${Number(project.pricePerSqft).toLocaleString('en-IN')}` : '—', lbl: 'Per Sq. Ft', orange: false },
          ].map((s, i, arr) => (
            <div key={i} style={{ textAlign: 'center', padding: '0 16px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              <span style={{ display: 'block', fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 700, color: s.orange ? '#C8593A' : '#fff', marginBottom: 5 }}>{s.val}</span>
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{s.lbl}</span>
            </div>
          ))}
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="page-grid" style={{ maxWidth: 1400, margin: '70px auto 60px', padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 60, alignItems: 'start' }}>

        {/* LEFT */}
        <div>

          {/* Project Overview */}
          <section style={{ marginBottom: 56 }}>
            <SectionTitle>Project Overview</SectionTitle>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: '#555', whiteSpace: 'pre-line', margin: 0 }}>{description}</p>
          </section>

          {/* Key Highlights */}
          <section style={{ marginBottom: 56 }}>
            <SectionTitle>Key Highlights</SectionTitle>
            <div className="highlights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 18 }}>
              {highlights.map((h, i) => (
                <div key={i} style={{ background: '#F7F7F7', padding: '18px 22px', borderRadius: 10, borderLeft: '4px solid #C8593A' }}>
                  {h.title && <div style={{ fontSize: 11, fontWeight: 700, color: '#999', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>{h.title}</div>}
                  <div style={{ fontSize: 15, color: '#333', fontWeight: 600 }}>{h.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Amenities */}
          {project.amenities.length > 0 && (
            <section style={{ marginBottom: 56 }}>
              <SectionTitle>Amenities &amp; Features</SectionTitle>
              <div className="amenities-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {project.amenities.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#555' }}>
                    <div style={{ width: 36, height: 36, background: '#C8593A', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="white" width="17" height="17">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <span style={{ fontWeight: 500 }}>{a}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gallery — padding-bottom trick for reliable aspect ratio */}
          {project.images.length > 0 && (
            <section style={{ marginBottom: 56 }}>
              <SectionTitle>Gallery</SectionTitle>
              <div className="gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {project.images.map((img, i) => (
                  <GalleryImage key={i} src={`${API_BASE}${img}`} alt={`${project.name} — photo ${i + 1}`} />
                ))}
              </div>
            </section>
          )}

          {/* Video */}
          {project.videoUrl && (
            <section style={{ marginBottom: 56 }}>
              <SectionTitle>Project Video</SectionTitle>
              <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#111' }}>
                <iframe src={getEmbedUrl(project.videoUrl)}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            </section>
          )}

          {/* Brochure */}
          {project.brochureUrl && (
            <section style={{ marginBottom: 56 }}>
              <SectionTitle>Downloads</SectionTitle>
              <a href={`${API_BASE}${project.brochureUrl}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#C8593A', color: '#fff', padding: '13px 26px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#a84830')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#C8593A')}>
                <svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                Download Brochure (PDF)
              </a>
            </section>
          )}
        </div>

        {/* RIGHT — sticky form */}
        <aside className="sidebar-col" style={{ position: 'sticky', top: 88 }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 10px 48px rgba(0,0,0,0.13)', overflow: 'hidden' }}>
            <div style={{ background: '#2A2A2A', padding: '24px 28px' }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 5 }}>Schedule a Site Visit</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Our team will call you back within 2 hours</p>
            </div>
            <div style={{ padding: '24px 28px' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <div style={{ width: 60, height: 60, background: '#e8f5e9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg viewBox="0 0 24 24" fill="#4CAF50" width="30" height="30"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  </div>
                  <h4 style={{ fontSize: 17, fontWeight: 700, color: '#333', margin: '0 0 8px' }}>Request Submitted!</h4>
                  <p style={{ color: '#666', fontSize: 14, lineHeight: 1.5, margin: 0 }}>Our team will get in touch shortly to confirm your visit.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  {([
                    { label: 'Full Name', key: 'name', type: 'text', ph: 'Your full name', req: true },
                    { label: 'Phone Number', key: 'phone', type: 'tel', ph: '+91 98765 43210', req: true },
                    { label: 'Email', key: 'email', type: 'email', ph: 'you@example.com', req: false },
                  ] as const).map(f => (
                    <div key={f.key} style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>
                        {f.label} {f.req && <span style={{ color: '#C8593A' }}>*</span>}
                      </label>
                      <input type={f.type} value={form[f.key]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.ph} style={iSt}
                        onFocus={e => Object.assign(e.currentTarget.style, iFocus)}
                        onBlur={e => Object.assign(e.currentTarget.style, iSt)} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Preferred Visit Date</label>
                    <input type="date" value={form.preferredDate} min={new Date().toISOString().split('T')[0]}
                      onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))}
                      style={iSt} onFocus={e => Object.assign(e.currentTarget.style, iFocus)} onBlur={e => Object.assign(e.currentTarget.style, iSt)} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Message</label>
                    <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Any specific requirements or questions..." rows={3}
                      style={{ ...iSt, resize: 'vertical', minHeight: 78 }}
                      onFocus={e => Object.assign(e.currentTarget.style, { ...iFocus, resize: 'vertical' })}
                      onBlur={e => Object.assign(e.currentTarget.style, { ...iSt, resize: 'vertical' })} />
                  </div>
                  <button type="submit" disabled={submitting}
                    style={{ width: '100%', background: submitting ? '#ddd' : '#C8593A', color: submitting ? '#999' : '#fff', border: 'none', padding: '14px 20px', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.25s' }}
                    onMouseEnter={e => { if (!submitting) Object.assign((e.currentTarget as HTMLElement).style, { background: '#a84830', boxShadow: '0 6px 20px rgba(200,89,58,0.3)' }); }}
                    onMouseLeave={e => { if (!submitting) Object.assign((e.currentTarget as HTMLElement).style, { background: '#C8593A', boxShadow: 'none' }); }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
                      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
                    </svg>
                    {submitting ? 'Submitting…' : 'Request Site Visit'}
                  </button>
                </form>
              )}
            </div>
            <div style={{ padding: '14px 28px', background: '#F5F5F5', textAlign: 'center', fontSize: 12, color: '#999', lineHeight: 1.6 }}>
              Built on Trust. Grown by Recommendations.®<br />
              nidhivanproperty@gmail.com
            </div>
          </div>
        </aside>
      </div>

      {/* LOCATION & CONNECTIVITY */}
      <section style={{ background: '#F5F5F5', padding: '72px 40px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <SectionTitle>Location &amp; Connectivity</SectionTitle>
          <div className="loc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start', marginTop: 28 }}>
            <div style={{ position: 'relative', paddingBottom: '65%', borderRadius: 12, overflow: 'hidden', background: '#2A2A2A' }}>
              {heroImageSrc && (
                <img src={heroImageSrc} alt={project.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.45)" width="42" height="42">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', fontWeight: 600, margin: 0 }}>
                  {project.location}{project.city ? `, ${project.city}` : ''}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 15, color: '#555', lineHeight: 1.8, marginBottom: 4 }}>
                {project.name} is located at <strong>{project.location}{project.city ? `, ${project.city}` : ''}</strong>, offering excellent connectivity to key services, schools, hospitals, and transportation.
              </p>
              {locationCards.map((card, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: 42, height: 42, background: '#C8593A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d={card.icon} /></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#333', lineHeight: 1.3 }}>{card.title}</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{card.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#1F1F1F', padding: '34px 40px 26px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/logo-white.png" alt="Nidhivan" style={{ height: 44 }} />
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>NIDHIVAN PROPERTY LINKERS®</p>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, margin: 0, marginTop: 3 }}>Built on Trust. Grown by Recommendations.</p>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0 }}>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        @media(max-width:1100px){.page-grid{grid-template-columns:1fr!important}.sidebar-col{position:static!important}}
        @media(max-width:700px){
          .page-grid{padding:0 20px!important;margin-top:40px!important}
          .highlights-grid{grid-template-columns:1fr!important}
          .amenities-grid{grid-template-columns:repeat(2,1fr)!important}
          .gallery-grid{grid-template-columns:repeat(2,1fr)!important}
          .loc-grid{grid-template-columns:1fr!important;padding:0 20px!important}
          section[style*="padding: 72px 40px"]{padding:50px 20px!important}
        }
        @media(max-width:480px){.amenities-grid,.gallery-grid{grid-template-columns:1fr!important}}
      `}</style>
    </div>
  );
}

const iSt: React.CSSProperties = {
  width: '100%', padding: '10px 13px', border: '2px solid #E0E0E0', borderRadius: 7,
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  background: '#FAFAFA', color: '#333', transition: 'all 0.2s',
};
const iFocus: React.CSSProperties = {
  ...iSt, borderColor: '#C8593A', background: '#fff',
  boxShadow: '0 0 0 3px rgba(200,89,58,0.1)',
};
