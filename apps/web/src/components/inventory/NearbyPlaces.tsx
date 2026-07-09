'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, X, GripVertical, Hospital, BookOpen, ShoppingBag, Bus, Building,
  Landmark, Trees, Coffee, Train, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TYPE_ICONS: Record<string, LucideIcon> = {
  HOSPITAL: Hospital,
  SCHOOL: BookOpen,
  MALL: ShoppingBag,
  TRANSPORT: Bus,
  BUS_STOP: Bus,
  METRO: Train,
  RAILWAY: Train,
  BANK: Building,
  LANDMARK: Landmark,
  PARK: Trees,
  RESTAURANT: Coffee,
  AIRPORT: Bus,
};

const TYPE_LABELS: Record<string, string> = {
  HOSPITAL: 'Hospital',
  SCHOOL: 'School / College',
  MALL: 'Mall',
  TRANSPORT: 'Bus Stop',
  METRO: 'Metro Station',
  RAILWAY: 'Railway Station',
  BANK: 'Bank / ATM',
  LANDMARK: 'Landmark',
  PARK: 'Park / Garden',
  RESTAURANT: 'Restaurant',
  AIRPORT: 'Airport',
};

export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  distance: number; // km
  order: number;
}

interface Props {
  places: NearbyPlace[];
  onChange: (places: NearbyPlace[]) => void;
  readOnly?: boolean;
}

function SortablePlace({
  place,
  onRemove,
  readOnly,
}: {
  place: NearbyPlace;
  onRemove: () => void;
  readOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: place.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = TYPE_ICONS[place.type] || Landmark;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-sm',
        isDragging ? 'border-blue-300 shadow-md z-10' : 'border-gray-100',
      )}
    >
      {!readOnly && (
        <button {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 touch-none">
          <GripVertical size={16} />
        </button>
      )}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{place.name}</p>
        <p className="text-[11px] text-gray-400">{TYPE_LABELS[place.type] || place.type} · {place.distance} km</p>
      </div>
      {!readOnly && (
        <button onClick={onRemove} className="text-gray-300 hover:text-red-500 p-1">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default function NearbyPlaces({ places, onChange, readOnly }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('HOSPITAL');
  const [distance, setDistance] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = places.findIndex(p => p.id === active.id);
    const newIdx = places.findIndex(p => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = [...places];
    const [moved] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, moved);
    onChange(next.map((p, i) => ({ ...p, order: i })));
  }

  function addPlace() {
    if (!name.trim() || !distance.trim()) return;
    onChange([
      ...places,
      {
        id: `temp-${Date.now()}`,
        name: name.trim(),
        type,
        distance: parseFloat(distance) || 0,
        order: places.length,
      },
    ]);
    setName('');
    setDistance('');
    setShowForm(false);
  }

  return (
    <div className="space-y-2">
      {places.length === 0 && !readOnly && (
        <p className="text-xs text-gray-400">No nearby places added yet.</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={places.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {places
              .sort((a, b) => a.order - b.order)
              .map(place => (
                <SortablePlace
                  key={place.id}
                  place={place}
                  onRemove={() => onChange(places.filter(p => p.id !== place.id))}
                  readOnly={readOnly}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>

      {!readOnly && (
        <>
          {showForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border border-dashed border-gray-200 rounded-lg p-3 space-y-3"
            >
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Place Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Fortis Hospital"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => e.key === 'Enter' && addPlace()}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={distance}
                    onChange={e => setDistance(e.target.value)}
                    placeholder="1.5"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => e.key === 'Enter' && addPlace()}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addPlace}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Add
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus size={13} /> Add Nearby Place
            </button>
          )}
        </>
      )}
    </div>
  );
}
