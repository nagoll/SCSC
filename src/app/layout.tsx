import type { Metadata } from 'next';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, jsonLdScript } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
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
    siteName: 'SCSC',
  },
  twitter: { card: 'summary' },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd) }}
        />
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
