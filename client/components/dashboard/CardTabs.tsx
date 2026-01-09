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
    id: "movements",
    label: "Movement Types",
    description: "Full / Half / Zero",
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
  {
    id: "distance",
    label: "Distance & Cost",
    description: "KM & Analytics",
  },
  {
    id: "ai",
    label: "AI Readiness",
    description: "Future Planning",
  },
];

export function CardTabs({ tabs, activeTab, onTabChange }: CardTabsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
      <div className="flex gap-1 px-4 py-3 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium",
              activeTab === tab.id
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
