import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle, Brain, AlertCircle } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DimCow, CowMovementsFact } from "@shared/models";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

export default function AIChatAgent() {
  const navigate = useNavigate();
  const { data: dashboardData, loading: dataLoading } = useDashboardData();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm your AI Chat Agent. I can help you with questions about cow movements, logistics, analytics, or anything else you'd like to know. Try asking about a specific COW ID (like CWN052) to get deployment and movement data. What can I help you with today?",
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

  // Extract COW ID from question (e.g., "CWN052" or "COW-001")
  const extractCowId = (question: string): string | null => {
    const cowPattern = /\b([A-Z]{2,3}[A-Z]?\d{3,4})\b/i;
    const match = question.match(cowPattern);
    return match ? match[1].toUpperCase() : null;
  };

  // Find COW data by ID
  const findCowData = (cowId: string): DimCow | null => {
    if (!dashboardData) return null;
    return dashboardData.cows.find(
      (cow) => cow.COW_ID.toUpperCase() === cowId.toUpperCase(),
    ) || null;
  };

  // Get movement statistics for a COW
  const getCowMovementStats = (
    cowId: string,
  ): {
    totalMovements: number;
    lastDeployDate?: string;
    firstDeployDate?: string;
    totalDistance: number;
    regions: string[];
    lastMovementDate?: string;
  } | null => {
    if (!dashboardData) return null;

    const cowMovements = dashboardData.movements.filter(
      (m) => m.COW_ID.toUpperCase() === cowId.toUpperCase(),
    );

    if (cowMovements.length === 0) {
      return {
        totalMovements: 0,
        totalDistance: 0,
        regions: [],
      };
    }

    const totalDistance = cowMovements.reduce(
      (sum, m) => sum + (m.Distance_KM || 0),
      0,
    );
    const regions = Array.from(
      new Set(
        cowMovements
          .map((m) => {
            const toLocation = dashboardData.locations.find(
              (l) => l.Location_ID === m.To_Location_ID,
            );
            return toLocation?.Region;
          })
          .filter(Boolean),
      ),
    ) as string[];

    const sortedMovements = [...cowMovements].sort(
      (a, b) =>
        new Date(b.Moved_DateTime).getTime() -
        new Date(a.Moved_DateTime).getTime(),
    );

    const cow = dashboardData.cows.find(
      (c) => c.COW_ID.toUpperCase() === cowId.toUpperCase(),
    );

    return {
      totalMovements: cowMovements.length,
      lastDeployDate: cow?.Last_Deploy_Date,
      firstDeployDate: cow?.First_Deploy_Date,
      totalDistance,
      regions,
      lastMovementDate: sortedMovements[0]?.Moved_DateTime,
    };
  };

  // Generate AI response based on question and data
  const generateAIResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();
    const cowId = extractCowId(question);

    // If COW ID is found, get specific data
    if (cowId) {
      const cowData = findCowData(cowId);
      const movementStats = getCowMovementStats(cowId);

      if (!cowData) {
        return `I couldn't find COW ${cowId} in the database. Please check the COW ID and try again. Make sure it's in the correct format (e.g., CWN052, COW001, etc.).`;
      }

      if (!movementStats) {
        return `There was an issue retrieving data for COW ${cowId}. Please try again.`;
      }

      // Question about deployment
      if (
        lowerQuestion.includes("deploy") ||
        lowerQuestion.includes("how many times")
      ) {
        return `📊 **Deployment Information for COW ${cowId}:**

**Total Deployments:** ${movementStats.totalMovements} times

**Deployment Timeline:**
- First Deployed: ${movementStats.firstDeployDate ? new Date(movementStats.firstDeployDate).toLocaleDateString() : "Not recorded"}
- Last Deployed: ${movementStats.lastDeployDate ? new Date(movementStats.lastDeployDate).toLocaleDateString() : "Not recorded"}
- Most Recent Movement: ${movementStats.lastMovementDate ? new Date(movementStats.lastMovementDate).toLocaleDateString() : "No movements"}

**Regions Served:** ${movementStats.regions.length > 0 ? movementStats.regions.join(", ") : "None"}

**Total Distance Covered:** ${movementStats.totalDistance.toFixed(2)} KM

**Specifications:**
- Tower Type: ${cowData.Tower_Type}
- Vendor: ${cowData.Vendor}
- Networks: ${[cowData.Network_2G && "2G", cowData.Network_4G && "4G", cowData.Network_5G && "5G"].filter(Boolean).join(", ")}`;
      }

      // Question about location/movement
      if (
        lowerQuestion.includes("location") ||
        lowerQuestion.includes("where") ||
        lowerQuestion.includes("movement")
      ) {
        return `📍 **Movement History for COW ${cowId}:**

**Total Movements:** ${movementStats.totalMovements}
**Total Distance:** ${movementStats.totalDistance.toFixed(2)} KM
**Regions Deployed:** ${movementStats.regions.length > 0 ? movementStats.regions.join(", ") : "No movements"}

This COW has been deployed to ${movementStats.regions.length} region(s) with an average of ${(movementStats.totalDistance / Math.max(movementStats.totalMovements, 1)).toFixed(2)} KM per movement.`;
      }

      // Question about vendor
      if (lowerQuestion.includes("vendor") || lowerQuestion.includes("supplier")) {
        return `🏢 **Vendor Information for COW ${cowId}:**

**Vendor:** ${cowData.Vendor}
**Tower Type:** ${cowData.Tower_Type}
**Shelter:** ${cowData.Shelter_Type}
**Installation Date:** ${new Date(cowData.Installation_Date).toLocaleDateString()}

This COW from ${cowData.Vendor} has been deployed ${movementStats.totalMovements} times across ${movementStats.regions.length} region(s).`;
      }

      // General question about COW
      return `📡 **Information for COW ${cowId}:**

**Deployment Stats:**
- Total Movements: ${movementStats.totalMovements}
- Total Distance: ${movementStats.totalDistance.toFixed(2)} KM
- Regions: ${movementStats.regions.length > 0 ? movementStats.regions.join(", ") : "None"}

**Specifications:**
- Vendor: ${cowData.Vendor}
- Type: ${cowData.Tower_Type}
- Height: ${cowData.Tower_Height}m
- Networks: ${[cowData.Network_2G && "2G", cowData.Network_4G && "4G", cowData.Network_5G && "5G"].filter(Boolean).join(", ")}
- Shelter: ${cowData.Shelter_Type}

Last Deployed: ${movementStats.lastDeployDate ? new Date(movementStats.lastDeployDate).toLocaleDateString() : "Not recorded"}`;
    }

    // General questions without COW ID
    if (
      lowerQuestion.includes("help") ||
      lowerQuestion.includes("how") ||
      lowerQuestion.includes("what can")
    ) {
      return `I can help you with:

1. **Specific COW Information** - Ask about any COW ID (e.g., "CWN052 how many times deployed")
2. **Movement History** - Ask where a COW has been deployed
3. **Vendor Details** - Ask about which vendor supplied a COW
4. **Location Data** - Ask where a COW is currently deployed
5. **General Questions** - I can discuss anything else too!

Try asking: "CWN052 deployment statistics" or "How many times has COW-001 been moved?"`;
    }

    if (
      lowerQuestion.includes("hello") ||
      lowerQuestion.includes("hi") ||
      lowerQuestion.includes("hey")
    ) {
      return "Hello! Great to see you. Ask me about any COW in the system (e.g., 'CWN052' or 'COW-001') to get detailed deployment and movement data!";
    }

    // Default response for general questions
    const defaultResponses = [
      "That's an interesting question! While I'm specialized in cow movement analytics, I can try to help. For specific COW data, please provide a COW ID.",
      "I understand your question. For deployment data and movement history, please ask about a specific COW ID. For general questions, I'm happy to help!",
      "Good question! If you're asking about a specific COW, please provide the COW ID (like CWN052 or COW-001) and I can get you detailed analytics.",
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
    }, 800);
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

      {/* Data Loading Status */}
      {dataLoading && (
        <div className="bg-blue-500/20 border-b border-blue-400/30 px-6 py-3 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-200">
            Loading dashboard data...
          </span>
        </div>
      )}

      {!dashboardData && !dataLoading && (
        <div className="bg-amber-500/20 border-b border-amber-400/30 px-6 py-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-400" />
          <span className="text-sm text-amber-200">
            Dashboard data unavailable. Some features may be limited.
          </span>
        </div>
      )}

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
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
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
            placeholder="Ask about any COW (e.g., 'CWN052 how many times deployed') or any general question..."
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
