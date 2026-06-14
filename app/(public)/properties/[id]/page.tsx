import type { Metadata } from 'next';
import PropertyDetailClient from './PropertyDetailClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://seqprojects.com';

async function fetchProperty(id: string) {
  try {
    const res = await fetch(`${API_URL}/properties/${id}/`, { next: { revalidate: 3600 } });
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
  const property = await fetchProperty(id);
  if (!property) return {};

  const image = property.images?.[0]?.image_url;
  const title = property.name;
  const description = property.description
    ? `${property.description.slice(0, 155)}…`
    : `View ${title} – luxury real estate by Sequoia Projects in Abuja.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/properties/${id}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/properties/${id}`,
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

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await fetchProperty(id);

  const jsonLd = property
    ? {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: property.name,
        description: property.description,
        url: `${BASE_URL}/properties/${id}`,
        image: property.images?.map((img: { image_url: string }) => img.image_url) ?? [],
        address: {
          '@type': 'PostalAddress',
          streetAddress: property.address,
          addressLocality: 'Abuja',
          addressRegion: 'Federal Capital Territory',
          addressCountry: 'NG',
        },
        ...(property.latitude && property.longitude
          ? { geo: { '@type': 'GeoCoordinates', latitude: property.latitude, longitude: property.longitude } }
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
      <PropertyDetailClient propertyId={id} />
    </>
  );
}
