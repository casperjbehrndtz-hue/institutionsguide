import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}

const BASE_URL = "https://institutionsguide.dk";

export default function SEOHead({ title, description, path = "", noIndex }: SEOHeadProps) {
  const { language } = useLanguage();
  const fullTitle = title.includes("Institutionsguide") ? title : `${title} | Institutionsguide`;
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

    setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
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

    // Remove stale en/x-default hreflang tags (no English URLs exist)
    document.querySelector('link[hreflang="en"]')?.remove();
    document.querySelector('link[hreflang="x-default"]')?.remove();

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
  }, [fullTitle, description, url, noIndex, language]);

  return null;
}
