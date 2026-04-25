import type { UnifiedInstitution } from "./types";

export function institutionSchema(
  inst: UnifiedInstitution,
  siteUrl: string,
  reviewData?: { averageRating: number; totalReviews: number },
): object {
  return {
    "@context": "https://schema.org",
    "@type": inst.category === "skole" || inst.category === "efterskole" ? "School" : "ChildCare",
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
    ...(inst.yearlyPrice ? {
      priceRange: `${inst.yearlyPrice} DKK/år`,
    } : inst.monthlyRate ? {
      priceRange: `${inst.monthlyRate} DKK/md`,
    } : {}),
    ...(reviewData && reviewData.totalReviews > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: reviewData.averageRating,
        bestRating: 5,
        worstRating: 1,
        ratingCount: reviewData.totalReviews,
      },
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
    name: "Institutionsguiden",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function itemListSchema(
  items: { name: string; url: string }[],
  siteUrl: string,
  listName?: string,
): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(listName && { name: listName }),
    numberOfItems: items.length,
    itemListElement: items.slice(0, 10).map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
    })),
  };
}
