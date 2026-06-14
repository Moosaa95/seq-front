import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://seqprojects.com'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

async function fetchIds(endpoint: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/${endpoint}/`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    const items = Array.isArray(data) ? data : (data.results ?? [])
    return items.map((item: { id: string | number }) => String(item.id))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [propertyIds, apartmentIds] = await Promise.all([
    fetchIds('properties'),
    fetchIds('apartments'),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/properties`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/services`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  const propertyPages: MetadataRoute.Sitemap = propertyIds.map((id) => ({
    url: `${BASE_URL}/properties/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const apartmentPages: MetadataRoute.Sitemap = apartmentIds.map((id) => ({
    url: `${BASE_URL}/apartments/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticPages, ...propertyPages, ...apartmentPages]
}
