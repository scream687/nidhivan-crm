'use client';
import { Fragment, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { IntegrationDef, FieldMap } from './types';

interface Props {
  integration: IntegrationDef | null;
  fieldMap: FieldMap;
  onSaved: (configType: string, fieldMap: FieldMap) => void;
  onClose: () => void;
}

export function FieldMappingDialog({ integration, fieldMap, onSaved, onClose }: Props) {
  const [draft, setDraft] = useState<FieldMap>(fieldMap);
  const [saving, setSaving] = useState(false);

  // Reset the draft whenever a different integration is opened.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (integration && openedFor !== integration.configType) {
    setOpenedFor(integration.configType);
    setDraft(fieldMap);
  }

  async function save() {
    if (!integration) return;
    setSaving(true);
    try {
      // Strip blanks so an empty box means "use the built-in field names".
      const cleaned = Object.fromEntries(
        Object.entries(draft).filter(([, v]) => v.trim()),
      ) as FieldMap;

      await api.post(`/integrations/config/${integration.configType}`, {
        metadata: { fieldMap: cleaned },
      });
      onSaved(integration.configType, cleaned);
      toast.success('Field mapping saved');
      onClose();
    } catch (e: any) {
      toast.error(
        e?.response?.status === 403
          ? 'Only admins can change field mappings'
          : 'Could not save field mapping',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!integration} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{integration?.name} — field mapping</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-500">
            Leave a box empty to use the built-in field names, which already cover the payloads these
            portals normally send. Fill one in only when {integration?.name} uses a different key.
          </p>

          <div className="grid grid-cols-[1fr_1.2fr] gap-x-4 gap-y-2 items-center">
            <div className="text-xs font-bold uppercase text-gray-400">CRM field</div>
            <div className="text-xs font-bold uppercase text-gray-400">Their field name</div>

            {integration?.crmFields.map(({ field, label, builtIn }) => (
              <Fragment key={field}>
                <div className="text-sm text-gray-700">{label}</div>
                <Input
                  value={draft[field] || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                  placeholder={builtIn}
                  className="h-8 bg-gray-50 font-mono text-xs"
                  aria-label={`${label} field name`}
                />
              </Fragment>
            ))}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDraft({})}>Clear all</Button>
          <Button className="flex items-center gap-2" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save mapping'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
