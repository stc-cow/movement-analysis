import { OffAirStayDetails } from "@/lib/analytics";
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

interface COWOffAirDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cowId: string;
  totalMovements: number;
  totalOffAirIdleDays: number;
  avgOffAirIdleDays: number;
  topOffAirWarehouse: string;
  stays: OffAirStayDetails[];
}

export function COWOffAirDetailsModal({
  open,
  onOpenChange,
  cowId,
  totalMovements,
  totalOffAirIdleDays,
  avgOffAirIdleDays,
  topOffAirWarehouse,
  stays,
}: COWOffAirDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>COW Off-Air Warehouse Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                COW ID
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
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
                Total Off-Air Idle Days
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {totalOffAirIdleDays}
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Average Off-Air Idle Days
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {avgOffAirIdleDays}
              </div>
            </div>

            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Top Off-Air Warehouse
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {topOffAirWarehouse}
              </div>
            </div>
          </div>

          {/* Off-Air Period Breakdown Table */}
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
                      To Location (Warehouse)
                    </TableHead>
                    <TableHead className="text-left py-3">
                      Idle Start Date
                    </TableHead>
                    <TableHead className="text-left py-3">
                      Idle End Date
                    </TableHead>
                    <TableHead className="text-right py-3">Idle Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stays.length > 0 ? (
                    stays.map((stay, idx) => (
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
                        <TableCell className="py-3">
                          {stay.idleEndDate}
                        </TableCell>
                        <TableCell className="text-right py-3 font-semibold">
                          {stay.idleDays}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-4 text-center text-gray-400"
                      >
                        No off-air warehouse stays available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
