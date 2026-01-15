/**
 * Data Preparation Module
 * Converts raw COW movement data into ML-ready training data
 */

import type {
  MovementFeatures,
  CowAggregateFeatures,
  TrainingDataset,
  NextLocationTrainingData,
  OptimalStayTrainingData,
  ClusteringTrainingData,
  DataQualityReport,
} from "./types";
import { CowMovementsFact, DimLocation } from "@shared/models";

/**
 * Main class for data preparation
 */
export class DataPreparationPipeline {
  private movements: CowMovementsFact[];
  private locations: Map<string, DimLocation>;
  private timeWindowDays: number;
  private lookBackPeriodMonths: number;

  constructor(
    movements: CowMovementsFact[],
    locations: DimLocation[],
    timeWindowDays: number = 30,
    lookBackPeriodMonths: number = 6,
  ) {
    this.movements = this.validateMovements(movements);
    this.locations = new Map(locations.map((l) => [l.Location_ID, l]));
    this.timeWindowDays = timeWindowDays;
    this.lookBackPeriodMonths = lookBackPeriodMonths;
  }

  /**
   * Validate movement data for quality and completeness
   */
  private validateMovements(movements: CowMovementsFact[]): CowMovementsFact[] {
    return movements.filter((mov) => {
      // Require essential fields
      if (!mov.COW_ID || !mov.Moved_DateTime || !mov.Reached_DateTime) {
        return false;
      }

      // Validate dates
      const movedDate = new Date(mov.Moved_DateTime);
      const reachedDate = new Date(mov.Reached_DateTime);
      if (isNaN(movedDate.getTime()) || isNaN(reachedDate.getTime())) {
        return false;
      }

      // Reached should be after moved
      if (reachedDate < movedDate) {
        return false;
      }

      return true;
    });
  }

  /**
   * Extract movement features from raw data
   */
  extractMovementFeatures(): MovementFeatures[] {
    const features: MovementFeatures[] = [];

    for (const mov of this.movements) {
      const fromLoc = this.locations.get(mov.From_Location_ID);
      const toLoc = this.locations.get(mov.To_Location_ID);

      if (!fromLoc || !toLoc) continue;

      const movedDateTime = new Date(mov.Moved_DateTime);
      const reachedDateTime = new Date(mov.Reached_DateTime);

      // Calculate idle days
      const idleDays =
        (reachedDateTime.getTime() - movedDateTime.getTime()) /
        (1000 * 60 * 60 * 24);

      // Determine if warehouse
      const isWarehouse =
        toLoc.Location_Type === "Warehouse" ||
        toLoc.Location_Name.toUpperCase().includes("WH");

      // Extract temporal features
      const dayOfWeek = movedDateTime.getDay();
      const monthOfYear = movedDateTime.getMonth() + 1;
      const quarter = Math.ceil(monthOfYear / 3);

      features.push({
        cowId: mov.COW_ID,
        fromLocation: mov.From_Location_ID,
        fromLocationType: fromLoc.Location_Type || "Unknown",
        toLocation: mov.To_Location_ID,
        toLocationType: toLoc.Location_Type || "Unknown",
        movedDateTime,
        reachedDateTime,
        idleDays,
        movementType: (mov.Movement_Type as any) || "Unknown",
        region: toLoc.Region || "Unknown",
        dayOfWeek,
        monthOfYear,
        quarter,
        isWarehouse,
        isSeasonal: false, // Will be calculated later
        consecutiveMovements: 0, // Will be calculated later
      });
    }

    return features;
  }

  /**
   * Calculate aggregate features for each COW
   */
  calculateCowAggregateFeatures(
    features: MovementFeatures[],
  ): Map<string, CowAggregateFeatures> {
    const cowFeatures = new Map<string, CowAggregateFeatures>();

    // Group features by COW
    const byCow = new Map<string, MovementFeatures[]>();
    for (const feature of features) {
      if (!byCow.has(feature.cowId)) {
        byCow.set(feature.cowId, []);
      }
      byCow.get(feature.cowId)!.push(feature);
    }

    // Calculate aggregate statistics
    for (const [cowId, cowMovements] of byCow) {
      const sortedMovements = cowMovements.sort(
        (a, b) =>
          new Date(a.movedDateTime).getTime() -
          new Date(b.movedDateTime).getTime(),
      );

      // Basic stats
      const totalMovements = sortedMovements.length;
      const idleDays = sortedMovements.map((m) => m.idleDays);
      const warehouseIdleDays = sortedMovements
        .filter((m) => m.isWarehouse)
        .map((m) => m.idleDays);
      const offsiteIdleDays = sortedMovements
        .filter((m) => !m.isWarehouse)
        .map((m) => m.idleDays);

      // Location frequency
      const toLocations = new Map<string, number>();
      const fromLocations = new Map<string, number>();
      const toWarehouses = new Map<string, number>();

      for (const mov of sortedMovements) {
        toLocations.set(
          mov.toLocation,
          (toLocations.get(mov.toLocation) || 0) + 1,
        );
        fromLocations.set(
          mov.fromLocation,
          (fromLocations.get(mov.fromLocation) || 0) + 1,
        );
        if (mov.isWarehouse) {
          toWarehouses.set(
            mov.toLocation,
            (toWarehouses.get(mov.toLocation) || 0) + 1,
          );
        }
      }

      const mostCommonToLocation = this.getMostFrequent(toLocations);
      const mostCommonFromLocation = this.getMostFrequent(fromLocations);
      const mostCommonToWarehouse = this.getMostFrequent(toWarehouses);

      // Region analysis
      const regions = new Map<string, number>();
      for (const mov of sortedMovements) {
        regions.set(mov.region, (regions.get(mov.region) || 0) + 1);
      }

      // Movement type analysis
      const movementTypes = new Map<string, number>();
      for (const mov of sortedMovements) {
        movementTypes.set(
          mov.movementType,
          (movementTypes.get(mov.movementType) || 0) + 1,
        );
      }

      // Calculate metrics
      const averageIdleDays =
        idleDays.length > 0
          ? idleDays.reduce((a, b) => a + b, 0) / idleDays.length
          : 0;

      const averageIdleDaysWarehouse =
        warehouseIdleDays.length > 0
          ? warehouseIdleDays.reduce((a, b) => a + b, 0) /
            warehouseIdleDays.length
          : 0;

      const averageIdleDaysOffsite =
        offsiteIdleDays.length > 0
          ? offsiteIdleDays.reduce((a, b) => a + b, 0) /
            offsiteIdleDays.length
          : 0;

      const stdDevIdleDays =
        idleDays.length > 1
          ? Math.sqrt(
              idleDays.reduce((acc, val) => acc + Math.pow(val - averageIdleDays, 2), 0) /
                (idleDays.length - 1),
            )
          : 0;

      // Movement frequency (per month in lookback period)
      const now = new Date();
      const lookBackDate = new Date(
        now.getFullYear(),
        now.getMonth() - this.lookBackPeriodMonths,
        now.getDate(),
      );
      const recentMovements = sortedMovements.filter(
        (m) => new Date(m.movedDateTime) > lookBackDate,
      );
      const movementFrequencyPerMonth =
        recentMovements.length > 0
          ? (recentMovements.length / this.lookBackPeriodMonths) * 30
          : 0;

      // Consistency score (0-1)
      const avgStd =
        idleDays.length > 0
          ? idleDays.reduce((a, b) => a + b, 0) / idleDays.length
          : 1;
      const movementConsistency =
        stdDevIdleDays > 0
          ? Math.max(0, 1 - stdDevIdleDays / (avgStd + 1))
          : 1;

      // Days since last movement
      const lastMovement = sortedMovements[sortedMovements.length - 1];
      const lastMovementDaysAgo = lastMovement
        ? (now.getTime() - new Date(lastMovement.movedDateTime).getTime()) /
          (1000 * 60 * 60 * 24)
        : 999;

      // Seasonal pattern analysis
      const monthFrequency = new Map<number, number>();
      for (const mov of sortedMovements) {
        const month = mov.monthOfYear;
        monthFrequency.set(month, (monthFrequency.get(month) || 0) + 1);
      }

      const avgMonthFreq =
        monthFrequency.size > 0
          ? Array.from(monthFrequency.values()).reduce((a, b) => a + b, 0) /
            monthFrequency.size
          : 0;

      const peakMonths = Array.from(monthFrequency.entries())
        .filter(([, count]) => count > avgMonthFreq * 1.5)
        .map(([month]) => month);

      const offPeakMonths = Array.from(monthFrequency.entries())
        .filter(([, count]) => count < avgMonthFreq * 0.5)
        .map(([month]) => month);

      const hasSeasonalPattern = peakMonths.length > 0 || offPeakMonths.length > 0;

      cowFeatures.set(cowId, {
        cowId,
        totalMovements,
        averageIdleDays,
        averageIdleDaysWarehouse,
        averageIdleDaysOffsite,
        stdDevIdleDays,
        mostCommonFromLocation,
        mostCommonToLocation,
        mostCommonToWarehouse,
        favoriteRegions: regions,
        movementFrequencyPerMonth,
        preferredMovementTypes: movementTypes,
        averageStayDurationPattern: averageIdleDays,
        lastMovementDaysAgo,
        totalStayDaysWarehouse: warehouseIdleDays.reduce((a, b) => a + b, 0),
        totalStayDaysOffsite: offsiteIdleDays.reduce((a, b) => a + b, 0),
        movementConsistency,
        hasSeasonalPattern,
        peakSeasonMonths: peakMonths,
        offPeakSeasonMonths: offPeakMonths,
      });
    }

    return cowFeatures;
  }

  /**
   * Create training dataset for next location prediction
   */
  createNextLocationTrainingData(
    features: MovementFeatures[],
  ): NextLocationTrainingData[] {
    const data: NextLocationTrainingData[] = [];
    const byCow = new Map<string, MovementFeatures[]>();

    for (const feature of features) {
      if (!byCow.has(feature.cowId)) {
        byCow.set(feature.cowId, []);
      }
      byCow.get(feature.cowId)!.push(feature);
    }

    // For each COW, create training samples from consecutive movements
    for (const [cowId, movements] of byCow) {
      const sorted = movements.sort(
        (a, b) =>
          new Date(a.movedDateTime).getTime() -
          new Date(b.movedDateTime).getTime(),
      );

      // Use movements up to n-1 to predict movement n
      for (let i = 0; i < sorted.length - 1; i++) {
        const currentMov = sorted[i];
        const nextMov = sorted[i + 1];

        // Create feature vector from current movement
        const featureVector = this.createFeatureVector(
          cowId,
          currentMov,
          features,
        );

        data.push({
          cowId,
          currentLocation: currentMov.toLocation,
          currentIdleDays: currentMov.idleDays,
          features: featureVector,
          nextLocation: nextMov.toLocation,
          nextLocationType: nextMov.toLocationType,
          nextIsWarehouse: nextMov.isWarehouse,
          timestamp: new Date(currentMov.reachedDateTime),
        });
      }
    }

    return data;
  }

  /**
   * Create training dataset for optimal stay duration prediction
   */
  createOptimalStayTrainingData(
    features: MovementFeatures[],
  ): OptimalStayTrainingData[] {
    const data: OptimalStayTrainingData[] = [];

    for (const feature of features) {
      const featureVector = this.createFeatureVector(feature.cowId, feature, [
        feature,
      ]);

      data.push({
        cowId: feature.cowId,
        fromLocation: feature.fromLocation,
        toLocation: feature.toLocation,
        region: feature.region,
        features: featureVector,
        actualStayDays: feature.idleDays,
        movementType: feature.movementType,
        timestamp: new Date(feature.movedDateTime),
      });
    }

    return data;
  }

  /**
   * Create training dataset for clustering
   */
  createClusteringTrainingData(
    features: MovementFeatures[],
    aggregateFeatures: Map<string, CowAggregateFeatures>,
  ): ClusteringTrainingData[] {
    const data: ClusteringTrainingData[] = [];
    const byCow = new Map<string, MovementFeatures[]>();

    for (const feature of features) {
      if (!byCow.has(feature.cowId)) {
        byCow.set(feature.cowId, []);
      }
      byCow.get(feature.cowId)!.push(feature);
    }

    for (const [cowId, movements] of byCow) {
      const aggregate = aggregateFeatures.get(cowId);
      if (!aggregate) continue;

      const featureVector = this.createFeatureVector(
        cowId,
        movements[0],
        movements,
      );

      data.push({
        cowId,
        features: featureVector,
        movements,
        aggregateFeatures: aggregate,
      });
    }

    return data;
  }

  /**
   * Create complete training dataset
   */
  createTrainingDataset(): TrainingDataset {
    const features = this.extractMovementFeatures();
    const aggregateFeatures = this.calculateCowAggregateFeatures(features);

    const nextLocationData = this.createNextLocationTrainingData(features);
    const optimalStayData = this.createOptimalStayTrainingData(features);
    const clusteringData = this.createClusteringTrainingData(
      features,
      aggregateFeatures,
    );

    return {
      nextLocationSamples: nextLocationData,
      optimalStaySamples: optimalStayData,
      clusteringSamples: clusteringData,
      testSetPercentage: 0.2,
      validationSetPercentage: 0.1,
      metadata: {
        totalMovements: this.movements.length,
        uniqueCows: new Set(this.movements.map((m) => m.COW_ID)).size,
        uniqueLocations: this.locations.size,
        dateRangeStart: new Date(
          Math.min(
            ...this.movements.map((m) =>
              new Date(m.Moved_DateTime).getTime(),
            ),
          ),
        ),
        dateRangeEnd: new Date(
          Math.max(
            ...this.movements.map((m) =>
              new Date(m.Moved_DateTime).getTime(),
            ),
          ),
        ),
        dataQualityScore: 0.95, // Default high quality
      },
    };
  }

  /**
   * Assess data quality
   */
  assessDataQuality(): DataQualityReport {
    const issues: Array<{
      type: string;
      severity: "critical" | "warning" | "info";
      description: string;
      affectedRecords: number;
      recommendation: string;
    }> = [];

    let criticalCount = 0;
    let warningCount = 0;

    // Check for missing values
    const missingMovements = this.movements.filter(
      (m) => !m.COW_ID || !m.Moved_DateTime || !m.Reached_DateTime,
    );
    if (missingMovements.length > 0) {
      criticalCount++;
      issues.push({
        type: "Missing Values",
        severity: "critical",
        description: "Some movements have missing essential fields",
        affectedRecords: missingMovements.length,
        recommendation:
          "Filter out movements with missing COW_ID, Moved_DateTime, or Reached_DateTime",
      });
    }

    // Check for invalid dates
    const invalidDates = this.movements.filter((m) => {
      const moved = new Date(m.Moved_DateTime);
      const reached = new Date(m.Reached_DateTime);
      return (
        isNaN(moved.getTime()) ||
        isNaN(reached.getTime()) ||
        reached < moved
      );
    });
    if (invalidDates.length > 0) {
      criticalCount++;
      issues.push({
        type: "Invalid Dates",
        severity: "critical",
        description: "Some movements have invalid or inconsistent dates",
        affectedRecords: invalidDates.length,
        recommendation:
          "Validate date formats and ensure Reached_DateTime > Moved_DateTime",
      });
    }

    // Check for data imbalance
    const cowCounts = new Map<string, number>();
    for (const mov of this.movements) {
      cowCounts.set(mov.COW_ID, (cowCounts.get(mov.COW_ID) || 0) + 1);
    }
    const avgMovements =
      this.movements.length / cowCounts.size;
    const imbalancedCows = Array.from(cowCounts.values()).filter(
      (count) => count < avgMovements * 0.3,
    );
    if (imbalancedCows.length / cowCounts.size > 0.3) {
      warningCount++;
      issues.push({
        type: "Data Imbalance",
        severity: "warning",
        description: "Some COWs have significantly fewer movements",
        affectedRecords: imbalancedCows.length,
        recommendation:
          "Consider filtering out COWs with very few movements or apply class weighting",
      });
    }

    // Calculate scores
    const completenessScore =
      1 - (missingMovements.length + invalidDates.length) / Math.max(this.movements.length, 1);
    const validityScore = 1 - invalidDates.length / Math.max(this.movements.length, 1);
    const consistencyScore =
      1 - imbalancedCows.length / Math.max(cowCounts.size, 1);

    const overallQualityScore =
      (completenessScore + validityScore + consistencyScore) / 3;

    return {
      totalRecords: this.movements.length,
      completenessScore,
      consistencyScore,
      validityScore,
      accuracyScore: 0.9, // Assume good source accuracy
      overallQualityScore,
      issues,
      recommendations: [
        overallQualityScore < 0.8
          ? "Overall data quality needs improvement. Address critical issues first."
          : "Data quality is acceptable for model training",
        criticalCount > 0
          ? `Address ${criticalCount} critical issues before training models`
          : "No critical issues found",
        "Consider data augmentation for underrepresented COWs",
        "Regular quality checks should be part of the ML pipeline",
      ],
    };
  }

  // ========== HELPER METHODS ==========

  private getMostFrequent(
    map: Map<string, number>,
  ): string {
    if (map.size === 0) return "Unknown";
    return Array.from(map.entries()).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  }

  private createFeatureVector(
    cowId: string,
    movement: MovementFeatures,
    allMovements: MovementFeatures[],
  ): any {
    // This is a placeholder - actual feature engineering is in featureEngineering.ts
    return {
      cowId,
      features: [movement.idleDays, movement.dayOfWeek, movement.monthOfYear],
      featureNames: ["idleDays", "dayOfWeek", "monthOfYear"],
      normalizedFeatures: [],
      timestamp: new Date(),
      metadata: {
        currentLocation: movement.toLocation,
        currentIdleDays: movement.idleDays,
        isWarehouseNow: movement.isWarehouse,
      },
    };
  }
}

/**
 * Convenience function to prepare data
 */
export function prepareMLData(
  movements: CowMovementsFact[],
  locations: DimLocation[],
): TrainingDataset {
  const pipeline = new DataPreparationPipeline(movements, locations);
  return pipeline.createTrainingDataset();
}

/**
 * Assess data quality
 */
export function assessDataQuality(
  movements: CowMovementsFact[],
  locations: DimLocation[],
): DataQualityReport {
  const pipeline = new DataPreparationPipeline(movements, locations);
  return pipeline.assessDataQuality();
}
