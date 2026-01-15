/**
 * Inference Engine
 * Generates movement recommendations using trained models
 */

import type {
  NextLocationModel,
  OptimalStayModel,
  CowClusteringModel,
  FeatureVector,
  MovementRecommendation,
  BatchPredictionResult,
} from "./types";
import { FeatureEngineer } from "./featureEngineering";

/**
 * Main inference engine
 */
export class MovementRecommendationEngine {
  private nextLocationModel: NextLocationModel | null = null;
  private optimalStayModel: OptimalStayModel | null = null;
  private clusteringModel: CowClusteringModel | null = null;
  private featureEngineer: FeatureEngineer;

  constructor() {
    this.featureEngineer = new FeatureEngineer();
  }

  /**
   * Set trained models
   */
  setModels(
    nextLocation: NextLocationModel,
    optimalStay: OptimalStayModel,
    clustering: CowClusteringModel,
  ): void {
    this.nextLocationModel = nextLocation;
    this.optimalStayModel = optimalStay;
    this.clusteringModel = clustering;
  }

  /**
   * Generate recommendation for a single COW
   */
  recommendMovement(
    cowId: string,
    features: FeatureVector,
    currentLocation: string,
    currentIdleDays: number,
  ): MovementRecommendation {
    if (
      !this.nextLocationModel ||
      !this.optimalStayModel ||
      !this.clusteringModel
    ) {
      return this.createEmptyRecommendation(
        cowId,
        currentLocation,
        currentIdleDays,
      );
    }

    // Get predictions from all models
    const nextLocationPredictions =
      this.nextLocationModel.predict(features, 3)[0];
    const optimalStayPrediction = this.optimalStayModel.predict(features);
    const clusterPrediction = this.clusteringModel.predict(features);

    // Determine action
    const readinessScore = optimalStayPrediction.movementReadinessScore;
    let action: "move" | "wait" | "monitor";

    if (readinessScore > 0.8) {
      action = "move";
    } else if (readinessScore > 0.5) {
      action = "monitor";
    } else {
      action = "wait";
    }

    // Determine priority
    let priority: "high" | "medium" | "low";
    if (readinessScore > 0.85) {
      priority = "high";
    } else if (readinessScore > 0.6) {
      priority = "medium";
    } else {
      priority = "low";
    }

    // Build recommendations
    const recommendations = [];

    if (nextLocationPredictions && nextLocationPredictions.predictions.length > 0) {
      recommendations.push({
        priority,
        action,
        suggestedLocations: nextLocationPredictions.predictions.map((pred) => ({
          location: pred.location,
          probability: pred.probability,
          confidence: pred.confidence,
          estimatedStay: optimalStayPrediction.predictedStayDays,
        })),
        reasoning: `Based on historical patterns similar COWs have moved to ${nextLocationPredictions.topRecommendation.location}. ${optimalStayPrediction.reasoning}`,
        confidenceScore: nextLocationPredictions.topRecommendation.probability,
      });
    }

    // Identify risk and opportunity factors
    const riskFactors: string[] = [];
    const opportunityFactors: string[] = [];

    if (readinessScore > 0.9) {
      riskFactors.push("COW is overdue for movement - extended idle time");
    }

    if (optimalStayPrediction.predictedStayDays > 30) {
      opportunityFactors.push(
        "Extended stay pattern - consider long-term placement",
      );
    }

    if (clusterPrediction.clusterName.includes("Cluster")) {
      opportunityFactors.push(
        `Similar movement pattern to ${clusterPrediction.clusterName} COWs`,
      );
    }

    const bestAction =
      recommendations.length > 0
        ? {
            location: recommendations[0].suggestedLocations[0].location,
            estimatedStay: optimalStayPrediction.predictedStayDays,
            priority,
            explanation: `Move ${cowId} to ${recommendations[0].suggestedLocations[0].location} for an estimated stay of ${optimalStayPrediction.predictedStayDays.toFixed(1)} days`,
          }
        : {
            location: "Unknown",
            estimatedStay: 0,
            priority: "low",
            explanation: "No recommendation available",
          };

    return {
      cowId,
      currentLocation,
      currentIdleDays,
      recommendations,
      bestAction,
      riskFactors,
      opportunityFactors,
      timestamp: new Date(),
    };
  }

  /**
   * Generate batch recommendations
   */
  recommendBatch(
    cows: Array<{
      cowId: string;
      features: FeatureVector;
      currentLocation: string;
      currentIdleDays: number;
    }>,
  ): BatchPredictionResult {
    const predictions = cows.map((cow) =>
      this.recommendMovement(
        cow.cowId,
        cow.features,
        cow.currentLocation,
        cow.currentIdleDays,
      ),
    );

    // Generate summary
    const needsImmediateAction = predictions.filter(
      (p) => p.recommendations[0]?.priority === "high",
    ).length;

    const readyToMove = predictions.filter(
      (p) =>
        p.recommendations[0]?.action === "move" ||
        p.recommendations[0]?.action === "monitor",
    ).length;

    const canWait = predictions.filter(
      (p) => p.recommendations[0]?.action === "wait",
    ).length;

    const criticalCows = predictions
      .filter(
        (p) =>
          p.currentIdleDays >
          (p.recommendations[0]?.suggestedLocations[0]?.estimatedStay ||
            30) *
            1.5,
      )
      .map((p) => p.cowId);

    return {
      predictions: predictions.map((p) => ({
        cowId: p.cowId,
        recommendation: p,
      })),
      summary: {
        totalCows: cows.length,
        needsImmediateAction,
        readyToMove,
        canWait,
        criticalCows,
      },
      generatedAt: new Date(),
      modelVersions: {
        nextLocationModel: this.nextLocationModel?.version || "unknown",
        optimalStayModel: this.optimalStayModel?.version || "unknown",
        clusteringModel: this.clusteringModel?.version || "unknown",
      },
    };
  }

  /**
   * Create movement recommendation report
   */
  generateReport(result: BatchPredictionResult): string {
    const lines: string[] = [];

    lines.push("=".repeat(60));
    lines.push("COW MOVEMENT RECOMMENDATION REPORT");
    lines.push("=".repeat(60));
    lines.push(`Generated: ${result.generatedAt.toISOString()}`);
    lines.push("");

    lines.push("SUMMARY");
    lines.push("-".repeat(60));
    lines.push(`Total COWs Analyzed: ${result.summary.totalCows}`);
    lines.push(
      `Needs Immediate Action: ${result.summary.needsImmediateAction} (🔴)`,
    );
    lines.push(`Ready to Move: ${result.summary.readyToMove} (🟡)`);
    lines.push(`Can Wait: ${result.summary.canWait} (🟢)`);
    lines.push("");

    if (result.summary.criticalCows.length > 0) {
      lines.push("CRITICAL COWS (Overdue)");
      lines.push("-".repeat(60));
      for (const cowId of result.summary.criticalCows) {
        const pred = result.predictions.find((p) => p.cowId === cowId);
        if (pred) {
          lines.push(
            `${cowId}: ${pred.recommendation.currentIdleDays} days idle`,
          );
        }
      }
      lines.push("");
    }

    lines.push("TOP RECOMMENDATIONS");
    lines.push("-".repeat(60));

    // Get top 10 highest priority
    const topRecommendations = result.predictions
      .sort(
        (a, b) =>
          (b.recommendation.recommendations[0]?.priority === "high" ? 1 : 0) -
          (a.recommendation.recommendations[0]?.priority === "high" ? 1 : 0),
      )
      .slice(0, 10);

    for (const { cowId, recommendation } of topRecommendations) {
      if (recommendation.recommendations.length > 0) {
        const rec = recommendation.recommendations[0];
        const location = rec.suggestedLocations[0]?.location || "Unknown";
        const priority =
          rec.priority === "high"
            ? "🔴"
            : rec.priority === "medium"
              ? "🟡"
              : "🟢";

        lines.push(
          `${priority} ${cowId} → ${location} (${rec.confidenceScore.toFixed(2)} confidence)`,
        );
      }
    }

    lines.push("");
    lines.push("MODEL INFORMATION");
    lines.push("-".repeat(60));
    lines.push(`Next Location Model: v${result.modelVersions.nextLocationModel}`);
    lines.push(`Optimal Stay Model: v${result.modelVersions.optimalStayModel}`);
    lines.push(`Clustering Model: v${result.modelVersions.clusteringModel}`);
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Export recommendations as CSV
   */
  exportAsCSV(result: BatchPredictionResult): string {
    const headers = [
      "COW_ID",
      "Current_Location",
      "Current_Idle_Days",
      "Recommended_Location",
      "Confidence",
      "Priority",
      "Action",
      "Estimated_Stay_Days",
      "Reasoning",
    ];

    const rows: string[][] = [];

    for (const { cowId, recommendation } of result.predictions) {
      const rec = recommendation.recommendations[0];
      if (rec && rec.suggestedLocations.length > 0) {
        const location = rec.suggestedLocations[0];
        rows.push([
          cowId,
          recommendation.currentLocation,
          recommendation.currentIdleDays.toString(),
          location.location,
          location.confidence.toFixed(3),
          rec.priority,
          rec.action,
          location.estimatedStay.toFixed(1),
          rec.reasoning.substring(0, 100),
        ]);
      }
    }

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return csv;
  }

  /**
   * Export recommendations as JSON
   */
  exportAsJSON(result: BatchPredictionResult): string {
    return JSON.stringify(result, null, 2);
  }

  // ========== PRIVATE HELPERS ==========

  private createEmptyRecommendation(
    cowId: string,
    location: string,
    idleDays: number,
  ): MovementRecommendation {
    return {
      cowId,
      currentLocation: location,
      currentIdleDays: idleDays,
      recommendations: [
        {
          priority: "low",
          action: "wait",
          suggestedLocations: [],
          reasoning: "Models not initialized",
          confidenceScore: 0,
        },
      ],
      bestAction: {
        location: "Unknown",
        estimatedStay: 0,
        priority: "low",
        explanation: "No recommendation available - models not trained",
      },
      riskFactors: [],
      opportunityFactors: [],
      timestamp: new Date(),
    };
  }
}

/**
 * Real-time prediction service
 */
export class RealtimePredictionService {
  private engine: MovementRecommendationEngine;
  private predictionCache: Map<
    string,
    {
      recommendation: MovementRecommendation;
      timestamp: Date;
    }
  > = new Map();
  private cacheExpiry: number = 1000 * 60 * 60; // 1 hour

  constructor(engine: MovementRecommendationEngine) {
    this.engine = engine;
  }

  /**
   * Get recommendation with caching
   */
  getRecommendation(
    cowId: string,
    features: FeatureVector,
    currentLocation: string,
    currentIdleDays: number,
  ): MovementRecommendation {
    const cached = this.predictionCache.get(cowId);

    if (
      cached &&
      new Date().getTime() - cached.timestamp.getTime() < this.cacheExpiry
    ) {
      return cached.recommendation;
    }

    const recommendation = this.engine.recommendMovement(
      cowId,
      features,
      currentLocation,
      currentIdleDays,
    );

    this.predictionCache.set(cowId, {
      recommendation,
      timestamp: new Date(),
    });

    return recommendation;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.predictionCache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; expiry: number } {
    return {
      size: this.predictionCache.size,
      expiry: this.cacheExpiry,
    };
  }
}
