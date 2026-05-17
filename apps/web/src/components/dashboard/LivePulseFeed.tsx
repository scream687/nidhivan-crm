'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSocketStore } from '@/stores/socketStore';
import { timeAgo } from '@/lib/utils';
import { Activity, Phone, UserPlus, Zap, MessageSquare, CheckCircle2 } from 'lucide-react';

interface PulseItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
  lead?: {
    name: string;
  };
}

const ICON_MAP: Record<string, any> = {
  NOTE: <MessageSquare className="size-3.5" />,
  CALL: <Phone className="size-3.5" />,
  STAGE_CHANGE: <Zap className="size-3.5" />,
  ASSIGNMENT: <UserPlus className="size-3.5" />,
  TASK: <CheckCircle2 className="size-3.5" />,
  SYSTEM: <Activity className="size-3.5" />,
};

export function LivePulseFeed() {
  const [items, setItems] = useState<PulseItem[]>([]);
  const { socket } = useSocketStore();

  useEffect(() => {
    if (!socket) return;

    socket.on('activity:new', (item: PulseItem) => {
      setItems((prev) => [item, ...prev].slice(0, 20));
    });

    socket.on('lead:stage_changed', ({ updated }: any) => {
      // Create a virtual activity item if one doesn't exist
      const newItem: PulseItem = {
        id: Math.random().toString(),
        type: 'STAGE_CHANGE',
        title: `Stage changed: ${updated.name}`,
        description: `Moved to ${updated.stage.replace(/_/g, ' ')}`,
        createdAt: new Date().toISOString(),
        user: updated.assignedTo || { name: 'System' },
        lead: { name: updated.name }
      };
      setItems((prev) => [newItem, ...prev].slice(0, 20));
    });

    return () => {
      socket.off('activity:new');
      socket.off('lead:stage_changed');
    };
  }, [socket]);

  return (
    <Card className="h-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="size-4 text-blue-500" />
            <span className="absolute -top-1 -right-1 flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-blue-500"></span>
            </span>
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">Live Pulse</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {items.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-gray-400">Waiting for activities...</p>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative pl-6 border-l border-gray-100"
                  >
                    <div className="absolute -left-2 top-0 size-4 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                      {ICON_MAP[item.type] || <Activity className="size-3" />}
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Avatar className="size-8 border border-white shadow-sm">
                        <AvatarImage src={item.user.avatarUrl} />
                        <AvatarFallback className="text-[10px] bg-blue-50 text-blue-600 font-bold">
                          {item.user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {item.user.name}
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 font-medium line-clamp-1">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 italic bg-gray-50 p-1.5 rounded border border-gray-100">
                            "{item.description}"
                          </p>
                        )}
                        {item.lead && (
                          <Badge variant="secondary" className="mt-2 text-[9px] px-1.5 py-0 h-4 bg-blue-50 text-blue-600 border-none">
                            {item.lead.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
