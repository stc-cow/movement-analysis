/**
 * useChat Hook
 * React hook for COW Movement POT chatbot interactions
 */

import { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/cowMovementChatbot";

interface UseChatOptions {
  sessionId?: string;
}

export function useCOWChatbot(options?: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(options?.sessionId || `session_${Date.now()}`);

  /**
   * Send a message to the chatbot
   */
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      setLoading(true);
      setError(null);

      try {
        // Add user message to state
        const userMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "user",
          content: userMessage,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);

        // Send to backend
        const response = await fetch("/api/chatbot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message: userMessage,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          // Add assistant message
          const assistantMsg: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random()}`,
            role: "assistant",
            content: result.data.message,
            timestamp: new Date(),
            metadata: {
              query_type: result.data.queryType,
              confidence: result.data.context?.confidence,
              sources: result.data.context?.sources,
            },
          };

          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          throw new Error(result.error || "Unknown error");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);

        // Add error message
        const errorMsg: ChatMessage = {
          id: `msg_${Date.now()}_error`,
          role: "assistant",
          content: `❌ Error: ${errorMessage}`,
          timestamp: new Date(),
          metadata: {
            query_type: "ERROR",
            confidence: 0,
          },
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  /**
   * Get chat history
   */
  const getHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/chatbot/history/${sessionId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const result = await response.json();
      return result.data.history;
    } catch (err) {
      console.error("Failed to fetch history:", err);
      return [];
    }
  }, [sessionId]);

  /**
   * Clear history
   */
  const clearHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/chatbot/history/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear history");
      }

      setMessages([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }, [sessionId]);

  /**
   * Get chatbot status
   */
  const getStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/chatbot/status");

      if (!response.ok) {
        throw new Error("Failed to fetch status");
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      console.error("Failed to fetch status:", err);
      return null;
    }
  }, []);

  return {
    messages,
    loading,
    error,
    sessionId,
    sendMessage,
    getHistory,
    clearHistory,
    getStatus,
  };
}
