import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { OffAirAgingTableRow } from "@/lib/analytics";
import { useSortableTable } from "@/hooks/useSortableTable";

interface BucketCowsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketName: string;
  cowIds: string[];
  allTableData: OffAirAgingTableRow[];
}

export function BucketCowsModal({
  open,
  onOpenChange,
  bucketName,
  cowIds,
  allTableData,
}: BucketCowsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter table data for COWs in this bucket and match search
  const bucketData = useMemo(() => {
    return allTableData
      .filter((row) => cowIds.includes(row.cowId))
      .filter(
        (row) =>
          searchTerm === "" ||
          row.cowId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.topOffAirWarehouse
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
  }, [cowIds, allTableData, searchTerm]);

  // Set up table sorting
  const {
    sortedData: sortedBucketData,
    setSortColumn,
    getSortIndicator,
  } = useSortableTable({
    data: bucketData,
    initialSortColumn: "avgOffAirIdleDays",
    initialSortDirection: "desc",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {bucketName} - {cowIds.length} COWs
          </DialogTitle>
          <DialogDescription>
            List of all COWs with off-air warehouse aging in {bucketName}
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-4">
          <Input
            placeholder="Search COW ID or warehouse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-4">
          {bucketData.length > 0 ? (
            <Table className="text-sm">
              <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                <TableRow className="bg-gray-50 dark:bg-gray-900">
                  <TableHead className="text-left py-3">COW ID</TableHead>
                  <TableHead className="text-center py-3">
                    Total Movement Times
                  </TableHead>
                  <TableHead className="text-center py-3">
                    Average Off-Air Idle Days
                  </TableHead>
                  <TableHead className="text-left py-3">
                    Top Off-Air Warehouse
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bucketData.map((row) => (
                  <TableRow
                    key={row.cowId}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <TableCell className="py-3 font-medium text-blue-600 dark:text-blue-400">
                      {row.cowId}
                    </TableCell>
                    <TableCell className="text-center py-3">
                      {row.totalMovementTimes}
                    </TableCell>
                    <TableCell className="text-center py-3 font-semibold">
                      {row.avgOffAirIdleDays}
                    </TableCell>
                    <TableCell className="py-3 text-gray-700 dark:text-gray-300">
                      {row.topOffAirWarehouse}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-400">
              No COWs match your search
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-600 dark:text-gray-400">
          Showing {bucketData.length} of {cowIds.length} COWs
        </div>
      </DialogContent>
    </Dialog>
  );
}
