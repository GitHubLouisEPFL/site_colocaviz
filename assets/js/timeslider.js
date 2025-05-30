/**
 * Gets available years from the CSV data
 * @param {Array} data - The filtered CSV data
 * @returns {Array} Array of available years
 */
function getAvailableYears(data) {
    if (!data || data.length === 0) return [];
    
    // Get all column names that look like years (4-digit numbers)
    const sampleRow = data[0];
    console.log("Sample row for year extraction:", sampleRow);
    const yearColumns = Object.keys(sampleRow).filter(key => {
        return /^\d{4}$/.test(key) && parseInt(key) >= 1960 && parseInt(key) <= 2030;
    });
    return yearColumns.map(year => parseInt(year)).sort((a, b) => a - b);
}