import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell } from "lucide-react";
import Button from "@/components/ui/Button";

interface PriceAlertSignupProps {
  municipality?: string;
  category?: string;
  compact?: boolean;
}

const t = {
  da: {
    heading: "Få besked når priserne ændres",
    description: "Vi sender dig en email når priserne opdateres i dit område.",
    emailPlaceholder: "Din email",
    gdprLabel: "Jeg accepterer at modtage prisændringer per email. Du kan altid afmelde dig.",
    subscribe: "Tilmeld",
    success: "Du er nu tilmeldt prisændringer!",
    errorEmail: "Indtast en gyldig email",
    errorGdpr: "Du skal acceptere betingelserne",
    errorGeneric: "Noget gik galt. Prøv igen.",
  },
  en: {
    heading: "Get notified when prices change",
    description: "We'll send you an email when prices are updated in your area.",
    emailPlaceholder: "Your email",
    gdprLabel: "I agree to receive price change notifications by email. You can unsubscribe at any time.",
    subscribe: "Subscribe",
    success: "You're now subscribed to price alerts!",
    errorEmail: "Enter a valid email",
    errorGdpr: "You must accept the terms",
    errorGeneric: "Something went wrong. Please try again.",
  },
};

export default function PriceAlertSignup({ municipality, category, compact = false }: PriceAlertSignupProps) {
  const [email, setEmail] = useState("");
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Default to Danish
  const lang = "da";
  const labels = t[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg(labels.errorEmail);
      return;
    }

    if (!gdprAccepted) {
      setErrorMsg(labels.errorGdpr);
      return;
    }

    setStatus("loading");

    const alertData = {
      email: email.trim(),
      municipality: municipality || null,
      category: category || null,
      alert_type: "price_change",
    };

    try {
      if (supabase) {
        const { error } = await supabase.from("email_alerts").insert(alertData);
        if (error && error.code !== "23505") {
          // 23505 = unique violation (already subscribed), treat as success
          throw error;
        }
      } else {
        // Fallback to localStorage
        const existing = JSON.parse(localStorage.getItem("ig_price_alerts") || "[]");
        const isDuplicate = existing.some(
          (a: typeof alertData) =>
            a.email === alertData.email &&
            a.municipality === alertData.municipality &&
            a.category === alertData.category
        );
        if (!isDuplicate) {
          existing.push({ ...alertData, created_at: new Date().toISOString() });
          localStorage.setItem("ig_price_alerts", JSON.stringify(existing));
        }
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg(labels.errorGeneric);
    }
  };

  if (status === "success") {
    return (
      <div className={`flex items-center gap-2 ${compact ? "py-2" : "card p-5"} text-success`}>
        <Bell className="w-4 h-4" />
        <span className="text-sm font-medium">{labels.success}</span>
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{labels.heading}</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={labels.emailPlaceholder}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button type="submit" variant="primary" size="sm" loading={status === "loading"}>
            {labels.subscribe}
          </Button>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={gdprAccepted}
            onChange={(e) => setGdprAccepted(e.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span className="text-xs text-muted leading-tight">{labels.gdprLabel}</span>
        </label>
        {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
      </form>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">{labels.heading}</h3>
          <p className="text-sm text-muted mt-0.5">{labels.description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={labels.emailPlaceholder}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button type="submit" variant="primary" size="sm" loading={status === "loading"}>
            {labels.subscribe}
          </Button>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={gdprAccepted}
            onChange={(e) => setGdprAccepted(e.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span className="text-xs text-muted leading-tight">{labels.gdprLabel}</span>
        </label>

        {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
      </form>
    </div>
  );
}
