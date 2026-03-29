import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const prevPath = useRef(pathname);

  useEffect(() => {
    // Only scroll to top on PUSH navigation (new page clicks).
    // Skip on POP (browser back/forward) so the user returns to their scroll position.
    if (navType === "PUSH" && pathname !== prevPath.current) {
      window.scrollTo(0, 0);
    }
    prevPath.current = pathname;
  }, [pathname, navType]);

  return null;
}
