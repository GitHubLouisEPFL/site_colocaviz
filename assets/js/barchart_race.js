// Chart class to encapsulate all functionality
export class RacingBarChart {
    constructor(containerId, chartId, options = {}) {
        this.containerId = containerId;
        this.chartId = chartId || 'barchart-race';
        this.margin = options.margin || {top: 16, right: 6, bottom: 6, left: 0};
        this.k = options.k || 10; // Number of frames per transition
        this.barSize = options.barSize || 48;
        this.n = options.n || 8; // Number of bars to show
        this.duration = options.duration || 250; // Animation duration per frame
        this.width = options.width || 928;
        this.height = this.margin.top + this.barSize * this.n + this.margin.bottom;
        
        this.formatDate = d3.utcFormat("%Y");
        this.parseDate = d3.utcParse("%Y-%m");
        
        this.currentFrame = 0;
        this.animationRunning = false;
        this.userDragging = false; // Track if user is manually dragging slider
        
        this.setupScales();
    }
    
    setupScales() {
        this.x = d3.scaleLinear([0, 1], [this.margin.left, this.width - this.margin.right]);
        this.y = d3.scaleBand()
            .domain(d3.range(this.n + 1))
            .rangeRound([this.margin.top, this.margin.top + this.barSize * (this.n + 1 + 0.1)])
            .padding(0.1);
    }
    
    processData(rawData, itemName, prodMetric) {
        // Transform the new format into the expected format
        const transformedData = [];
        
        // Check if the item exists in the data
        if (!rawData[itemName] || !rawData[itemName][prodMetric]) {
            throw new Error(`Item "${itemName}" or metric "${prodMetric}" not found in data`);
        }
        
        const timeSeriesData = rawData[itemName][prodMetric];
        
        // Transform each time point
        timeSeriesData.forEach(([date, countryValues]) => {
            Object.entries(countryValues).forEach(([country, value]) => {
                transformedData.push({
                    name: country,
                    category: country,
                    date: date,
                    value: value
                });
            });
        });

        // Now process the transformed data using the original logic
        const data = transformedData.map(d => ({
            ...d,
            date: this.parseDate(d.date),
            value: +d.value
        }));

        const names = new Set(data.map(d => d.name));
        
        const dateValues = Array.from(d3.rollup(data, ([d]) => d.value, d => +d.date, d => d.name))
            .map(([date, data]) => [new Date(date), data])
            .sort(([a], [b]) => d3.ascending(a, b))

        const rankAt = (value) => {
            const rankData = Array.from(names, name => ({ name, value: value(name) || 0 }));
            rankData.sort((a, b) => d3.descending(a.value, b.value));
            for (let i = 0; i < rankData.length; ++i) rankData[i].rank = Math.min(this.n, i);
            return rankData;
        };

        const keyframes = [];
        let ka, a, kb, b;
        for ([[ka, a], [kb, b]] of d3.pairs(dateValues)) {
            for (let i = 0; i < this.k; ++i) {
                const t = i / this.k;
                keyframes.push([
                    new Date(ka * (1 - t) + kb * t),
                    rankAt(name => (a.get(name) || 0) * (1 - t) + (b.get(name) || 0) * t)
                ]);
            }
        }

        keyframes.push([new Date(kb), rankAt(name => b.get(name) || 0)]);

        const nameframes = d3.groups(keyframes.flatMap(([, data]) => data), d => d.name);
        const prev = new Map(nameframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a])));
        const next = new Map(nameframes.flatMap(([, data]) => d3.pairs(data)));

        return { keyframes, prev, next, data };
    }

    createColorScale(data) {
        const scale = d3.scaleOrdinal(d3.schemeTableau10);
        if (data.some(d => d.category !== undefined)) {
            const categoryByName = new Map(data.map(d => [d.name, d.category]));
            scale.domain([...new Set(categoryByName.values())]);
            return d => scale(categoryByName.get(d.name));
        }
        return d => scale(d.name);
    }
    
    textTween(a, b) {
        const i = d3.interpolateNumber(a, b);
        return function(t) {
            this.textContent = d3.format(",d")(i(t));
        };
    }
    
    createBars(svg, prev, next) {
        let bar = svg.append("g")
            .attr("fill-opacity", 0.6)
            .selectAll("rect");

        return ([date, data], transition) => bar = bar
            .data(data.slice(0, this.n), d => d.name)
            .join(
                enter => enter.append("rect")
                    .attr("fill", this.color)
                    .attr("height", this.y.bandwidth())
                    .attr("x", this.x(0))
                    .attr("y", d => this.y((prev.get(d) || d).rank))
                    .attr("width", d => this.x((prev.get(d) || d).value) - this.x(0)),
                update => update,
                exit => exit.transition(transition).remove()
                    .attr("y", d => this.y((next.get(d) || d).rank))
                    .attr("width", d => this.x((next.get(d) || d).value) - this.x(0))
            )
            .call(bar => bar.transition(transition)
                .attr("y", d => this.y(d.rank))
                .attr("width", d => this.x(d.value) - this.x(0)));
    }
    
    createLabels(svg, prev, next) {
        let label = svg.append("g")
            .style("font", "bold 12px var(--sans-serif)")
            .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")
            .selectAll("text");

        return ([date, data], transition) => label = label
            .data(data.slice(0, this.n), d => d.name)
            .join(
                enter => enter.append("text")
                    .attr("transform", d => `translate(${this.x((prev.get(d) || d).value)},${this.y((prev.get(d) || d).rank)})`)
                    .attr("y", this.y.bandwidth() / 2)
                    .attr("x", -6)
                    .attr("dy", "-0.25em")
                    .text(d => d.name.charAt(0).toUpperCase() + d.name.slice(1).toLowerCase())
                    .call(text => text.append("tspan")
                        .attr("fill-opacity", 0.7)
                        .attr("font-weight", "normal")
                        .attr("x", -6)
                        .attr("dy", "1.15em")),
                update => update,
                exit => exit.transition(transition).remove()
                    .attr("transform", d => `translate(${this.x((next.get(d) || d).value)},${this.y((next.get(d) || d).rank)})`)
                    .call(g => g.select("tspan").tween("text", d => this.textTween(d.value, (next.get(d) || d).value)))
            )
            .call(bar => bar.transition(transition)
                .attr("transform", d => `translate(${this.x(d.value)},${this.y(d.rank)})`)
                .call(g => g.select("tspan").tween("text", d => this.textTween((prev.get(d) || d).value, d.value))));
    }
    
    createAxis(svg) {
        const g = svg.append("g")
            .attr("transform", `translate(0,${this.margin.top})`);

        const axis = d3.axisTop(this.x)
            .ticks(this.width / 160)
            .tickSizeOuter(0)
            .tickSizeInner(-this.barSize * (this.n + this.y.padding()));

        return (_, transition) => {
            g.transition(transition).call(axis);
            g.select(".tick:first-of-type text").remove();
            g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "white");
            g.select(".domain").remove();
        };
    }
    
    createTicker(svg, keyframes) {
        const now = svg.append("text")
            .style("font", `bold ${this.barSize}px var(--sans-serif)`)
            .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")
            .attr("x", this.width - 6)
            .attr("y", this.margin.top + this.barSize * (this.n - 0.45))
            .attr("dy", "0.32em")
            .text(this.formatDate(keyframes[0][0]));

        return ([date], transition) => {
            if (!transition) {
                now.text(this.formatDate(date));
                return;
            }
            transition.end().then(() => now.text(this.formatDate(date)));
        };
    }

    getElementId(element_id) {
        return `${this.chartId}-${element_id}`;
    }

    createButtons() {
        // Create and append the controls div
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'controls';
        controlsDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 20px 0;
            padding: 0 10px;
        `;

        // Create control buttons
        const startBtn = document.createElement('button');
        startBtn.id = this.getElementId('start-btn');
        startBtn.className = 'start-btn';
        startBtn.textContent = '▶';

        const pauseBtn = document.createElement('button');
        pauseBtn.id = this.getElementId('pause-btn');
        pauseBtn.className = 'pause-btn';
        pauseBtn.textContent = '⏸';
        pauseBtn.disabled = true;

        const resetBtn = document.createElement('button');
        resetBtn.id = this.getElementId('reset-btn');
        resetBtn.className = 'reset-btn';
        resetBtn.textContent = '⏹';


        // Create the slider input
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = this.getElementId('timeline-slider');
        slider.min = '0';
        slider.max = '0'; // Will be set when keyframes are available
        slider.value = '0';
        slider.step = '1';
        slider.style.cssText = `
            flex: 1;
            height: 6px;
            max-width: 300px;
            background: #ddd;
            outline: none;
            border-radius: 3px;
            margin: 0 15px;
        `;

        // Create frame display
        const frameDisplay = document.createElement('span');
        frameDisplay.id = this.getElementId('frame-display');
        frameDisplay.style.cssText = `
            min-width: 80px;
            font-size: 12px;
            color: #666;
        `;

        controlsDiv.appendChild(startBtn);
        controlsDiv.appendChild(pauseBtn);
        controlsDiv.appendChild(resetBtn);
        controlsDiv.appendChild(slider);
        controlsDiv.appendChild(frameDisplay);

        document.getElementById(this.containerId).appendChild(controlsDiv);
        
        // Add event listeners to buttons
        startBtn.addEventListener('click', () => this.start());
        pauseBtn.addEventListener('click', () => this.pause());
        resetBtn.addEventListener('click', () => this.reset());

        // Add event listeners to slider
        slider.addEventListener('input', (e) => {
            this.userDragging = true;
            this.goToFrame(parseInt(e.target.value));
        });

        slider.addEventListener('mousedown', () => {
            this.userDragging = true;
        });

        slider.addEventListener('mouseup', () => {
            setTimeout(() => {
                this.userDragging = false;
                this.pause(); // Pause animation when user stops dragging
            }, 100); // Small delay to prevent immediate animation resume
        });

        slider.addEventListener('touchstart', () => {
            this.userDragging = true;
        });

        slider.addEventListener('touchend', () => {
            setTimeout(() => {
                this.userDragging = false;
                this.pause();
            }, 100);
        });
    }

    updateSlider() {
        const slider = document.getElementById(this.getElementId('timeline-slider'));
        const frameDisplay = document.getElementById(this.getElementId('frame-display'));
        
        if (slider && !this.userDragging) {
            slider.value = this.currentFrame;
        }
        
        if (frameDisplay && this.keyframes) {
            frameDisplay.textContent = `${this.currentFrame + 1} / ${this.keyframes.length}`;
        }
    }

    goToFrame(frameIndex) {
        if (!this.keyframes || frameIndex < 0 || frameIndex >= this.keyframes.length) {
            return;
        }

        this.currentFrame = frameIndex;
        const keyframe = this.keyframes[this.currentFrame];
        
        // Update chart without transition for immediate response
        this.x.domain([0, keyframe[1][0].value]);
        this.updateAxis(keyframe);
        this.updateBars(keyframe);
        this.updateLabels(keyframe);
        this.updateTicker(keyframe);
        
        this.updateSlider();
    }

    createTitle(title) {
        // Create and append the result item div
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.style.margin = '10px 0 10px 0';

        const titleheading = document.createElement('h3');
        titleheading.className = 'title';
        titleheading.textContent = `${title['title']}`;

        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'highlight';
        highlightSpan.textContent = `${title['subtitle']}`;

        resultItem.appendChild(titleheading);
        resultItem.appendChild(highlightSpan);
        document.getElementById(this.containerId).appendChild(resultItem);
    }    

    createChartContainer() {
        // Create the chart container div
        const chartContainer = document.createElement('div');
        chartContainer.id = this.chartId;

        document.getElementById(this.containerId).appendChild(chartContainer);
    }

    createSeperator(size) {
        // Create a horizontal line separator
        const separator = document.createElement('hr');
        separator.style.width = '100%';
        separator.style.height = `${size}px`;
        separator.style.border = 'none';
        separator.style.borderTop = '1px solid #ccc';
        separator.style.margin = '10px 0';
        document.getElementById(this.containerId).appendChild(separator);
    }

    
    init(data, title, itemName = 'margarine', prodMetric = 'production_t') {
        const processedData = this.processData(data, itemName, prodMetric);
        this.keyframes = processedData.keyframes;
        this.prev = processedData.prev;
        this.next = processedData.next;
        this.color = this.createColorScale(processedData.data);

        // Create the title and controls
        this.createTitle(title);
        this.createChartContainer();
        this.createButtons(); // Now includes slider in same div
        this.createSeperator(10);

        // Initialize slider max value
        const slider = document.getElementById(this.getElementId('timeline-slider'));
        if (slider) {
            slider.max = this.keyframes.length - 1;
        }

        d3.select(`#${this.chartId}`).select("svg").remove();
        
        this.svg = d3.select(`#${this.chartId}`)
            .append("svg")
            .attr("viewBox", [0, 0, this.width, this.height])
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("style", "max-width: 100%; height: auto;");

        this.updateBars = this.createBars(this.svg, this.prev, this.next);
        this.updateAxis = this.createAxis(this.svg);
        this.updateLabels = this.createLabels(this.svg, this.prev, this.next);
        this.updateTicker = this.createTicker(this.svg, this.keyframes);

        // Show initial frame
        const keyframe = this.keyframes[0];
        console.log(keyframe);
        this.x.domain([0, keyframe[1][0].value]);
        this.updateAxis(keyframe);
        this.updateBars(keyframe);
        this.updateLabels(keyframe);
        this.updateTicker(keyframe);
        
        this.currentFrame = 0;
        this.updateSlider(); // Initialize slider display
    }
    
    async animate() {
        if (!this.animationRunning || this.userDragging) return;
        
        if (this.currentFrame >= this.keyframes.length) {
            this.stop();
            return;
        }

        const keyframe = this.keyframes[this.currentFrame];
        const transition = this.svg.transition()
            .duration(this.duration)
            .ease(d3.easeLinear);

        this.x.domain([0, keyframe[1][0].value]);

        this.updateAxis(keyframe, transition);
        this.updateBars(keyframe, transition);
        this.updateLabels(keyframe, transition);
        this.updateTicker(keyframe, transition);
        
        // Update slider during animation
        this.updateSlider();

        await transition.end();
        console.log(this.animationRunning)
        this.currentFrame++;
        if (this.animationRunning && !this.userDragging) {
            console.log(`Animating frame ${this.currentFrame}`);
            requestAnimationFrame(() => this.animate());
        }
    }
    
    start() {
        this.animationRunning = true;
        document.getElementById(this.getElementId('start-btn')).disabled = true;
        document.getElementById(this.getElementId('pause-btn')).disabled = false;
        this.animate();
    }
    
    pause() {
        this.animationRunning = false;
        console.log(this.animationRunning)
        document.getElementById(this.getElementId('start-btn')).disabled = false;
        document.getElementById(this.getElementId('pause-btn')).disabled = true;
        this.svg.interrupt();

    }
    
    stop() {
        this.animationRunning = false;
        document.getElementById(this.getElementId('start-btn')).disabled = false;
        document.getElementById(this.getElementId('pause-btn')).disabled = true;
        this.svg.interrupt();
    }
    
    reset() {
        this.stop();
        this.currentFrame = 0;
        if (this.keyframes && this.keyframes.length > 0) {
            const keyframe = this.keyframes[0];
            this.x.domain([0, keyframe[1][0].value]);
            this.updateAxis(keyframe);
            this.updateBars(keyframe);
            this.updateLabels(keyframe);
            this.updateTicker(keyframe);
            this.updateSlider(); // Update slider on reset
        }
    }
}

// Helper function for easy initialization
export function initChart(data, itemName = 'margarine', prodMetric = 'production_t', containerId = 'chart', options = {}) {
    const defaultOptions = {
        margin: {top: 16, right: 6, bottom: 6, left: 0},
        barSize: 48,
        n: 8,
        k: 5,
        duration: 100,
        width: 928
    };
    
    const chart = new RacingBarChart(containerId, { ...defaultOptions, ...options });
    chart.init(data, itemName, prodMetric);
    return chart;
}