import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubmitReview, REVIEW_DIMENSIONS, type DimensionKey, type DimensionRatings } from "@/hooks/useReviews";

interface ReviewFormV2Props {
  institutionId: string;
  onClose?: () => void;
}

const ageGroups = [
  { value: "0-2", da: "0-2 år", en: "0-2 years" },
  { value: "3-5", da: "3-5 år", en: "3-5 years" },
  { value: "6-9", da: "6-9 år", en: "6-9 years" },
  { value: "10-16", da: "10-16 år", en: "10-16 years" },
];

export default function ReviewFormV2({ institutionId, onClose }: ReviewFormV2Props) {
  const { t: _t, language } = useLanguage();
  const { submit, submitting, submitted, error: submitError, reset } = useSubmitReview();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [childAgeGroup, setChildAgeGroup] = useState("");
  const [dimensionRatings, setDimensionRatings] = useState<DimensionRatings>({});
  const [dimensionHover, setDimensionHover] = useState<Partial<Record<DimensionKey, number>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const labels = {
    da: {
      writeReview: "Skriv en anmeldelse",
      yourRating: "Din vurdering",
      name: "Dit navn",
      namePlaceholder: "Fornavn eller kaldenavn",
      titleLabel: "Overskrift",
      titlePlaceholder: "Sammenfat din oplevelse",
      bodyLabel: "Din anmeldelse",
      bodyPlaceholder: "Fortæl om din oplevelse med institutionen...",
      prosLabel: "Fordele",
      prosPlaceholder: "Hvad er godt?",
      consLabel: "Ulemper",
      consPlaceholder: "Hvad kunne være bedre?",
      ageGroup: "Barnets aldersgruppe",
      selectAge: "Vælg aldersgruppe",
      submit: "Send anmeldelse",
      close: "Luk",
      successTitle: "Tak for din anmeldelse!",
      successMessage: "Din anmeldelse er modtaget og vil blive gennemgået inden offentliggørelse.",
      errorRating: "Vælg en vurdering",
      errorName: "Indtast dit navn",
      errorBody: "Skriv din anmeldelse",
      dimensionRatings: "Vurder på dimensioner",
      dimensionOptional: "(valgfrit)",
    },
    en: {
      writeReview: "Write a review",
      yourRating: "Your rating",
      name: "Your name",
      namePlaceholder: "First name or nickname",
      titleLabel: "Title",
      titlePlaceholder: "Summarise your experience",
      bodyLabel: "Your review",
      bodyPlaceholder: "Tell us about your experience with this institution...",
      prosLabel: "Pros",
      prosPlaceholder: "What's good?",
      consLabel: "Cons",
      consPlaceholder: "What could be better?",
      ageGroup: "Child's age group",
      selectAge: "Select age group",
      submit: "Submit review",
      close: "Close",
      successTitle: "Thank you for your review!",
      successMessage: "Your review has been received and will be reviewed before publishing.",
      errorRating: "Select a rating",
      errorName: "Enter your name",
      errorBody: "Write your review",
      dimensionRatings: "Rate by dimension",
      dimensionOptional: "(optional)",
    },
  };

  const l = labels[language as keyof typeof labels] || labels.da;

  if (submitted) {
    return (
      <div className="card p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-success text-xl">&#10003;</span>
        </div>
        <p className="text-lg font-semibold mb-2">{l.successTitle}</p>
        <p className="text-sm text-muted mb-4">{l.successMessage}</p>
        <button
          onClick={() => {
            reset();
            onClose?.();
          }}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {l.close}
        </button>
      </div>
    );
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (rating === 0) newErrors.rating = l.errorRating;
    if (!authorName.trim()) newErrors.authorName = l.errorName;
    if (!body.trim()) newErrors.body = l.errorBody;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await submit({
      institution_id: institutionId,
      author_name: authorName.trim(),
      rating,
      title: title.trim() || undefined,
      body: body.trim(),
      pros: pros.trim() || undefined,
      cons: cons.trim() || undefined,
      child_age_group: childAgeGroup || undefined,
      dimension_ratings: Object.keys(dimensionRatings).length > 0 ? dimensionRatings : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg font-semibold">{l.writeReview}</h3>
        <button type="button" onClick={() => onClose?.()} className="text-muted hover:text-foreground text-sm">
          {l.close}
        </button>
      </div>

      {/* Star rating selector */}
      <div>
        <label className="block text-sm font-medium mb-1">{l.yourRating}</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="text-2xl transition-colors"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              aria-label={`${star} ${star === 1 ? (language === "da" ? "stjerne" : "star") : (language === "da" ? "stjerner" : "stars")}`}
            >
              <span className={star <= (hoverRating || rating) ? "text-warning" : "text-border"}>
                &#9733;
              </span>
            </button>
          ))}
        </div>
        {errors.rating && <p className="text-xs text-destructive mt-1">{errors.rating}</p>}
      </div>

      {/* Dimension ratings */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {l.dimensionRatings} <span className="text-muted font-normal">{l.dimensionOptional}</span>
        </label>
        <div className="space-y-1.5">
          {REVIEW_DIMENSIONS.map((dim) => {
            const dimLabel = language === "da" ? dim.da : dim.en;
            const currentVal = dimensionRatings[dim.key] || 0;
            const hoverVal = dimensionHover[dim.key] || 0;
            return (
              <div key={dim.key} className="flex items-center gap-3">
                <span className="text-xs text-muted w-[130px] shrink-0 truncate">{dimLabel}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="text-base transition-colors p-0 leading-none"
                      onMouseEnter={() => setDimensionHover((prev) => ({ ...prev, [dim.key]: star }))}
                      onMouseLeave={() => setDimensionHover((prev) => ({ ...prev, [dim.key]: 0 }))}
                      onClick={() => {
                        setDimensionRatings((prev) => {
                          // Clicking the same star again clears the rating
                          if (prev[dim.key] === star) {
                            const next = { ...prev };
                            delete next[dim.key];
                            return next;
                          }
                          return { ...prev, [dim.key]: star };
                        });
                      }}
                      aria-label={`${dimLabel} ${star}`}
                    >
                      <span className={star <= (hoverVal || currentVal) ? "text-warning" : "text-border"}>
                        &#9733;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Author name */}
      <div>
        <label htmlFor="rv2-author" className="block text-sm font-medium mb-1">{l.name}</label>
        <input
          id="rv2-author"
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder={l.namePlaceholder}
          maxLength={50}
        />
        {errors.authorName && <p className="text-xs text-destructive mt-1">{errors.authorName}</p>}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="rv2-title" className="block text-sm font-medium mb-1">{l.titleLabel}</label>
        <input
          id="rv2-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder={l.titlePlaceholder}
          maxLength={100}
        />
      </div>

      {/* Body */}
      <div>
        <label htmlFor="rv2-body" className="block text-sm font-medium mb-1">{l.bodyLabel}</label>
        <textarea
          id="rv2-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          placeholder={l.bodyPlaceholder}
          maxLength={2000}
        />
        {errors.body && <p className="text-xs text-destructive mt-1">{errors.body}</p>}
      </div>

      {/* Pros */}
      <div>
        <label htmlFor="rv2-pros" className="block text-sm font-medium mb-1">{l.prosLabel}</label>
        <textarea
          id="rv2-pros"
          value={pros}
          onChange={(e) => setPros(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          placeholder={l.prosPlaceholder}
          maxLength={500}
        />
      </div>

      {/* Cons */}
      <div>
        <label htmlFor="rv2-cons" className="block text-sm font-medium mb-1">{l.consLabel}</label>
        <textarea
          id="rv2-cons"
          value={cons}
          onChange={(e) => setCons(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          placeholder={l.consPlaceholder}
          maxLength={500}
        />
      </div>

      {/* Child age group */}
      <div>
        <label htmlFor="rv2-age" className="block text-sm font-medium mb-1">{l.ageGroup}</label>
        <select
          id="rv2-age"
          value={childAgeGroup}
          onChange={(e) => setChildAgeGroup(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">{l.selectAge}</option>
          {ageGroups.map((ag) => (
            <option key={ag.value} value={ag.value}>
              {language === "da" ? ag.da : ag.en}
            </option>
          ))}
        </select>
      </div>

      {submitError && (
        <p className="text-xs text-destructive">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 px-4 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {submitting ? "..." : l.submit}
      </button>
    </form>
  );
}
