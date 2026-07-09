'use client';
import { useState, useRef } from 'react';
import { Upload, X, FileText, File, Image, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const DOC_TYPES = ['AADHAAR', 'PAN', 'AGREEMENT', 'RECEIPT', 'OTHER'] as const;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  AADHAAR: <FileText size={14} />,
  PAN: <FileText size={14} />,
  AGREEMENT: <File size={14} />,
  RECEIPT: <Image size={14} />,
  OTHER: <File size={14} />,
};

interface UploadedDoc {
  id?: string;
  type: string;
  title: string;
  url: string;
  uploadedAt: string;
}

export default function DocumentUpload({
  bookingId,
  documents = [],
  onUpdate,
}: {
  bookingId: string;
  documents: UploadedDoc[];
  onUpdate: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('AADHAAR');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', selectedType);
      await api.post(`/bookings/${bookingId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded');
      onUpdate();
      setShowPicker(false);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeDoc(doc: UploadedDoc) {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/bookings/${bookingId}/documents/${doc.id}`);
      toast.success('Document deleted');
      onUpdate();
    } catch {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="space-y-3">
      {/* Uploaded docs */}
      {documents.length > 0 && (
        <div className="space-y-1.5">
          {documents.map((doc, i) => (
            <div
              key={doc.id || i}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-blue-500">
                  {TYPE_ICONS[doc.type] || <File size={14} />}
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-700">
                    {doc.title || doc.type}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-blue-600 transition"
                >
                  <Download size={14} />
                </a>
                <button
                  onClick={() => removeDoc(doc)}
                  className="p-1 text-gray-400 hover:text-red-500 transition"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload */}
      {showPicker ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center space-y-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 mx-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Choose file'}
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFile}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <button
            onClick={() => setShowPicker(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Upload size={14} /> Upload Document
        </button>
      )}
    </div>
  );
}
