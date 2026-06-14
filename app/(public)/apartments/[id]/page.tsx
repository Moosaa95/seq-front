import type { Metadata } from 'next';
import ApartmentDetailClient from './ApartmentDetailClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://seqprojects.com';

async function fetchApartment(id: string) {
  try {
    const res = await fetch(`${API_URL}/apartments/${id}/`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const apt = await fetchApartment(id);
  if (!apt) return {};

  const image = apt.primary_image ?? apt.images?.[0]?.image_url;
  const title = apt.title ?? apt.name;
  const bedsText = apt.bedrooms ? `${apt.bedrooms}-bed` : '';
  const priceText = apt.price ? ` from ₦${Number(apt.price).toLocaleString()}/night` : '';
  const description = apt.description
    ? `${apt.description.slice(0, 155)}…`
    : `${bedsText} apartment${priceText} in ${apt.location ?? 'Abuja'} – Sequoia Projects short-let.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/apartments/${id}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/apartments/${id}`,
      type: 'website',
      images: image ? [{ url: image, alt: title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const apt = await fetchApartment(id);

  const jsonLd = apt
    ? {
        '@context': 'https://schema.org',
        '@type': 'LodgingBusiness',
        '@id': `${BASE_URL}/apartments/${id}`,
        name: apt.title ?? apt.name,
        description: apt.description,
        url: `${BASE_URL}/apartments/${id}`,
        image: apt.primary_image
          ? [apt.primary_image]
          : (apt.images?.map((img: { image_url: string }) => img.image_url) ?? []),
        address: {
          '@type': 'PostalAddress',
          addressLocality: apt.location ?? 'Abuja',
          addressRegion: 'Federal Capital Territory',
          addressCountry: 'NG',
        },
        numberOfRooms: apt.bedrooms,
        amenityFeature: [
          ...(apt.bedrooms ? [{ '@type': 'LocationFeatureSpecification', name: 'Bedrooms', value: apt.bedrooms }] : []),
          ...(apt.bathrooms ? [{ '@type': 'LocationFeatureSpecification', name: 'Bathrooms', value: apt.bathrooms }] : []),
        ],
        ...(apt.price
          ? {
              offers: {
                '@type': 'Offer',
                price: apt.price,
                priceCurrency: apt.currency ?? 'NGN',
                availability: 'https://schema.org/InStock',
              },
            }
          : {}),
        provider: {
          '@type': 'RealEstateAgent',
          name: 'Sequoia Projects Ltd',
          url: BASE_URL,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ApartmentDetailClient apartmentId={id} />
    </>
  );
}
