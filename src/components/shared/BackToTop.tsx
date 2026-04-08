import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary-light transition-all flex items-center justify-center opacity-90 hover:opacity-100"
      aria-label="Scroll til toppen"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
}
