'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props { onClose: () => void; onImported?: () => void; }

export default function ImportLeadsModal({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a CSV file');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/leads/import/csv', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.created > 0) onImported?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Import Leads from CSV</h2>
            <p className="text-xs text-gray-500">Upload a Cratio or Nidhivan CSV export</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={18} /></button>
        </div>

        <div className="px-6 py-5">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
              >
                <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                {file ? (
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Click to choose a CSV file</p>
                    <p className="text-xs text-gray-400 mt-1">Accepts Cratio CSV export format</p>
                  </>
                )}
                <input ref={inputRef} type="file" accept=".csv" className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </div>

              <p className="text-xs text-gray-400">
                Supported columns: Contact Name, Mobile Number, Lead Stage, Lead Source, Project Name, Site Location,
                Requirements, Description, Lead Owner, Next Follow Up On, Campaign Name, Budget, City, Email
              </p>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={!file || loading}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Import Leads
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-green-50 rounded-xl p-4 text-center">
                  <CheckCircle size={20} className="mx-auto text-green-500 mb-1" />
                  <p className="text-2xl font-bold text-green-700">{result.created}</p>
                  <p className="text-xs text-green-600">Created</p>
                </div>
                <div className="flex-1 bg-yellow-50 rounded-xl p-4 text-center">
                  <AlertCircle size={20} className="mx-auto text-yellow-500 mb-1" />
                  <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                  <p className="text-xs text-yellow-600">Skipped (duplicates)</p>
                </div>
                <div className="flex-1 bg-red-50 rounded-xl p-4 text-center">
                  <X size={20} className="mx-auto text-red-400 mb-1" />
                  <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                  <p className="text-xs text-red-600">Errors</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-600 mb-2">Errors (first {Math.min(result.errors.length, 20)} shown)</p>
                  {result.errors.slice(0, 20).map((e, i) => (
                    <p key={i} className="text-xs text-red-500 mb-0.5">{e}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={onClose}
                  className="px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
