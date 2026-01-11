/**
 * ENHANCED CSV PARSER WITH DETAILED DEBUGGING
 * Drop-in replacement for parseCSVData() in server/routes/data.ts
 */

export function parseCSVData(csvText: string) {
  // First, check if we got HTML error page instead of CSV
  if (csvText.includes("<html") || csvText.includes("<HTML") || csvText.includes("<!DOCTYPE")) {
    console.error("❌ RECEIVED HTML INSTEAD OF CSV!");
    console.error("First 500 chars:", csvText.substring(0, 500));
    throw new Error("Google Sheets returned HTML instead of CSV. The sheet may not be published or URL is incorrect.");
  }

  const lines = csvText.trim().split("\n");

  console.log(`\n════════════════════════════════════════`);
  console.log(`📊 CSV PARSING STARTED`);
  console.log(`════════════════════════════════════════`);
  console.log(`Total lines: ${lines.length}`);
  console.log(`CSV size: ${csvText.length} bytes`);

  if (lines.length < 2) {
    console.warn("⚠️  CSV has fewer than 2 lines (header + data)");
    return [];
  }

  // Parse header row
  const headerLine = lines[0];
  const headerCells = parseCSVLine(headerLine);
  console.log(`\n📋 HEADER ROW (${headerCells.length} columns):`);
  headerCells.forEach((col, idx) => {
    console.log(`   [${idx}] = "${col}"`);
  });

  // Parse first few data rows for debugging
  console.log(`\n📍 FIRST 5 DATA ROWS (for inspection):`);
  for (let i = 1; i < Math.min(6, lines.length); i++) {
    const cells = parseCSVLine(lines[i]);
    console.log(`   Row ${i}: ${cells.length} cells`);
    cells.slice(0, 5).forEach((cell, idx) => {
      console.log(`      [${idx}] = "${cell}"`);
    });
  }

  // Detect column positions by looking for key column names
  const headerLower = headerCells.map((h, idx) => ({
    original: h,
    lower: h.toLowerCase().trim(),
    index: idx
  }));

  // Find critical columns with detailed logging
  console.log(`\n🔍 COLUMN DETECTION:`);

  const cowIdMatch = headerLower.find(h => 
    h.lower === "cow" || h.lower === "cow_id" || h.lower === "cow id" || 
    h.lower === "id" || h.lower === "a" || h.lower.includes("cow")
  );
  console.log(`   COW ID: ${cowIdMatch ? `Found at index ${cowIdMatch.index} (${cowIdMatch.original})` : "NOT FOUND - will use index 0"}`);

  const fromLocationMatch = headerLower.find(h => 
    h.lower.includes("from") && h.lower.includes("location")
  );
  console.log(`   FROM LOCATION: ${fromLocationMatch ? `Found at index ${fromLocationMatch.index} (${fromLocationMatch.original})` : "NOT FOUND - will use index 16"}`);

  const toLocationMatch = headerLower.find(h => 
    h.lower.includes("to") && h.lower.includes("location")
  );
  console.log(`   TO LOCATION: ${toLocationMatch ? `Found at index ${toLocationMatch.index} (${toLocationMatch.original})` : "NOT FOUND - will use index 20"}`);

  // Set column indices with fallbacks
  let cowIdIdx = cowIdMatch?.index ?? 0;
  let fromLocationIdx = fromLocationMatch?.index ?? 16;
  let toLocationIdx = toLocationMatch?.index ?? 20;

  console.log(`\n✅ Using indices: cow=${cowIdIdx}, from=${fromLocationIdx}, to=${toLocationIdx}`);

  // Parse data rows
  const rows: any[] = [];
  let skippedCount = 0;
  let successCount = 0;
  const skipReasons = new Map<string, number>();

  console.log(`\n🔄 PARSING DATA ROWS:`);

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);

    // Skip completely empty rows
    if (cells.length === 0 || !cells[0]?.trim()) {
      const reason = "empty_row";
      skipReasons.set(reason, (skipReasons.get(reason) ?? 0) + 1);
      skippedCount++;
      continue;
    }

    // Skip rows with too few columns
    if (cells.length < 5) {
      const reason = `too_few_cells_${cells.length}`;
      skipReasons.set(reason, (skipReasons.get(reason) ?? 0) + 1);
      if (i <= 3) {
        console.warn(`   ⚠️  Row ${i}: Only ${cells.length} cells (need ≥5) - SKIPPED`);
      }
      skippedCount++;
      continue;
    }

    // Extract critical fields
    const cow_id = cells[cowIdIdx]?.trim() || "";
    const from_location = cells[fromLocationIdx]?.trim() || "";
    const to_location = cells[toLocationIdx]?.trim() || "";

    // Log first 3 rows in detail
    if (i <= 3) {
      console.log(`   Row ${i}:`);
      console.log(`      cells[${cowIdIdx}] = "${cow_id}"`);
      console.log(`      cells[${fromLocationIdx}] = "${from_location}"`);
      console.log(`      cells[${toLocationIdx}] = "${to_location}"`);
    }

    // Validate required fields
    if (!cow_id || !from_location || !to_location) {
      const reasons: string[] = [];
      if (!cow_id) reasons.push("empty_cow_id");
      if (!from_location) reasons.push("empty_from_location");
      if (!to_location) reasons.push("empty_to_location");
      const reason = reasons.join("+");
      skipReasons.set(reason, (skipReasons.get(reason) ?? 0) + 1);
      if (i <= 5) {
        console.log(`      SKIPPED: ${reason}`);
      }
      skippedCount++;
      continue;
    }

    successCount++;

    // Map all columns
    const row: any = {
      cow_id,
      from_location,
      to_location,
      site_label: cells[1]?.trim() || "",
      last_deploy_date: cells[2]?.trim() || cells[11]?.trim() || "",
      first_deploy_date: cells[3]?.trim() || cells[10]?.trim() || "",
      ebu_royal_flag: cells[4]?.trim() || cells[2]?.trim() || "",
      shelter_type: cells[5]?.trim() || cells[3]?.trim() || "",
      tower_type: cells[6]?.trim() || cells[4]?.trim() || "Macro",
      tower_system: cells[7]?.trim() || cells[5]?.trim() || "",
      tower_height: cells[8]?.trim() || cells[6]?.trim() || "0",
      network_technology: cells[9]?.trim() || cells[7]?.trim() || "",
      vehicle_make: cells[10]?.trim() || cells[8]?.trim() || "",
      vehicle_plate_number: cells[11]?.trim() || cells[9]?.trim() || "",
      moved_datetime: cells[12]?.trim() || cells[10]?.trim() || "",
      moved_month_year: cells[13]?.trim() || cells[11]?.trim() || "",
      reached_datetime: cells[14]?.trim() || cells[12]?.trim() || "",
      reached_month_year: cells[15]?.trim() || cells[13]?.trim() || "",
      from_sub_location: cells[17]?.trim() || cells[15]?.trim() || "",
      from_latitude: cells[18]?.trim() || cells[16]?.trim() || "0",
      from_longitude: cells[19]?.trim() || cells[17]?.trim() || "0",
      to_sub_location: cells[21]?.trim() || cells[19]?.trim() || "",
      to_latitude: cells[22]?.trim() || cells[20]?.trim() || "0",
      to_longitude: cells[23]?.trim() || cells[21]?.trim() || "0",
      distance_km: cells[24]?.trim() || cells[22]?.trim() || "0",
      movement_type: cells[25]?.trim() || cells[23]?.trim() || "Zero",
      region_from: cells[26]?.trim() || cells[24]?.trim() || "CENTRAL",
      region_to: cells[27]?.trim() || cells[25]?.trim() || "CENTRAL",
      vendor: cells[28]?.trim() || cells[26]?.trim() || "Unknown",
      installation_status: cells[29]?.trim() || cells[27]?.trim() || "",
      remarks: cells[30]?.trim() || cells[28]?.trim() || "",
    };

    rows.push(row);
  }

  // Summary
  console.log(`\n📊 PARSING SUMMARY:`);
  console.log(`   ✓ Valid rows parsed: ${successCount}`);
  console.log(`   ✗ Rows skipped: ${skippedCount}`);
  
  if (skipReasons.size > 0) {
    console.log(`   Skip breakdown:`);
    skipReasons.forEach((count, reason) => {
      console.log(`      ${reason}: ${count}`);
    });
  }

  if (rows.length === 0) {
    console.error(`\n❌ NO VALID ROWS PARSED!`);
    if (skippedCount > 0) {
      console.error(`   Problem: All ${skippedCount} data rows were rejected.`);
      console.error(`   Possible causes:`);
      console.error(`     1. Column indices are wrong (cow=${cowIdIdx}, from=${fromLocationIdx}, to=${toLocationIdx})`);
      console.error(`     2. Required columns contain empty data`);
      console.error(`     3. CSV format is corrupted`);
      console.error(`     4. You're looking at the wrong sheet/GID`);
    }
  }

  console.log(`════════════════════════════════════════\n`);

  return rows;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
