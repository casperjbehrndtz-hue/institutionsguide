import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Review } from "@/lib/types";

interface ReviewFormProps {
  onClose: () => void;
}

export default function ReviewForm({ onClose }: ReviewFormProps) {
  const { t, language } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [relationship, setRelationship] = useState<Review["relationship"]>("parent");
  const [authorName, setAuthorName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const relationshipOptions: { value: Review["relationship"]; da: string; en: string }[] = [
    { value: "parent", da: "Forælder", en: "Parent" },
    { value: "employee", da: "Medarbejder", en: "Employee" },
    { value: "student", da: "Elev", en: "Student" },
    { value: "other", da: "Andet", en: "Other" },
  ];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (rating === 0) newErrors.rating = t.reviews.errorRating;
    if (!title.trim()) newErrors.title = t.reviews.errorTitle;
    if (!body.trim()) newErrors.body = t.reviews.errorBody;
    if (!authorName.trim()) newErrors.authorName = t.reviews.errorName;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold mb-2">{t.reviews.comingSoon}</p>
        <p className="text-sm text-muted mb-4">{t.reviews.comingSoonMessage}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t.common.close}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg font-semibold">{t.reviews.writeReview}</h3>
        <button type="button" onClick={onClose} className="text-muted hover:text-foreground text-sm">
          {t.common.close}
        </button>
      </div>

      {/* Star rating selector */}
      <div>
        <label className="block text-sm font-medium mb-1">{t.reviews.yourRating}</label>
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
                ★
              </span>
            </button>
          ))}
        </div>
        {errors.rating && <p className="text-xs text-destructive mt-1">{errors.rating}</p>}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="review-title" className="block text-sm font-medium mb-1">
          {t.reviews.reviewTitle}
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder={t.reviews.titlePlaceholder}
          maxLength={100}
        />
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
      </div>

      {/* Body */}
      <div>
        <label htmlFor="review-body" className="block text-sm font-medium mb-1">
          {t.reviews.reviewBody}
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          placeholder={t.reviews.bodyPlaceholder}
          maxLength={1000}
        />
        {errors.body && <p className="text-xs text-destructive mt-1">{errors.body}</p>}
      </div>

      {/* Relationship */}
      <div>
        <label htmlFor="review-relationship" className="block text-sm font-medium mb-1">
          {t.reviews.relationship}
        </label>
        <select
          id="review-relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as Review["relationship"])}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {relationshipOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {language === "da" ? opt.da : opt.en}
            </option>
          ))}
        </select>
      </div>

      {/* Author name */}
      <div>
        <label htmlFor="review-author" className="block text-sm font-medium mb-1">
          {t.reviews.displayName}
        </label>
        <input
          id="review-author"
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder={t.reviews.namePlaceholder}
          maxLength={50}
        />
        {errors.authorName && <p className="text-xs text-destructive mt-1">{errors.authorName}</p>}
      </div>

      <button
        type="submit"
        className="w-full py-2.5 px-4 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        {t.reviews.submit}
      </button>
    </form>
  );
}
