'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Alert {
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  link?: string;
}

const ICON_MAP = {
  danger: <AlertTriangle className="size-4 text-red-500" />,
  warning: <AlertCircle className="size-4 text-amber-500" />,
  info: <Info className="size-4 text-blue-500" />,
};

const COLOR_MAP = {
  danger: 'border-l-red-400 bg-red-50/30',
  warning: 'border-l-amber-400 bg-amber-50/30',
  info: 'border-l-blue-400 bg-blue-50/30',
};

export function AlertsWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/leads/alerts').then((res) => setAlerts(res.data)).catch(() => toast.error('Failed to load alerts'));
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.title));

  if (visible.length === 0) return null;

  return (
    <Card className="shadow-sm border-gray-100 overflow-hidden">
      <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
        <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" />
          ALERTS
          {visible.length > 0 && (
            <span className="ml-auto text-[10px] font-normal text-gray-400">{visible.length} active</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-2">
        <AnimatePresence>
          {visible.map((alert) => (
            <motion.div
              key={alert.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${COLOR_MAP[alert.type]}`}
            >
              <div className="mt-0.5">{ICON_MAP[alert.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-gray-800">{alert.title}</p>
                  <button onClick={() => setDismissed((prev) => new Set(prev).add(alert.title))} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="size-3" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">{alert.description}</p>
                {alert.link && (
                  <Link href={alert.link} className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 mt-1 inline-block">
                    View details →
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
