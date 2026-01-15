/**
 * Chatbot API Endpoints
 * Backend routes for COW Movement POT chatbot with ML integration
 */

import express from "express";
import type {
  MovementRecommendationEngine,
  FeatureEngineer,
} from "../../ml";
import type { CowMovementsFact, DimLocation } from "@shared/models";

const router = express.Router();

// Store for conversation history
const conversationHistory = new Map<string, { role: string; content: string }[]>();

let mlEngine: MovementRecommendationEngine | null = null;
let featureEngineer: FeatureEngineer | null = null;
let movements: CowMovementsFact[] = [];
let locations: DimLocation[] = [];

/**
 * Initialize ML engine for chatbot
 */
export function initializeChatbotML(
  engine: MovementRecommendationEngine,
  engineer: FeatureEngineer,
  movementsData: CowMovementsFact[],
  locationsData: DimLocation[],
) {
  mlEngine = engine;
  featureEngineer = engineer;
  movements = movementsData;
  locations = locationsData;
}

/**
 * POST /api/chatbot/chat
 * Send a message and get response
 */
router.post("/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    const sid = sessionId || "default";

    // Get or create conversation history
    if (!conversationHistory.has(sid)) {
      conversationHistory.set(sid, []);
    }

    const history = conversationHistory.get(sid)!;

    const route = routeMessage(message);

    // Generate response based on route type
    let response: string;
    let context: any = {};
    let queryType: QueryType;

    if (route === "cow") {
      const cowResult = handleCowQuery(message);
      response = cowResult.response;
      context = cowResult.context;
      queryType = cowResult.queryType;
    } else if (route === "general") {
      const generalResult = await runGeneralAgent({
        userText: message,
        chatHistory: history,
        now: new Date(),
      });
      response = generalResult.message;
      context = generalResult.context;
      queryType = "GENERAL_LIVE_INFO";
    } else {
      const cowResult = handleCowQuery(message);
      const generalResult = await runGeneralAgent({
        userText: message,
        chatHistory: history,
        now: new Date(),
      });
      response = `${cowResult.response}\n\n---\n\n${generalResult.message}`;
      context = {
        cow: cowResult.context,
        general: generalResult.context,
      };
      queryType = "HYBRID";
    }

    // Add to history
    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: response });

    // Keep history size manageable (last 50 messages)
    if (history.length > 50) {
      history.splice(0, 2);
    }

    res.json({
      success: true,
      data: {
        message: response,
        queryType,
        context,
        sessionId: sid,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/chatbot/history/:sessionId
 * Get conversation history
 */
router.get("/history/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = conversationHistory.get(sessionId) || [];

    res.json({
      success: true,
      data: {
        sessionId,
        history,
        messageCount: history.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/chatbot/history/:sessionId
 * Clear conversation history
 */
router.delete("/history/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    conversationHistory.delete(sessionId);

    res.json({
      success: true,
      message: "Conversation history cleared",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/chatbot/status
 * Get chatbot status
 */
router.get("/status", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "active",
      mlModelsInitialized: !!mlEngine,
      sessionsActive: conversationHistory.size,
      totalMessages: Array.from(conversationHistory.values()).reduce(
        (sum, msgs) => sum + msgs.length,
        0,
      ),
    },
  });
});

// ========== HELPER FUNCTIONS ==========

type QueryType =
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

type ToolSource = {
  title: string;
  url: string;
  published?: string;
  provider?: string;
};

type ToolResult = {
  ok: boolean;
  data?: any;
  error?: string;
  sources?: ToolSource[];
};

type GeneralAgentContext = {
  intent: string;
  sources?: ToolSource[];
  toolErrors?: string[];
};

type GeneralAgentResult = {
  message: string;
  context: GeneralAgentContext;
};

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

const saudiCities = [
  "riyadh",
  "jeddah",
  "makkah",
  "mecca",
  "madinah",
  "medina",
  "dammam",
  "khobar",
  "al khobar",
  "tabuk",
  "taif",
  "abha",
  "jazan",
  "najran",
  "hail",
  "al ahsa",
  "hofuf",
  "qassim",
  "yanbu",
];

function routeMessage(message: string): RouteType {
  const lower = message.toLowerCase();
  const cowHit = cowSignals.some((signal) => lower.includes(signal));
  const generalHit = generalSignals.some((signal) => lower.includes(signal));

  if (cowHit && generalHit) return "hybrid";
  if (cowHit) return "cow";
  return "general";
}

function parseCowQueryType(message: string): QueryType {
  const lower = message.toLowerCase();

  if (
    lower.includes("status") ||
    lower.includes("where is") ||
    lower.includes("current")
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
    lower.includes("action")
  ) {
    return "RECOMMENDATIONS";
  }

  if (
    lower.includes("statistics") ||
    lower.includes("stats") ||
    lower.includes("how many") ||
    lower.includes("total")
  ) {
    return "STATISTICS";
  }

  if (
    lower.includes("analyze") ||
    lower.includes("analysis") ||
    lower.includes("insight")
  ) {
    return "ANALYSIS";
  }

  if (lower.includes("help") || lower.includes("how do")) {
    return "HELP";
  }

  return "GENERAL";
}

function handleCowQuery(message: string): {
  response: string;
  context: any;
  queryType: QueryType;
} {
  const queryType = parseCowQueryType(message);
  let response: string;
  let context: any = {};

  switch (queryType) {
    case "COW_STATUS": {
      const cowId = extractCowId(message);
      const statusInfo = getCOWStatus(cowId);
      response = formatCOWStatusResponse(statusInfo);
      context = statusInfo;
      break;
    }
    case "PREDICTIONS": {
      if (mlEngine && featureEngineer) {
        const predictions = getPredictions(message);
        response = formatPredictionResponse(predictions);
        context = predictions;
      } else {
        response =
          "ML models are not initialized. Please ensure they are trained first.";
      }
      break;
    }
    case "RECOMMENDATIONS": {
      if (mlEngine && featureEngineer) {
        const recommendations = getRecommendations(message);
        response = formatRecommendationResponse(recommendations);
        context = recommendations;
      } else {
        response = "ML models are not initialized for generating recommendations.";
      }
      break;
    }
    case "STATISTICS": {
      const stats = getStatistics(message);
      response = formatStatisticsResponse(stats);
      context = stats;
      break;
    }
    case "ANALYSIS": {
      const analysis = performAnalysis(message);
      response = formatAnalysisResponse(analysis);
      context = analysis;
      break;
    }
    case "HELP": {
      response = getHelpResponse();
      break;
    }
    default:
      response = getGeneralResponse(message);
  }

  return { response, context, queryType };
}

type GeneralIntent =
  | "WEATHER"
  | "EVENTS"
  | "SEASON"
  | "CITY_INFO"
  | "NEWS"
  | "GENERAL";

function parseGeneralIntent(message: string): GeneralIntent {
  const lower = message.toLowerCase();

  if (
    lower.includes("weather") ||
    lower.includes("temperature") ||
    lower.includes("forecast")
  ) {
    return "WEATHER";
  }

  if (
    lower.includes("event") ||
    lower.includes("concert") ||
    lower.includes("festival") ||
    lower.includes("exhibition")
  ) {
    return "EVENTS";
  }

  if (lower.includes("season") || lower.includes("spring")) {
    return "SEASON";
  }

  if (lower.includes("news") || lower.includes("headline") || lower.includes("latest")) {
    return "NEWS";
  }

  if (
    lower.includes("city") ||
    lower.includes("population") ||
    lower.includes("district") ||
    lower.includes("about")
  ) {
    return "CITY_INFO";
  }

  return "GENERAL";
}

async function runGeneralAgent(input: {
  userText: string;
  chatHistory: { role: string; content: string }[];
  now: Date;
}): Promise<GeneralAgentResult> {
  const intent = parseGeneralIntent(input.userText);
  const asOf = formatRiyadhTimestamp(input.now);

  switch (intent) {
    case "WEATHER": {
      const city = extractSaudiCity(input.userText) ?? "Riyadh";
      const weather = await getWeather(city);
      if (!weather.ok) {
        return formatLiveDataFailure("weather", city, asOf, weather.error);
      }

      const summary = weather.data?.summary ?? "Weather data is available.";
      const details = weather.data?.details ?? "";
      const message = [
        `**Weather in ${city}**`,
        summary,
        details,
        `As of ${asOf} (Asia/Riyadh).`,
        formatSources(weather.sources),
      ]
        .filter(Boolean)
        .join("\n");

      return {
        message,
        context: {
          intent,
          sources: weather.sources,
        },
      };
    }
    case "EVENTS": {
      const city = extractSaudiCity(input.userText) ?? "Riyadh";
      const { from, to } = getDefaultDateRange(input.now, 30);
      const events = await saudiEvents(city, from, to);
      if (!events.ok) {
        return formatLiveDataFailure("events", city, asOf, events.error);
      }

      const list = Array.isArray(events.data?.events)
        ? events.data.events
            .slice(0, 5)
            .map(
              (event: any, index: number) =>
                `${index + 1}. ${event.title ?? "Event"}${
                  event.date ? ` (${event.date})` : ""
                }${event.venue ? ` — ${event.venue}` : ""}`,
            )
        : [];

      const message = [
        `**Upcoming events in ${city}**`,
        list.length > 0 ? list.join("\n") : "No events returned by the events feed.",
        `Date range: ${from} → ${to}.`,
        `As of ${asOf} (Asia/Riyadh).`,
        formatSources(events.sources),
      ]
        .filter(Boolean)
        .join("\n");

      return {
        message,
        context: {
          intent,
          sources: events.sources,
        },
      };
    }
    case "SEASON": {
      const season = getSeasonKSA(input.now.toISOString());
      const message = [
        `**Season in Saudi Arabia**`,
        season.ok
          ? `Season: ${season.data?.season ?? "Unknown"}.`
          : "Season data is unavailable.",
        `As of ${asOf} (Asia/Riyadh).`,
      ]
        .filter(Boolean)
        .join("\n");

      return {
        message,
        context: {
          intent,
        },
      };
    }
    case "NEWS": {
      const query = input.userText;
      const news = await webSearch(query, 7);
      if (!news.ok) {
        return formatLiveDataFailure("news", undefined, asOf, news.error);
      }

      const message = [
        `**Latest news results**`,
        "Here are the most recent items I found:",
        formatSources(news.sources),
        `As of ${asOf} (Asia/Riyadh).`,
      ]
        .filter(Boolean)
        .join("\n");

      return {
        message,
        context: {
          intent,
          sources: news.sources,
        },
      };
    }
    case "CITY_INFO": {
      const city = extractSaudiCity(input.userText) ?? "Saudi Arabia";
      const info = await webSearch(`${city} city overview`, 365);
      if (!info.ok) {
        return formatLiveDataFailure("city info", city, asOf, info.error);
      }

      const message = [
        `**${city} overview**`,
        "Here are a few sources to explore:",
        formatSources(info.sources),
        `As of ${asOf} (Asia/Riyadh).`,
      ]
        .filter(Boolean)
        .join("\n");

      return {
        message,
        context: {
          intent,
          sources: info.sources,
        },
      };
    }
    default:
      return {
        message: [
          "I can help with Saudi weather, events, seasons, city information, and news.",
          "Ask a question like:",
          "- “What’s the weather in Riyadh tomorrow?”",
          "- “Upcoming events in Jeddah this month?”",
          "- “What season is it in Saudi Arabia?”",
          `As of ${asOf} (Asia/Riyadh).`,
        ].join("\n"),
        context: { intent },
      };
  }
}

async function webSearch(query: string, recencyDays = 7): Promise<ToolResult> {
  return {
    ok: false,
    error: `webSearch is not configured. Set up a search provider for query "${query}" (recency ${recencyDays} days).`,
  };
}

async function getWeather(location: string): Promise<ToolResult> {
  return {
    ok: false,
    error: `getWeather is not configured. Set up a weather provider for ${location}.`,
  };
}

async function geocode(place: string): Promise<ToolResult> {
  return {
    ok: false,
    error: `geocode is not configured. Provide a geocoding provider for ${place}.`,
  };
}

async function saudiEvents(
  city: string,
  from: string,
  to: string,
): Promise<ToolResult> {
  return {
    ok: false,
    error: `saudiEvents is not configured. Provide event sources for ${city} (${from} → ${to}).`,
  };
}

function getSeasonKSA(dateISO: string): ToolResult {
  const month = new Date(dateISO).getUTCMonth() + 1;
  let season = "Unknown";

  if ([12, 1, 2].includes(month)) {
    season = "Winter";
  } else if ([3, 4, 5].includes(month)) {
    season = "Spring";
  } else if ([6, 7, 8].includes(month)) {
    season = "Summer";
  } else if ([9, 10, 11].includes(month)) {
    season = "Autumn";
  }

  return { ok: true, data: { season } };
}

function extractSaudiCity(message: string): string | null {
  const lower = message.toLowerCase();
  const match = saudiCities.find((city) => lower.includes(city));
  return match ? toTitleCase(match) : null;
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getDefaultDateRange(now: Date, days: number): {
  from: string;
  to: string;
} {
  const fromDate = new Date(now);
  const toDate = new Date(now);
  toDate.setDate(toDate.getDate() + days);

  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

function formatRiyadhTimestamp(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(now);
}

function formatSources(sources?: ToolSource[]): string {
  if (!sources || sources.length === 0) return "";
  return ["Sources:"]
    .concat(
      sources.map((source) => {
        const published = source.published ? ` (${source.published})` : "";
        return `- ${source.title}${published}: ${source.url}`;
      }),
    )
    .join("\n");
}

function formatLiveDataFailure(
  intent: string,
  city: string | undefined,
  asOf: string,
  error?: string,
): GeneralAgentResult {
  const detail = error ? `Error: ${error}` : "Live data tool is unavailable.";
  return {
    message: [
      `I couldn't retrieve live ${intent} data right now.`,
      city ? `Location: ${city}.` : null,
      detail,
      `As of ${asOf} (Asia/Riyadh).`,
    ]
      .filter(Boolean)
      .join("\n"),
    context: {
      intent,
      toolErrors: [detail],
    },
  };
}

function extractCowId(message: string): string | null {
  const match = message.match(/COW[_-]?(\d{3,})/i);
  return match ? match[0] : null;
}

function getCOWStatus(cowId: string | null): any {
  if (!cowId) return null;

  const cowMovements = movements.filter(
    (m) => m.COW_ID.toUpperCase() === cowId.toUpperCase(),
  );

  if (cowMovements.length === 0) return null;

  const lastMovement = cowMovements[cowMovements.length - 1];
  const locationMap = new Map(locations.map((l) => [l.Location_ID, l]));
  const location = locationMap.get(lastMovement.To_Location_ID);

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

function getPredictions(message: string): any {
  const cowId = extractCowId(message);

  if (!cowId || !mlEngine) return null;

  // This would use the ML engine to generate predictions
  // For now, return placeholder
  return {
    cowId,
    status: "ML predictions would be generated here",
    note: "Ensure ML models are trained before predictions",
  };
}

function getRecommendations(message: string): any {
  const cowId = extractCowId(message);

  if (!cowId || !mlEngine) return null;

  // This would use the ML engine to generate recommendations
  return {
    cowId,
    status: "ML recommendations would be generated here",
    note: "Ensure ML models are trained",
  };
}

function getStatistics(message: string): any {
  const locationMap = new Map(locations.map((l) => [l.Location_ID, l]));

  // Calculate statistics
  const uniqueCows = new Set(movements.map((m) => m.COW_ID)).size;
  const uniqueLocations = new Set(movements.map((m) => m.To_Location_ID)).size;

  const now = new Date();
  const avgIdleDays = Math.round(
    movements.reduce((sum, mov) => {
      const days =
        (now.getTime() - new Date(mov.Moved_DateTime).getTime()) /
        (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0) / movements.length,
  );

  // Busiest locations
  const locationCounts = new Map<string, number>();
  for (const mov of movements) {
    const name =
      locationMap.get(mov.To_Location_ID)?.Location_Name ||
      mov.To_Location_ID;
    locationCounts.set(name, (locationCounts.get(name) || 0) + 1);
  }

  const busyLocations = Array.from(locationCounts.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalCows: uniqueCows,
    totalLocations: uniqueLocations,
    totalMovements: movements.length,
    averageIdleDays: avgIdleDays,
    busyLocations,
  };
}

function performAnalysis(message: string): any {
  const locationMap = new Map(locations.map((l) => [l.Location_ID, l]));

  // Identify patterns
  const patterns: string[] = [];

  // Check for seasonal patterns
  const monthFrequency = new Map<number, number>();
  for (const mov of movements) {
    const month = new Date(mov.Moved_DateTime).getMonth();
    monthFrequency.set(month, (monthFrequency.get(month) || 0) + 1);
  }

  const avgMonthly = movements.length / 12;
  for (const [month, count] of monthFrequency) {
    if (count > avgMonthly * 1.5) {
      patterns.push(`📈 Peak season in month ${month + 1}`);
    }
  }

  // Check for anomalies
  const anomalies: string[] = [];
  const now = new Date();
  const longIdleCount = movements.filter((mov) => {
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

  // Generate insights
  const insights: string[] = [];
  const avgPerMonth = movements.length / 12;

  if (avgPerMonth > 50) {
    insights.push("⚡ High movement activity detected");
  } else if (avgPerMonth < 10) {
    insights.push("🚶 Low movement activity detected");
  }

  const uniqueCows = new Set(movements.map((m) => m.COW_ID)).size;
  insights.push(`🐄 ${uniqueCows} unique COWs in the system`);

  return {
    patterns: patterns.length > 0 ? patterns : ["No specific patterns detected"],
    anomalies: anomalies.length > 0 ? anomalies : ["No anomalies detected"],
    insights,
  };
}

function formatCOWStatusResponse(statusInfo: any): string {
  if (!statusInfo) {
    return "I couldn't find information for that COW. Please provide a valid COW ID (e.g., COW_001).";
  }

  return `
**${statusInfo.cowId} Status Report**

📍 **Current Location:** ${statusInfo.currentLocation}
📅 **Last Moved:** ${statusInfo.lastMovement}
⏱️ **Idle Time:** ${statusInfo.idleDays} days
${statusInfo.status}
📊 **Total Movements:** ${statusInfo.movements}

Analysis: This COW has been idle for ${statusInfo.idleDays} days. ${
    statusInfo.idleDays > 30
      ? "It may be due for repositioning based on typical movement patterns."
      : "It's in a normal movement cycle."
  }
`.trim();
}

function formatPredictionResponse(predictions: any): string {
  if (!predictions) {
    return "I need to run ML predictions. Please ask about specific COWs or use the predictions feature.";
  }

  return "ML-based predictions would be displayed here with location forecasts.";
}

function formatRecommendationResponse(recommendations: any): string {
  if (!recommendations) {
    return "I can generate ML-based movement recommendations. Which COWs would you like me to analyze?";
  }

  return "ML-generated recommendations would be shown here.";
}

function formatStatisticsResponse(stats: any): string {
  return `
**COW Movement Statistics**

📊 **System Overview**
- Total COWs: ${stats.totalCows}
- Total Locations: ${stats.totalLocations}
- Total Movements: ${stats.totalMovements}
- Average Idle Days: ${stats.averageIdleDays}

🏢 **Top 5 Busiest Locations**
${stats.busyLocations.map((loc: any, i: number) => `${i + 1}. ${loc.location}: ${loc.count} movements`).join("\n")}

📈 This data helps identify movement patterns and optimize COW deployment.
`.trim();
}

function formatAnalysisResponse(analysis: any): string {
  return `
**COW Movement Analysis Report**

🔍 **Identified Patterns**
${analysis.patterns.map((p: string) => `• ${p}`).join("\n")}

⚠️ **Anomalies**
${analysis.anomalies.map((a: string) => `• ${a}`).join("\n")}

💡 **Key Insights**
${analysis.insights.map((i: string) => `• ${i}`).join("\n")}

Consider using ML-based recommendations for optimized movement planning.
`.trim();
}

function getHelpResponse(): string {
  return `
**COW Movement POT - Help Guide** 🤖

I'm your AI assistant for COW movement insights. I can help with:

**📍 Check Status**
- "What's the status of COW_001?"
- "Where is COW_002?"
- "Show me details for COW_003"

**🎯 Get Predictions** (requires ML training)
- "Predict where COW_001 should go"
- "Where will COW_002 move next?"
- "Forecast COW_003 movements"

**💡 Recommendations** (requires ML models)
- "Should we move COW_001?"
- "What actions for COW_002?"
- "Recommend movements"

**📊 Statistics**
- "Show movement statistics"
- "How many COWs total?"
- "Average idle time?"

**🔍 Analysis**
- "Analyze movement patterns"
- "What insights exist?"
- "Detect anomalies"

**🌍 General Info (live data tools)**
- "Weather in Riyadh tomorrow"
- "Events in Jeddah this week"
- "What season is it in Saudi Arabia?"

Try asking naturally! I'll do my best to help. 🚀
`.trim();
}

function getGeneralResponse(message: string): string {
  const first30 = message.substring(0, 30);
  return `
I'm the COW Movement POT assistant, here to help with movement insights.

I understood: "${first30}${message.length > 30 ? "..." : ""}"

For best results, ask about:
- Specific COW status
- Movement predictions
- Action recommendations  
- System statistics
- Movement analysis

Type "help" for more examples! 🐄
`.trim();
}

export default router;
