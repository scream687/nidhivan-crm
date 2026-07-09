"use client";
import { useState, useEffect } from "react";
import { Copy, X } from "lucide-react";
import api from "@/lib/api";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import toast from "react-hot-toast";

interface Props {
  leadId: string;
  phone: string;
  onMergeComplete: () => void;
}

interface DuplicateGroup {
  phone: string;
  count: number;
  leads: any[];
}

export function DuplicateAlert({ leadId, phone, onMergeComplete }: Props) {
  const [group, setGroup] = useState<DuplicateGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!phone) return;
    api
      .get("/leads/duplicates")
      .then(({ data }: any) => {
        const match = data.find(
          (g: DuplicateGroup) =>
            g.phone === phone && g.leads.some((l: any) => l.id === leadId),
        );
        if (match && match.count > 1) setGroup(match);
      })
      .catch(() => toast.error('Failed to check duplicates'));
  }, [phone, leadId]);

  if (!group) return null;

  const others = group.leads.filter((l) => l.id !== leadId);
  const trapRef = useFocusTrap(showConfirm);

  async function handleMerge() {
    setMerging(true);
    try {
      await api.post("/leads/merge", {
        primaryId: leadId,
        duplicateIds: others.map((l) => l.id),
      });
      toast.success(`Merged ${others.length} duplicate(s)`);
      setShowConfirm(false);
      setGroup(null);
      onMergeComplete();
    } catch {
      toast.error("Merge failed");
    } finally {
      setMerging(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border-b border-orange-200 text-sm">
        <Copy size={14} className="text-orange-500 flex-shrink-0" />
        <span className="text-orange-800">
          This lead has <strong>{others.length} duplicate(s)</strong> with the
          same phone number
        </span>
        <button
          onClick={() => setShowConfirm(true)}
          className="ml-auto text-xs font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 px-3 py-1 rounded-lg transition flex-shrink-0"
        >
          Merge
        </button>
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowConfirm(false)}
        >
          <div
            ref={trapRef} tabIndex={-1}
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Merge Duplicate Leads
              </h3>
              <button
                onClick={() => setShowConfirm(false)}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will merge all activities, calls, tasks, site visits, and
              bookings from <strong>{others.length} duplicate(s)</strong> into
              this lead. The duplicates will be marked as{" "}
              <code className="bg-gray-100 px-1 rounded">DUPLICATE</code> and
              hidden from the pipeline.
            </p>
            <div className="space-y-1.5 mb-4 max-h-32 overflow-y-auto">
              {others.map((l: any) => (
                <div
                  key={l.id}
                  className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5"
                >
                  <Copy size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="font-medium">{l.leadNumber}</span>
                  <span className="text-gray-500">— {l.name}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={merging}
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg transition flex items-center gap-1.5"
              >
                {merging ? "Merging..." : `Merge ${others.length} lead(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
