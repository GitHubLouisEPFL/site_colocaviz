// Main modular functions for world map visualization

let chosenFoodName = null;
let switzerlandFeature = null;

const areaharvestedcsv =getFilteredbyelement(element_name = "area harvested");

let lemanDataCache = null;
let lemanDataPromise = null;
/**
 * Fetches Leman SVG data with caching
 * @returns {Promise<Array>} Promise resolving to array of `d` path values.
 */

function fetch_leman_svg() {
    // Return cached data if available
    if (lemanDataCache) {
        return Promise.resolve(lemanDataCache);
    }
    
    // Return existing promise if already fetching
    if (lemanDataPromise) {
        return lemanDataPromise;
    }
    https://github.com/com-480-data-visualization/com480-project-colocaviz/tree/13a44cb13c2e05ef4871acfcc794aedef8cec6ce/data
    // Create new fetch promise
    lemanDataPromise = fetch('https://raw.githubusercontent.com/GitHubLouisEPFL/site_colocaviz/refs/heads/main/svg_files/lac_leman.svg')
        .then(res => res.text())
        .then(svg => {
            const matches = svg.match(/<path[^>]*d="([^"]+)"/g) || [];
            const dValues = matches.map(m => m.match(/d="([^"]+)"/)[1]);
            lemanDataCache = dValues; // Cache the result
            return dValues;
        })
        .catch(error => {
            console.error("Error fetching or processing the SVG:", error);
            lemanDataPromise = null; // Reset promise on error to allow retry
            throw error;
        });
    
    return lemanDataPromise;
}

let parisDataCache = null;
let parisDataPromise = null;
/**
 * Fetches Paris SVG data with caching
 * @returns {Promise<Array>} Promise resolving to array of `d` path values.
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
    
    // Create container: Use wrapper object to manage the main group element
    const gWrapper = { current: svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`) };
            
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
    function render(data, feature, geodata) {
        // Reset gWrapper to main container before clearing
        gWrapper.current = svg.select('g');
        // Clear existing content
        gWrapper.current.selectAll("*").remove();
        svg.selectAll("defs").remove(); // Clear any existing defs
        
        // Check if we have country data
        if (!data) {
            gWrapper.current.append('text')
                .attr('x', innerWidth / 2)
                .attr('y', innerHeight / 2)
                .attr('text-anchor', 'middle')
                .attr('font-size', '14px')
                .text('Select a country to view details');
            return;
        }
        // Add main title
        gWrapper.current.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .attr('font-size', '16px')
            .text(geodata["countryNames"][feature.id]);
        
        let area_for_comparison = "";    
        let area_percentage = 0;

        if ( data[year_chosen] <= 10540) {   
            area_for_comparison = "Paris";     
            area_percentage = Math.round((data[year_chosen]/10540|| 0) * 100);
            const number_of_times_lausanne = Math.round(data[year_chosen] / 55);
            
            gWrapper.current.append('text')
                .attr('x', innerWidth / 2)
                .attr('y', 5)
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('fill', '#666')
                .text(`${area_percentage}% of ${area_for_comparison} surface area and ${number_of_times_lausanne} times Lausanne surface area`);
        }
        
        else if (data[year_chosen] <=  58100) {
            area_for_comparison = "Leman Lake";
            area_percentage = Math.round((data[year_chosen]/58100 || 0) * 100);
            const number_of_times_paris = Math.round(data[year_chosen] / 10540);
            gWrapper.current.append('text')
                .attr('x', innerWidth / 2)
                .attr('y', 5)
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('fill', '#666')
                .text(`${area_percentage}% of ${area_for_comparison} surface area and ${number_of_times_paris} times Paris surface area`)
         }
        else {
            // switzerland id is 756
            area_for_comparison = "Switzerland";
            area_percentage = Math.round((data[year_chosen]/4128500 || 0) * 100);
            const number_of_times = Math.round(data[year_chosen] / 58100);
            gWrapper.current.append('text')
                .attr('x', innerWidth / 2)
                .attr('y', 5)
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('fill', '#666')
                .text(`${area_percentage}% of ${area_for_comparison} surface area and ${number_of_times} times Leman lake surface area`);
        }

        // Add data label
        gWrapper.current.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(`${data[year_chosen]} ${data.Unit} of ${chosenFoodName} harvested in ${year_chosen}`);
        
        // Create gradient outside the function to avoid duplicates
        const defs = svg.append("defs");
        const lg = defs.append("linearGradient")
            .attr("id", "mygrad")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");
        
        // Store the gradient reference
        currentGradient = lg;
        
         // Fetch and render svgs for leman lake, paris, and ginevra
         function createcountrysvgandfill(data, area_percentage, dValues, gWrapper, area_for_comparison) {
            if (!dValues || dValues.length === 0) {
                console.error(`No ${area_for_comparison} SVG data available`);
                return null;
            }            
            
            const pathData = dValues[0];
            
            // Calculate actual bounds of the path instead of assuming viewBox
            const tempSvg = d3.select('body').append('svg').style('visibility', 'hidden');
            const tempPath = tempSvg.append('path').attr('d', pathData);
            const bbox = tempPath.node().getBBox();
            tempSvg.remove();
            
            console.log(`${area_for_comparison} bbox:`, bbox);
            
            // Use actual path dimensions
            const pathWidth = bbox.width;
            const pathHeight = bbox.height;
        
            // Set the size we want to show the area within
            const targetWidth = innerWidth * 0.6;  // Use 60% of available width
            const targetHeight = (innerHeight - 60) * 0.8; // Account for titles
            const scale = Math.min(targetWidth / pathWidth, targetHeight / pathHeight);
        
            // Create center group
            const Group = gWrapper.current.append('g')
                .attr('class', `${area_for_comparison.toLowerCase().replace(' ', '-')}-group`)
                .attr('transform', `translate(${innerWidth / 2}, ${(innerHeight + 40) / 2}) scale(${scale}) translate(${-bbox.x - pathWidth/2}, ${-bbox.y - pathHeight/2})`);
            
            // Set up gradient with current data
            updateGradient(data.fillColor, area_percentage);
        
            // Add path with gradient fill
            Group.append('path')
                .attr('d', pathData)
                .attr('fill', `url(#mygrad)`)
                .attr('stroke', 'black')
                .attr('stroke-width', 4 / scale);
                
            // Update the wrapper's current reference
            gWrapper.current = Group;
            return Group;
        }
            
        // Now fetch and render Paris - only when render is called
        if (area_for_comparison == "Paris") {
            fetch_paris_svg().then(dValues => {
                createcountrysvgandfill(data, area_percentage, dValues, gWrapper, area_for_comparison);
            }).catch(error => {
                console.error("Error fetching Paris SVG data:", error);
            });
        }
        else if (area_for_comparison == "Leman Lake") {
            fetch_leman_svg().then(dValues => {
                createcountrysvgandfill(data, area_percentage, dValues, gWrapper, area_for_comparison);
            }).catch(error => {
                console.error("Error fetching Leman Lake SVG data:", error);
            });
        }
        else if (area_for_comparison == "Switzerland") {
            // Create center group for Switzerland
            const projection = d3.geoMercator().fitSize([400, 400], switzerlandFeature);
            const pathGenerator = d3.geoPath().projection(projection);

            const switzerlandGroup = gWrapper.current.append('g')
                .attr('class', 'switzerland-group')
                .attr('transform', `translate(${innerWidth / 2 - 200}, ${(innerHeight + 40) / 2 - 200})`);
            
            // Set up gradient with current data
            updateGradient(data.fillColor, area_percentage);
            
            // Draw Switzerland path
            switzerlandGroup.append('path')
                .datum(switzerlandFeature)
                .attr('d', pathGenerator)
                .attr('fill', 'url(#mygrad)')
                .attr('stroke', 'black')                
                .attr('stroke-width', 4);
        }
    }
    
    // Initial render
    render(countryData, countryFeature, geoData);
    
    // Return control object
    return {
        update: (newCountryData, newCountryFeature, newGeoData) => {
            if (newGeoData) {
                geoData = newGeoData;
            }
            render(newCountryData, newCountryFeature, newGeoData);
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
async function createareaharvestedVisualizationPage(smallAreaFunction = null, width = 1000, height = 500, containerId = 'visualization-container',
    element_to_visualize = 'area harvested',
    id_indicator='area-harvested') {
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
    let timeSlider = null;
    
    // Process the country JSON to add styling

    countryWideJson = null;
    let selectedCountry = null;
    // Current selected country and geographic data
    let geoData = null;
    
    // Create the detail visualization first (will be updated once geo data loads)
    const mapWidth = width / 2 - 30;
    const mapHeight = height - 60;
    
    const detailViz = createSmallAreaVisualization(
        null,
        null, // no feature initially
        mapWidth,
        mapHeight,
        'actual-detail-container'  + id_indicator
    );
    
    document.getElementById("area-harvested-container").style.visibility = "visible";
    // Create the world map with callbacks
    document.getElementById("area-harvested-container").hidden = true;
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
        areaharvestedcsv.then(data => {
            return filterByItem(data, item_name = chosenFoodName)}
            )
            .then(filteredData => {
                console.log("Filtered data for area harvested :", filteredData);
            if (!filteredData || filteredData.length === 0) {
                document.getElementById("area-harvested-container").hidden = true;
                return;
            }
            document.getElementById("area-harvested-container").hidden = false;
            const newCountryWideJson = createCountryWideJson(filteredData);
            
            // Get available years from the data and create/update time slider
            const availableYears = getAvailableYears(filteredData);
            
            if (timeSlider) {
                // Update existing slider
                timeSlider.update(availableYears, year_chosen);
            } else if (availableYears.length > 0) {
                // Create new slider
                timeSlider = createTimeSlider(
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