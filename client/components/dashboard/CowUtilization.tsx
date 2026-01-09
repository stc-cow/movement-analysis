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
import { COWMetrics } from "@shared/models";

interface CowUtilizationProps {
  cowMetrics: COWMetrics[];
}

export function CowUtilization({ cowMetrics }: CowUtilizationProps) {
  // Histogram data: Count of COWs by number of movements
  const movementBuckets: Record<string, number> = {
    "0-5": 0,
    "6-10": 0,
    "11-20": 0,
    "21-50": 0,
    "51-100": 0,
    "100+": 0,
  };

  cowMetrics.forEach((cow) => {
    if (cow.Total_Movements <= 5) movementBuckets["0-5"]++;
    else if (cow.Total_Movements <= 10) movementBuckets["6-10"]++;
    else if (cow.Total_Movements <= 20) movementBuckets["11-20"]++;
    else if (cow.Total_Movements <= 50) movementBuckets["21-50"]++;
    else if (cow.Total_Movements <= 100) movementBuckets["51-100"]++;
    else movementBuckets["100+"]++;
  });

  const histogramData = Object.entries(movementBuckets).map(
    ([range, count]) => ({
      range,
      count,
    }),
  );

  // Top 10 most moved
  const topMostMoved = cowMetrics
    .sort((a, b) => b.Total_Movements - a.Total_Movements)
    .slice(0, 10);

  // Top 10 least moved (excluding static)
  const topLeastMoved = cowMetrics
    .filter((c) => !c.Is_Static)
    .sort((a, b) => a.Total_Movements - b.Total_Movements)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Histogram: Moves per COW */}
      <Card>
        <CardHeader>
          <CardTitle>COW Utilization Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={histogramData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">
            Histogram showing the distribution of COWs by number of movements
            performed
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 Most Moved */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Most Utilized COWs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>COW ID</TableHead>
                    <TableHead className="text-right">Movements</TableHead>
                    <TableHead className="text-right">Distance (KM)</TableHead>
                    <TableHead className="text-right">Avg/Move</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topMostMoved.map((cow) => (
                    <TableRow key={cow.COW_ID}>
                      <TableCell className="font-mono font-medium">
                        {cow.COW_ID}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {cow.Total_Movements}
                      </TableCell>
                      <TableCell className="text-right">
                        {cow.Total_Distance_KM.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {cow.Avg_Distance_Per_Move.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom 10 Least Moved */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-orange-600" />
              Bottom 10 Least Utilized COWs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>COW ID</TableHead>
                    <TableHead className="text-right">Movements</TableHead>
                    <TableHead className="text-right">Distance (KM)</TableHead>
                    <TableHead className="text-right">Regions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLeastMoved.map((cow) => (
                    <TableRow key={cow.COW_ID}>
                      <TableCell className="font-mono font-medium">
                        {cow.COW_ID}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {cow.Total_Movements}
                      </TableCell>
                      <TableCell className="text-right">
                        {cow.Total_Distance_KM.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {cow.Regions_Served.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
