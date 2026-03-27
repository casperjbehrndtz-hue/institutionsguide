const SUITE_LINKS = [
  { label: "NemtBudget", href: "https://nemtbudget.nu" },
  { label: "ParFinans", href: "https://parfinans.dk" },
  { label: "Børneskat", href: "https://børneskat.dk" },
  { label: "Institutionsguide", href: "/", current: true },
];

export default function SuiteBar() {
  return (
    <div className="bg-[#1A2632] text-white/90 text-[10px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-6 flex items-center justify-end gap-3">
        <span className="text-white/50 hidden sm:inline">
          Del af ParFinans-familien
        </span>
        {SUITE_LINKS.map((link, i) => (
          <span key={link.label} className="inline-flex items-center gap-3">
            {i > 0 && <span className="text-white/30">·</span>}
            {link.current ? (
              <span className="text-white font-medium">{link.label}</span>
            ) : (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors font-medium"
              >
                {link.label}
              </a>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
