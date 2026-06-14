import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://seqprojects.com';

export const metadata: Metadata = {
  title: 'Properties',
  description:
    'Browse Sequoia Projects\' portfolio of properties in Abuja — residential buildings, commercial complexes, and luxury short-let apartments in prime FCT locations.',
  alternates: { canonical: `${BASE_URL}/properties` },
  openGraph: {
    title: 'Properties – Sequoia Projects Ltd',
    description:
      'Browse our portfolio of residential and commercial properties in Abuja, Nigeria.',
    url: `${BASE_URL}/properties`,
    type: 'website',
  },
};

export default function PropertiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
