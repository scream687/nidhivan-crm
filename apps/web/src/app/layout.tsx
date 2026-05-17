import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Nidhivan CRM',
  description: 'NIDHIVAN PROPERTY LINKERS® — Real Estate CRM',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster position="top-right" closeButton richColors />
      </body>
    </html>
  );
}

