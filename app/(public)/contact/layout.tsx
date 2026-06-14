import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://seqprojects.com';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Sequoia Projects Ltd. Visit us in Abuja or send a message — our team is ready to help with property management, short-let bookings, and real estate consultancy.',
  alternates: { canonical: `${BASE_URL}/contact` },
  openGraph: {
    title: 'Contact Sequoia Projects Ltd',
    description:
      'Reach out to Sequoia Projects in Abuja for property management, short-let bookings, and real estate consultancy.',
    url: `${BASE_URL}/contact`,
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
