import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, ChevronDown, ChevronUp, Loader2, MessageCircle } from "lucide-react";
import { useInstitutionChat, type ChatMessage } from "@/hooks/useInstitutionChat";
import { supabase } from "@/lib/supabase";

interface Props {
  institutionId: string;
  category: string;
  context: Record<string, unknown>;
  language: "da" | "en";
}

const SCHOOL_CATEGORIES = new Set(["skole", "efterskole", "gymnasium"]);

/**
 * AI Insight Box — auto-generates a narrative description of the institution
 * focusing on what the data MEANS for parents, not just repeating numbers.
 * Also allows follow-up questions.
 */
export default function InstitutionChat({ institutionId, category, context, language }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchedRef = useRef(false);
  const { messages, sendMessage, isLoading, error, canSendMore } = useInstitutionChat(institutionId);

  const isSchool = SCHOOL_CATEGORIES.has(category);
  const userCount = messages.filter((m) => m.role === "user").length;

  // Auto-fetch insight on mount
  const fetchInsight = useCallback(async () => {
    if (fetchedRef.current || !supabase) return;
    fetchedRef.current = true;
    setInsightLoading(true);
    setInsightError(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "institution-chat",
        {
          body: {
            institution_id: institutionId,
            question: language === "da"
              ? "Giv mig en samlet vurdering af denne institution. Fokuser på hvad tallene betyder i praksis for en forælder: Hvad er institutionens styrker og svagheder i kontekst? Hvordan adskiller den sig fra lignende institutioner? Hvad bør man som forælder være opmærksom på? Undgå at gentage rå tal — fortolk dem i stedet."
              : "Give me an overall assessment of this institution. Focus on what the numbers mean in practice for a parent: What are the institution's contextual strengths and weaknesses? How does it differ from similar institutions? What should parents be aware of? Avoid repeating raw numbers — interpret them instead.",
            context,
          },
        },
      );

      if (fnError || !data) throw new Error("Failed");
      setInsight(data.answer);
    } catch {
      setInsightError(true);
    } finally {
      setInsightLoading(false);
    }
  }, [institutionId, context, language]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading || !canSendMore) return;
    sendMessage(input, context);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestionsDA = isSchool
    ? ["Passer den til et stille barn?", "Hvordan er det sociale miljø?", "Er lærerne erfarne?"]
    : ["Passer den til et barn med særlige behov?", "Hvordan er hverdagen?", "Er der venteliste?"];
  const suggestionsEN = isSchool
    ? ["Is it good for a quiet child?", "How is the social environment?", "Are the teachers experienced?"]
    : ["Is it good for a child with special needs?", "What's the daily routine like?", "Is there a waiting list?"];
  const suggestions = language === "da" ? suggestionsDA : suggestionsEN;

  // Show retry state instead of hiding entirely
  const showRetry = insightError && !insight && !insightLoading;

  return (
    <div>
      <div className="rounded-2xl overflow-hidden border border-primary/10 bg-primary/[0.02]">
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-primary">
              {language === "da" ? `Spørg om ${context.name || "institutionen"}` : `Ask about ${context.name || "the institution"}`}
            </div>
            <div className="text-[11px] text-muted">
              {language === "da" ? "AI-indsigt baseret på officielle data" : "AI insight based on official data"}
            </div>
          </div>
          <button onClick={() => setIsOpen((o) => !o)} className="p-1 cursor-pointer">
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted" />
            )}
          </button>
        </div>

        {isOpen && (
          <div className="border-t border-primary/15">
            {/* Auto-generated insight */}
            <div className="px-5 py-4">
              {insightLoading && (
                <div className="flex items-center gap-2.5 text-muted py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm">
                    {language === "da" ? "Analyserer institution..." : "Analyzing institution..."}
                  </span>
                </div>
              )}
              {showRetry && (
                <div className="text-center py-3">
                  <p className="text-sm text-muted mb-2">
                    {language === "da" ? "Kunne ikke hente AI-indsigt." : "Could not load AI insight."}
                  </p>
                  <button
                    onClick={() => { fetchedRef.current = false; fetchInsight(); }}
                    className="text-sm text-primary font-medium hover:underline cursor-pointer"
                  >
                    {language === "da" ? "Prøv igen" : "Try again"}
                  </button>
                </div>
              )}
              {insight && (
                <div className="space-y-3">
                  <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-line">
                    {insight}
                  </p>
                  <p className="text-[10px] text-muted flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
                    {language === "da" ? "AI-genereret indsigt baseret på offentlige data" : "AI-generated insight based on public data"}
                  </p>
                </div>
              )}
            </div>

            {/* Divider + follow-up section */}
            {insight && (
              <div className="border-t border-primary/10">
                {!showChat ? (
                  <button
                    onClick={() => {
                      setShowChat(true);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm text-primary hover:bg-primary/5 transition-colors cursor-pointer min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {language === "da" ? "Stil et opfølgende spørgsmål" : "Ask a follow-up question"}
                  </button>
                ) : (
                  <div className="px-4 py-3 space-y-3">
                    {/* Suggestion chips when no follow-ups yet */}
                    {messages.length === 0 && (
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((q) => (
                          <button
                            key={q}
                            onClick={() => {
                              if (!isLoading && canSendMore) sendMessage(q, context);
                            }}
                            disabled={isLoading}
                            className="text-xs px-3.5 py-2 rounded-full border border-primary/15 bg-primary/[0.04] text-primary font-medium hover:bg-primary/10 hover:border-primary/25 transition-all min-h-[32px] disabled:opacity-50 cursor-pointer"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Follow-up messages */}
                    {messages.length > 0 && (
                      <div className="max-h-[280px] overflow-y-auto space-y-2.5">
                        {messages.map((msg, i) => (
                          <ChatBubble key={i} message={msg} />
                        ))}
                        {isLoading && (
                          <div className="flex items-center gap-2 text-muted">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs">{language === "da" ? "Tænker..." : "Thinking..."}</span>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}

                    {error && (
                      <p className="text-xs text-red-500">
                        {language === "da" ? "Noget gik galt. Prøv igen." : "Something went wrong. Try again."}
                      </p>
                    )}

                    {/* Input */}
                    {canSendMore ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={inputRef}
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={language === "da" ? "Stil et spørgsmål..." : "Ask a question..."}
                          disabled={isLoading}
                          className="flex-1 text-sm bg-transparent border border-border rounded-lg px-3 py-2.5 min-h-[44px] text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                        />
                        <button
                          onClick={handleSend}
                          disabled={!input.trim() || isLoading}
                          className="shrink-0 w-[44px] h-[44px] flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary-light transition-colors disabled:opacity-40 cursor-pointer"
                          aria-label="Send"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted text-center">
                        {language === "da"
                          ? "Du har brugt alle 10 spørgsmål i denne session."
                          : "You have used all 10 questions in this session."}
                      </p>
                    )}
                    {messages.length > 0 && canSendMore && (
                      <p className="text-[10px] text-muted text-right">
                        {userCount}/10 {language === "da" ? "spørgsmål brugt" : "questions used"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-border/30 text-foreground rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
