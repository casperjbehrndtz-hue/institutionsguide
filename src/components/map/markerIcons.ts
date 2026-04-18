/**
 * Custom hand-drawn SVG pictograms for map pins.
 *
 * Each icon is designed for readability at ~10–12px (inside a 28px teardrop pin).
 * All icons fit a 16×16 viewBox, centered, with stroke-based minimal forms
 * in white on colored pin backgrounds.
 */

export type PinCategory =
  | "vuggestue"
  | "boernehave"
  | "dagpleje"
  | "skole"
  | "sfo"
  | "fritidsklub"
  | "efterskole"
  | "gymnasium";

/**
 * Return SVG path markup for the category icon.
 * Coordinates assume a 16×16 viewBox, drawn with white stroke/fill.
 * The SVG is later scaled to fit inside the pin.
 */
export function getCategoryIcon(category: string): string {
  switch (category as PinCategory) {
    case "vuggestue":
      // Cradle: small head above, rounded bassinet below
      return `<circle cx="8" cy="5.2" r="1.6" fill="#fff"/>
              <path d="M2.8 10.5 Q8 13.2 13.2 10.5 L12.4 8.6 Q8 10.4 3.6 8.6 Z" fill="#fff"/>`;
    case "boernehave":
      // Three children — three small figures side by side
      return `<circle cx="4.2" cy="6" r="1.3" fill="#fff"/>
              <circle cx="8" cy="5.4" r="1.4" fill="#fff"/>
              <circle cx="11.8" cy="6" r="1.3" fill="#fff"/>
              <path d="M2.4 12 Q2.4 9 4.2 9 Q6 9 6 11.5 M6 11.5 Q6 9 8 9 Q10 9 10 11.5 M10 11.5 Q10 9 11.8 9 Q13.6 9 13.6 12" stroke="#fff" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    case "dagpleje":
      // Single child + home: small house with heart inside
      return `<path d="M3.5 13 L3.5 7.5 L8 3.8 L12.5 7.5 L12.5 13 Z" fill="#fff"/>
              <path d="M8 10.8 L6.4 9.3 Q5.6 8.5 6.4 7.8 Q7.2 7.3 8 8.2 Q8.8 7.3 9.6 7.8 Q10.4 8.5 9.6 9.3 Z" fill="currentColor"/>`;
    case "skole": {
      // Open book — two pages meeting at spine
      return `<path d="M2.5 5 L7.6 6.2 L7.6 12.4 L2.5 11.2 Z M13.5 5 L8.4 6.2 L8.4 12.4 L13.5 11.2 Z" fill="#fff"/>
              <path d="M8 6 L8 12.4" stroke="currentColor" stroke-width="0.6" fill="none"/>`;
    }
    case "sfo":
      // Afterschool — sun with rays
      return `<circle cx="8" cy="8" r="2.8" fill="#fff"/>
              <path d="M8 2.8 L8 4.4 M8 11.6 L8 13.2 M2.8 8 L4.4 8 M11.6 8 L13.2 8 M4.3 4.3 L5.4 5.4 M10.6 10.6 L11.7 11.7 M11.7 4.3 L10.6 5.4 M5.4 10.6 L4.3 11.7" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>`;
    case "fritidsklub":
      // Play triangle — sideways, for activity/leisure
      return `<path d="M5.2 3.2 L5.2 12.8 L13 8 Z" fill="#fff"/>`;
    case "efterskole":
      // Tall house with pitched roof and chimney — boarding school
      return `<path d="M2.8 13 L2.8 7.8 L8 3.2 L13.2 7.8 L13.2 13 Z" fill="#fff"/>
              <rect x="10.4" y="4.4" width="1.6" height="2.6" fill="#fff"/>
              <rect x="6.8" y="9.4" width="2.4" height="3.6" fill="currentColor"/>`;
    case "gymnasium":
      // Graduation cap — mortarboard with tassel
      return `<path d="M1.6 6.8 L8 4 L14.4 6.8 L8 9.6 Z" fill="#fff"/>
              <path d="M4.4 8 L4.4 11.2 Q8 13 11.6 11.2 L11.6 8" stroke="#fff" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
              <circle cx="13.6" cy="7.8" r="0.7" fill="#fff"/>
              <path d="M13.6 8 L13.6 10.4" stroke="#fff" stroke-width="0.8"/>`;
    default:
      // Fallback: simple dot
      return `<circle cx="8" cy="8" r="2.4" fill="#fff"/>`;
  }
}
