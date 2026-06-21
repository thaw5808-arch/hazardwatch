import type { Metadata } from 'next';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'HazardWatch — Real-time Disaster Monitoring',
  description: 'Real-time weather forecasting and multi-disaster monitoring platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
