'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface LandingPageForm {
  title: string;
  slug: string;
  projectId: string;
  metaTitle: string;
  metaDescription: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroCta: string;
  heroImageUrl: string;
  showGallery: boolean;
  showAmenities: boolean;
  showForm: boolean;
  showMap: boolean;
  isActive: boolean;
}

const defaultForm: LandingPageForm = {
  title: '',
  slug: '',
  projectId: '',
  metaTitle: '',
  metaDescription: '',
  heroHeadline: '',
  heroSubheadline: '',
  heroCta: 'Book a Site Visit',
  heroImageUrl: '',
  showGallery: true,
  showAmenities: true,
  showForm: true,
  showMap: true,
  isActive: true,
};

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  edit?: any | null;
}

export function LandingPageBuilder({ open, onClose, onSaved, edit }: Props) {
  const [form, setForm] = useState<LandingPageForm>(defaultForm);
  const [projects, setProjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data)).catch(() => toast.error('Failed to load projects'));
  }, []);

  useEffect(() => {
    if (edit) {
      setForm({
        title: edit.title ?? '',
        slug: edit.slug ?? '',
        projectId: edit.projectId ?? edit.project?.id ?? '',
        metaTitle: edit.metaTitle ?? '',
        metaDescription: edit.metaDescription ?? '',
        heroHeadline: edit.heroHeadline ?? '',
        heroSubheadline: edit.heroSubheadline ?? '',
        heroCta: edit.heroCta ?? 'Book a Site Visit',
        heroImageUrl: edit.heroImageUrl ?? '',
        showGallery: edit.showGallery ?? true,
        showAmenities: edit.showAmenities ?? true,
        showForm: edit.showForm ?? true,
        showMap: edit.showMap ?? true,
        isActive: edit.isActive ?? true,
      });
    } else {
      setForm(defaultForm);
      setSlugEdited(false);
    }
  }, [edit, open]);

  function update(field: keyof LandingPageForm, value: any) {
    if (field === 'title' && !slugEdited && !edit) {
      setForm(prev => ({ ...prev, title: value, slug: slugify(value) }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  }

  async function save() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.slug.trim()) { toast.error('Slug is required'); return; }
    if (!form.projectId) { toast.error('Select a project'); return; }
    setSaving(true);
    try {
      if (edit) {
        await api.put(`/marketing/landing-pages/${edit.id}`, form);
        toast.success('Landing page updated');
      } else {
        await api.post('/marketing/landing-pages', form);
        toast.success('Landing page created');
      }
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to save landing page');
    } finally {
      setSaving(false);
    }
  }

  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition relative flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{edit ? 'Edit Landing Page' : 'Create Landing Page'}</DialogTitle>
          <DialogDescription>Configure your project landing page details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title & Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Lakeside Apartments" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <Input value={form.slug} onChange={e => { setSlugEdited(true); update('slug', e.target.value); }} placeholder="lakeside-apartments" />
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
            <Select value={form.projectId} onValueChange={v => update('projectId', v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SEO */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">SEO</h3>
            <div className="space-y-3">
              <Input value={form.metaTitle} onChange={e => update('metaTitle', e.target.value)} placeholder="Meta title" />
              <Input value={form.metaDescription} onChange={e => update('metaDescription', e.target.value)} placeholder="Meta description" />
            </div>
          </div>

          {/* Hero */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Hero Section</h3>
            <div className="space-y-3">
              <Input value={form.heroHeadline} onChange={e => update('heroHeadline', e.target.value)} placeholder="Headline" />
              <Input value={form.heroSubheadline} onChange={e => update('heroSubheadline', e.target.value)} placeholder="Subheadline" />
              <div className="grid grid-cols-2 gap-3">
                <Input value={form.heroCta} onChange={e => update('heroCta', e.target.value)} placeholder="CTA text" />
                <Input value={form.heroImageUrl} onChange={e => update('heroImageUrl', e.target.value)} placeholder="Hero image URL" />
              </div>
            </div>
          </div>

          {/* Section toggles */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Sections</h3>
            <div className="grid grid-cols-2 gap-2">
              <Toggle label="Gallery" checked={form.showGallery} onChange={v => update('showGallery', v)} />
              <Toggle label="Amenities" checked={form.showAmenities} onChange={v => update('showAmenities', v)} />
              <Toggle label="Enquiry Form" checked={form.showForm} onChange={v => update('showForm', v)} />
              <Toggle label="Map" checked={form.showMap} onChange={v => update('showMap', v)} />
            </div>
          </div>

          {/* Active */}
          <Toggle label="Published (active)" checked={form.isActive} onChange={v => update('isActive', v)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {edit ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
