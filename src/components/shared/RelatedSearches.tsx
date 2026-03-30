import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { toSlug, CATEGORY_LABELS_DA, CATEGORY_SINGULAR_DA, DAYCARE_CATEGORY_SLUGS, VS_PAIRS, vsSlug, type CategorySlug } from "@/lib/slugs";

interface Props {
  municipality?: string;
  category?: CategorySlug;
}

interface SearchLink {
  label: string;
  to: string;
}

export default function RelatedSearches({ municipality, category }: Props) {
  const { municipalities, institutions } = useData();

  const nearbyMunicipalities = useMemo(() => {
    if (!municipality) return [];
    const idx = municipalities.findIndex((m) => m.municipality === municipality);
    if (idx === -1) return [];
    const nearby: string[] = [];
    for (let i = Math.max(0, idx - 3); i <= Math.min(municipalities.length - 1, idx + 3); i++) {
      if (municipalities[i].municipality !== municipality) {
        nearby.push(municipalities[i].municipality);
      }
    }
    return nearby;
  }, [municipalities, municipality]);

  const links = useMemo(() => {
    const result: SearchLink[] = [];

    if (municipality) {
      const slug = toSlug(municipality);

      // Cheapest daycare links
      for (const cat of DAYCARE_CATEGORY_SLUGS) {
        if (category === cat) continue;
        const hasInsts = institutions.some(
          (i) => i.category === cat && i.municipality === municipality
        );
        if (hasInsts) {
          result.push({
            label: `Billigste ${CATEGORY_SINGULAR_DA[cat]} i ${municipality}`,
            to: `/billigste-${cat}/${slug}`,
          });
        }
      }

      // Best schools
      if (category !== "skole") {
        const hasSchools = institutions.some(
          (i) => i.category === "skole" && i.municipality === municipality && i.quality?.r !== undefined
        );
        if (hasSchools) {
          result.push({
            label: `Bedste skoler i ${municipality}`,
            to: `/bedste-skole/${slug}`,
          });
        }
      }

      // Best dagtilbud links
      const bedsteCats: CategorySlug[] = ["vuggestue", "boernehave", "dagpleje", "sfo"];
      for (const bCat of bedsteCats) {
        if (category === bCat) continue;
        const hasInsts = institutions.some(
          (i) => i.category === bCat && i.municipality === municipality
        );
        if (hasInsts) {
          result.push({
            label: `Bedste ${CATEGORY_SINGULAR_DA[bCat]} i ${municipality}`,
            to: `/bedste-${bCat}/${slug}`,
          });
        }
      }

      // VS comparison links
      for (const [a, b] of VS_PAIRS) {
        if (category && category !== a && category !== b) continue;
        const hasA = institutions.some((i) => i.category === a && i.municipality === municipality);
        const hasB = institutions.some((i) => i.category === b && i.municipality === municipality);
        if (hasA && hasB) {
          result.push({
            label: `${CATEGORY_SINGULAR_DA[a].charAt(0).toUpperCase() + CATEGORY_SINGULAR_DA[a].slice(1)} vs ${CATEGORY_SINGULAR_DA[b]} i ${municipality}`,
            to: `/sammenlign/${vsSlug(a, b)}/${slug}`,
          });
        }
      }

      // Normering link
      result.push({
        label: `Normering i ${municipality}`,
        to: `/normering/${slug}`,
      });

      // Category pages for this municipality
      if (category) {
        const otherCats: CategorySlug[] = (["vuggestue", "boernehave", "dagpleje", "skole", "sfo"] as CategorySlug[]).filter(
          (c) => c !== category
        );
        for (const c of otherCats) {
          const hasInsts = institutions.some(
            (i) => i.category === c && i.municipality === municipality
          );
          if (hasInsts) {
            result.push({
              label: `${CATEGORY_LABELS_DA[c]} i ${municipality}`,
              to: `/${c}/${slug}`,
            });
          }
        }
      }

      // Nearby municipality links
      for (const m of nearbyMunicipalities.slice(0, 4)) {
        if (category) {
          result.push({
            label: `${CATEGORY_LABELS_DA[category]} i ${m}`,
            to: `/${category}/${toSlug(m)}`,
          });
        } else {
          result.push({
            label: `Institutioner i ${m}`,
            to: `/kommune/${encodeURIComponent(m)}`,
          });
        }
      }
    } else if (category) {
      // No municipality context — show top cities for this category
      const topCities = ["København", "Aarhus", "Odense", "Aalborg", "Frederiksberg"];
      for (const city of topCities) {
        result.push({
          label: `${CATEGORY_LABELS_DA[category]} i ${city}`,
          to: `/${category}/${toSlug(city)}`,
        });
      }
      if ((DAYCARE_CATEGORY_SLUGS as readonly string[]).includes(category)) {
        for (const city of topCities.slice(0, 3)) {
          result.push({
            label: `Billigste ${CATEGORY_SINGULAR_DA[category]} i ${city}`,
            to: `/billigste-${category}/${toSlug(city)}`,
          });
        }
      }
    } else {
      // No municipality or category context — show general links
      const topCities = ["København", "Aarhus", "Odense", "Aalborg", "Frederiksberg"];
      for (const city of topCities) {
        result.push({
          label: `Institutioner i ${city}`,
          to: `/kommune/${encodeURIComponent(city)}`,
        });
      }
      for (const cat of DAYCARE_CATEGORY_SLUGS) {
        result.push({
          label: CATEGORY_LABELS_DA[cat],
          to: `/${cat}`,
        });
      }
      result.push({ label: "Prissammenligning", to: "/prissammenligning" });
      result.push({ label: "Bedste værdi for pengene", to: "/bedste-vaerdi" });
    }

    return result;
  }, [municipality, category, institutions, nearbyMunicipalities]);

  if (links.length === 0) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">
        Relaterede søgninger
      </h2>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
