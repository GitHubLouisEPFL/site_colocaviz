document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("water");
  const width = container.clientWidth;
  const height = container.clientHeight;

  const svg = d3.select("#water")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("preserveAspectRatio", "xMidYMid meet");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")

  let globalRoot;

  d3.json("data/data_water.json").then(data => {
    const root = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    globalRoot = root;

    const treemap = d3.treemap().size([width, height]).paddingInner(1);
    treemap(root);
    draw(root);
  });

  function draw(node, source = "water") {
    svg.selectAll("*").remove();

    const breadcrumbHeight = 20;
    const breadcrumbWidth = 174;
    const nodes = node.children || [];

    const values = nodes.map(d => d.value);
    const minValue = d3.min(values);
    const maxValue = d3.max(values);

    const color = d3.scaleSequential()
      .domain([minValue, maxValue])
      .interpolator(d3.interpolateRgb("#A8E3FF", "#2659D5"));

    const ancestors = node.ancestors().reverse();
    const breadcrumb = svg.append("g")
      .attr("class", "breadcrumb")
      .attr("transform", "translate(0, 0)");

    const crumb = breadcrumb.selectAll("g")
      .data(ancestors)
      .enter().append("g")
      .attr("transform", (d, i) => `translate(${i * breadcrumbWidth}, 0)`)
      .on("click", (event, d) => {
        draw(d);
        // Créer le chemin basé sur les noms des ancêtres
        const path = d.ancestors().reverse().map(n => n.data.name);
        updateCarbonTreemap(path, "water");
      });

    crumb.append("rect")
      .attr("width", breadcrumbWidth)
      .attr("height", breadcrumbHeight)
      .attr("fill", "#6D9FBD");

    crumb.append("text")
      .attr("x", breadcrumbWidth / 2)
      .attr("y", breadcrumbHeight / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(d => d.data.name)
      .style("opacity", 0)
      .transition().duration(300)
      .style("opacity", 1);

    const group = svg.append("g")
      .attr("class", "root")
      .attr("transform", `translate(0, ${breadcrumbHeight + 5})`);

    const x = d3.scaleLinear().domain([node.x0, node.x1]).range([0, width]);
    const y = d3.scaleLinear().domain([node.y0, node.y1]).range([0, height - breadcrumbHeight - 5]);

    const cell = group.selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("transform", d => `translate(${x(d.x0)},${y(d.y0)})`)
      .on("click", (event, d) => {
        if (d.children) {
          draw(d);
          // Créer le chemin basé sur les noms des ancêtres
          const path = d.ancestors().reverse().map(n => n.data.name);
          path.push(d.data.name); // Ajouter le nœud actuel au chemin
          updateCarbonTreemap(path, "water");
        }
      });

    cell.append("rect")
      .attr("width", d => x(d.x1) - x(d.x0))
      .attr("height", d => y(d.y1) - y(d.y0))
      .attr("fill", d => color(d.value));

    cell.append("title").text(d => `${d.data.name}: ${d.value}`);

    // Créons un groupe pour contenir le texte du nom et de la valeur
    const textGroup = cell.append("g")
      .attr("class", "text-group")
      .attr("transform", d => `translate(${(x(d.x1) - x(d.x0)) / 2}, ${(y(d.y1) - y(d.y0)) / 2})`)
      .style("pointer-events", "none");
    
    // Ajout du nom
    textGroup.append("text")
      .attr("class", "label name")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("dy", "-0.5em")  // Décalage vers le haut pour le nom
      .style("opacity", 0)
      .text(d => d.data.name)
      .transition().duration(500)
      .style("opacity", 1);
    
    // Ajout de la valeur
    textGroup.append("text")
      .attr("class", "label value")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("dy", "0.7em")  // Décalage vers le bas pour la valeur
      .style("opacity", 0)
      .text(d => d.value)
      .transition().duration(500)
      .style("opacity", 1);

    // Ajuster la taille des textes pour qu'ils rentrent dans les rectangles
    cell.selectAll("g.text-group").each(function(d) {
      const textGroup = d3.select(this);
      const nameNode = textGroup.select("text.name").node();
      const valueNode = textGroup.select("text.value").node();
      const rectWidth = x(d.x1) - x(d.x0);
      const rectHeight = y(d.y1) - y(d.y0);

      const availableHeight = rectHeight - 0;
      let fontSize = 17;

      textGroup.selectAll("text").style("font-size", fontSize + "px");

      let nameWidth = nameNode.getBBox().width;
      let valueWidth = valueNode.getBBox().width;
      let totalHeight = nameNode.getBBox().height + valueNode.getBBox().height;

      while ((Math.max(nameWidth, valueWidth) > rectWidth - 6 || totalHeight > availableHeight) && fontSize > 3) {
        fontSize -= 1;
        textGroup.selectAll("text").style("font-size", fontSize + "px");
        nameWidth = nameNode.getBBox().width;
        valueWidth = valueNode.getBBox().width;
        totalHeight = nameNode.getBBox().height + valueNode.getBBox().height;
      }

      // Fonction pour tronquer un texte avec "…" si trop large
      const truncateText = (text, node, maxWidth) => {
        let truncated = text;
        const selection = d3.select(node);
        while (truncated.length > 0 && node.getBBox().width > maxWidth) {
          truncated = truncated.slice(0, -1);
          selection.text(truncated + "…");
        }
      };

      // Tronquer le nom si nécessaire
      if (nameNode.getBBox().width > rectWidth - 6) {
        truncateText(d.data.name, nameNode, rectWidth - 6);
      }

      // Tronquer la valeur si nécessaire
      if (valueNode.getBBox().width > rectWidth - 6) {
        truncateText(String(d.value), valueNode, rectWidth - 6);
      }
    });

  }

  function updateCarbonTreemap(path, source) {
    const event = new CustomEvent("updateCarbon", { 
      detail: { path: path, source: source } 
    });
    document.dispatchEvent(event);
  }

  function findNodeByPath(path) {
    let node = globalRoot;
    for (let i = 1; i < path.length; i++) {
      if (!node.children) break;
      const found = node.children.find(d => d.data.name === path[i]);
      if (!found) break;
      node = found;
    }
    return node;
  }

  document.addEventListener("updateWater", function (e) {
    if (e.detail.source === "water") return;
    const path = e.detail.path;
    const node = findNodeByPath(path);
    draw(node, e.detail.source);
  });
});
