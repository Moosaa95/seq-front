import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { StoreProvider } from "@/lib/store/StoreProvider";
import { AuthInitializer } from "@/components/AuthInitializer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://seqprojects.com"
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Sequoia Projects Ltd – Premier Real Estate in Abuja",
    template: "%s | Sequoia Projects Ltd",
  },
  description:
    "Your premier destination for comprehensive real estate services in Abuja, Nigeria. Property management, construction, consultancy, and short-let services since 2017. Trusted by 200+ clients.",

  keywords: [
    "real estate Abuja",
    "property management Nigeria",
    "luxury apartments Abuja",
    "short let Abuja",
    "property consultancy Abuja",
    "construction company Nigeria",
    "Sequoia Projects",
    "buy property Abuja",
    "rent apartment Abuja",
    "FCT real estate",
    "Jabi apartments",
    "Maitama real estate",
  ],

  authors: [{ name: "Sequoia Projects Ltd" }],
  creator: "Sequoia Projects Ltd",
  publisher: "Sequoia Projects Ltd",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    title: "Sequoia Projects Ltd – Premier Real Estate in Abuja",
    description:
      "Property management, construction, consultancy & short-let services in Abuja. Trusted by 200+ clients since 2017.",
    url: BASE_URL,
    siteName: "Sequoia Projects Ltd",
    type: "website",
    locale: "en_NG",
  },

  twitter: {
    card: "summary_large_image",
    title: "Sequoia Projects Ltd – Premier Real Estate in Abuja",
    description:
      "Property management, construction, consultancy & short-let services in Abuja since 2017.",
  },

  alternates: {
    canonical: BASE_URL,
  },

  verification: {
    // google: "YOUR_GOOGLE_SEARCH_CONSOLE_TOKEN",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "Sequoia Projects Ltd",
  description:
    "Premier real estate services in Abuja, Nigeria — property management, construction, consultancy, and short-let accommodation since 2017.",
  url: BASE_URL,
  logo: `${BASE_URL}/icon`,
  foundingDate: "2017",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Abuja",
    addressRegion: "Federal Capital Territory",
    addressCountry: "NG",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 9.0765,
    longitude: 7.3986,
  },
  areaServed: [
    { "@type": "City", name: "Abuja" },
  ],
  knowsAbout: [
    "Property Management",
    "Construction",
    "Real Estate Consultancy",
    "Short-Let Accommodation",
    "Airbnb Management",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Real Estate Services",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Property Management" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Construction" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Real Estate Consultancy" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Short-Let & Airbnb Management" } },
    ],
  },
  sameAs: [],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth overflow-x-hidden">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-white overflow-x-hidden`} suppressHydrationWarning>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
        <StoreProvider>
          <AuthInitializer>
            <main className="min-h-screen overflow-x-hidden">{children}</main>
          </AuthInitializer>
        </StoreProvider>
      </body>
    </html>
  );
}
