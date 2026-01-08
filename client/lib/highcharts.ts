import Highcharts from "highcharts";
import HighchartsMap from "highcharts/modules/map.js";
import Exporting from "highcharts/modules/exporting.js";
import ExportData from "highcharts/modules/export-data.js";

// Initialize modules once
HighchartsMap(Highcharts);
Exporting(Highcharts);
ExportData(Highcharts);

export default Highcharts;
