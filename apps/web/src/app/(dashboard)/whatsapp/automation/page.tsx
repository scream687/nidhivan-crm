'use client';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, Megaphone } from 'lucide-react';

export default function AutomationPage() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-6 h-6 text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Automation</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto">
          <Megaphone className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">WhatsApp drip sequences are in Nurture</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          You can set up automated WhatsApp follow-ups using the <strong>Nurture Sequences</strong> feature in Marketing.
          Choose a trigger stage, add steps with delay days, select type <strong>WHATSAPP</strong>, and write your message template.
          The system will auto-send when leads move into that stage.
        </p>
        <button onClick={() => router.push('/marketing/nurture')}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-3 rounded-xl transition">
          Go to Nurture Sequences <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-6 bg-blue-50 rounded-xl border border-blue-100 p-5 space-y-3">
        <h3 className="font-semibold text-blue-900 text-sm">Also useful:</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span><strong>Workflows</strong> — trigger actions (tasks, notifications) when leads are created or stage changes</span>
          </div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 flex-shrink-0" />
            <span><strong>Campaigns</strong> — send bulk WhatsApp messages to a segment all at once</span>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => router.push('/workflows')}
            className="text-xs border border-blue-200 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
            Open Workflows
          </button>
          <button onClick={() => router.push('/marketing/campaigns')}
            className="text-xs border border-blue-200 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
            Open Campaigns
          </button>
        </div>
      </div>
    </div>
  );
}
