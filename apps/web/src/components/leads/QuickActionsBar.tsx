"use client";
import {
  Phone,
  MessageSquare,
  CheckSquare,
  Calendar,
  FileCheck,
} from "lucide-react";

interface Props {
  onCall: () => void;
  onWhatsApp: () => void;
  onTask: () => void;
  onVisit: () => void;
  onBooking: () => void;
}

export default function QuickActionsBar({ onCall, onWhatsApp, onTask, onVisit, onBooking }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 lg:px-6 py-2.5 border-b border-gray-200 bg-white">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Quick Actions</span>
      <ActionButton icon={<Phone size={13} />} label="Call" onClick={onCall} color="bg-green-600 hover:bg-green-700" />
      <ActionButton icon={<MessageSquare size={13} />} label="WhatsApp" onClick={onWhatsApp} color="bg-emerald-600 hover:bg-emerald-700" />
      <ActionButton icon={<CheckSquare size={13} />} label="Task" onClick={onTask} color="bg-blue-600 hover:bg-blue-700" />
      <ActionButton icon={<Calendar size={13} />} label="Visit" onClick={onVisit} color="bg-purple-600 hover:bg-purple-700" />
      <ActionButton icon={<FileCheck size={13} />} label="Booking" onClick={onBooking} color="bg-amber-600 hover:bg-amber-700" />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-white text-xs px-2.5 py-1.5 rounded-lg transition font-medium ${color}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
