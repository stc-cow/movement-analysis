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
    icon: <BarChart3 className="w-5 h-5" />,
    description: "KPIs & Summary",
  },
  {
    id: "map",
    label: "Saudi Map",
    icon: <MapPin className="w-5 h-5" />,
    description: "Movement Flows",
  },
  {
    id: "movements",
    label: "Movement Types",
    icon: <PieChart className="w-5 h-5" />,
    description: "Full / Half / Zero",
  },
  {
    id: "regions",
    label: "Region Analysis",
    icon: <Grid3x3 className="w-5 h-5" />,
    description: "Cross-Region Matrix",
  },
  {
    id: "warehouse",
    label: "Warehouse Intel",
    icon: <Warehouse className="w-5 h-5" />,
    description: "Dispatch & Receive",
  },
  {
    id: "utilization",
    label: "COW Utilization",
    icon: <TrendingUp className="w-5 h-5" />,
    description: "Usage Metrics",
  },
  {
    id: "events",
    label: "Events Analysis",
    icon: <Calendar className="w-5 h-5" />,
    description: "Event Demand",
  },
  {
    id: "royal",
    label: "Royal / EBU",
    icon: <Crown className="w-5 h-5" />,
    description: "VIP Deployments",
  },
  {
    id: "distance",
    label: "Distance & Cost",
    icon: <Zap className="w-5 h-5" />,
    description: "KM & Analytics",
  },
  {
    id: "ai",
    label: "AI Readiness",
    icon: <Brain className="w-5 h-5" />,
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
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium",
              activeTab === tab.id
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
