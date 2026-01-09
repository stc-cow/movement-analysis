import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardFilters as DashboardFiltersType } from "@shared/models";

interface DashboardFiltersProps {
  filters: DashboardFiltersType;
  onFiltersChange: (filters: DashboardFiltersType) => void;
  vendors: string[];
  years: number[];
}

const REGIONS = ["WEST", "EAST", "CENTRAL", "SOUTH", "NORTH"];
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

export function DashboardFiltersComponent({
  filters,
  onFiltersChange,
  vendors,
  years,
}: DashboardFiltersProps) {
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
  const eventValue = filters.eventType
    ? `event_${filters.eventType}`
    : EVENT_PLACEHOLDER;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Filters
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Year Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Year
          </label>
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
            <SelectTrigger>
              <SelectValue placeholder="All Years" />
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
        </div>

        {/* Region Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Region
          </label>
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
            <SelectTrigger>
              <SelectValue placeholder="All Regions" />
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
        </div>

        {/* Vendor Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Vendor
          </label>
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
            <SelectTrigger>
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={VENDOR_PLACEHOLDER}>All Vendors</SelectItem>
              {vendors.length > 0 &&
                vendors.map((vendor) => (
                  <SelectItem
                    key={`vendor_${vendor}`}
                    value={`vendor_${vendor}`}
                  >
                    {vendor}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Movement Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Movement Type
          </label>
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
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
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
        </div>

        {/* Event Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Event Type
          </label>
          <Select
            value={eventValue}
            onValueChange={(value) => {
              if (value === EVENT_PLACEHOLDER) {
                onFiltersChange({ ...filters, eventType: undefined });
              } else {
                const type = value.replace("event_", "") as any;
                onFiltersChange({ ...filters, eventType: type });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EVENT_PLACEHOLDER}>All Events</SelectItem>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={`event_${type}`} value={`event_${type}`}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
