import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://seqprojects.com';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about Sequoia Projects Ltd — Abuja\'s trusted real estate firm since 2017, delivering property management, construction, consultancy, and short-let services to 200+ satisfied clients.',
  alternates: { canonical: `${BASE_URL}/about` },
  openGraph: {
    title: 'About Sequoia Projects Ltd',
    description:
      'Abuja\'s trusted real estate firm since 2017 — property management, construction, consultancy & short-let services.',
    url: `${BASE_URL}/about`,
    type: 'website',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
