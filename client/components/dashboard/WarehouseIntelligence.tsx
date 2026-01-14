import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CowMovementsFact, DimLocation } from "@shared/models";
import { calculateWarehouseMetrics } from "@/lib/analytics";

interface WarehouseIntelligenceProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

export function WarehouseIntelligence({
  movements,
  locations,
}: WarehouseIntelligenceProps) {
  const warehouses = locations.filter((l) => l.Location_Type === "Warehouse");
  const warehouseMetrics = warehouses
    .map((wh) =>
      calculateWarehouseMetrics(wh.Location_ID, movements, locations),
    )
    .filter((m) => m !== null);

  // Top 10 outgoing
  const topOutgoing = warehouseMetrics
    .sort((a, b) => b!.Outgoing_Movements - a!.Outgoing_Movements)
    .slice(0, 10);

  // Top 10 incoming
  const topIncoming = warehouseMetrics
    .sort((a, b) => b!.Incoming_Movements - a!.Incoming_Movements)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Top Outgoing Warehouses */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Dispatch Warehouses (Outgoing)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topOutgoing.map((m) => ({
                name: m!.Location_Name,
                movements: m!.Outgoing_Movements,
                distance: m!.Avg_Outgoing_Distance,
              }))}
              margin={{ top: 5, right: 30, left: 200 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={190} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="movements"
                fill="#10b981"
                radius={[0, 8, 8, 0]}
                label={{
                  position: "right",
                  fill: "#374151",
                  fontSize: 9,
                  fontWeight: "bold",
                  formatter: (value: number) => value.toString(),
                  offset: 5,
                }}
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Detailed Outgoing Analytics
            </h3>
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Movements</TableHead>
                    <TableHead className="text-right">
                      Avg Distance (KM)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topOutgoing.map((m) => (
                    <TableRow key={m!.Location_ID}>
                      <TableCell className="font-medium">
                        {m!.Location_Name}
                      </TableCell>
                      <TableCell className="text-right">
                        {m!.Outgoing_Movements}
                      </TableCell>
                      <TableCell className="text-right">
                        {m!.Avg_Outgoing_Distance.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Incoming Warehouses */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Receiving Warehouses (Incoming)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topIncoming.map((m) => ({
                name: m!.Location_Name,
                movements: m!.Incoming_Movements,
                distance: m!.Avg_Incoming_Distance,
              }))}
              margin={{ top: 5, right: 30, left: 200 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={190} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="movements" fill="#f59e0b" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Detailed Incoming Analytics
            </h3>
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Movements</TableHead>
                    <TableHead className="text-right">
                      Avg Distance (KM)
                    </TableHead>
                    <TableHead className="text-right">Idle Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topIncoming.map((m) => (
                    <TableRow key={m!.Location_ID}>
                      <TableCell className="font-medium">
                        {m!.Location_Name}
                      </TableCell>
                      <TableCell className="text-right">
                        {m!.Incoming_Movements}
                      </TableCell>
                      <TableCell className="text-right">
                        {m!.Avg_Incoming_Distance.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {m!.Idle_Accumulation_Days.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
