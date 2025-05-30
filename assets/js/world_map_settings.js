let csvData = [];

function loadCSVData() {
  return fetch('https://raw.githubusercontent.com/com-480-data-visualization/com480-project-colocaviz/refs/heads/main/data/merged_data.csv')
    .then(response => response.text())
    .then(csvText => {
      return new Promise((resolve) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          complete: function(results) {
            csvData = results.data;
            resolve(csvData);
          }
        });
      });
    });
}




// Separate filtering function
function filterCSV(data, item_name = null, element_name = "area harvested") {
    let filteredData = data
        .filter(item => item.Item === item_name)
        .filter(item => item.Element === element_name);
    if (filteredData.length === 0) {
        filteredData = data
        .filter(item => item.food_commodity_typology === item_name)
        .filter(item => item.Element === element_name);
    }
    console.log(`CSV data filtered for Item: ${item_name}, Element: ${element_name}`);
    console.log(`Filtered ${filteredData.length} records from ${data.length} total records`);
    
    return filteredData;
};

// Convenience function that combines both
function getFilteredCSV(item_name = null, element_name = "area harvested") {
    let filteredcsv =getCSV().then(data => filterCSV(data, item_name, element_name)); 
    return filteredcsv;
};


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


/**
 * Creates country-wide JSON with styling information
 * @param {Object} countryJson - Raw country data
 * @param {Array} colorGradient - Array of two colors for gradient [min, max]
 * @param {Function} colorMappingFunction - Optional custom mapping function
 * @returns {Object} Styled country data
 */
function createCountryWideJson(countryJson, colorGradient = ['#A8E6CF', '#FFFACD', '#CC3232'], colorMappingFunction = null) {
    // Default to linear mapping if no custom function provided
    if (!countryJson){return countryJson}

    const defaultMapping = (value, min, max) => {
        return (value - min) / (max - min);
    };
    const logMapping = (value, min, max) => {
    // Add small offset to handle zeros
    const offset = 1;
    const safeValue = Math.max(value + offset, offset);
    const safeMin = Math.max(min + offset, offset);
    const safeMax = Math.max(max + offset, offset);
    
    const logValue = Math.log(safeValue);
    const logMin = Math.log(safeMin);
    const logMax = Math.log(safeMax);
    
    return Math.max(0, Math.min(1, (logValue - logMin) / (logMax - logMin)));
    };
    const mappingFn = colorMappingFunction || logMapping;
    
    // Extract values for min/max calculation

    //const values = Object.values(countryJson).map(country => country.value);
    const yearvalues = countryJson.map(item => item[year_chosen]).filter(value => value !== null && value !== undefined);
    const minValue = Math.min(...yearvalues);
    const maxValue = Math.max(...yearvalues);
    
    // Create color scale using D3
    
    const colorScale = d3.scaleLinear()
        .domain([0, 0.5,1])
        .range(colorGradient);
    
    // Create styled country data
    return Object.entries(countryJson).reduce((acc, [countryCode, data]) => {
        if (!data || !data[year_chosen]) {  
            return acc; // Skip countries with missing data
        }
        const normalizedValue = mappingFn(data[year_chosen], minValue, maxValue);   
        acc[data["Area"]] = {
            ...data,
            fillColor: colorScale(normalizedValue),
            outlineColor: '#333',
            outlineWidth: 0.5,
            hoverText: `${data.Area}: ${data[year_chosen]} ${data.Unit}`,
            normalizedValue
        };
        return acc;
    }, {});
}