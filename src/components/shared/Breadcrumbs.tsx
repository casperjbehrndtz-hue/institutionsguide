import { Link } from "react-router-dom";

/**
 * Breadcrumbs component for navigation hierarchy.
 *
 * API:
 *   items: Array of { label: string; href?: string }
 *     - The last item is treated as the current page (no link).
 *     - All other items render as links.
 *
 * Example usage in InstitutionPage (not edited by this agent):
 *   import Breadcrumbs from "@/components/shared/Breadcrumbs";
 *   <Breadcrumbs items={[
 *     { label: "Forside", href: "/" },
 *     { label: categoryLabel, href: `/${category}` },
 *     { label: institution.name },
 *   ]} />
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 pt-4 pb-1">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          // On mobile (< md), only show first item, parent (second-to-last), and current (last)
          const isFirst = idx === 0;
          const isParent = idx === items.length - 2;
          const mobileHidden =
            items.length > 2 && !isFirst && !isParent && !isLast;

          return (
            <li
              key={idx}
              className={`flex items-center gap-1 ${mobileHidden ? "hidden md:flex" : "flex"}`}
            >
              {idx > 0 && (
                <span className="text-muted/50 select-none" aria-hidden="true">
                  ›
                </span>
              )}
              {isLast || !item.href ? (
                <span className="text-foreground font-medium truncate max-w-[200px]" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="hover:text-primary transition-colors truncate max-w-[200px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
