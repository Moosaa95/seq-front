import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://seqprojects.com';

export const metadata: Metadata = {
  title: 'Book an Apartment',
  description:
    'Book a luxury short-let apartment in Abuja with Sequoia Projects. Choose your dates, select a unit, and confirm your stay in minutes.',
  alternates: { canonical: `${BASE_URL}/booking` },
  robots: { index: false, follow: false },
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
