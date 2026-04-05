import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}

const BASE_URL = "https://institutionsguiden.dk";

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + "…";
}

export default function SEOHead({ title, description, path = "", noIndex }: SEOHeadProps) {
  const { language } = useLanguage();
  const rawTitle = title.includes("Institutionsguide") ? title : `${title} | Institutionsguide`;
  const fullTitle = truncate(rawTitle, 60);
  const safeDescription = truncate(description, 155);
  const url = `${BASE_URL}${path}`;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", safeDescription);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", safeDescription);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:image", `${BASE_URL}/og-image.png`);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:image", `${BASE_URL}/og-image.png`);

    if (noIndex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      setMeta("name", "robots", "index, follow");
    }

    // hreflang
    const setLink = (hreflang: string, href: string) => {
      let el = document.querySelector(`link[hreflang="${hreflang}"]`);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", "alternate");
        el.setAttribute("hreflang", hreflang);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    setLink("da", url);
    setLink("x-default", url);

    // Remove stale en hreflang tags (no English URLs exist)
    document.querySelector('link[hreflang="en"]')?.remove();

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    // lang attribute
    document.documentElement.lang = language;
  }, [fullTitle, safeDescription, url, noIndex, language]);

  return null;
}
