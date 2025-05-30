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
function filterByElement(data, element_name = "area harvested") {
    const filteredData = data.filter(item => item.Element === element_name);
    console.log(`CSV data filtered for Element: ${element_name}`);
    return filteredData;
}

// Convenience function that combines both
function getFilteredbyelement(element_name = "area harvested") {
    let filteredcsv =getCSV().then(data => filterByElement(data, element_name)); 
    return filteredcsv;
};

// Filter by item (checks both Item and food_commodity_typology fields)
function filterByItem(data, item_name = null) {
    
    let filteredData = data.filter(item => item.Item === item_name);
    
    // If no results found with Item field, try food_commodity_typology field
    if (filteredData.length === 0) {
        filteredData = data.filter(item => item.food_commodity_typology === item_name);
    }
    
    console.log(`CSV data filtered for Item: ${item_name}`);
    console.log(`Filtered ${filteredData.length} records from ${data.length} total records`);
    return filteredData;
}




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

/**
 * Creates a time slider control
 * @param {Array} availableYears - Array of available years
 * @param {number} currentYear - Current selected year
 * @param {Function} onYearChange - Callback when year changes
 * @param {string} containerId - ID of container for the slider
 * @returns {Object} Control object with update method
 */

function createTimeSlider(availableYears, currentYear, onYearChange, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id '${containerId}' not found`);
        return { update: () => {} };
    }
    container.innerHTML = '';
    
    if (!availableYears || availableYears.length === 0) {
        const noDataMsg = document.createElement('p');
        noDataMsg.textContent = 'Aucune donnée temporelle disponible';
        noDataMsg.style.textAlign = 'center';
        noDataMsg.style.color = '#8B5E3C';
        noDataMsg.style.fontStyle = 'italic';
        noDataMsg.style.padding = '20px';
        container.appendChild(noDataMsg);
        return { update: () => {} };
    }
    
    const sortedYears = [...availableYears].sort((a, b) => a - b);
    let currentIndex = sortedYears.indexOf(currentYear);
    if (currentIndex === -1) {
        currentIndex = 0;
        currentYear = sortedYears[0];
    }
    console.log("sadd")
    // --- Create Slider Container ---
    const sliderContainer = document.createElement('div');
    sliderContainer.id = 'sliderContainer'; 
    sliderContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        background: linear-gradient(135deg, #F6F1E7 0%, #EDE6DB 100%);
        border: 2px solid rgba(139, 94, 60, 0.2);
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(139, 94, 60, 0.15);
        font-family: 'Inter', sans-serif;
        transition: all 0.3s ease;
    `;
    
    // Add subtle pattern overlay
    const patternOverlay = document.createElement('div');
    patternOverlay.className = 'pattern-overlay';
    patternOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: radial-gradient(circle at 20% 50%, rgba(163, 137, 102, 0.05) 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, rgba(139, 94, 60, 0.05) 0%, transparent 50%);
        pointer-events: none;
    `;
    sliderContainer.appendChild(patternOverlay);
    
    // Title with decorative elements
    const titleContainer = document.createElement('div');
    titleContainer.className = 'title-container';
    titleContainer.style.cssText = `
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        position: relative;
        z-index: 1;
    `;
    
    const decorLeft = document.createElement('div');
    decorLeft.className = 'decor-left';
    decorLeft.style.cssText = `
        width: 30px;
        height: 2px;
        background: linear-gradient(to right, transparent, #8B5E3C);
        margin-right: 15px;
    `;
    
    const title = document.createElement('div');
    title.className = 'slider-title';
    title.textContent = 'Time Period';
    title.style.cssText = `
        font-weight: 700;
        font-size: 20px;
        color: #3B2F2F;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
    `;
    
    const decorRight = document.createElement('div');
    decorRight.className = 'decor-right';
    decorRight.style.cssText = `
        width: 30px;
        height: 2px;
        background: linear-gradient(to left, transparent, #8B5E3C);
        margin-left: 15px;
    `;
    
    titleContainer.appendChild(decorLeft);
    titleContainer.appendChild(title);
    titleContainer.appendChild(decorRight);
    sliderContainer.appendChild(titleContainer);
    
    // Year display (large and prominent)
    const yearDisplay = document.createElement('div');
    yearDisplay.textContent = currentYear;
    yearDisplay.style.cssText = `
        font-size: 32px;
        font-weight: 800;
        color: #8B5E3C;
        text-shadow: 0 2px 4px rgba(139, 94, 60, 0.1);
        margin-bottom: 15px;
        position: relative;
        z-index: 1;
        transition: all 0.3s ease;
    `;
    sliderContainer.appendChild(yearDisplay);
    
    // Slider container with custom styling
    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'slider-wrapper';
    sliderWrapper.style.cssText = `
        width: 100%;
        padding: 0 10px;
        margin: 10px 0 15px 0;
        position: relative;
        z-index: 1;
    `;
    
    // Create custom slider track background
    const sliderTrack = document.createElement('div');
    sliderTrack.style.cssText = `
        width: 100%;
        height: 8px;
        background: linear-gradient(to right, #D4C4A8, #A38966);
        border-radius: 4px;
        position: relative;
        box-shadow: inset 0 2px 4px rgba(59, 47, 47, 0.1);
    `;
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = sortedYears.length - 1;
    slider.value = currentIndex;
    slider.step = 1;
    slider.style.cssText = `
        width: 100%;
        height: 8px;
        background: transparent;
        outline: none;
        position: absolute;
        top: 0;
        left: 0;
        -webkit-appearance: none;
        -moz-appearance: none;
        cursor: pointer;
        z-index: 2;
    `;
    
    // Custom slider thumb styling
    const styleSheet = document.createElement('style');
    const randomId = 'slider_' + Math.random().toString(36).substr(2, 9);
    slider.id = randomId;
    
    styleSheet.textContent = `
        #${randomId}::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: radial-gradient(circle, #8B5E3C, #A38966);
            cursor: pointer;
            border: 3px solid #FAF9F6;
            box-shadow: 0 4px 12px rgba(139, 94, 60, 0.3);
            transition: all 0.2s ease;
        }
        
        #${randomId}::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(139, 94, 60, 0.4);
        }
        
        #${randomId}::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: radial-gradient(circle, #8B5E3C, #A38966);
            cursor: pointer;
            border: 3px solid #FAF9F6;
            box-shadow: 0 4px 12px rgba(139, 94, 60, 0.3);
            -moz-appearance: none;
        }
        
        #${randomId}::-moz-range-track {
            background: transparent;
            border: none;
        }
    `;
    document.head.appendChild(styleSheet);
    
    sliderTrack.appendChild(slider);
    sliderWrapper.appendChild(sliderTrack);
    sliderContainer.appendChild(sliderWrapper);
    
    // Range display with rustic styling
    const rangeDisplay = document.createElement('div');
    rangeDisplay.textContent = `${sortedYears[0]} — ${sortedYears[sortedYears.length - 1]}`;
    rangeDisplay.style.cssText = `
        font-size: 13px;
        color: #A38966;
        font-weight: 500;
        text-align: center;
        position: relative;
        z-index: 1;
        letter-spacing: 0.5px;
    `;
    sliderContainer.appendChild(rangeDisplay);
    
    // Event listener with smooth transitions
    slider.addEventListener('input', (event) => {
        const yearIndex = parseInt(event.target.value);
        const newYear = sortedYears[yearIndex];
        
        // Smooth year change animation
        yearDisplay.style.opacity = '0.7';
        yearDisplay.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            yearDisplay.textContent = newYear;
            yearDisplay.style.opacity = '1';
            yearDisplay.style.transform = 'scale(1)';
        }, 100);
        
        year_chosen = newYear;
        if (onYearChange) {
            onYearChange(newYear);
        }
    });
    
    container.appendChild(sliderContainer);
    
    return {
        update: (newAvailableYears, newCurrentYear) => {
            if (newAvailableYears && newAvailableYears.length > 0) {
                const newSortedYears = [...newAvailableYears].sort((a, b) => a - b);
                let newCurrentIndex = newSortedYears.indexOf(newCurrentYear || year_chosen);
                if (newCurrentIndex === -1) {
                    newCurrentIndex = 0;
                    newCurrentYear = newSortedYears[0];
                }
                
                slider.min = 0;
                slider.max = newSortedYears.length - 1;
                slider.value = newCurrentIndex;
                yearDisplay.textContent = newCurrentYear || newSortedYears[newCurrentIndex];
                rangeDisplay.textContent = `${newSortedYears[0]} — ${newSortedYears[newSortedYears.length - 1]}`;
                year_chosen = newCurrentYear || newSortedYears[newCurrentIndex];
                sortedYears.splice(0, sortedYears.length, ...newSortedYears);
            }
        }
    };
}

/**
 * Creates the complete visualization page with world map and country detail
 * @param {Object} countryJson - Raw country data
 * @param {Function} smallAreaFunction - Optional custom visualization function
 * @param {number} width - Overall container width
 * @param {number} height - Overall container height
 * @param {string} containerId - ID of the main container
 * @returns {Object} - Control object with update method
 */
async function createVisualizationPage(smallAreaFunction = null, width = 1000, height = 500, containerId = 'visualization-container',
    element_to_visualize = 'area harvested',
    id_indicator='animal-slaugthered') {
    
    const elementcsv =getFilteredbyelement(element_name = element_to_visualize);
     console.log('Filtered dataehfcur for element:', elementcsv);
    // Get container
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.gap = '20px';
    // Create map container
    const mapContainer = document.createElement('div');
    mapContainer.id = 'map-container' + id_indicator;
    mapContainer.style.flex = '1';
    mapContainer.style.position = 'relative';
    mapContainer.style.border = '1px solid #ccc';
    mapContainer.style.borderRadius = '4px';
    container.appendChild(mapContainer);
    
    // Create title for map
    const mapTitle = document.createElement('h3');
    mapTitle.textContent = 'World Map';
    mapTitle.style.textAlign = "center";
    mapTitle.style.margin = '10px';
    mapTitle.style.fontWeight = 'bold';
    mapContainer.appendChild(mapTitle);
    
    // Create actual map container
    const actualMapContainer = document.createElement('div');
    actualMapContainer.id = 'actual-map-container'+ id_indicator;
    actualMapContainer.style.position = 'absolute';
    actualMapContainer.style.top = '40px';
    actualMapContainer.style.bottom = '0';
    actualMapContainer.style.left = '0';
    actualMapContainer.style.right = '0';    
    mapContainer.appendChild(actualMapContainer); 
    // Create detail container
    const detailContainer = document.createElement('div');
    detailContainer.id = 'detail-container'  + id_indicator;
    detailContainer.style.flex = '1';
    detailContainer.style.position = 'relative';
    detailContainer.style.border = '1px solid #ccc';
    detailContainer.style.borderRadius = '4px';
    container.appendChild(detailContainer);
    
    // Create title for detail
    const detailTitle = document.createElement('h3');
    detailTitle.textContent = 'Country Details';
    detailTitle.style.textAlign = "center";
    detailTitle.style.margin = '10px';
    detailTitle.style.fontWeight = 'bold';
    detailContainer.appendChild(detailTitle);
    
    // Create actual detail container
    const actualDetailContainer = document.createElement('div');
    actualDetailContainer.id = 'actual-detail-container'  + id_indicator;
    actualDetailContainer.style.position = 'absolute';
    actualDetailContainer.style.top = '40px';
    actualDetailContainer.style.bottom = '0';
    actualDetailContainer.style.left = '0';
    actualDetailContainer.style.right = '0';
    detailContainer.appendChild(actualDetailContainer);

    // Initialize time slider variable (declare it here, outside the return object)
    let timeSlider_animal = null;
    
    // Process the country JSON to add styling

    countryWideJson = null;
    let selectedCountry = null;
    // Current selected country and geographic data
    let geoData = null;
    
    // Create the detail visualization first (will be updated once geo data loads)
    const mapWidth = width / 2 - 30;
    const mapHeight = height - 60;
    document.getElementById(id_indicator + "-container").style.visibility = "hidden";
    const detailViz = createSmallAreaVisualization(
        null,
        null, // no feature initially
        mapWidth,
        mapHeight,
        'actual-detail-container'  + id_indicator
    );
    
    // Create the world map with callbacks
    const map = createWorldMap(        
        mapWidth, 
        mapHeight, 
        countryWideJson, 
        'actual-map-container'  + id_indicator, 
        // onCountrySelect callback
        (country, countryFeature, geoDataFromMap) => {
            selectedCountry = country;            
            // Update detail visualization with country data, feature, and geo data
            detailViz.update(selectedCountry, countryFeature, geoDataFromMap);
            
        },
        // onDataLoaded callback  
        (loadedGeoData) => {
            geoData = loadedGeoData;
            console.log('Geographic data loaded and available for detail viz');
        }
    );
        
    // Return control object
    return {
    update: () => {
        chosenFoodName = document.getElementById("chosen-food-name").textContent;
        elementcsv.then(data => {
            console.log(filterByItem(data, item_name = chosenFoodName));
            return filterByItem(data, item_name = chosenFoodName)}
            )
            .then(filteredData => {
            if (!filteredData || filteredData.length === 0) {
                document.getElementById(id_indicator + "-container").style.visibility = "hidden";
                return;
            }

            document.getElementById(id_indicator + "-container").style.visibility = "visible";
            console.log('Filtered dataehfcur fyr:', filteredData);
            const newCountryWideJson = createCountryWideJson(filteredData);
            
            // Get available years from the data and create/update time slider
            const availableYears = getAvailableYears(filteredData);
            
            if (timeSlider_animal) {
                // Update existing slider
                timeSlider_animal.update(availableYears, year_chosen);
            } else if (availableYears.length > 0) {
                // Create new slider
                timeSlider_animal = createTimeSlider(
                    availableYears,
                    year_chosen,
                    (newYear) => {
                        // Callback when year changes
                        year_chosen = newYear;
                        
                        // Update the map with new year data
                        const updatedCountryWideJson = createCountryWideJson(filteredData);
                        if (map) {
                            map.update(updatedCountryWideJson);
                        }
                        if (selectedCountry && geoData) {
                            detailViz.update(
                                selectedCountry,
                                geoData.countries.features.find(f => f.id === country_to_iso[selectedCountry.Area]),
                                geoData
                            );}
                    },
                    'time-slider-container'
                );
            }
            
            if (map) {  // Check if map is ready
                map.update(newCountryWideJson);
            }
            // Reset selected country
            selectedCountry = null;
            if (detailViz && geoData) {
                detailViz.update(null, null, geoData);
            }
        }).catch(error => {
            console.error("Error updating visualization:", error);
        });
    },
    selectCountry: (countryCode) => {
        if (countryWideJson[countryCode] && geoData) {
            selectedCountry = countryWideJson[countryCode];
            
            // Find the geographic feature for this country
            const countryFeature = geoData.countries.features.find(f => f.id === countryCode);
            detailViz.update(selectedCountry, countryFeature, geoData);
        }
    }
    };
}