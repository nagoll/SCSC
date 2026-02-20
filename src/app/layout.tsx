import type { Metadata } from 'next';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'SCSC — Southern California Sports Calendar',
  description:
    'Every sporting event in LA County on one calendar. Professional, college, and junior college — filter by sport, level, area, and more.',
  keywords: [
    'LA sports',
    'Los Angeles sports calendar',
    'SoCal sports',
    'LA County events',
    'USC football',
    'UCLA basketball',
    'Lakers schedule',
    'Dodgers schedule',
    'LAFC schedule',
    'community college sports',
  ],
  openGraph: {
    title: 'SCSC — Southern California Sports Calendar',
    description: 'Every sporting event in LA County on one calendar.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
