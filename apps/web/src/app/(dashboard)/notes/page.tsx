'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { StickyNote, Search } from 'lucide-react';

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadNotes(); }, []);

  async function loadNotes() {
    setIsLoading(true);
    try {
      const { data } = await api.get('/activities', { params: { type: 'NOTE', limit: 200 } });
      setNotes(Array.isArray(data) ? data : []);
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = notes.filter(n =>
    !search ||
    n.description?.toLowerCase().includes(search.toLowerCase()) ||
    n.lead?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote size={20} className="text-amber-500" />
          <h1 className="text-lg font-bold text-gray-900">Notes</h1>
          <span className="text-sm text-gray-400">({filtered.length})</span>
        </div>
        <div className="relative w-64">
          <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((note, i) => (
            <motion.div key={note.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-amber-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-2">
                {note.lead ? (
                  <a href={`/leads/${note.lead.id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                    {note.lead.name}
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">No lead</span>
                )}
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(note.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{note.description}</p>
              <p className="text-xs text-gray-400 mt-3">by {note.user?.name}</p>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <StickyNote size={40} className="mx-auto mb-3 opacity-30" />
              <p>No notes yet. Add notes from a lead's detail page.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
