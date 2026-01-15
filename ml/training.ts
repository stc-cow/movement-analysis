/**
 * Model Training and Evaluation Utilities
 * Provides training pipelines, cross-validation, and hyperparameter tuning
 */

import type {
  TrainingDataset,
  NextLocationTrainingData,
  OptimalStayTrainingData,
  ClusteringTrainingData,
  NextLocationModel,
  OptimalStayModel,
  CowClusteringModel,
  ClassificationMetrics,
  RegressionMetrics,
  ClusteringMetrics,
} from "./types";

/**
 * Train/Test split utility
 */
export class DataSplitter {
  /**
   * Split data into train and test sets
   */
  static trainTestSplit<T>(
    data: T[],
    testSize: number = 0.2,
  ): { train: T[]; test: T[] } {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(shuffled.length * (1 - testSize));

    return {
      train: shuffled.slice(0, splitIndex),
      test: shuffled.slice(splitIndex),
    };
  }

  /**
   * Create k-fold cross-validation splits
   */
  static kFoldSplit<T>(
    data: T[],
    k: number = 5,
  ): Array<{ train: T[]; validation: T[] }> {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const foldSize = Math.floor(shuffled.length / k);
    const splits: Array<{ train: T[]; validation: T[] }> = [];

    for (let i = 0; i < k; i++) {
      const start = i * foldSize;
      const end = start + foldSize;

      const validation = shuffled.slice(start, end);
      const train = [...shuffled.slice(0, start), ...shuffled.slice(end)];

      splits.push({ train, validation });
    }

    return splits;
  }

  /**
   * Create stratified split (maintains class distribution)
   */
  static stratifiedSplit<T extends { nextLocation?: string }>(
    data: T[],
    testSize: number = 0.2,
  ): { train: T[]; test: T[] } {
    const groups = new Map<string | undefined, T[]>();

    // Group by label
    for (const item of data) {
      const label = item.nextLocation;
      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label)!.push(item);
    }

    const train: T[] = [];
    const test: T[] = [];

    // Split each group
    for (const [, items] of groups) {
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      const splitIndex = Math.floor(shuffled.length * (1 - testSize));

      train.push(...shuffled.slice(0, splitIndex));
      test.push(...shuffled.slice(splitIndex));
    }

    return { train, test };
  }
}

/**
 * Model training pipeline
 */
export class ModelTrainingPipeline {
  /**
   * Train next location model with cross-validation
   */
  static async trainNextLocationModel(
    model: NextLocationModel,
    dataset: TrainingDataset,
    kFolds: number = 5,
  ): Promise<{
    model: NextLocationModel;
    metrics: ClassificationMetrics[];
    bestModel: NextLocationModel;
  }> {
    const splits = DataSplitter.kFoldSplit(dataset.nextLocationSamples, kFolds);
    const metrics: ClassificationMetrics[] = [];
    let bestScore = -Infinity;
    let bestModel = model;

    for (const split of splits) {
      // Train on training set
      await model.train(split.train);

      // Evaluate on validation set
      const foldMetrics = model.evaluate(split.validation);
      metrics.push(foldMetrics);

      if (foldMetrics.overallPerformance > bestScore) {
        bestScore = foldMetrics.overallPerformance;
        // Clone the model
        const encoded = model.encode();
        const newModel = Object.create(Object.getPrototypeOf(model));
        Object.assign(newModel, model);
        newModel.decode(encoded);
        bestModel = newModel;
      }
    }

    return { model, metrics, bestModel };
  }

  /**
   * Train optimal stay model with cross-validation
   */
  static async trainOptimalStayModel(
    model: OptimalStayModel,
    dataset: TrainingDataset,
    kFolds: number = 5,
  ): Promise<{
    model: OptimalStayModel;
    metrics: RegressionMetrics[];
    bestModel: OptimalStayModel;
  }> {
    const splits = DataSplitter.kFoldSplit(dataset.optimalStaySamples, kFolds);
    const metrics: RegressionMetrics[] = [];
    let bestScore = -Infinity;
    let bestModel = model;

    for (const split of splits) {
      // Train on training set
      await model.train(split.train);

      // Evaluate on validation set
      const foldMetrics = model.evaluate(split.validation);
      metrics.push(foldMetrics);

      if (foldMetrics.r2Score > bestScore) {
        bestScore = foldMetrics.r2Score;
        const encoded = model.encode();
        const newModel = Object.create(Object.getPrototypeOf(model));
        Object.assign(newModel, model);
        newModel.decode(encoded);
        bestModel = newModel;
      }
    }

    return { model, metrics, bestModel };
  }

  /**
   * Train clustering model
   */
  static async trainClusteringModel(
    model: CowClusteringModel,
    dataset: TrainingDataset,
  ): Promise<{
    model: CowClusteringModel;
    metrics: ClusteringMetrics;
  }> {
    // Train on all data for clustering
    await model.train(dataset.clusteringSamples);

    // Evaluate
    const metrics = model.evaluate(dataset.clusteringSamples);

    return { model, metrics };
  }

  /**
   * Hyperparameter tuning for next location model
   */
  static async tuneNextLocationHyperparameters(
    model: NextLocationModel,
    dataset: TrainingDataset,
    paramGrid: Record<string, any[]>,
  ): Promise<{
    bestParams: Record<string, any>;
    bestScore: number;
    results: Array<{
      params: Record<string, any>;
      score: number;
    }>;
  }> {
    const results: Array<{
      params: Record<string, any>;
      score: number;
    }> = [];
    let bestScore = -Infinity;
    let bestParams: Record<string, any> = {};

    // Grid search
    const combinations = this.generateParameterCombinations(paramGrid);

    for (const params of combinations) {
      model.hyperparameters = params;

      const { metrics } = await this.trainNextLocationModel(
        model,
        dataset,
        3, // Use 3-fold for tuning
      );

      const avgScore =
        metrics.reduce((sum, m) => sum + m.overallPerformance, 0) /
        metrics.length;

      results.push({ params, score: avgScore });

      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestParams = params;
      }
    }

    return {
      bestParams,
      bestScore,
      results: results.sort((a, b) => b.score - a.score),
    };
  }

  /**
   * Generate parameter combinations for grid search
   */
  private static generateParameterCombinations(
    paramGrid: Record<string, any[]>,
  ): Record<string, any>[] {
    const keys = Object.keys(paramGrid);
    const combinations: Record<string, any>[] = [];

    function generate(index: number, current: Record<string, any>) {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      for (const value of paramGrid[key]) {
        current[key] = value;
        generate(index + 1, current);
      }
    }

    generate(0, {});
    return combinations;
  }
}

/**
 * Model ensemble combining multiple models
 */
export class ModelEnsemble {
  /**
   * Create ensemble predictions by voting
   */
  static voteEnsemble(
    predictions: Array<{ location: string; probability: number }[]>,
  ): Array<{ location: string; probability: number }> {
    const locationVotes = new Map<string, number>();

    for (const modelPredictions of predictions) {
      for (const pred of modelPredictions) {
        locationVotes.set(
          pred.location,
          (locationVotes.get(pred.location) || 0) + pred.probability,
        );
      }
    }

    return Array.from(locationVotes.entries())
      .map(([location, votes]) => ({
        location,
        probability: votes / predictions.length,
      }))
      .sort((a, b) => b.probability - a.probability);
  }

  /**
   * Create ensemble predictions by weighted average
   */
  static weightedEnsemble(
    predictions: Array<{
      location: string;
      probability: number;
    }[]>,
    weights: number[],
  ): Array<{ location: string; probability: number }> {
    const locationScores = new Map<string, number>();

    for (let i = 0; i < predictions.length; i++) {
      const weight = weights[i] || 1;
      for (const pred of predictions[i]) {
        locationScores.set(
          pred.location,
          (locationScores.get(pred.location) || 0) +
            pred.probability * weight,
        );
      }
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);

    return Array.from(locationScores.entries())
      .map(([location, score]) => ({
        location,
        probability: score / totalWeight,
      }))
      .sort((a, b) => b.probability - a.probability);
  }
}

/**
 * Cross-validation utility
 */
export class CrossValidator {
  /**
   * Calculate cross-validation score
   */
  static calculateCVScore(metrics: ClassificationMetrics[]): {
    mean: number;
    std: number;
  } {
    const scores = metrics.map((m) => m.overallPerformance);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;

    return {
      mean,
      std: Math.sqrt(variance),
    };
  }

  /**
   * Report cross-validation results
   */
  static reportCVResults(
    metrics: ClassificationMetrics[],
    modelName: string,
  ): string {
    const { mean, std } = this.calculateCVScore(metrics);

    return `
Cross-Validation Results for ${modelName}
==========================================
Mean Accuracy: ${(mean * 100).toFixed(2)}%
Std Dev: ${(std * 100).toFixed(2)}%
Fold Scores: ${metrics.map((m) => (m.overallPerformance * 100).toFixed(1)).join(", ")}%
    `.trim();
  }
}

/**
 * Learning curves for overfitting detection
 */
export class LearningCurveAnalysis {
  /**
   * Generate learning curve by training on increasing dataset sizes
   */
  static async generateLearningCurve(
    model: NextLocationModel,
    dataset: TrainingDataset,
    trainSizes: number[] = [0.1, 0.3, 0.5, 0.7, 0.9],
  ): Promise<
    Array<{
      trainSize: number;
      trainScore: number;
      valScore: number;
    }>
  > {
    const results: Array<{
      trainSize: number;
      trainScore: number;
      valScore: number;
    }> = [];

    for (const size of trainSizes) {
      const trainCount = Math.floor(dataset.nextLocationSamples.length * size);
      const trainData = dataset.nextLocationSamples.slice(0, trainCount);
      const valData = dataset.nextLocationSamples.slice(trainCount);

      await model.train(trainData);

      const trainMetrics = model.evaluate(trainData);
      const valMetrics = model.evaluate(valData);

      results.push({
        trainSize: size,
        trainScore: trainMetrics.overallPerformance,
        valScore: valMetrics.overallPerformance,
      });
    }

    return results;
  }

  /**
   * Detect overfitting from learning curve
   */
  static detectOverfitting(
    curve: Array<{
      trainSize: number;
      trainScore: number;
      valScore: number;
    }>,
    threshold: number = 0.1,
  ): boolean {
    if (curve.length < 2) return false;

    const lastPoint = curve[curve.length - 1];
    const gap = lastPoint.trainScore - lastPoint.valScore;

    return gap > threshold;
  }
}

/**
 * Model persistence utilities
 */
export class ModelPersistence {
  /**
   * Save model to localStorage
   */
  static saveModel(
    model: NextLocationModel | OptimalStayModel | CowClusteringModel,
    name: string,
  ): void {
    try {
      const encoded = model.encode();
      const serialized = JSON.stringify({
        name: model.name,
        version: model.version,
        modelType: model.modelType,
        trainingDate: model.trainingDate,
        hyperparameters: model.hyperparameters,
        data: encoded,
      });

      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`ml_model_${name}`, serialized);
      }
    } catch (error) {
      console.error(`Failed to save model ${name}:`, error);
    }
  }

  /**
   * Load model from localStorage
   */
  static loadModel(
    name: string,
  ): {
    name: string;
    version: string;
    modelType: string;
    trainingDate: Date;
    hyperparameters: Record<string, any>;
    data: string;
  } | null {
    try {
      if (typeof localStorage === "undefined") return null;

      const serialized = localStorage.getItem(`ml_model_${name}`);
      if (!serialized) return null;

      return JSON.parse(serialized);
    } catch (error) {
      console.error(`Failed to load model ${name}:`, error);
      return null;
    }
  }

  /**
   * Export model as JSON
   */
  static exportModel(
    model: NextLocationModel | OptimalStayModel | CowClusteringModel,
  ): string {
    return JSON.stringify(
      {
        name: model.name,
        version: model.version,
        modelType: model.modelType,
        trainingDate: model.trainingDate,
        hyperparameters: model.hyperparameters,
        metrics: model.metrics,
        data: model.encode(),
      },
      null,
      2,
    );
  }

  /**
   * Import model from JSON
   */
  static importModel(json: string): any {
    try {
      return JSON.parse(json);
    } catch (error) {
      console.error("Failed to import model:", error);
      return null;
    }
  }
}
