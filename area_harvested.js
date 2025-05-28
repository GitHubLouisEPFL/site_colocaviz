// Main modular functions for world map visualization

let csvdata = null;
let csvDataPromise = null;
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

        csvdata = data.filter(item => item.Item === "rice");
        csvdata = csvdata.filter(item => item.Element === "area harvested");
        console.log("CSV data loaded successfully");
        return csvdata;
    }).catch(error => {
        console.error("Error loading CSV data:", error);
        throw error;        
    });

    return csvDataPromise;
};

let year_chosen = 2019; // Default year
/**
 * Sets the year for filtering data
 * @param {number} year - The year to set
 * */
let yearlyData = null;


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
    https://github.com/com-480-data-visualization/com480-project-colocaviz/tree/13a44cb13c2e05ef4871acfcc794aedef8cec6ce/data
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
    const yearvalues = csvdata.map(item => item[year_chosen]).filter(value => value !== null && value !== undefined);
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
let countryWideJson = null;
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
    // Create SVG element
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
    // Use .then to access the data after loading
    
    
    // Load world map data
    Promise.all([
        d3.tsv('https://unpkg.com/world-atlas@1.1.4/world/50m.tsv'),
        d3.json('https://unpkg.com/world-atlas@1.1.4/world/50m.json')
    ]).then(([tsvData, topoJSONdata]) => {
        // Remove loader
        container.removeChild(loader);
        
        // Create country name lookup
        const countryNames = tsvData.reduce((acc, d) => {
            acc[d.iso_n3] = d.name;
            return acc;
        }, {});

        const nameToId = tsvData.reduce((acc, d) => {
            acc[d.name] = d.iso_n3;
            return acc;
        }, {});
        
        // Convert TopoJSON to GeoJSON
        const countries = topojson.feature(topoJSONdata, topoJSONdata.objects.countries);
        
        // Setup projection and path generator
        const projection = d3.geoNaturalEarth1()
            .fitSize([width, height], countries);
        const pathGenerator = d3.geoPath().projection(projection);
        
        // Create container for zoom
        const g = svg.append('g');
        
        // Add background
        g.append('rect')
            .attr('class', 'background')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', '#ffffff');
        
            let country_name = '';
        // Add countries
            countryWideJson.then(resolvedCountryWideJson => {

            // Calculate min/max values for legend
            const values = Object.values(resolvedCountryWideJson)
                .map(d => d[year_chosen])
                .filter(v => v !== null && v !== undefined && v > 0);
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            
            // Create the same color scale used in createCountryWideJson
            const colorScale = d3.scaleLinear()
                .domain([0, 1])
                .range(['#FADC00', '#FD1D1D']); // Use the same gradient as in createCountryWideJson
            
            // Add the legend function inside this scope where we have access to the values
            const addLegend = (svg, colorScale, min, max) => {
                const legendWidth = 250;
                const legendHeight = 15;
                const legendX = 20;
                const legendY = height - 50; // Position at bottom of map
                
                // Create legend group
                const legend = svg.append('g')
                    .attr('class', 'legend')
                    .attr('transform', `translate(${legendX}, ${legendY})`);
                
                // Create gradient definition
                const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
                const gradient = defs.append('linearGradient')
                    .attr('id', 'legend-gradient');
                
                // Add color stops using log scale
                const numStops = 10;
                for (let i = 0; i <= numStops; i++) {
                    const ratio = i / numStops;
                    const logValue = min * Math.pow(max / min, ratio); // Log scale values
                    
                    // Apply the same log mapping as in createCountryWideJson
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
                
                // Add rectangle with gradient
                legend.append('rect')
                    .attr('width', legendWidth)
                    .attr('height', legendHeight)
                    .style('fill', 'url(#legend-gradient)')
                    .style('stroke', '#000')
                    .style('stroke-width', 0.5);
                
                // Add scale labels
                const scale = d3.scaleLog()
                    .domain([min, max])
                    .range([0, legendWidth]);
                
                const axis = d3.axisBottom(scale)
                    .ticks(4, '.1s'); // Format large numbers nicely
                
                legend.append('g')
                    .attr('transform', `translate(0, ${legendHeight})`)
                    .style('font-size', '10px')
                    .call(axis);
                
                // Add title
                legend.append('text')
                    .attr('x', legendWidth / 2)
                    .attr('y', -5)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '12px')
                    .style('font-weight', 'bold')
                    .text('Rice Area Harvested (hectares)');
            };


            // Append paths for each country
            g.selectAll('path')
                .data(countries.features)
                .enter()
                .append('path')
                .attr('d', pathGenerator)
                .attr('fill', d => {
                    country_name = countryNames[d.id]
                    country_name = countryNames[d.id].toLowerCase();
                    return resolvedCountryWideJson[country_name]?.fillColor || '#ccc';
                })
            .attr('stroke', d => resolvedCountryWideJson[countryNames[d.id].toLowerCase()]?.outlineColor || '#333')
            .attr('stroke-width', d => resolvedCountryWideJson[countryNames[d.id].toLowerCase()]?.outlineWidth || 0.5)
            .attr('class', 'country')
            .style('cursor', 'pointer')
            .on('click', function(event, d) {
                if (onCountrySelect && resolvedCountryWideJson[countryNames[d.id].toLowerCase()]) {
                    // Find the geographic feature for this country
                    const countryFeature = countries.features.find(f => f.id === d.id);
                    // Call the callback with both country data and geographic feature
                    onCountrySelect(resolvedCountryWideJson[countryNames[d.id].toLowerCase()], countryFeature, {
                        countries: countries,
                        countryNames: countryNames,
                        pathGenerator: pathGenerator,
                        projection: projection
                    });
                }
            })
            .append('title')
            .text(d => {
                if (resolvedCountryWideJson[countryNames[d.id].toLowerCase()]) {
                    return resolvedCountryWideJson[countryNames[d.id].toLowerCase()].hoverText;
                }
                return countryNames[d.id] || 'Unknown';
            });
             // Add the legend AFTER we have access to the data
            addLegend(svg, colorScale, minValue, maxValue);
            })

        // Add zoom behavior with better responsiveness
        const zoomHandler = d3.zoom()
            .scaleExtent([0.5, 10]) // Allow zoom out to 0.5x and in to 10x
            .translateExtent([[-width * 2, -height * 2], [width * 2, height * 2]]) // Limit pan area
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
                
                // Adjust stroke width based on zoom level for better visibility
                g.selectAll('.country')
                    .attr('stroke-width', 0.5 / event.transform.k);
            });
        
        svg.call(zoomHandler);
        
        // Call the onDataLoaded callback if provided
        if (onDataLoaded) {
            onDataLoaded({
                countries: countries,
                countryNames: countryNames,
                pathGenerator: pathGenerator,
                projection: projection
            });
        }
    });
    
    // Return control object
    return {
        update: (newCountryWideJson) => {
            svg.selectAll('.country')
                .attr('fill', d => {
                    const countryCode = d.id;
                    return newCountryWideJson[countryNames[countryCode]]?.fillColor || '#ccc';
                })
                .select('title')
                .text(d => {
                    if (newCountryWideJson[countryNames[countryCode]]) {
                        return newCountryWideJson[countryNames[countryCode]].hoverText;
                    }
                    return d.id;
                });
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
    
    const margin = { top: 40, right: 20, bottom: 60, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create container
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
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
        
        
        const area_percentage = Math.round((data[year_chosen]/10540|| 0) * 100);
        
        // Add subtitle with percentage of maximum value
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#666')
            .text(`${area_percentage}% of Paris surface area`);
        // Add data label
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(`${data[year_chosen]} ${data.Unit}`);
        
        // Now fetch and render Paris - only when render is called
        fetch_paris_svg().then(dValues => {
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
                .attr('stroke-width', 4 / scale);
                
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
    
    // Initial render
    render(countryData, countryFeature,geoData);
    
    // Return control object
    return {
        update: (newCountryData, newCountryFeature, newGeoData) => {
            if (newGeoData) {
                geoData = newGeoData;
            }
            render(newCountryData, newCountryFeature,newGeoData);
        },
        clear: () => {
            container.innerHTML = '';
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
function createVisualizationPage(countryJson, smallAreaFunction = null, width = 1000, height = 500, containerId = 'visualization-container') {
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
    mapContainer.id = 'map-container';
    mapContainer.style.flex = '1';
    mapContainer.style.position = 'relative';
    mapContainer.style.border = '1px solid #ccc';
    mapContainer.style.borderRadius = '4px';
    container.appendChild(mapContainer);
    
    // Create title for map
    const mapTitle = document.createElement('h3');
    mapTitle.textContent = 'World Map';
    mapTitle.style.margin = '10px';
    mapTitle.style.fontWeight = 'bold';
    mapContainer.appendChild(mapTitle);
    
    // Create actual map container
    const actualMapContainer = document.createElement('div');
    actualMapContainer.id = 'actual-map-container';
    actualMapContainer.style.position = 'absolute';
    actualMapContainer.style.top = '40px';
    actualMapContainer.style.bottom = '0';
    actualMapContainer.style.left = '0';
    actualMapContainer.style.right = '0';
    mapContainer.appendChild(actualMapContainer);
    
    // Create detail container
    const detailContainer = document.createElement('div');
    detailContainer.id = 'detail-container';
    detailContainer.style.flex = '1';
    detailContainer.style.position = 'relative';
    detailContainer.style.border = '1px solid #ccc';
    detailContainer.style.borderRadius = '4px';
    container.appendChild(detailContainer);
    
    // Create title for detail
    const detailTitle = document.createElement('h3');
    detailTitle.textContent = 'Country Details';
    detailTitle.style.margin = '10px';
    detailTitle.style.fontWeight = 'bold';
    detailContainer.appendChild(detailTitle);
    
    // Create actual detail container
    const actualDetailContainer = document.createElement('div');
    actualDetailContainer.id = 'actual-detail-container';
    actualDetailContainer.style.position = 'absolute';
    actualDetailContainer.style.top = '40px';
    actualDetailContainer.style.bottom = '0';
    actualDetailContainer.style.left = '0';
    actualDetailContainer.style.right = '0';
    detailContainer.appendChild(actualDetailContainer);
    
    // Process the country JSON to add styling
    countryWideJson = getCSV().then(data => createCountryWideJson(data));
    
    // Current selected country and geographic data
    let selectedCountry = null;
    let geoData = null;
    
    // Create the detail visualization first (will be updated once geo data loads)
    const mapWidth = width / 2 - 30;
    const mapHeight = height - 60;
    
    const detailViz = createSmallAreaVisualization(
        null,
        null, // no feature initially
        mapWidth,
        mapHeight,
        'actual-detail-container'
    );
    
    // Create the world map with callbacks
    const map = createWorldMap(
        mapWidth, 
        mapHeight, 
        countryWideJson, 
        'actual-map-container', 
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
        update: (newCountryJson) => {
            const newCountryWideJson = createCountryWideJson(newCountryJson);
            map.update(newCountryWideJson);
            // Reset selected country
            selectedCountry = null;
            detailViz.update(null, null, geoData);
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