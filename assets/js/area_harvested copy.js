// Main modular functions for world map visualization

let csvdata = null;
let csvDataPromise = null;
let chosenFoodName = null;
let switzerlandFeature = null;
/**
 * Fetches Paris SVG data with caching
 * @returns {Promise<Array>} Promise resolving csvdata
 */
const getCSV = function getCSV() {
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

// Separate filtering function
const filterCSV = function filterCSV(data, item_name = null, element_name = "area harvested") {
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
const getFilteredCSV = function getFilteredCSV(item_name = null, element_name = "area harvested") {
    let filteredcsv =getCSV().then(data => filterCSV(data, item_name, element_name)); 
    return filteredcsv;
};


let year_chosen = 2023; // Default year
/**
 * Sets the year for filtering data
 * @param {number} year - The year to set
 * */
let yearlyData = null;

/**
 * Gets available years from the CSV data
 * @param {Array} data - The filtered CSV data
 * @returns {Array} Array of available years
 */
function getAvailableYears(data) {
    if (!data || data.length === 0) return [];
    
    // Get all column names that look like years (4-digit numbers)
    const sampleRow = data[0];
    const yearColumns = Object.keys(sampleRow).filter(key => {
        return /^\d{4}$/.test(key) && parseInt(key) >= 1960 && parseInt(key) <= 2030;
    });
    
    return yearColumns.map(year => parseInt(year)).sort((a, b) => a - b);
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
    container.innerHTML = '';
    
    if (!availableYears || availableYears.length === 0) {
        container.innerHTML = '<p>No time data available</p>';
        return { update: () => {} };
    }
    
    // Create slider container
    const sliderContainer = document.createElement('div');
    sliderContainer.style.padding = '15px';
    sliderContainer.style.backgroundColor = '#f8f9fa';
    sliderContainer.style.border = '1px solid #dee2e6';
    sliderContainer.style.borderRadius = '6px';
    sliderContainer.style.margin = '10px 0';
    
    // Create title
    const title = document.createElement('div');
    title.textContent = 'Time Period';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.fontSize = '14px';
    title.style.color = '#495057';
    sliderContainer.appendChild(title);
    
    // Create slider input
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = Math.min(...availableYears);
    slider.max = Math.max(...availableYears);
    slider.value = currentYear;
    slider.step = 1;
    slider.style.width = '100%';
    slider.style.marginBottom = '8px';
    
    // Create year display
    const yearDisplay = document.createElement('div');
    yearDisplay.textContent = currentYear;
    yearDisplay.style.textAlign = 'center';
    yearDisplay.style.fontWeight = 'bold';
    yearDisplay.style.fontSize = '16px';
    yearDisplay.style.color = '#007bff';
    
    // Create year range display
    const rangeDisplay = document.createElement('div');
    rangeDisplay.textContent = `${Math.min(...availableYears)} - ${Math.max(...availableYears)}`;
    rangeDisplay.style.textAlign = 'center';
    rangeDisplay.style.fontSize = '12px';
    rangeDisplay.style.color = '#6c757d';
    rangeDisplay.style.marginTop = '5px';
    
    // Add event listener
    slider.addEventListener('input', (event) => {
        const newYear = parseInt(event.target.value);
        yearDisplay.textContent = newYear;
        year_chosen = newYear; // Update global variable
        if (onYearChange) {
            onYearChange(newYear);
        }
    });
    
    // Assemble the slider
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(yearDisplay);
    sliderContainer.appendChild(rangeDisplay);
    container.appendChild(sliderContainer);
    
    return {
        update: (newAvailableYears, newCurrentYear) => {
            if (newAvailableYears && newAvailableYears.length > 0) {
                slider.min = Math.min(...newAvailableYears);
                slider.max = Math.max(...newAvailableYears);
                rangeDisplay.textContent = `${Math.min(...newAvailableYears)} - ${Math.max(...newAvailableYears)}`;
            }
            if (newCurrentYear) {
                slider.value = newCurrentYear;
                yearDisplay.textContent = newCurrentYear;
                year_chosen = newCurrentYear;
            }
        }
    };
}


// Global cache for Paris SVG data
let parisDataCache = null;
let parisDataPromise = null;
/**
 * Fetches Paris SVG data with caching
 * @returns {Promise<Array>} Promise resolving to array of path data
 */
function fetch_paris_svg() {
    // Return cached data if available
    if (parisDataCache) {
        return Promise.resolve(parisDataCache);
    }
    
    // Return existing promise if already fetching
    if (parisDataPromise) {
        return parisDataPromise;
    }
    
    // Create new fetch promise
    parisDataPromise = fetch('https://raw.githubusercontent.com/GitHubLouisEPFL/site_colocaviz/bbe178cd7725a4e7fcafb7954e484f83d92838ef/svg_files/paris_border.svg')
        .then(res => res.text())
        .then(svg => {
            const matches = svg.match(/<path[^>]*d="([^"]+)"/g) || [];
            const dValues = matches.map(m => m.match(/d="([^"]+)"/)[1]);
            parisDataCache = dValues; // Cache the result
            return dValues;
        })
        .catch(error => {
            console.error("Error fetching or processing the SVG:", error);
            parisDataPromise = null; // Reset promise on error to allow retry
            throw error;
        });
    
    return parisDataPromise;
}

/**
 * Creates country-wide JSON with styling information
 * @param {Object} countryJson - Raw country data
 * @param {Array} colorGradient - Array of two colors for gradient [min, max]
 * @param {Function} colorMappingFunction - Optional custom mapping function
 * @returns {Object} Styled country data
 */
function createCountryWideJson(countryJson, colorGradient = ['#FADC00', '#FD1D1D'], colorMappingFunction = null) {
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
        .domain([0, 1])
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
            .domain([0, 1])
            .range(['#FADC00', '#FD1D1D']);

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

            legend.append('text')
                .attr('x', legendWidth / 2)
                .attr('y', -5)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('font-weight', 'bold')
                .text(`${chosenFoodName} Area Harvested (hectares) - ${year_chosen}`);
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
                console.warn('No new country-wide JSON provided, rendering no-data map');
                renderNoDataMap();
            } else if (newCountryWideJson ) {
            console.log('Rendering data map with new country-wide JSON');
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

/**
 * Creates a small area visualization for a selected country
 * @param {Object} countryData - Data for the selected country
 * @param {Object} countryFeature - Geographic feature for the country
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 * @param {string} containerId - ID of container element
 * @param {Object} geoData - Geographic data (countries, countryNames, etc.)
 * @returns {Object} - Control object with update and clear methods
 */
function createSmallAreaVisualization(countryData, countryFeature, width, height, containerId, geoData = null) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    console.log('Creating small area visualization');
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'small-area-visualization');
    svg.append('rect')
        .attr('class', 'background')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#ffffff');
    
    const margin = { top: 40, right: 20, bottom: 60, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create container
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        
    // Add background rect once
    
    //g

    
    // Store gradient reference for updates
    let currentGradient = null;
    
    // Function to update gradient
    function updateGradient(newColor, newPercentage) {
        if (currentGradient) {
            // Remove existing stops
            currentGradient.selectAll("stop").remove();
            
            // Add new stops with updated values
            currentGradient.append("stop")
                .attr("offset", "0%")
                .style("stop-color", newColor)
                .style("stop-opacity", 1);
            
            currentGradient.append("stop")
                .attr("offset", newPercentage + "%")
                .style("stop-color", newColor)
                .style("stop-opacity", 1);
            
            currentGradient.append("stop")
                .attr("offset", newPercentage + "%")
                .style("stop-color", "#e0e0e0")
                .style("stop-opacity", 1);
            
            currentGradient.append("stop")
                .attr("offset", "100%")
                .style("stop-color", "#e0e0e0")
                .style("stop-opacity", 1);
        }
    }
   
    // Function to render the visualization
    function render(data, feature,geodata) {
        console.log('Rendering small area visualization');
        // Clear existing content
        g.selectAll("*").remove();
        svg.selectAll("defs").remove(); // Clear any existing defs
        
        // Check if we have country data
        if (!data) {
            g.append('text')
                .attr('x', innerWidth / 2)
                .attr('y', innerHeight / 2)
                .attr('text-anchor', 'middle')
                .attr('font-size', '14px')
                .text('Select a country to view details');
            return;
        }
        // Add main title
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .attr('font-size', '16px')
            .text(geodata["countryNames"][feature.id]);
        
        let area_for_comparison = "";    
        let area_percentage = 0;

        if (data[year_chosen] <= 10540) {   
            area_for_comparison = "Paris";     
        area_percentage = Math.round((data[year_chosen]/10540|| 0) * 100);
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#666')
            .text(`${area_percentage}% of ${area_for_comparison} surface area`);}
        else {
            // switzerland id is 756
            area_for_comparison = "Switzerland";
        area_percentage = Math.round((data[year_chosen]/4128500 || 0) * 100);
        const number_of_times_paris = Math.round(data[year_chosen] / 10540);
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#666')
            .text(`${area_percentage}% of ${area_for_comparison} surface area and ${number_of_times_paris} times Paris surface area`);
        }

        // Add subtitle with percentage of maximum value
        
        // Add data label
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(`${data[year_chosen]} ${data.Unit} of ${chosenFoodName} harvested  in ${year_chosen}`);
        // Now fetch and render Paris - only when render is called
        if (area_for_comparison == "Paris") {fetch_paris_svg().then(dValues => {
            if (!dValues || dValues.length === 0) {
                console.error('No Paris SVG data available');
                return;
            }
            
            const pathData = dValues[0];
            const viewBoxWidth = 1000;
            const viewBoxHeight = 1000;
            
            // Set the size we want to show Paris within
            const targetWidth = innerWidth * 0.6;  // Use 60% of available width
            const targetHeight = (innerHeight - 60) * 0.8; // Account for titles
            const scale = Math.min(targetWidth / viewBoxWidth, targetHeight / viewBoxHeight);
            
            // Create center group for Paris
            const parisGroup = g.append('g')
                .attr('class', 'paris-group')
                .attr('transform', `translate(${innerWidth / 2}, ${(innerHeight + 40) / 2}) scale(${scale}) translate(${-viewBoxWidth / 2}, ${-viewBoxHeight / 2})`);
            
            // Create gradient definition
            const defs = svg.append("defs");
            const lg = defs.append("linearGradient")
                .attr("id", "mygrad")
                .attr("x1", "0%")
                .attr("x2", "100%")
                .attr("y1", "0%")
                .attr("y2", "0%");
            
            // Store the gradient reference
            currentGradient = lg;
            
            // Set up gradient with current data
            updateGradient(data.fillColor, area_percentage);
            
            // Add Paris path with gradient fill
            parisGroup.append('path')
                .attr('d', pathData)
                .attr('fill', "url(#mygrad)")
                .attr('stroke', 'black')
                .attr('stroke-width', 4/ scale);
                
        }).catch(error => {
            console.error('Failed to load Paris SVG:', error);
            // Show error message in the visualization
            g.append('text')
                .attr('x', innerWidth / 2)
                .attr('y', (innerHeight + 40) / 2)
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('fill', 'red')
                .text('Failed to load Paris visualization');
        });
        }
        else if (area_for_comparison == "Switzerland") {
            if (switzerlandFeature) {console.log("Switzerland feature found");