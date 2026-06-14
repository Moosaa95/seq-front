import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://seqprojects.com';

export const metadata: Metadata = {
  title: 'Our Services',
  description:
    'Explore Sequoia Projects\' full range of real estate services in Abuja — property management, construction, real estate consultancy, and fully managed short-let accommodation.',
  alternates: { canonical: `${BASE_URL}/services` },
  openGraph: {
    title: 'Real Estate Services – Sequoia Projects Ltd',
    description:
      'Property management, construction, consultancy & short-let services in Abuja by Sequoia Projects.',
    url: `${BASE_URL}/services`,
    type: 'website',
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
