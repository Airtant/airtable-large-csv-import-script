# 🚀 Airtable CSV Importer: Import Large Files Without Timeouts (Auto-Resumable)
![Airtable](https://img.shields.io/badge/Airtable-18BFFF?style=for-the-badge&logo=airtable&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![JSON](https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white)
![Webhooks](https://img.shields.io/badge/Webhooks-FCC624?style=for-the-badge&logo=webhooks&logoColor=black)
[![Maintained by Khan](https://img.shields.io/badge/Maintained%20by-Khan-blueviolet?style=for-the-badge)](https://github.com/Airtant/airtable-large-csv-import-script#author)


A robust, "state-aware" Airtable Automation script designed to import large CSV files from an attachment field into a destination table.

Unlike standard scripts that crash after 30 seconds or 5 minutes, this script monitors its own execution time. If it approaches the limit, it **gracefully pauses**, saves its progress, and **automatically resumes** via a secondary automation trigger.

## ✨ Key Features

* **⚡ Auto-Resumable:** Breaks large CSVs into batches. If the time limit is reached, it marks the status as "Partial Success" and resumes exactly where it left off in the next run.
* **🛡️ Time Limit Safe:** Actively monitors the clock and stops execution *before* Airtable kills the process, preventing data loss.
* **✅ Robust Validation:** Checks CSV headers against your specific mapping before processing. Supports case-insensitive matching and auto-trimming.
* **📝 Detailed Logging:** Provides human-readable status updates (e.g., "Processed 500/1000 rows") directly in a Log field.
* **🔗 Automatic Linking:** Links every created record back to the original source record for easy auditing.

---

## 🛠️ Base Setup (Prerequisites)

Before adding the script, set up your Airtable base with the following fields.

### 1. Source Table (Where you upload the CSV)
Create a table (e.g., `CSV Imports`) with these fields:

| Field Name | Type | Notes |
| :--- | :--- | :--- |
| **CSV File** | Attachment | Upload your `.csv` here. |
| **Status** | Single Select | Options: `In Progress`, `Partial Success`, `Success`, `Error`. |
| **Processing Log** | Long Text | Stores error messages and progress updates. |
| **Total Rows** | Number | Integer. Stores the total line count of the CSV. |
| **Processed Rows** | Number | Integer. Tracks how many rows have been finished. |

### 2. Destination Table (Where data goes)
* Ensure you have fields that match the columns in your CSV.
* Create a **Link to another record** field pointing back to the **Source Table**.

---

## ⚠️ Critical Requirements

For this script to work, you must be precise with your naming. The script looks for specific **Input Variable Names** and **Status Options**.

### 1. Input Variable Names
When adding variables in the Airtable Automation "Input" sidebar, the **Name** column must match the list in the configuration section **exactly**.
* **Case Sensitive:** `source_table_id` is NOT the same as `Source_Table_Id`.
* **No Spaces:** Use underscores (e.g., `status_value_success`).

### 2. Status Field Options
Your **Status** field (Single Select) in the Source Table **must** contain the exact options you define in the inputs.
* If you set the input `status_value_success` to `Success`, your Single Select field **must** have an option created named `Success`.
* If the script tries to update the status to "Partial Success" but that option doesn't exist in the field configuration, the script will fail.

---

## 🆔 How to Find IDs & Why We Use Them

You might wonder: *"Why do I need to look up these weird codes like `tblK3s9...` instead of just typing 'Clients'?"*

### 1. Why use IDs? (The "Anti-Break" Policy)
We strictly use **IDs** for Tables and Fields instead of names to make your automation **bulletproof**.
* **The Problem with Names:** If you configure the script to look for a table named "Orders", and next week you rename that table to "Sales Orders", **the script will crash**.
* **The Solution with IDs:** An ID (like `tblxxxxxxxx`) never changes, even if you rename the table or field a hundred times.

### 2. How to find a Table ID
1.  Open your Airtable base and click on the tab for the table you want.
2.  Look at your browser's address bar (URL).
3.  Find the string that starts with `tbl`.
    * *Example:* `https://airtable.com/appXXXXXX/`**`tblMmM123456`**`/viwXXXXXX`
4.  Copy that code. That is your `source_table_id` or `dest_table_id`.



### 3. How to find a Field ID
1.  Right-click the header of the specific field (column) you need.
2.  Select **"Copy field URL"**.
3.  Paste the link somewhere (like a notepad). It will look like this:
    * `https://airtable.com/tblXXXXXX/viwXXXXXX/`**`fldYyY789012`**
4.  The last part, starting with `fld`, is your **Field ID**.



---

## ⚙️ Automation Setup

To enable the "Auto-Resume" loop, you need **two** automations.

### Automation 1: The Starter
* **Trigger:** "When record matches conditions"
    * *Condition:* `CSV File` is not empty AND `Status` is empty.
* **Action:** "Run Script"
    * Paste the code from `script.js`.
    * Configure the input variables (see below).

### Automation 2: The Resumer (The Loop)
* **Prerequisite:** Create a Filtered View in your Source Table named **"Partial Imports"**.
    * *Filter:* `Status` is `Partial Success`.
* **Trigger:** "When record enters view" -> Select **"Partial Imports"** view.
* **Action:** "Run Script"
    * Paste the **exact same code** from `script.js`.
    * Use the **exact same input variables**.

---
## 📝 Script Configuration (Input Variables)

In the "Run Script" action, add the following **Input Variables** on the left sidebar. The names must match exactly.

| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `source_table_id` | `tblXXXXXXXX` | The ID of the table containing the CSV. |
| `source_record_id` | (From Trigger) | Click the + button and select Record ID from the trigger. |
| `attachment_field_id` | `fldXXXXXXXX` | Field ID of the CSV Attachment. |
| `status_field_id` | `fldXXXXXXXX` | Field ID of the Status column. |
| `status_value_success` | `Success` | Exact text for the success option. |
| `status_value_partial` | `Partial Success` | Exact text for the partial option. |
| `status_value_error` | `Error` | Exact text for the error option. |
| `status_value_progress` | `In Progress` | Exact text for the running option. |
| `log_field_id` | `fldXXXXXXXX` | Field ID for the Log/Notes column. |
| `total_rows_field_id` | `fldXXXXXXXX` | Field ID for the 'Total Rows' number field. |
| `processed_rows_field_id` | `fldXXXXXXXX` | Field ID for the 'Processed Rows' number field. |
| `dest_table_id` | `tblXXXXXXXX` | The ID of the table where records will be created. |
| `link_field_id` | `fldXXXXXXXX` | Field ID in Dest. Table that links back to Source. |
| `header_mapping` | (See Below) | A string mapping CSV headers to Field IDs. |
| `config_match_case` | `false` | `true` to enforce exact case matching on headers. |
| `config_trim_headers` | `true` | `true` to remove whitespace from CSV headers. |

### Header Mapping Format
In the `header_mapping` input value, enter your map in this format (one per line):
```text
CSV Header Name 1: fld_Dest_ID_1
Product Name: fld_AbCdEfG123
Price: fld_HiJkLmN456
SKU Code: fld_OpQrStU789
```
## 🚀 How It Works (The Lifecycle)

1. **Upload:** You upload a CSV to the source record.
2. **Start:** Automation 1 triggers. The script sets status to `In Progress` and calculates `Total Rows`.
3. **Process:** The script creates records in batches of 50.
4. **Time Check:**
    - If the script finishes all rows: It sets status to `Success`.
    - If the script runs near the time limit (4.5 mins): It stops, updates `Processed Rows`, and sets status to `Partial Success`.
5. **Resume:** Setting the status to `Partial Success` moves the record into the **"Partial Imports"** view. This triggers **Automation 2**, which runs the script again.
6. **Loop:** The script sees existing `Processed Rows`, skips them, and continues until finished.

---

## ❌ Common Mistakes & Troubleshooting

If the script fails, check these common issues first:

### 1. "ReferenceError: x is not defined"

- **Cause:** You likely made a typo in the **Input Variable Name** on the left side of the automation screen.
- **Fix:** Double-check the spelling and casing against the "Script Configuration" table above. They must match exactly.

### 2. "Error: Field 'Status' cannot accept value 'Partial Success'"

- **Cause:** The text "Partial Success" does not exist as an option in your Single Select field.
- **Fix:** Go to your table, edit the Status field, and add the option "Partial Success" (or whatever specific text you used in your input variables).

### 3. "Error: Header 'Product Name' not found"

- **Cause:** The header name in your CSV file is slightly different from what you put in the `header_mapping`.
- **Fix:** Open your CSV file. Check for trailing spaces (e.g., `"Product Name "` vs `"Product Name"`).
    - *Tip:* Set `config_trim_headers` to `true` to fix space issues automatically.

### 4. "Error: Permissions denied"

- **Cause:** The automation is running as "You" (the user), but you might not have permission to create records in the Destination Table.
- **Fix:** Ensure your user account has "Creator" or "Editor" permissions on both the Source and Destination tables.

## 📄 The Script
```JavaScript
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
```

## ✍️ Author

### Hi there, I'm Khan 👋
I’m the Lead Developer at **Airtant**, where we build specialized solutions for the Airtable ecosystem. I bridge the gap between standard Airtable features and complex backend requirements using JavaScript, Webhooks, and Data Scraping.

- 🔬 I’m currently building robust scripts and extensions to power **Airtant's** automation suite.
- ⚡️ I specialize in handling large datasets, API integrations, and "impossible" Airtable workflows.
- 🌱 I’m constantly exploring advanced Node.js patterns to optimize Airtable scripting performance.
- 👯‍♂️ I’m open to collaboration on open-source Airtable tools and data extraction pipelines.
- 🗯 Ask me about Scripting Block, Regex, API Connectivity, and Database Architecture.

### 🎓 Certifications
![Airtable Certified](https://img.shields.io/badge/Airtable-Certified-blue?style=for-the-badge&logo=airtable&logoColor=white) ![Make.com Certified](https://img.shields.io/badge/Make.com-Certified-purple?style=for-the-badge&logo=make&logoColor=white) ![Scrum Certified Product Owner](https://img.shields.io/badge/Scrum-Product%20Owner-red?style=for-the-badge&logo=scrumalliance&logoColor=white)

## 📄 License

This project is licensed under the MIT License.
