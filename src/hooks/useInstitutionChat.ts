import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 10;

export function useInstitutionChat(institutionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const canSendMore = userMessageCount < MAX_MESSAGES;

  const sendMessage = useCallback(
    async (question: string, context: Record<string, unknown>) => {
      if (!supabase || !canSendMore || isLoading) return;

      const trimmed = question.trim();
      if (!trimmed) return;

      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setIsLoading(true);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "institution-chat",
          {
            body: {
              institution_id: institutionId,
              question: trimmed,
              context,
            },
          },
        );

        if (fnError || !data) {
          throw new Error(fnError?.message || "No response");
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        // Remove the user message on failure so they can retry
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [institutionId, canSendMore, isLoading],
  );

  return { messages, sendMessage, isLoading, error, canSendMore };
}
