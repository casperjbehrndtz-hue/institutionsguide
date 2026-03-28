import { useState } from "react";
import { Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  title: string;
  url: string;
}

export default function ShareButton({ title, url }: Props) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        // User cancelled or share failed — ignore
      }
      return;
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <button
      onClick={handleShare}
      className="p-2 rounded-lg text-muted hover:text-primary hover:bg-border/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center relative"
      aria-label={t.share.share}
      title={t.share.share}
    >
      <Share2 className="w-5 h-5" />
      {copied && (
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-foreground text-bg text-xs font-medium animate-fade-in">
          {t.share.linkCopied}
        </span>
      )}
    </button>
  );
}
