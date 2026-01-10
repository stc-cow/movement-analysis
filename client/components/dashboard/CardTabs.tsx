import { cn } from "@/lib/utils";

export interface CardTab {
  id: string;
  label: string;
  description: string;
}

interface CardTabsProps {
  tabs: CardTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const DASHBOARD_CARDS: CardTab[] = [
  {
    id: "executive",
    label: "Executive Overview",
    description: "KPIs & Summary",
  },
  {
    id: "map",
    label: "Saudi Map",
    description: "Movement Flows",
  },
  {
    id: "heatmap",
    label: "Movement Heat Map",
    description: "Origin-Destination Matrix",
  },
  {
    id: "regions",
    label: "Region Analysis",
    description: "Cross-Region Matrix",
  },
  {
    id: "warehouse",
    label: "Warehouse Intel",
    description: "Dispatch & Receive",
  },
  {
    id: "utilization",
    label: "COW Utilization",
    description: "Usage Metrics",
  },
  {
    id: "events",
    label: "Events Analysis",
    description: "Event Demand",
  },
  {
    id: "royal",
    label: "Royal / EBU",
    description: "VIP Deployments",
  },
];

export function CardTabs({ tabs, activeTab, onTabChange }: CardTabsProps) {
  return (
    <div className="bg-gradient-to-r from-white via-blue-50/30 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200/60 dark:border-gray-700/40 backdrop-blur-lg overflow-x-auto sticky top-0 z-10">
      <div className="flex gap-2 px-6 py-4 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-2.5 rounded-xl transition-all duration-300 whitespace-nowrap text-sm font-semibold",
              "relative group overflow-hidden",
              activeTab === tab.id
                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50",
            )}
          >
            <span className="relative z-10">{tab.label}</span>
            {activeTab !== tab.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
