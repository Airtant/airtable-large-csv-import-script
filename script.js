// =========================================================
// 1. CONFIGURATION
// =========================================================

// SAFETY STOP: 4.5 Minutes (270,000ms). 
// This leaves 30 seconds buffer before the absolute 5-minute limit to save data safely.
const MAX_EXECUTION_TIME_MS = 270000; 
const MAX_BATCH_SIZE = 50; 
const START_TIME = Date.now();

// LOAD INPUTS
const CONFIG = input.config();
const INPUTS = {
    SOURCE_TABLE_ID:        CONFIG.source_table_id,
    SOURCE_RECORD_ID:       CONFIG.source_record_id,
    ATTACHMENT_FLD_ID:      CONFIG.attachment_field_id,
    STATUS_FLD_ID:          CONFIG.status_field_id,
    STATUS_VAL_SUCCESS:     CONFIG.status_value_success,
    STATUS_VAL_PARTIAL:     CONFIG.status_value_partial,
    STATUS_VAL_ERROR:       CONFIG.status_value_error,
    STATUS_VAL_PROGRESS:    CONFIG.status_value_progress,
    LOG_FLD_ID:             CONFIG.log_field_id,
    TOTAL_ROWS_FLD_ID:      CONFIG.total_rows_field_id,
    PROCESSED_FLD_ID:       CONFIG.processed_rows_field_id,
    DEST_TABLE_ID:          CONFIG.dest_table_id,
    LINK_FLD_ID:            CONFIG.link_field_id,
    HEADER_MAPPING:         CONFIG.header_mapping,
    // Convert text inputs "true"/"false" to actual boolean values
    IS_MATCH_CASE:          String(CONFIG.config_match_case).toLowerCase() === 'true',
    IS_TRIM_HEADERS:        String(CONFIG.config_trim_headers).toLowerCase() === 'true'
};

// =========================================================
// 2. MAIN EXECUTION
// =========================================================

async function main() {
    console.log(`🚀 Script Starting... (Time Limit: ${MAX_EXECUTION_TIME_MS / 1000} seconds)`);

    const sourceTable = base.getTable(INPUTS.SOURCE_TABLE_ID);
    const destTable = base.getTable(INPUTS.DEST_TABLE_ID);

    // --- STEP 1: SET STATUS TO "IN PROGRESS" ---
    // Immediate feedback to user
    await sourceTable.updateRecordAsync(INPUTS.SOURCE_RECORD_ID, {
        [INPUTS.STATUS_FLD_ID]: INPUTS.STATUS_VAL_PROGRESS
    });
    console.log(`✅ Status updated to: "${INPUTS.STATUS_VAL_PROGRESS}"`);

    // --- STEP 2: FETCH RECORD & FILE ---
    const sourceRecord = await sourceTable.selectRecordAsync(INPUTS.SOURCE_RECORD_ID);
    if (!sourceRecord) throw new Error("❌ Could not find the source record.");

    const currentProcessed = sourceRecord.getCellValue(INPUTS.PROCESSED_FLD_ID) || 0;
    let currentTotal = sourceRecord.getCellValue(INPUTS.TOTAL_ROWS_FLD_ID) || 0;
    const attachments = sourceRecord.getCellValue(INPUTS.ATTACHMENT_FLD_ID);

    if (!attachments || !attachments.length) throw new Error("❌ No file attached in the CSV field.");
    
    console.log(`📂 Found file: "${attachments[0].filename}"`);
    console.log(`⏳ Downloading and reading file...`);

    const csvUrl = attachments[0].url;
    const csvRaw = await fetch(csvUrl).then(r => r.text());
    
    // Parse the CSV
    const { headers, rows } = parseCSV(csvRaw);
    console.log(`📄 CSV Parsed successfully. Found ${headers.length} columns and ${rows.length} rows.`);

    // --- STEP 3: INITIALIZE (First Run Only) ---
    if (currentTotal === 0) {
        currentTotal = rows.length;
        await sourceTable.updateRecordAsync(INPUTS.SOURCE_RECORD_ID, {
            [INPUTS.TOTAL_ROWS_FLD_ID]: currentTotal
        });
        console.log(`📊 First run detected. Initialized 'Total Rows' to: ${currentTotal}`);
    }

    // --- STEP 4: CHECK IF JOB IS DONE ---
    if (currentProcessed >= currentTotal) {
        console.log("✅ All records are already processed. Nothing to do.");
        await updateStatus(sourceTable, INPUTS.STATUS_VAL_SUCCESS, "Job was already completed previously.");
        return;
    }

    // --- STEP 5: PREPARE DATA (Resume Logic) ---
    const rowsToProcess = rows.slice(currentProcessed);
    console.log(`🔄 Resuming job from row ${currentProcessed}.`);
    console.log(`📉 Remaining rows to process: ${rowsToProcess.length}`);

    // Validate Headers before starting loop
    console.log("🔍 Checking CSV headers against your mapping...");
    const fieldMap = parseMapping(INPUTS.HEADER_MAPPING, headers);
    console.log("✅ Headers validated! Mapping confirmed.");

    // --- STEP 6: PROCESSING LOOP ---
    let batch = [];
    let localProcessedCount = currentProcessed;
    let isTimeout = false;

    for (let i = 0; i < rowsToProcess.length; i++) {
        
        // A. TIME CHECK (The "Graceful Pause")
        // We check this BEFORE processing the row to ensure we never get stuck mid-batch
        if (Date.now() - START_TIME > MAX_EXECUTION_TIME_MS) {
            console.log("\n⚠️ TIME LIMIT APPROACHING! ⚠️");
            console.log("⏸️  Pausing execution to save progress safely...");
            isTimeout = true;
            break; // Stop the loop immediately
        }

        // B. CREATE ROW OBJECT
        const row = rowsToProcess[i];
        const recordData = {};
        
        // Map columns
        for (const [csvHeader, destFieldId] of fieldMap.entries()) {
            const index = getHeaderIndex(headers, csvHeader);
            // Only add data if the cell is not empty
            if (index > -1 && row[index]) {
                recordData[destFieldId] = row[index];
            }
        }

        // Add Link back to Source Record
        recordData[INPUTS.LINK_FLD_ID] = [{ id: INPUTS.SOURCE_RECORD_ID }];
        
        batch.push({ fields: recordData });

        // C. SEND BATCH TO AIRTABLE (Every 50 records)
        if (batch.length === MAX_BATCH_SIZE || i === rowsToProcess.length - 1) {
            
            // Log before sending
            console.log(`📤 Sending batch of ${batch.length} records to destination...`);
            
            await destTable.createRecordsAsync(batch);
            
            localProcessedCount += batch.length;
            batch = []; // Empty the bucket
            
            // Log after success
            console.log(`📦 Batch saved! Total records processed so far: ${localProcessedCount}`);
        }
    }

    // --- STEP 7: FINAL WRAP UP ---
    if (isTimeout) {
        // CASE: PAUSED (Time limit hit)
        const logMsg = `⏸️ Paused at ${new Date().toLocaleTimeString()}. Processed ${localProcessedCount} / ${currentTotal} rows.`;
        
        await sourceTable.updateRecordAsync(INPUTS.SOURCE_RECORD_ID, {
            [INPUTS.PROCESSED_FLD_ID]: localProcessedCount,
            [INPUTS.STATUS_FLD_ID]: INPUTS.STATUS_VAL_PARTIAL,
            [INPUTS.LOG_FLD_ID]: logMsg
        });
        console.log(`💾 Progress saved. Status set to "${INPUTS.STATUS_VAL_PARTIAL}". Automation will resume automatically.`);

    } else {
        // CASE: SUCCESS (Finished all rows)
        const logMsg = `🎉 SUCCESS! All ${currentTotal} records have been created.`;
        
        await sourceTable.updateRecordAsync(INPUTS.SOURCE_RECORD_ID, {
            [INPUTS.PROCESSED_FLD_ID]: currentTotal,
            [INPUTS.STATUS_FLD_ID]: INPUTS.STATUS_VAL_SUCCESS,
            [INPUTS.LOG_FLD_ID]: logMsg
        });
        console.log(`🏁 JOB COMPLETE. Status set to "${INPUTS.STATUS_VAL_SUCCESS}".`);
    }
}

// =========================================================
// 3. HELPER FUNCTIONS (The machinery)
// =========================================================

async function updateStatus(table, status, log) {
    await table.updateRecordAsync(INPUTS.SOURCE_RECORD_ID, {
        [INPUTS.STATUS_FLD_ID]: status,
        [INPUTS.LOG_FLD_ID]: log
    });
}

// Read the mapping string and match it to CSV headers
function parseMapping(mappingStr, csvHeaders) {
    const map = new Map();
    const lines = mappingStr.split('\n');
    const available = csvHeaders.map(h => normalize(h));

    for (const line of lines) {
        const parts = line.split(':');
        if (parts.length < 2) continue; // Skip empty lines

        const headerName = parts[0];
        const fieldId = parts[1].trim();

        // Check if the header exists in the file
        if (!available.includes(normalize(headerName))) {
            const errorMsg = `❌ ERROR: Your mapping asks for "${headerName}", but that header was not found in the CSV file.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        map.set(headerName, fieldId);
    }
    return map;
}

// Find column number for a specific header
function getHeaderIndex(headersArray, targetName) {
    const target = normalize(targetName);
    return headersArray.findIndex(h => normalize(h) === target);
}

// Clean up text (Trim / Lowercase) based on settings
function normalize(str) {
    let s = String(str);
    if (INPUTS.IS_TRIM_HEADERS) s = s.trim();
    if (!INPUTS.IS_MATCH_CASE) s = s.toLowerCase();
    return s;
}

// Parse CSV Text into Arrays
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error("❌ The CSV file appears to be empty or only has a header row.");
    
    const parseLine = (line) => {
        // This regex handles commas inside "quoted strings" correctly
        const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
        const matches = line.match(regex);
        return matches ? matches.map(m => m.replace(/^"|"$/g, '')) : line.split(',');
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(l => parseLine(l));
    return { headers, rows };
}

// GLOBAL ERROR HANDLER
main().catch(async (err) => {
    console.error(`💥 CRITICAL ERROR: ${err.message}`);
    const table = base.getTable(INPUTS.SOURCE_TABLE_ID);
    await table.updateRecordAsync(INPUTS.SOURCE_RECORD_ID, {
        [INPUTS.STATUS_FLD_ID]: INPUTS.STATUS_VAL_ERROR,
        [INPUTS.LOG_FLD_ID]: `⛔ Script Failed: ${err.message}`
    });
});
