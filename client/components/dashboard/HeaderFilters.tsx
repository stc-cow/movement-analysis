import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardFilters as DashboardFiltersType } from "@shared/models";

interface HeaderFiltersProps {
  filters: DashboardFiltersType;
  onFiltersChange: (filters: DashboardFiltersType) => void;
  vendors: string[];
  years: number[];
}

const REGIONS = ["WEST", "EAST", "CENTRAL", "SOUTH"];
const MOVEMENT_TYPES = ["Full", "Half", "Zero"];
const EVENT_TYPES = [
  "Hajj",
  "Umrah",
  "Royal",
  "National Event",
  "Seasonal",
  "Normal Coverage",
];

const YEAR_PLACEHOLDER = "year_all";
const REGION_PLACEHOLDER = "region_all";
const VENDOR_PLACEHOLDER = "vendor_all";
const MOVEMENT_PLACEHOLDER = "movement_all";
const EVENT_PLACEHOLDER = "event_all";

export function HeaderFilters({
  filters,
  onFiltersChange,
  vendors,
  years,
}: HeaderFiltersProps) {
  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);

  const yearValue = filters.year ? `year_${filters.year}` : YEAR_PLACEHOLDER;
  const regionValue = filters.region
    ? `region_${filters.region}`
    : REGION_PLACEHOLDER;
  const vendorValue = filters.vendor
    ? `vendor_${filters.vendor}`
    : VENDOR_PLACEHOLDER;
  const movementValue = filters.movementType
    ? `movement_${filters.movementType}`
    : MOVEMENT_PLACEHOLDER;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Year Filter */}
      <Select
        value={yearValue}
        onValueChange={(value) => {
          if (value === YEAR_PLACEHOLDER) {
            onFiltersChange({ ...filters, year: undefined });
          } else {
            const year = parseInt(value.replace("year_", ""));
            onFiltersChange({ ...filters, year });
          }
        }}
      >
        <SelectTrigger className="w-36 h-10 text-sm bg-white/80 border-white/30 hover:bg-white transition-all duration-200 rounded-lg font-medium text-gray-700 backdrop-blur-sm shadow-md">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={YEAR_PLACEHOLDER}>All Years</SelectItem>
          {years.length > 0 &&
            years.map((year) => (
              <SelectItem key={`year_${year}`} value={`year_${year}`}>
                {year}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Region Filter */}
      <Select
        value={regionValue}
        onValueChange={(value) => {
          if (value === REGION_PLACEHOLDER) {
            onFiltersChange({ ...filters, region: undefined });
          } else {
            const region = value.replace("region_", "");
            onFiltersChange({ ...filters, region });
          }
        }}
      >
        <SelectTrigger className="w-36 h-10 text-sm bg-white/80 border-white/30 hover:bg-white transition-all duration-200 rounded-lg font-medium text-gray-700 backdrop-blur-sm shadow-md">
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={REGION_PLACEHOLDER}>All Regions</SelectItem>
          {REGIONS.map((region) => (
            <SelectItem key={`region_${region}`} value={`region_${region}`}>
              {region}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Vendor Filter */}
      <Select
        value={vendorValue}
        onValueChange={(value) => {
          if (value === VENDOR_PLACEHOLDER) {
            onFiltersChange({ ...filters, vendor: undefined });
          } else {
            const vendor = value.replace("vendor_", "");
            onFiltersChange({ ...filters, vendor });
          }
        }}
      >
        <SelectTrigger className="w-36 h-10 text-sm bg-white/70 dark:bg-slate-800/70 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 rounded-lg font-medium text-gray-700 dark:text-gray-300 backdrop-blur-sm">
          <SelectValue placeholder="Vendor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={VENDOR_PLACEHOLDER}>All Vendors</SelectItem>
          {vendors.length > 0 &&
            vendors.map((vendor) => (
              <SelectItem key={`vendor_${vendor}`} value={`vendor_${vendor}`}>
                {vendor}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Movement Type Filter */}
      <Select
        value={movementValue}
        onValueChange={(value) => {
          if (value === MOVEMENT_PLACEHOLDER) {
            onFiltersChange({ ...filters, movementType: undefined });
          } else {
            const type = value.replace("movement_", "") as any;
            onFiltersChange({ ...filters, movementType: type });
          }
        }}
      >
        <SelectTrigger className="w-36 h-10 text-sm bg-white/70 dark:bg-slate-800/70 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 rounded-lg font-medium text-gray-700 dark:text-gray-300 backdrop-blur-sm">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={MOVEMENT_PLACEHOLDER}>All Types</SelectItem>
          {MOVEMENT_TYPES.map((type) => (
            <SelectItem key={`movement_${type}`} value={`movement_${type}`}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-10 px-4 text-sm font-medium rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 border border-red-200 dark:border-red-800"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
}
