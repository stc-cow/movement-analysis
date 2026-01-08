import { Lightbulb, AlertCircle, TrendingUp, Target } from "lucide-react";
import { COWMetrics, CowMovementsFact, DimLocation } from "@shared/models";

interface AIReadinessCardProps {
  cowMetrics: COWMetrics[];
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

export function AIReadinessCard({
  cowMetrics,
  movements,
  locations,
}: AIReadinessCardProps) {
  // Detect idle COWs (no movement in last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const idleCOWs = cowMetrics.filter((cow) => {
    const lastMove = cow.Last_Movement_Date
      ? new Date(cow.Last_Movement_Date)
      : new Date(0);
    return lastMove < sixMonthsAgo && !cow.Is_Static;
  });

  // Predictive insights
  const predictions = [
    {
      title: "Idle COW Warnings",
      icon: <AlertCircle className="w-5 h-5" />,
      value: idleCOWs.length,
      description: `COWs inactive for 6+ months`,
      recommendation: "Consider redeployment or maintenance",
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "High-Utilization COWs",
      icon: <TrendingUp className="w-5 h-5" />,
      value: cowMetrics.filter((c) => c.Total_Movements > 50).length,
      description: "COWs with 50+ movements",
      recommendation: "These are critical fleet assets",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Warehouse Optimization",
      icon: <Target className="w-5 h-5" />,
      value: locations.filter((l) => l.Location_Type === "Warehouse").length,
      description: "Active warehouses for staging",
      recommendation: "Evaluate for capacity optimization",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
  ];

  const mlUseCases = [
    {
      id: "demand",
      title: "Event Demand Forecasting",
      description: "Predict COW demand for Hajj, Umrah, and seasonal events",
      features: ["Historical event patterns", "Calendar alignment", "Regional demand"],
      status: "Ready",
      impact: "High",
    },
    {
      id: "placement",
      title: "Optimal Warehouse Placement",
      description: "Recommend warehouse locations based on movement patterns",
      features: ["Movement heatmaps", "Distance optimization", "Regional coverage"],
      status: "Ready",
      impact: "High",
    },
    {
      id: "assignment",
      title: "Smart COW Assignment",
      description: "Match COWs to deployments based on history and capability",
      features: ["Capability matching", "Utilization balance", "Vendor diversity"],
      status: "Ready",
      impact: "Medium",
    },
    {
      id: "maintenance",
      title: "Predictive Maintenance",
      description: "Identify COWs likely to fail based on usage patterns",
      features: ["Movement frequency", "Age analysis", "Vendor patterns"],
      status: "Planning",
      impact: "Medium",
    },
    {
      id: "distance",
      title: "Distance Minimization",
      description: "Route optimization and route planning",
      features: ["Shortest path algorithms", "Region clustering", "Cost analysis"],
      status: "Ready",
      impact: "High",
    },
  ];

  return (
    <div className="h-[calc(100vh-200px)] overflow-hidden flex flex-col gap-4 p-4">
      {/* AI Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-shrink-0">
        {predictions.map((pred, idx) => (
          <div
            key={idx}
            className={`${pred.bgColor} rounded-lg border border-gray-200 dark:border-gray-700 p-4`}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {pred.title}
              </h3>
              <div className={pred.color}>{pred.icon}</div>
            </div>
            <div className={`text-3xl font-bold ${pred.color} mb-2`}>
              {pred.value}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {pred.description}
            </p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded p-2">
              💡 {pred.recommendation}
            </p>
          </div>
        ))}
      </div>

      {/* ML Use Cases */}
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          ML Use Cases (Engineered Features Available)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pr-2">
          {mlUseCases.map((useCase) => (
            <div
              key={useCase.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {useCase.title}
                </h3>
                <div className="flex gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium ${
                      useCase.status === "Ready"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {useCase.status}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium ${
                      useCase.impact === "High"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    }`}
                  >
                    {useCase.impact} Impact
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {useCase.description}
              </p>

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Available Features:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {useCase.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-4 text-sm">
        <p className="text-gray-700 dark:text-gray-300">
          ✨ <strong>Data Ready for ML:</strong> All data is engineered and normalized. The immutable
          fact table and dimension tables provide a solid foundation for machine learning models.
          Features are calculated on demand and cached for performance.
        </p>
      </div>
    </div>
  );
}
