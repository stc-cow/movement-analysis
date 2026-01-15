import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle, Brain } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

export default function AIChatAgent() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm your AI Chat Agent. I can help you with questions about cow movements, logistics, analytics, or anything else you'd like to know. What can I help you with today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();

    // Movement and logistics related questions
    if (
      lowerQuestion.includes("movement") ||
      lowerQuestion.includes("cow") ||
      lowerQuestion.includes("location")
    ) {
      const responses = [
        "Based on the data, cow movements are typically tracked from warehouses to distribution hubs. You can create new movements using the AI Movement tracker to log these transfers.",
        "Movement patterns show that most COWs are transferred between regions to optimize logistics efficiency. Would you like to know more about specific movement data?",
        "To track a movement, you'll need the COW ID, source location, destination, and date. Our system automatically logs all transfers for analysis.",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Analytics related questions
    if (
      lowerQuestion.includes("analytics") ||
      lowerQuestion.includes("data") ||
      lowerQuestion.includes("report")
    ) {
      const responses = [
        "Our analytics dashboard provides comprehensive insights into movement patterns, distribution efficiency, and regional performance. Visit the Dashboard to explore detailed reports.",
        "Data visualization helps us identify trends and optimize operations. The dashboard shows KPIs, movement distribution, and warehouse utilization metrics.",
        "Analytics reveal that efficient movement planning reduces costs and improves delivery times. Would you like specific insights from our dashboard?",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // General knowledge questions
    if (
      lowerQuestion.includes("help") ||
      lowerQuestion.includes("how") ||
      lowerQuestion.includes("what")
    ) {
      const responses = [
        "I'm here to assist! I can help you understand cow movement tracking, answer logistics questions, or discuss analytics insights. What specifically would you like to know?",
        "Feel free to ask me anything - whether it's about the system features, general knowledge, or specific business questions. I'll do my best to help!",
        "You can ask me about movements, analytics, locations, or any general topic. I'm powered by advanced AI to provide helpful answers.",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Greeting responses
    if (
      lowerQuestion.includes("hello") ||
      lowerQuestion.includes("hi") ||
      lowerQuestion.includes("hey")
    ) {
      const responses = [
        "Hello! Great to see you. How can I assist you today?",
        "Hi there! What questions can I answer for you?",
        "Hey! I'm ready to help. What would you like to know?",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Default response for any topic
    const defaultResponses = [
      "That's an interesting question! While I'm specialized in cow movement analytics, I can try to help. Could you provide more details?",
      "I understand your question. Let me provide some insights: Based on best practices and available data, the answer involves careful planning and optimization.",
      "Great question! This is an important topic. The key factors to consider are efficiency, accuracy, and real-time monitoring. Would you like more specific information?",
      "I appreciate the question. The answer depends on various factors like logistics, planning, and available resources. Feel free to ask follow-up questions!",
    ];
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: generateAIResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="flex-shrink-0 backdrop-blur-md bg-slate-900/80 border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-purple-400" />
              <h1 className="text-2xl font-bold">AI Chat Agent</h1>
            </div>
          </div>
          <Button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Dashboard
          </Button>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-2xl ${
                  message.type === "user"
                    ? "bg-blue-600 text-white rounded-2xl rounded-tr-none"
                    : "bg-slate-800 text-slate-100 rounded-2xl rounded-tl-none border border-slate-700"
                } px-6 py-4`}
              >
                <div className="flex items-start gap-3">
                  {message.type === "ai" && (
                    <Brain className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                  )}
                  <div>
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.type === "user"
                          ? "text-blue-100"
                          : "text-slate-400"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-100 rounded-2xl rounded-tl-none border border-slate-700 px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200" />
                  </div>
                  <span className="text-sm text-slate-400">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 backdrop-blur-md bg-slate-900/80 border-t border-blue-500/20 px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything... (Shift+Enter for new line, Enter to send)"
            rows={1}
            className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
            style={{
              maxHeight: "120px",
              minHeight: "48px",
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 gap-2"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
