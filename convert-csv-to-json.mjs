import fs from 'fs';
import https from 'https';
import http from 'http';

// Simple CSV parser that handles basic cases
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];
  
  // Parse headers
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return data;
}

// Parse a single CSV line, handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Delete file on error
      reject(err);
    });
  });
}

async function convert() {
  try {
    const urls = {
      movement: 'https://cdn.builder.io/o/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F124e69817e1b4085be1859e4dfe70f5e?alt=media&token=f0a49c2c-922e-4255-8e54-4476523ef8fd&apiKey=abc8ab05f7d144f289a582747d3e5ca3',
      neverMoved: 'https://cdn.builder.io/o/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F993601ff6839476f938662820b74b06a?alt=media&token=7aa7157b-052b-465f-8b9f-2197eeb4912a&apiKey=abc8ab05f7d144f289a582747d3e5ca3'
    };

    console.log('Downloading CSV files...');
    await downloadFile(urls.movement, 'movement-data.csv');
    console.log('✓ Downloaded movement-data.csv');
    
    await downloadFile(urls.neverMoved, 'never-moved-cows.csv');
    console.log('✓ Downloaded never-moved-cows.csv');

    console.log('\nConverting to JSON...');
    
    // Convert movement data
    const movementCSV = fs.readFileSync('movement-data.csv', 'utf-8');
    const movementData = parseCSV(movementCSV);
    fs.writeFileSync('public/movement-data.json', JSON.stringify(movementData, null, 2));
    console.log(`✓ movement-data.json: ${movementData.length} records`);

    // Convert never-moved cows
    const neverMovedCSV = fs.readFileSync('never-moved-cows.csv', 'utf-8');
    const neverMovedData = parseCSV(neverMovedCSV);
    fs.writeFileSync('public/never-moved-cows.json', JSON.stringify(neverMovedData, null, 2));
    console.log(`✓ never-moved-cows.json: ${neverMovedData.length} records`);

    console.log('\n✅ Conversion complete!');
    console.log('Files created:');
    console.log('  - public/movement-data.json');
    console.log('  - public/never-moved-cows.json');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

convert();
