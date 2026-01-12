import { OffAirStay } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface COWOffAirDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cowId: string;
  totalMovements: number;
  totalIdleDays: number;
  avgIdleDays: number;
  topWarehouse: string;
  stays: OffAirStay[];
}

export function COWOffAirDetailsModal({
  open,
  onOpenChange,
  cowId,
  totalMovements,
  totalIdleDays,
  avgIdleDays,
  topWarehouse,
  stays,
}: COWOffAirDetailsModalProps) {
  // Prepare chart data: idle days grouped by warehouse
  const warehouseChartData = Array.from(
    stays.reduce((acc, stay) => {
      const key = stay.toWarehouse;
      const existing = acc.get(key) || { warehouse: key, "Idle Days": 0 };
      existing["Idle Days"] += stay.idleDays;
      acc.set(key, existing);
      return acc;
    }, new Map<string, { warehouse: string; "Idle Days": number }>()),
  )
    .map(([, data]) => data)
    .sort((a, b) => b["Idle Days"] - a["Idle Days"]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>COW Off-Air Warehouse Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section A: COW Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                COW ID
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {cowId}
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Movements
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {totalMovements}
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Idle Days
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {totalIdleDays}
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Avg Idle Days
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {avgIdleDays}
              </div>
            </div>

            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Top Warehouse
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {topWarehouse}
              </div>
            </div>
          </div>

          {/* Section B: Off-Air Period Breakdown Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Off-Air Period Breakdown
            </h3>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead className="text-left py-3">
                      From Location
                    </TableHead>
                    <TableHead className="text-left py-3">
                      To Warehouse
                    </TableHead>
                    <TableHead className="text-left py-3">
                      Idle Start Date
                    </TableHead>
                    <TableHead className="text-left py-3">
                      Idle End Date
                    </TableHead>
                    <TableHead className="text-right py-3">Idle Days</TableHead>
                    <TableHead className="text-center py-3">
                      Off-Air Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stays.map((stay, idx) => (
                    <TableRow
                      key={idx}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <TableCell className="py-3">
                        {stay.fromLocation}
                      </TableCell>
                      <TableCell className="py-3 font-medium">
                        {stay.toWarehouse}
                      </TableCell>
                      <TableCell className="py-3">
                        {stay.idleStartDate}
                      </TableCell>
                      <TableCell className="py-3">{stay.idleEndDate}</TableCell>
                      <TableCell className="text-right py-3 font-semibold">
                        {stay.idleDays}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <span className="inline-block px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-semibold">
                          {stay.offAirStatus}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Section C: Optional Bar Chart - Idle Days by Warehouse */}
          {warehouseChartData.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Idle Days by Warehouse
              </h3>
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={warehouseChartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="warehouse"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => `${value} days`}
                    />
                    <Bar dataKey="Idle Days" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
