/**
 * COW Movement POT Chatbot
 * An intelligent assistant for COW movement insights using ML models
 */

import type { CowMovementsFact, DimLocation } from "@shared/models";
import type {
  MovementRecommendation,
  BatchPredictionResult,
} from "../../../ml/types";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    query_type?: string;
    cow_ids?: string[];
    confidence?: number;
    sources?: string[];
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatResponse {
  message: ChatMessage;
  context?: {
    recommendations?: MovementRecommendation[];
    statistics?: Record<string, any>;
    data?: Record<string, any>;
  };
}

export type QueryType =
  | "COW_STATUS"
  | "PREDICTIONS"
  | "RECOMMENDATIONS"
  | "STATISTICS"
  | "ANALYSIS"
  | "HELP"
  | "GENERAL"
  | "GENERAL_LIVE_INFO"
  | "HYBRID";

type RouteType = "cow" | "general" | "hybrid";

const cowSignals = [
  "cow",
  "movement",
  "dashboard",
  "anomaly",
  "predict",
  "duration",
  "cluster",
];

const generalSignals = [
  "weather",
  "riyadh",
  "jeddah",
  "dammam",
  "events",
  "season",
  "city",
  "news",
  "today",
  "tomorrow",
];

// ============================================================================
// CHATBOT SERVICE
// ============================================================================

export class COWMovementChatbot {
  private sessionId: string;
  private messages: ChatMessage[] = [];
  private conversationHistory: Map<string, ChatMessage[]> = new Map();
  private sessionTitle: string = "New Chat";
  private movements: CowMovementsFact[] = [];
  private locations: Map<string, DimLocation> = new Map();

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize chatbot with data
   */
  initialize(
    movements: CowMovementsFact[],
    locations: DimLocation[],
  ): void {
    this.movements = movements;
    this.locations = new Map(locations.map((l) => [l.Location_ID, l]));
  }

  /**
   * Main chat function - process user message
   */
  async chat(userMessage: string): Promise<ChatResponse> {
    // Add user message to history
    const userMsg: ChatMessage = {
      id: this.generateMessageId(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);

    try {
      const route = this.routeMessage(userMessage);
      let responseText: string;
      let context: any = {};
      let queryType: QueryType;

      if (route === "cow") {
        queryType = this.parseCowQueryType(userMessage);
        const cowResponse = await this.buildCowResponse(queryType, userMessage);
        responseText = cowResponse.responseText;
        context = cowResponse.context;
      } else if (route === "general") {
        queryType = "GENERAL_LIVE_INFO";
        responseText = this.getGeneralLiveInfoResponse(userMessage);
      } else {
        const cowQueryType = this.parseCowQueryType(userMessage);
        const cowResponse = await this.buildCowResponse(
          cowQueryType,
          userMessage,
        );
        queryType = "HYBRID";
        responseText = `${cowResponse.responseText}\n\n---\n\n${this.getGeneralLiveInfoResponse(
          userMessage,
        )}`;
        context = { cow: cowResponse.context };
      }

      // Create assistant response
      const assistantMsg: ChatMessage = {
        id: this.generateMessageId(),
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
        metadata: {
          query_type: queryType,
          confidence: this.calculateConfidence(userMessage),
          sources: this.identifySources(queryType),
        },
      };

      this.messages.push(assistantMsg);

      // Update session title if first message
      if (this.messages.length === 2) {
        this.sessionTitle = this.generateSessionTitle(userMessage);
      }

      return {
        message: assistantMsg,
        context,
      };
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: this.generateMessageId(),
        role: "assistant",
        content: `I encountered an error processing your request: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
        metadata: {
          query_type: "ERROR",
          confidence: 0,
        },
      };

      this.messages.push(errorMsg);
      return { message: errorMsg };
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return this.messages;
  }

  /**
   * Get session info
   */
  getSession(): ChatSession {
    return {
      id: this.sessionId,
      title: this.sessionTitle,
      messages: this.messages,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Clear conversation
   */
  clearHistory(): void {
    this.conversationHistory.set(this.sessionId, this.messages);
    this.messages = [];
    this.sessionId = this.generateSessionId();
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Parse the type of query from user message
   */
  private parseQueryType(message: string): QueryType {
    const route = this.routeMessage(message);
    if (route === "general") return "GENERAL_LIVE_INFO";
    if (route === "hybrid") return "HYBRID";
    return this.parseCowQueryType(message);
  }

  private routeMessage(message: string): RouteType {
    const lower = message.toLowerCase();
    const cowHit = cowSignals.some((signal) => lower.includes(signal));
    const generalHit = generalSignals.some((signal) => lower.includes(signal));

    if (cowHit && generalHit) return "hybrid";
    if (cowHit) return "cow";
    return "general";
  }

  private parseCowQueryType(message: string): QueryType {
    const lower = message.toLowerCase();

    if (
      lower.includes("status") ||
      lower.includes("where is") ||
      lower.includes("current location")
    ) {
      return "COW_STATUS";
    }

    if (
      lower.includes("predict") ||
      lower.includes("forecast") ||
      lower.includes("next") ||
      lower.includes("will move")
    ) {
      return "PREDICTIONS";
    }

    if (
      lower.includes("recommend") ||
      lower.includes("should") ||
      lower.includes("should move") ||
      lower.includes("action")
    ) {
      return "RECOMMENDATIONS";
    }

    if (
      lower.includes("statistics") ||
      lower.includes("stats") ||
      lower.includes("how many") ||
      lower.includes("total") ||
      lower.includes("average")
    ) {
      return "STATISTICS";
    }

    if (
      lower.includes("analyze") ||
      lower.includes("analysis") ||
      lower.includes("insight") ||
      lower.includes("pattern")
    ) {
      return "ANALYSIS";
    }

    if (
      lower.includes("help") ||
      lower.includes("how do i") ||
      lower.includes("what can")
    ) {
      return "HELP";
    }

    return "GENERAL";
  }

  private async buildCowResponse(
    queryType: QueryType,
    userMessage: string,
  ): Promise<{ responseText: string; context: any }> {
    let responseText: string;
    let context: any = {};

    switch (queryType) {
      case "COW_STATUS": {
        const cowId = this.extractCowId(userMessage);
        const statusInfo = await this.getCOWStatus(cowId);
        responseText = this.formatCOWStatusResponse(statusInfo);
        context = statusInfo;
        break;
      }
      case "PREDICTIONS": {
        const predictions = await this.getPredictions(userMessage);
        responseText = this.formatPredictionResponse(predictions);
        context = { recommendations: predictions };
        break;
      }
      case "RECOMMENDATIONS": {
        const recs = await this.getRecommendations(userMessage);
        responseText = this.formatRecommendationResponse(recs);
        context = { recommendations: recs };
        break;
      }
      case "STATISTICS": {
        const stats = await this.getStatistics(userMessage);
        responseText = this.formatStatisticsResponse(stats);
        context = { statistics: stats };
        break;
      }
      case "ANALYSIS": {
        const analysis = await this.performAnalysis(userMessage);
        responseText = this.formatAnalysisResponse(analysis);
        context = analysis;
        break;
      }
      case "HELP": {
        responseText = this.getHelpResponse();
        break;
      }
      default:
        responseText = this.getGeneralResponse(userMessage);
    }

    return { responseText, context };
  }

  /**
   * Extract COW ID from message
   */
  private extractCowId(message: string): string | null {
    const match = message.match(/COW[_-]?(\d{3,})/i);
    return match ? match[0] : null;
  }

  /**
   * Get status of a specific COW
   */
  private async getCOWStatus(
    cowId: string | null,
  ): Promise<{
    cowId: string;
    currentLocation: string;
    lastMovement: string;
    idleDays: number;
    status: string;
    movements: number;
  } | null> {
    if (!cowId) return null;

    const cowMovements = this.movements.filter(
      (m) => m.COW_ID.toUpperCase() === cowId.toUpperCase(),
    );
    if (cowMovements.length === 0) return null;

    const lastMovement = cowMovements[cowMovements.length - 1];
    const location = this.locations.get(lastMovement.To_Location_ID);

    const now = new Date();
    const movedDate = new Date(lastMovement.Moved_DateTime);
    const idleDays = Math.floor(
      (now.getTime() - movedDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const status =
      idleDays > 30
        ? "⚠️ Long idle time"
        : idleDays > 15
          ? "⏱️ Moderate idle time"
          : "✅ Recently moved";

    return {
      cowId,
      currentLocation: location?.Location_Name || lastMovement.To_Location_ID,
      lastMovement: movedDate.toLocaleDateString(),
      idleDays,
      status,
      movements: cowMovements.length,
    };
  }

  /**
   * Get predictions for COWs
   */
  private async getPredictions(
    message: string,
  ): Promise<MovementRecommendation[] | null> {
    const cowId = this.extractCowId(message);

    // This would call the backend ML endpoint
    // For now, return mock data structure
    return null;
  }

  /**
   * Get recommendations
   */
  private async getRecommendations(
    message: string,
  ): Promise<MovementRecommendation[] | null> {
    // This would call the backend ML endpoint
    return null;
  }

  /**
   * Get statistics
   */
  private async getStatistics(
    message: string,
  ): Promise<Record<string, any>> {
    const stats = {
      totalCOWs: new Set(this.movements.map((m) => m.COW_ID)).size,
      totalMovements: this.movements.length,
      averageIdleDays: this.calculateAverageIdleDays(),
      busyLocations: this.getBusiestLocations(5),
      movementTrends: this.getMovementTrends(),
      recentMovements: this.getRecentMovements(10),
    };

    return stats;
  }

  /**
   * Perform analysis on data
   */
  private async performAnalysis(
    message: string,
  ): Promise<Record<string, any>> {
    return {
      patterns: this.identifyMovementPatterns(),
      anomalies: this.detectAnomalies(),
      insights: this.generateInsights(),
      recommendations: this.generateDataInsights(),
    };
  }

  /**
   * Calculate average idle days
   */
  private calculateAverageIdleDays(): number {
    if (this.movements.length === 0) return 0;

    const now = new Date();
    const totalDays = this.movements.reduce((sum, mov) => {
      const movedDate = new Date(mov.Moved_DateTime);
      const days = (now.getTime() - movedDate.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return Math.round(totalDays / this.movements.length);
  }

  /**
   * Get busiest locations
   */
  private getBusiestLocations(
    limit: number,
  ): Array<{ location: string; count: number }> {
    const locationCounts = new Map<string, number>();

    for (const mov of this.movements) {
      const loc = this.locations.get(mov.To_Location_ID);
      const name = loc?.Location_Name || mov.To_Location_ID;
      locationCounts.set(name, (locationCounts.get(name) || 0) + 1);
    }

    return Array.from(locationCounts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get movement trends
   */
  private getMovementTrends(): { month: string; count: number }[] {
    const trends = new Map<string, number>();

    for (const mov of this.movements) {
      const date = new Date(mov.Moved_DateTime);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      trends.set(month, (trends.get(month) || 0) + 1);
    }

    return Array.from(trends.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }

  /**
   * Get recent movements
   */
  private getRecentMovements(
    limit: number,
  ): Array<{ cow: string; from: string; to: string; date: string }> {
    return this.movements
      .sort(
        (a, b) =>
          new Date(b.Moved_DateTime).getTime() -
          new Date(a.Moved_DateTime).getTime(),
      )
      .slice(0, limit)
      .map((mov) => ({
        cow: mov.COW_ID,
        from: this.locations.get(mov.From_Location_ID)?.Location_Name || mov.From_Location_ID,
        to: this.locations.get(mov.To_Location_ID)?.Location_Name || mov.To_Location_ID,
        date: new Date(mov.Moved_DateTime).toLocaleDateString(),
      }));
  }

  /**
   * Identify movement patterns
   */
  private identifyMovementPatterns(): string[] {
    const patterns: string[] = [];

    // Seasonal patterns
    const monthFrequency = new Map<number, number>();
    for (const mov of this.movements) {
      const month = new Date(mov.Moved_DateTime).getMonth();
      monthFrequency.set(month, (monthFrequency.get(month) || 0) + 1);
    }

    const avgMonthly =
      this.movements.length /
      (Math.max(...Array.from(monthFrequency.keys())) + 1 || 12);
    for (const [month, count] of monthFrequency) {
      if (count > avgMonthly * 1.5) {
        patterns.push(`📈 Peak season in month ${month + 1}`);
      }
    }

    // Location affinity
    const cowLocations = new Map<string, Map<string, number>>();
    for (const mov of this.movements) {
      if (!cowLocations.has(mov.COW_ID)) {
        cowLocations.set(mov.COW_ID, new Map());
      }
      const locs = cowLocations.get(mov.COW_ID)!;
      locs.set(
        mov.To_Location_ID,
        (locs.get(mov.To_Location_ID) || 0) + 1,
      );
    }

    if (cowLocations.size > 0) {
      patterns.push("🔄 COWs show preference for specific warehouses");
    }

    return patterns;
  }

  /**
   * Detect anomalies
   */
  private detectAnomalies(): string[] {
    const anomalies: string[] = [];

    // Very long idle times
    const now = new Date();
    const longIdleCount = this.movements.filter((mov) => {
      const days =
        (now.getTime() - new Date(mov.Moved_DateTime).getTime()) /
        (1000 * 60 * 60 * 24);
      return days > 60;
    }).length;

    if (longIdleCount > 0) {
      anomalies.push(
        `⚠️ ${longIdleCount} COW(s) have been idle for more than 60 days`,
      );
    }

    // No recent movements
    const recentCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentMovements = this.movements.filter(
      (m) => new Date(m.Moved_DateTime) > recentCutoff,
    );

    if (recentMovements.length === 0) {
      anomalies.push("📉 No movements in the last 7 days");
    }

    return anomalies;
  }

  /**
   * Generate insights
   */
  private generateInsights(): string[] {
    const insights: string[] = [];

    // Movement frequency
    const avgPerMonth = this.movements.length / 12; // Assume 12 months of data
    if (avgPerMonth > 50) {
      insights.push("⚡ High movement activity - COWs are frequently repositioned");
    } else if (avgPerMonth < 10) {
      insights.push("🚶 Low movement activity - COWs stay longer in locations");
    }

    // Location diversity
    const uniqueLocations = new Set(
      this.movements.map((m) => m.To_Location_ID),
    ).size;
    if (uniqueLocations > 20) {
      insights.push("🌍 Wide geographic distribution across many locations");
    }

    // Cow diversity
    const uniqueCows = new Set(this.movements.map((m) => m.COW_ID)).size;
    insights.push(`🐄 ${uniqueCows} unique COWs in the system`);

    return insights;
  }

  /**
   * Generate data-driven insights
   */
  private generateDataInsights(): string[] {
    return [
      "Consider implementing ML-based movement predictions for better resource allocation",
      "Regular rebalancing recommended based on seasonal patterns",
      "Monitor long-idle COWs for maintenance or redeployment opportunities",
    ];
  }

  /**
   * Format COW status response
   */
  private formatCOWStatusResponse(
    statusInfo: any,
  ): string {
    if (!statusInfo) {
      return "I couldn't find information for that COW. Please provide a valid COW ID (e.g., COW_001).";
    }

    return `
**${statusInfo.cowId} Status**

📍 **Current Location:** ${statusInfo.currentLocation}
📅 **Last Moved:** ${statusInfo.lastMovement}
⏱️ **Idle Time:** ${statusInfo.idleDays} days
${statusInfo.status}
📊 **Total Movements:** ${statusInfo.movements}

This COW has been idle for ${statusInfo.idleDays} days. ${
      statusInfo.idleDays > 30
        ? "It may be due for repositioning based on typical movement patterns."
        : "It's in relatively recent movement."
    }
`.trim();
  }

  /**
   * Format prediction response
   */
  private formatPredictionResponse(predictions: any): string {
    if (!predictions) {
      return "I need ML predictions. Please ask about specific COWs or use the predictions feature.";
    }

    return "ML predictions would be displayed here.";
  }

  /**
   * Format recommendation response
   */
  private formatRecommendationResponse(
    recommendations: any,
  ): string {
    if (!recommendations) {
      return "I can recommend movements based on ML analysis. Which COWs would you like me to analyze?";
    }

    return "Recommendations would be displayed here.";
  }

  /**
   * Format statistics response
   */
  private formatStatisticsResponse(stats: any): string {
    return `
**COW Movement Statistics**

📊 **Overview**
- Total COWs: ${stats.totalCOWs}
- Total Movements: ${stats.totalMovements}
- Average Idle Days: ${Math.round(stats.averageIdleDays)}

🏢 **Top Locations**
${stats.busyLocations.map((loc: any, i: number) => `${i + 1}. ${loc.location}: ${loc.count} movements`).join("\n")}

📈 **Trends**
Recent movement activity shows ${
      stats.movementTrends.length > 0
        ? `varying patterns across months`
        : "stable activity"
    }

🔄 **Recent Movements**
${stats.recentMovements.slice(0, 5).map((mov: any) => `- ${mov.cow}: ${mov.from} → ${mov.to} (${mov.date})`).join("\n")}
`.trim();
  }

  /**
   * Format analysis response
   */
  private formatAnalysisResponse(analysis: any): string {
    return `
**COW Movement Analysis**

🔍 **Patterns Identified**
${analysis.patterns.join("\n")}

⚠️ **Anomalies Detected**
${analysis.anomalies.length > 0 ? analysis.anomalies.join("\n") : "No significant anomalies detected"}

💡 **Key Insights**
${analysis.insights.join("\n")}

📌 **Recommendations**
${analysis.recommendations.join("\n")}
`.trim();
  }

  /**
   * Get help response
   */
  private getHelpResponse(): string {
    return `
**COW Movement POT - Help Guide**

I can help you with:

**📍 COW Status**
- "What's the status of COW_001?"
- "Where is COW_002?"
- "Show me COW_003 details"

**🎯 Predictions**
- "Predict where COW_001 should go next"
- "Where will COW_002 move to?"
- "Forecast movement for COW_003"

**💡 Recommendations**
- "Should we move COW_001?"
- "What action is needed for COW_002?"
- "Recommend movements for idle COWs"

**📊 Statistics**
- "Show me movement statistics"
- "How many COWs are in the system?"
- "What's the average idle time?"

**🔍 Analysis**
- "Analyze movement patterns"
- "What insights can you provide?"
- "Identify movement anomalies"

**🌍 General Info (live data tools)**
- "Weather in Riyadh tomorrow"
- "Events in Jeddah this week"
- "What season is it in Saudi Arabia?"

Just ask naturally and I'll do my best to help! 🤖
`.trim();
  }

  /**
   * Get general response
   */
  private getGeneralResponse(message: string): string {
    return `
I'm the COW Movement POT assistant, powered by machine learning insights. 

I understood you're asking about: "${message.substring(0, 50)}..."

To better assist you, you can:
- Ask about specific COW status
- Request movement predictions
- Get recommendations for actions
- View statistics and trends
- Analyze movement patterns

Type "help" or ask me anything about COW movements! 🤖
`.trim();
  }

  private getGeneralLiveInfoResponse(message: string): string {
    return `
I can answer general questions about Saudi weather, events, seasons, cities, and news. 

Your question: "${message.substring(0, 60)}..."

To fetch live data, connect this client to the server chatbot route that has web search and weather tools configured.

Try:
- "Weather in Riyadh tomorrow"
- "Events in Jeddah this week"
- "What season is it in Saudi Arabia?"
`.trim();
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(message: string): number {
    // Simple heuristic - more specific queries get higher confidence
    const hasSpecificCow = /COW[_-]?\d{3,}/.test(message);
    const hasQueryType = this.parseQueryType(message) !== "GENERAL";

    let confidence = 0.5;
    if (hasSpecificCow) confidence += 0.3;
    if (hasQueryType) confidence += 0.2;

    return Math.min(1, confidence);
  }

  /**
   * Identify sources for response
   */
  private identifySources(queryType: QueryType): string[] {
    const sources: string[] = [];

    switch (queryType) {
      case "COW_STATUS":
        sources.push("Movement Database", "Location Master");
        break;
      case "PREDICTIONS":
        sources.push("ML Model - Next Location", "Historical Patterns");
        break;
      case "RECOMMENDATIONS":
        sources.push("ML Models", "Decision Engine", "Optimization Logic");
        break;
      case "STATISTICS":
        sources.push("Analytics Engine", "Data Warehouse");
        break;
      case "ANALYSIS":
        sources.push("Pattern Recognition", "Anomaly Detection", "ML Models");
        break;
      case "GENERAL_LIVE_INFO":
      case "HYBRID":
        sources.push("Live Data Tools", "Search Providers", "Weather/Events APIs");
        break;
      default:
        sources.push("Knowledge Base");
    }

    return sources;
  }

  /**
   * Generate session title
   */
  private generateSessionTitle(firstMessage: string): string {
    const first20 = firstMessage.substring(0, 20);
    return `Chat about: ${first20}...`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create chatbot instance
 */
export function createCOWMovementChatbot(): COWMovementChatbot {
  return new COWMovementChatbot();
}
