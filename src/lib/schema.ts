import type { UnifiedInstitution } from "./types";

export function institutionSchema(inst: UnifiedInstitution, siteUrl: string): object {
  return {
    "@context": "https://schema.org",
    "@type": inst.category === "skole" ? "School" : "ChildCare",
    name: inst.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: inst.address,
      addressLocality: inst.city,
      postalCode: String(inst.postalCode),
      addressRegion: inst.municipality,
      addressCountry: "DK",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: inst.lat,
      longitude: inst.lng,
    },
    url: `${siteUrl}/institution/${inst.id}`,
    ...(inst.phone && { telephone: inst.phone }),
    ...(inst.email && { email: inst.email }),
    ...(inst.web && { sameAs: inst.web.startsWith("http") ? inst.web : `https://${inst.web}` }),
    ...(inst.monthlyRate && {
      priceRange: `${inst.monthlyRate} DKK/md`,
    }),
  };
}

export function faqSchema(faqs: { q: string; a: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function websiteSchema(siteUrl: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Institutionsguide",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
