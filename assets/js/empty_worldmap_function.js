// Main modular functions for world map visualization
let year_chosen = 2023; // Default year

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
    
    // Add hover effect to container
    sliderContainer.addEventListener('mouseenter', () => {
        sliderContainer.style.transform = 'translateX(-50%) translateY(-2px)';
        sliderContainer.style.boxShadow = '0 14px 45px rgba(139, 94, 60, 0.2)';
        yearDisplay.style.transform = 'scale(1.05)';
    });
    
    sliderContainer.addEventListener('mouseleave', () => {
        sliderContainer.style.transform = 'translateX(-50%) translateY(0)';
        sliderContainer.style.boxShadow = '0 8px 30px rgba(139, 94, 60, 0.15)';
        yearDisplay.style.transform = 'scale(1)';
    });
    
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

//let country_to_iso = {};
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

            legend.append('text')
                .attr('x', legendWidth / 2)
                .attr('y', -5)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('font-weight', 'bold')
                .text(`${chosenFoodName} Number of animals slaugthered in ${year_chosen}`);
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
    
    // Create container - CHANGED: Use wrapper object
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
        console.log('Rendering small area visualization');
        // CHANGED: Reset gWrapper to main container before clearing
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
        
        // CHANGED: Create gradient outside the function to avoid duplicates
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
            
            // CHANGED: Calculate actual bounds of the path instead of assuming viewBox
            const tempSvg = d3.select('body').append('svg').style('visibility', 'hidden');
            const tempPath = tempSvg.append('path').attr('d', pathData);
            const bbox = tempPath.node().getBBox();
            tempSvg.remove();
            
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
            
            //  Update the wrapper's current reference
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
async function createanimalslaugtherVisualizationPage(smallAreaFunction = null, width = 1000, height = 500, containerId = 'visualization-container',
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
            countryWideJson = null;
            if (map) {
                map.update(countryWideJson);
            }
            return;
        }
            console.log('Filtered dataehfcur fyr:', filteredData);
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