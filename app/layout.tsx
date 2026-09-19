import type { Metadata } from 'next';
import Link from 'next/link';
import { Mark } from '@/components/Mark';
import './globals.css';

export const metadata: Metadata = {
  title: 'On Me — leave dinner for someone you will never meet',
  description:
    'Suspended meals for the Blackbird network. Escrowed in USDC, released only when a Flynet check-in proves the claimer is in the restaurant.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="brand">
            <Mark className="brand-mark" />
            On <em>Me</em>
          </Link>
          <div style={{ flex: 1 }} />
          <Link href="/">Map</Link>
          <Link href="/leave">Leave one</Link>
          <Link href="/claim">Claim</Link>
          <Link href="/wall">The wall</Link>
          <Link href="/how">How it works</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
