import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CowMovementsFact, DimEvent } from "@shared/models";
import { Crown, Zap } from "lucide-react";

interface EventRoyalAnalysisProps {
  movements: CowMovementsFact[];
  events: DimEvent[];
}

const EVENT_COLORS: Record<string, string> = {
  Hajj: "#f59e0b",
  Umrah: "#06b6d4",
  Royal: "#8b5cf6",
  "National Event": "#10b981",
  Seasonal: "#ec4899",
  "Normal Coverage": "#6b7280",
};

export function EventRoyalAnalysis({
  movements,
  events,
}: EventRoyalAnalysisProps) {
  // Event distribution
  const eventMap = new Map(events.map((e) => [e.Event_ID, e]));
  const eventCounts: Record<string, number> = {
    Hajj: 0,
    Umrah: 0,
    Royal: 0,
    "National Event": 0,
    Seasonal: 0,
    "Normal Coverage": 0,
  };

  movements.forEach((mov) => {
    if (mov.Event_ID) {
      const event = eventMap.get(mov.Event_ID);
      if (event && eventCounts.hasOwnProperty(event.Event_Type)) {
        eventCounts[event.Event_Type]++;
      }
    }
  });

  const eventData = Object.entries(eventCounts)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      name: type,
      value: count,
    }));

  // Distance by event type
  const distanceByEvent: Record<string, { total: number; count: number }> = {
    Hajj: { total: 0, count: 0 },
    Umrah: { total: 0, count: 0 },
    Royal: { total: 0, count: 0 },
    "National Event": { total: 0, count: 0 },
    Seasonal: { total: 0, count: 0 },
    "Normal Coverage": { total: 0, count: 0 },
  };

  movements.forEach((mov) => {
    if (mov.Event_ID) {
      const event = eventMap.get(mov.Event_ID);
      if (event && distanceByEvent.hasOwnProperty(event.Event_Type)) {
        distanceByEvent[event.Event_Type].total += mov.Distance_KM || 0;
        distanceByEvent[event.Event_Type].count++;
      }
    }
  });

  const distanceData = Object.entries(distanceByEvent)
    .filter(([_, data]) => data.count > 0)
    .map(([type, data]) => ({
      type,
      avgDistance: Math.round((data.total / data.count) * 100) / 100,
    }));

  // Royal vs Non-Royal
  const royalCount = movements.filter((m) => m.Is_Royal).length;
  const nonRoyalCount = movements.length - royalCount;
  const ebuCount = movements.filter((m) => m.Is_EBU).length;
  const nonEbuCount = movements.length - ebuCount;

  const vipData = [
    { name: "Royal", value: royalCount },
    { name: "Non-Royal", value: nonRoyalCount },
  ];

  const ebuData = [
    { name: "EBU", value: ebuCount },
    { name: "Non-EBU", value: nonEbuCount },
  ];

  return (
    <div className="space-y-4">
      {/* Event Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Event Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={eventData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {eventData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={EVENT_COLORS[entry.name]}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Average Distance by Event Type */}
      <Card>
        <CardHeader>
          <CardTitle>Average Distance by Event Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={distanceData}
              margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
              <YAxis label={{ value: "Distance (KM)", angle: -90, position: "insideLeft" }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="avgDistance" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Royal Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              Royal vs Non-Royal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={vipData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vipData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#8b5cf6" : "#cbd5e1"}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Royal Movements</span>
                <span className="font-semibold">{royalCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Non-Royal Movements</span>
                <span className="font-semibold">{nonRoyalCount}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600 dark:text-gray-400">Royal %</span>
                <span className="font-semibold">
                  {movements.length > 0
                    ? ((royalCount / movements.length) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EBU Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              EBU vs Non-EBU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={ebuData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ebuData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#fbbf24" : "#cbd5e1"}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">EBU Movements</span>
                <span className="font-semibold">{ebuCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Non-EBU Movements</span>
                <span className="font-semibold">{nonEbuCount}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600 dark:text-gray-400">EBU %</span>
                <span className="font-semibold">
                  {movements.length > 0
                    ? ((ebuCount / movements.length) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
