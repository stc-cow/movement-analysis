/**
 * ML Module Main Entry Point
 * Exports all ML functionality
 */

// Types
export type {
  MovementFeatures,
  CowAggregateFeatures,
  FeatureVector,
  NextLocationTrainingData,
  OptimalStayTrainingData,
  ClusteringTrainingData,
  TrainingDataset,
  MLModel,
  NextLocationModel,
  OptimalStayModel,
  CowClusteringModel,
  NextLocationPrediction,
  OptimalStayPrediction,
  ClusterPrediction,
  ModelMetrics,
  ClassificationMetrics,
  RegressionMetrics,
  ClusteringMetrics,
  MovementRecommendation,
  BatchPredictionResult,
  CowCluster,
  MLPipelineConfig,
  DataQualityReport,
} from "./types";

export type { ModelType } from "./types";

// Data Preparation
export { DataPreparationPipeline, prepareMLData, assessDataQuality } from "./dataPreparation";

// Feature Engineering
export {
  FeatureEngineer,
  FeatureScaler,
  MissingValueHandler,
  OutlierDetector,
} from "./featureEngineering";

// Models
export {
  KNNNextLocationModel,
  LinearRegressionOptimalStayModel,
  KMeansClusteringModel,
} from "./models";

// Training
export {
  DataSplitter,
  ModelTrainingPipeline,
  ModelEnsemble,
  CrossValidator,
  LearningCurveAnalysis,
  ModelPersistence,
} from "./training";

// Inference
export {
  MovementRecommendationEngine,
  RealtimePredictionService,
} from "./inference";

/**
 * Quick-start helper function
 */
export async function createMLPipeline(movements: any, locations: any) {
  const {
    DataPreparationPipeline,
    KNNNextLocationModel,
    LinearRegressionOptimalStayModel,
    KMeansClusteringModel,
    ModelTrainingPipeline,
    MovementRecommendationEngine,
  } = await import("./index");

  // Prepare data
  const pipeline = new DataPreparationPipeline(movements, locations);
  const dataset = pipeline.createTrainingDataset();

  // Train models
  const nextLocationModel = new KNNNextLocationModel();
  const optimalStayModel = new LinearRegressionOptimalStayModel();
  const clusteringModel = new KMeansClusteringModel();

  const { bestModel: locModel } = await ModelTrainingPipeline
    .trainNextLocationModel(nextLocationModel, dataset, 5);

  const { bestModel: stayModel } = await ModelTrainingPipeline
    .trainOptimalStayModel(optimalStayModel, dataset, 5);

  const { model: clusterModel } = await ModelTrainingPipeline
    .trainClusteringModel(clusteringModel, dataset);

  // Setup inference engine
  const engine = new MovementRecommendationEngine();
  engine.setModels(locModel, stayModel, clusterModel);

  return {
    engine,
    models: {
      nextLocation: locModel,
      optimalStay: stayModel,
      clustering: clusterModel,
    },
    dataset,
    pipeline,
  };
}
