// Main modular functions for world map visualization


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

    const mappingFn = colorMappingFunction || defaultMapping;

    // Extract values for min/max calculation
    const values = Object.values(countryJson).map(country => country.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Create color scale using D3
    const colorScale = d3.scaleLinear()
        .domain([0, 1])
        .range(colorGradient);

    // Create styled country data
    return Object.entries(countryJson).reduce((acc, [countryCode, data]) => {
        const normalizedValue = mappingFn(data.value, minValue, maxValue);

        acc[countryCode] = {
            ...data,
            fillColor: colorScale(normalizedValue),
            outlineColor: '#333',
            outlineWidth: 0.5,
            hoverText: `${data.country_name}: ${data.value} ${data.unit}`,
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

        // Add countries
        g.selectAll('path')
            .data(countries.features)
            .enter()
            .append('path')
            .attr('d', pathGenerator)
            .attr('fill', d => {
                const countryCode = d.id;
                return countryWideJson[countryCode]?.fillColor || '#ccc';
            })
            .attr('stroke', d => countryWideJson[d.id]?.outlineColor || '#333')
            .attr('stroke-width', d => countryWideJson[d.id]?.outlineWidth || 0.5)
            .attr('class', 'country')
            .style('cursor', 'pointer')
            .on('click', function(event, d) {
                if (onCountrySelect && countryWideJson[d.id]) {
                    // Find the geographic feature for this country
                    const countryFeature = countries.features.find(f => f.id === d.id);
                    // Call the callback with both country data and geographic feature
                    onCountrySelect(countryWideJson[d.id], countryFeature, {
                        countries: countries,
                        countryNames: countryNames,
                        pathGenerator: pathGenerator,
                        projection: projection
                    });
                }
            })
            .append('title')
            .text(d => {
                if (countryWideJson[d.id]) {
                    return countryWideJson[d.id].hoverText;
                }
                return countryNames[d.id] || 'Unknown';
            });

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
                    return newCountryWideJson[countryCode]?.fillColor || '#ccc';
                })
                .select('title')
                .text(d => {
                    if (newCountryWideJson[d.id]) {
                        return newCountryWideJson[d.id].hoverText;
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
   
    // Function to render the visualization
    function render(data, feature) {
        console.log('Rendering small area visualization');
        console.log('Data:', data);
        console.log('Feature:', feature);
        
        // Clear existing content
        g.selectAll("*").remove();
        
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
            .text(data.country_name);
        const area_percentage = Math.round((data.normalizedValue || 0) * 100);
        // Add subtitle with percentage of maximum value
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#666')
            .text(`${area_percentage}% of maximum value`);
        
        // Add data label
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(`${data.value} ${data.unit}`);

        // Create country SVG section (top half)
        const countrySection = g.append('g')
            .attr('class', 'country-section');

        const countrySectionHeight = (innerHeight - 40) / 2;

        // if (feature && geoData) {
        //     // Create a projection for the individual country
        //     const bounds = d3.geoBounds(feature);
        //     const countryProjection = d3.geoMercator()
        //         .fitSize([innerWidth - 20, countrySectionHeight - 20], feature);
            
        //     const countryPathGenerator = d3.geoPath().projection(countryProjection);

        //     // Add country shape
        //     countrySection.append('path')
        //         .datum(feature)
        //         .attr('d', countryPathGenerator)
        //         .attr('fill', data.fillColor || '#69b3a2')
        //         .attr('stroke', data.outlineColor || '#333')
        //         .attr('stroke-width', 1.5)
        //         .attr('transform', 'translate(10,10)')
        //         .attr('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))');

            
        // } else {
        //     // Fallback if no geographic feature available
        //     countrySection.append('rect')
        //         .attr('x', 10)
        //         .attr('y', 10)
        //         .attr('width', innerWidth - 20)
        //         .attr('height', countrySectionHeight - 20)
        //         .attr('fill', data.fillColor || '#69b3a2')
        //         .attr('stroke', data.outlineColor || '#333')
        //         .attr('stroke-width', 2)
        //         .attr('rx', 8);

        //     countrySection.append('text')
        //         .attr('x', innerWidth / 2)
        //         .attr('y', countrySectionHeight / 2)
        //         .attr('text-anchor', 'middle')
        //         .attr('fill', 'white')
        //         .attr('font-weight', 'bold')
        //         .attr('font-size', '14px')
        //         .text(data.country_name);
        // }


        const svgCenterGroup = svg.append('g')
        .attr('class', 'centered-paris-group')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
        
        fetch_paris_svg().then(dValues => {
            const pathData = dValues[0];

            const viewBoxWidth = 1000;
            const viewBoxHeight = 1000;

            // Set the size we want to show Paris within
            const targetWidth = innerWidth * 0.8;  // Use 60% of available width
            const targetHeight = innerHeight * 0.8;

            const scale = Math.min(targetWidth / viewBoxWidth, targetHeight / viewBoxHeight);

            // Append group inside center group
            const parisGroup = svg.select('.centered-paris-group')
                .append('g')
                .attr('transform', `scale(${scale}) translate(${-viewBoxWidth / 2}, ${-viewBoxHeight / 2})`);

            //Create a linear gradient for the fill color
            //make defs and add the linear gradient
            var lg = parisGroup.append("defs").append("linearGradient")
            .attr("id", "mygrad")//id of the gradient
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");//since its a vertical linear gradient
            
            lg.append("stop")
            .attr("offset", "0%")
            .style("stop-color", data.fillColor )//end in red
            .style("stop-opacity", 1)

            lg.append("stop")
            .attr("offset",`${area_percentage}%`)
            .style("stop-color", data.fillColor)//start in blue
            .style("stop-opacity", 1)
            lg.append("stop")
            .attr("offset", `${area_percentage}%`)
            .style("stop-color", "#e0e0e0")//start in blue
            .style("stop-opacity", 1)

            lg.append("stop")
            .attr("offset", "100%")
            .style("stop-color", "#e0e0e0")//start in blue
            .style("stop-opacity", 1)

            parisGroup.append('path')
                .attr('d', pathData)
                .attr('fill', "url(#mygrad)")
                .attr('stroke', 'black')
                .attr('stroke-width', 4 / scale); // Adjust stroke so it's not too thick when scaled
            // This script modifies an SVG file to change the gradient fill of a path element.
            

        });


        // dataSection.append('rect')
        // .attr('x', 2)
        // .attr('y', 12)
        // .attr('width', Math.max(0, (innerWidth - 4) * (data.normalizedValue || 0)))
        // .attr('height', 21)
        // .attr('fill', data.fillColor || '#69b3a2')
        // .attr('fill-opacity', 0.8)
        // .attr('rx', 4);

        // Add percentage label
        
    }

    // Initial render
    render(countryData, countryFeature);
    
    // Return control object
    return {
        update: (newCountryData, newCountryFeature, newGeoData) => {
            console.log('Updating detail viz with:', newCountryData);
            if (newGeoData) {
                geoData = newGeoData;
            }
            render(newCountryData, newCountryFeature);
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
    const countryWideJson = createCountryWideJson(countryJson);

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

function fetch_paris_svg() {
    return fetch('https://raw.githubusercontent.com/GitHubLouisEPFL/site_colocaviz/bbe178cd7725a4e7fcafb7954e484f83d92838ef/svg_files/paris_border.svg')
        .then(res => res.text())
        .then(svg => {
            const matches = svg.match(/<path[^>]*d="([^"]+)"/g) || [];
            const dValues = matches.map(m => m.match(/d="([^"]+)"/)[1]);
            return dValues;
        })
        .catch(error => {
            console.error("Error fetching or processing the SVG:", error);
        });
}