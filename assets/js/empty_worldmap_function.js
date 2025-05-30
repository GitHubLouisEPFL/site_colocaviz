// Main modular functions for world map visualization
let year_chosen = 2023; // Default year

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
function createSmallAreaVisualization_animals_slaughtered(countryData, countryFeature, width, height, containerId, geoData = null) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    // Create map container
    // Create future needed elements
     const slaughtered_only = document.getElementById(containerId);
    slaughtered_only.id = 'container_for_animals_slaughtered';
    slaughtered_only.className  = 'container_for_animals_slaughtered';
    const titlediv = document.createElement('div');
    titlediv.id = 'title';
    titlediv.className  = 'title';
    slaughtered_only.appendChild(titlediv);
    const calendardiv = document.createElement('div');
    calendardiv.id = 'calendar';
    calendardiv.className  = 'calendar';
    slaughtered_only.appendChild(calendardiv);
    const summarydiv = document.createElement('div');
    summarydiv.id = 'summary';
    summarydiv.className  = 'summary';
    slaughtered_only.appendChild(summarydiv);
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

    function render(data, feature, geodata) {
        console.log(data, feature, geodata)
        // Reset gWrapper to main container before clearing
        gWrapper.current = svg.select('g');
        svg.selectAll('rect.background').remove();
        // Clear existing content
        gWrapper.current.selectAll("*").remove();

        svg.selectAll("defs").remove(); // Clear any existing defs
        
    
        // Check if we have country data
        if (!data) {
            gWrapper.current.append('rect')
            .attr('class', 'background')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', '#ffffff');
    
            gWrapper.current.append('text')
                .attr('x', innerWidth / 2)
                .attr('y', innerHeight / 2)
                .attr('text-anchor', 'middle')
                .attr('font-size', '14px')
                .text('Select a country to view details');
            return;
        }
        totalAnimals = data[year_chosen]; 
        const calendarEl = document.getElementById('calendar');
        const titleEl = document.getElementById('title');
        const summaryEl = document.getElementById('summary');

        const secondsInMinute = 60;
        const secondsInHour = 60 * secondsInMinute;
        const secondsInDay = 24 * secondsInHour;
        const secondsInMonth = 30 * secondsInDay;
        const secondsInYear = 365 * secondsInDay;

        const lausanne = 140619;
        const zurich = 423193;
        const switzerland = 8888000;
        const canada = 40100000;

        function formatDuration(seconds) {
        let remaining = seconds;
        const y = Math.floor(remaining / secondsInYear);
        remaining %= secondsInYear;
        const mo = Math.floor(remaining / secondsInMonth);
        remaining %= secondsInMonth;
        const d = Math.floor(remaining / secondsInDay);
        remaining %= secondsInDay;
        const h = Math.floor(remaining / secondsInHour);
        remaining %= secondsInHour;
        const m = Math.floor(remaining / secondsInMinute);
        remaining %= secondsInMinute;
        const s = Math.floor(remaining);

        const parts = [];
        if (y > 0) parts.push(`${y} year${y > 1 ? 's' : ''}`);
        if (mo > 0) parts.push(`${mo} month${mo > 1 ? 's' : ''}`);
        if (d > 0) parts.push(`${d} day${d > 1 ? 's' : ''}`);
        if (h > 0) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
        if (m > 0) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
        if (s > 0) parts.push(`${s} second${s > 1 ? 's' : ''}`);

        return parts.join(', ');
        }

        function formatPopulationComparison(count) {
        if (count >= canada) {
            return `The total is equivalent to ${(count / canada).toFixed(1)} times the population of Canada.`;
        } else if (count >= switzerland) {
            return `The total is equivalent to ${(count / switzerland).toFixed(1)} times the population of Switzerland.`;
        } else if (count >= zurich) {
            return `The total is equivalent to ${(count / zurich).toFixed(1)} times the population of Zurich.`;
        } else {
            return `The total is equivalent to ${(count / lausanne).toFixed(1)} times the population of Lausanne.`;
        }
        }

        function renderCalendar(seconds) {
        calendarEl.innerHTML = '';
        let unitType = '';

        if (seconds <= secondsInMonth) {
            unitType = 'Day';
            calendarEl.style.gridTemplateColumns = 'repeat(7, 1fr)';
            const fullUnits = Math.floor(seconds / secondsInDay);
            const remainder = (seconds % secondsInDay) / secondsInDay;

            for (let i = 1; i <= 31; i++) {
            const cell = document.createElement('div');
            cell.className = 'time-unit';
            cell.innerText = "Day " + i;

            if (i <= fullUnits) {
                cell.classList.add('filled-full');
            } else if (i === fullUnits + 1 && remainder > 0) {
                cell.classList.add('filled-partial');
                cell.style.background = `linear-gradient(to right, #b15e5e ${remainder * 100}%, #e0d6c3 ${remainder * 100}%)`;
            }
            calendarEl.appendChild(cell);
            }
        } else if (seconds <= secondsInYear) {
            unitType = 'Month';
            calendarEl.style.gridTemplateColumns = 'repeat(6, 1fr)';
            const fullUnits = Math.floor(seconds / secondsInMonth);
            const remainder = (seconds % secondsInMonth) / secondsInMonth;

            for (let i = 1; i <= 12; i++) {
            const cell = document.createElement('div');
            cell.className = 'time-unit';
            cell.innerText = "Month " + i;

            if (i <= fullUnits) {
                cell.classList.add('filled-full');
            } else if (i === fullUnits + 1 && remainder > 0) {
                cell.classList.add('filled-partial');
                cell.style.background = `linear-gradient(to right, #b15e5e ${remainder * 100}%, #e0d6c3 ${remainder * 100}%)`;
            }
            calendarEl.appendChild(cell);
            }
        } else {
            unitType = 'Year';
            calendarEl.style.gridTemplateColumns = 'repeat(auto-fit, minmax(12vmin, 1fr))';
            const fullUnits = Math.floor(seconds / secondsInYear);
            const remainder = (seconds % secondsInYear) / secondsInYear;
            const totalUnits = fullUnits + (remainder > 0 ? 1 : 0);

            for (let i = 0; i < totalUnits; i++) {
            const cell = document.createElement('div');
            cell.className = 'time-unit';

            if (i < fullUnits) {
                cell.classList.add('filled-full');
            } else if (i === fullUnits && remainder > 0) {
                cell.classList.add('filled-partial');
                cell.style.background = `linear-gradient(to right, #b15e5e ${remainder * 100}%, #e0d6c3 ${remainder * 100}%)`;
            }

            const animalsThisYear = Math.round((i < fullUnits ? 1 : remainder) * secondsInYear);
            cell.innerHTML = `
                <div>Year ${i + 1}</div>
                <div style="font-size: 1.5vmin">${animalsThisYear.toLocaleString()} animals</div>
                <div style="font-size: 1.3vmin"> approx.${(animalsThisYear / switzerland).toFixed(1)} times Switzerland population</div>
            `;

            calendarEl.appendChild(cell);
            }
            }

            titleEl.innerText = `If one animal were killed every second, it would take ${formatDuration(seconds)}`;
            summaryEl.innerText = formatPopulationComparison(totalAnimals);
            }

            const totalSeconds = totalAnimals; // 1 animal/second
            renderCalendar(totalSeconds);            

        }

    // Initial render
    render(countryData, countryFeature, geoData);
    
    // Return control object
    return {
        update: (newCountryData, newCountryFeature, newGeoData) => {
            console.log('Updating small area visualization with new data', newCountryData, newCountryFeature, newGeoData);
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
async function createanimalslaughteredVisualizationPage(smallAreaFunction = null, width = 1000, height = 500, containerId = 'visualization-container',
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
    const detailViz = createSmallAreaVisualization_animals_slaughtered(
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
    document.getElementById(id_indicator + "-container").style.visibility = "visible";
    document.getElementById(id_indicator + "-container").hidden = true;
        
    // Return control object
    return {
    update: () => {
        chosenFoodName = document.getElementById("chosen-food-name").textContent;
        elementcsv.then(data => {
            console.log("fheeerre",filterByItem(data, item_name = chosenFoodName));
            return filterByItem(data, item_name = chosenFoodName)}
            )
            .then(filteredData => {
            if (!filteredData || filteredData.length === 0) {
                document.getElementById(id_indicator +"-container").hidden = true;
                return;
            }
            document.getElementById(id_indicator + "-container").hidden= false;

            const newCountryWideJson = createCountryWideJson(filteredData);
            console.log('animal slaughtered:', newCountryWideJson);
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
                    'time-slider-container-' + id_indicator
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