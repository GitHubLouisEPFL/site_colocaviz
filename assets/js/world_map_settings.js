let csvData = [];

function loadCSVData() {
  return fetch('https://raw.githubusercontent.com/com-480-data-visualization/com480-project-colocaviz/refs/heads/main/Milestones 1&2/data/merged_data.csv')
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
    
    const filteredData = data.filter(item => item.Item === item_name);
    
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
        margin-top: 0.5rem;
        flex-direction: column;
        align-items: center;
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
    
    // Year display (large and prominent)
    const yearDisplay = document.createElement('div');
    yearDisplay.textContent = currentYear;
    yearDisplay.style.cssText = `
        font-size: 1.5rem;
        font-weight: 800;
        color: #8B5E3C;
        text-shadow: 0 2px 4px rgba(139, 94, 60, 0.1);
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
        margin: 0 0 0.2rem 0;
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


let csvdata = null;
let csvDataPromise = null;
/**
 * Fetches global csv data with caching
 * @returns {Promise<Array>} Promise resolving csvdata
 */
function getCSV() {
    if (csvdata) {
        return Promise.resolve(csvdata);
    }
    // Return existing promise if already fetching  
    if (csvDataPromise) {
        return csvDataPromise;
    }

    csvDataPromise = loadCSVData().then(data => {
        csvdata = data;
        console.log("CSV data loaded successfully");
        return csvdata;
    }).catch(error => {
        console.error("Error loading CSV data:", error);
        throw error;        
    });

    return csvDataPromise;
};

getCSV().then(data => {console.log("firstdownload")}).catch(error => {
    console.error("Error in getCSV:", error);  });


let country_to_iso = {};
/**
 * Creates a world map visualization
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 * @param {Object} countryWideJson - Styled country data
 * @param {string} containerId - ID of container element
 * @param {Function} onCountrySelect - Callback when country is selected
 * @param {Function} onDataLoaded - Callback when geographic data is loaded (optional)
 * @returns {Object} - Control object with update and clear methods
 */
function createWorldMap(width, height, countryWideJson, containerId, onCountrySelect = null, onDataLoaded = null) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'world-map');

    // Create loader element
    const loader = document.createElement('div');
    loader.textContent = 'Loading map data...';
    loader.style.position = 'absolute';
    loader.style.top = '50%';
    loader.style.left = '50%';
    loader.style.transform = 'translate(-50%, -50%)';
    container.appendChild(loader);

    const g = svg.append('g'); // container group for zoom and map elements

    // Add background rect once
    g.append('rect')
        .attr('class', 'background')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#ffffff');

    let countryNames = {};
    let countries;
    let pathGenerator;
    let hasData = false;

    // --- Functions to render the map ---

    // Render no-data map
    const renderNoDataMap = () => {
        hasData = false;
        // Clear existing map elements
        g.selectAll('.country').remove();
        g.selectAll('.no-data-element').remove();
        svg.selectAll('.legend').remove();

        // Add gray countries
        g.selectAll('path.no-data-path')
            .data(countries.features)
            .enter()
            .append('path')
            .attr('class', 'country no-data-element no-data-path')
            .attr('d', pathGenerator)
            .attr('fill', '#cccccc')
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5)
            .style('cursor', 'default')
            .append('title')
            .text(d => countryNames[d.id] || 'Unknown');

        // Add "No data" text
        const noDataText = g.append('text')
            .attr('class', 'no-data-element no-data-text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '18px')
            .attr('font-weight', 'bold')
            .attr('fill', '#666')
            .text('No data available for the selected element');

        // Add background rect behind text for readability
        const bbox = noDataText.node().getBBox();
        g.insert('rect', '.no-data-text')
            .attr('class', 'no-data-element no-data-background')
            .attr('x', bbox.x - 10)
            .attr('y', bbox.y - 5)
            .attr('width', bbox.width + 20)
            .attr('height', bbox.height + 10)
            .attr('fill', 'rgba(255, 255, 255, 0.8)')
            .attr('stroke', '#ccc')
            .attr('stroke-width', 1)
            .attr('rx', 5);

    };

    // Render data map (colored countries)
    const renderDataMap = (resolvedCountryWideJson) => {
        hasData = true;
        // Clear previous map and legend
        g.selectAll('.country').remove();
        g.selectAll('.no-data-element').remove();
        svg.selectAll('.legend').remove();

        // Calculate min and max for legend (example assumes year_chosen variable exists)
        const values = Object.values(resolvedCountryWideJson)
            .map(d => d[year_chosen])
            .filter(v => v !== null && v !== undefined && v > 0);

        if (values.length === 0) {
            renderNoDataMap();
            return;
        }

        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        // Color scale - adjust domain & range to your data
        const colorScale = d3.scaleLinear()
            .domain([0, 0.5, 1])
            .range(['#A8E6CF', '#FFFACD', '#CC3232']);

        // Draw countries with data
        g.selectAll('path')
            .data(countries.features)
            .enter()
            .append('path')
            .attr('class', 'country')
            .attr('d', pathGenerator)
            .attr('fill', d => {
                const name = countryNames[d.id]?.toLowerCase();
                return resolvedCountryWideJson[name]?.fillColor || '#ccc';
            })
            .attr('stroke', d => {
                const name = countryNames[d.id]?.toLowerCase();
                return resolvedCountryWideJson[name]?.outlineColor || '#333';
            })
            .attr('stroke-width', d => {
                const name = countryNames[d.id]?.toLowerCase();
                return resolvedCountryWideJson[name]?.outlineWidth || 0.5;
            })
            .style('cursor', d => {
                const name = countryNames[d.id]?.toLowerCase();
                return resolvedCountryWideJson[name] ? 'pointer' : 'default';
            })
            .on('click', function(event, d) {
                const name = countryNames[d.id]?.toLowerCase();
                if (onCountrySelect && resolvedCountryWideJson[name]) {
                    const countryFeature = countries.features.find(f => f.id === d.id);
                    onCountrySelect(resolvedCountryWideJson[name], countryFeature, {
                        countries: countries,
                        countryNames: countryNames,
                        pathGenerator: pathGenerator,
                        projection: projection
                    });
                }
            })
            .append('title')
            .text(d => {
                const name = countryNames[d.id]?.toLowerCase();
                return resolvedCountryWideJson[name]?.hoverText || countryNames[d.id] || 'Unknown';
            });
            

        // Add legend
        const addLegend = (svg, colorScale, min, max) => {
            const legendWidth = 250;
            const legendHeight = 15;
            const legendX = 20;
            const legendY = height - 50;

            const legend = svg.append('g')
                .attr('class', 'legend')
                .attr('transform', `translate(${legendX}, ${legendY})`);

            const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
            const gradient = defs.append('linearGradient')
                .attr('id', 'legend-gradient');

            const numStops = 10;
            for (let i = 0; i <= numStops; i++) {
                const ratio = i / numStops;
                const logValue = min * Math.pow(max / min, ratio);

                const offset = 1;
                const safeValue = Math.max(logValue + offset, offset);
                const safeMin = Math.max(min + offset, offset);
                const safeMax = Math.max(max + offset, offset);

                const logVal = Math.log(safeValue);
                const logMin = Math.log(safeMin);
                const logMax = Math.log(safeMax);

                const normalizedValue = Math.max(0, Math.min(1, (logVal - logMin) / (logMax - logMin)));
                const color = colorScale(normalizedValue);

                gradient.append('stop')
                    .attr('offset', `${ratio * 100}%`)
                    .attr('stop-color', color);
            }

            legend.append('rect')
                .attr('width', legendWidth)
                .attr('height', legendHeight)
                .style('fill', 'url(#legend-gradient)')
                .style('stroke', '#000')
                .style('stroke-width', 0.5);

            const scale = d3.scaleLog()
                .domain([min, max])
                .range([0, legendWidth]);

            const axis = d3.axisBottom(scale)
                .ticks(4, '.1s');

            legend.append('g')
                .attr('transform', `translate(0, ${legendHeight})`)
                .style('font-size', '10px')
                .call(axis);
            console.log("whhich",resolvedCountryWideJson,resolvedCountryWideJson[Element])
            legend.append('text')
                .attr('x', legendWidth / 2)
                .attr('y', -5)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('font-weight', 'bold')
                .text(`${chosenFoodName}  in ${year_chosen}`);
        };

        addLegend(svg, colorScale, minValue, maxValue);
    };

    // Setup projection and pathGenerator after loading data
    let projection;

    Promise.all([
        d3.tsv('https://unpkg.com/world-atlas@1.1.4/world/50m.tsv'),
        d3.json('https://unpkg.com/world-atlas@1.1.4/world/50m.json')
    ]).then(([tsvData, topoJSONdata]) => {
        container.removeChild(loader);

        countryNames = tsvData.reduce((acc, d) => {
            acc[d.iso_n3] = d.name;
            return acc;
        }, {});
        // Convert TopoJSON to GeoJSON
        country_to_iso = tsvData.reduce((acc, d) => {  
            acc[d.name.toLowerCase()] = d.iso_n3;
            return acc;
        }, {});
        

        countries = topojson.feature(topoJSONdata, topoJSONdata.objects.countries);

        projection = d3.geoNaturalEarth1()
            .fitSize([width, height], countries);
        pathGenerator = d3.geoPath().projection(projection);
        
        switzerlandFeature = countries.features.find(f => f.id === '756');
        // Add zoom behavior
        const zoomHandler = d3.zoom()
            .scaleExtent([0.5, 10])
            .translateExtent([[-width * 2, -height * 2], [width * 2, height * 2]])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
                g.selectAll('.country')
                    .attr('stroke-width', 0.5 / event.transform.k);
            });

        svg.call(zoomHandler);

        // Render initial map based on passed data or fallback
        if (!countryWideJson) {
            renderNoDataMap();
        } else if (typeof countryWideJson.then === 'function') {
            countryWideJson.then(resolved => {
                if (!resolved || Object.keys(resolved).length === 0) {
                    renderNoDataMap();
                } else {
                    renderDataMap(resolved);
                }
            }).catch(() => {
                renderNoDataMap();
            });
        } else {
            renderDataMap(countryWideJson);
        }

        if (onDataLoaded) {
            onDataLoaded({
                countries,
                countryNames,
                pathGenerator,
                projection
            });
        }
    });
    return {
        update: (newCountryWideJson) => {
            if (!newCountryWideJson && hasData) {
                renderNoDataMap();
            } else if (newCountryWideJson ) {
            renderDataMap(newCountryWideJson);
            }
             else {
                return; // No update needed
            }
            },
        clear: () => {
        container.innerHTML = '';
        }
        };
        }
