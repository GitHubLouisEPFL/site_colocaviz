document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("water");
  let width = container.clientWidth;
  let height = container.clientHeight;

  // Création du SVG avec viewBox pour le responsive
  const svg = d3.select("#water")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, width, height])
    .attr("preserveAspectRatio", "xMidYMid meet");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold");

  let globalRoot;
  let currentNode;

  // Fonction pour redimensionner la treemap
  function resizeTreemap() {
    width = container.clientWidth;
    height = container.clientHeight;
    
    svg.attr("viewBox", [0, 0, width, height]);
    
    if (currentNode) {
      const treemap = d3.treemap().size([width, height]).paddingInner(1);
      treemap(globalRoot);
      draw(currentNode);
    }
  }

  // Écouteur d'événement pour le redimensionnement
  window.addEventListener("resize", debounce(resizeTreemap, 250));

  // Fonction de debounce pour limiter les appels lors du redimensionnement
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  d3.json("data/data_water.json").then(data => {
    const root = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    globalRoot = root;
    currentNode = root;

    const treemap = d3.treemap().size([width, height]).paddingInner(1);
    treemap(root);
    draw(root);
  });

  function draw(node, source = "water") {
    currentNode = node;
    svg.selectAll("*").remove();

    const breadcrumbHeight = Math.min(20, height * 0.05);
    const breadcrumbWidth = Math.min(100, width * 0.2);
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

    // Gestion adaptative des fils d'Ariane
    const visibleCrumbs = Math.floor(width / breadcrumbWidth);
    const displayedAncestors = ancestors.slice(Math.max(0, ancestors.length - visibleCrumbs));

    // Si nous avons tronqué des ancêtres, ajoutons un indicateur
    if (ancestors.length > visibleCrumbs) {
      breadcrumb.append("g")
        .attr("transform", "translate(0, 0)")
        .append("text")
        .attr("x", breadcrumbWidth / 2)
        .attr("y", breadcrumbHeight / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text("...")
        .style("font-size", `${Math.max(8, breadcrumbHeight * 0.6)}px`);
    }

    const crumb = breadcrumb.selectAll(".crumb")
      .data(displayedAncestors)
      .enter().append("g")
      .attr("class", "crumb")
      .attr("transform", (d, i) => {
        const offset = ancestors.length > visibleCrumbs ? 1 : 0;
        return `translate(${(i + offset) * breadcrumbWidth}, 0)`;
      })
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
      .text(d => {
        // Tronquer le texte si nécessaire
        const name = d.data.name;
        const maxChars = Math.floor(breadcrumbWidth / 6);
        return name.length > maxChars ? name.substring(0, maxChars-1) + "…" : name;
      })
      .style("font-size", `${Math.max(8, breadcrumbHeight * 0.6)}px`)
      .style("opacity", 0)
      .transition().duration(300)
      .style("opacity", 1);

    const group = svg.append("g")
      .attr("class", "root")
      .attr("transform", `translate(0, ${breadcrumbHeight + 5})`);

    const treemapHeight = height - breadcrumbHeight - 5;
    const x = d3.scaleLinear().domain([node.x0, node.x1]).range([0, width]);
    const y = d3.scaleLinear().domain([node.y0, node.y1]).range([0, treemapHeight]);

    const cell = group.selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "cell")
      .attr("transform", d => `translate(${x(d.x0)},${y(d.y0)})`)
      .on("click", (event, d) => {
        if (d.children) {
          event.stopPropagation();
          draw(d);
          // Créer le chemin basé sur les noms des ancêtres
          const path = d.ancestors().reverse().map(n => n.data.name);
          path.push(d.data.name); // Ajouter le nœud actuel au chemin
          updateCarbonTreemap(path, "water");
        }
      });

    cell.append("rect")
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0)))
      .attr("height", d => Math.max(0, y(d.y1) - y(d.y0)))
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
      
      // Si le rectangle est trop petit, masquer immédiatement tout le texte
      if (rectWidth < 30 || rectHeight < 25) {
        textGroup.selectAll("text").text("");
        return;
      }
      
      // Espace disponible pour les deux textes
      const availableHeight = rectHeight - 10;
      
      let fontSize = Math.min(14, rectWidth / 8, rectHeight / 4);
      textGroup.selectAll("text").style("font-size", fontSize + "px");
      
      // Vérifier si les textes sont trop larges
      let nameWidth = nameNode?.getBBox().width || 0;
      let valueWidth = valueNode?.getBBox().width || 0;
      let totalHeight = (nameNode?.getBBox().height || 0) + (valueNode?.getBBox().height || 0);
      
      // Réduire progressivement la taille de police jusqu'à ce que tout rentre
      while ((Math.max(nameWidth, valueWidth) > rectWidth - 6 || totalHeight > availableHeight) && fontSize > 6) {
        fontSize -= 1;
        textGroup.selectAll("text").style("font-size", fontSize + "px");
        nameWidth = nameNode?.getBBox().width || 0;
        valueWidth = valueNode?.getBBox().width || 0;
        totalHeight = (nameNode?.getBBox().height || 0) + (valueNode?.getBBox().height || 0);
      }
      
      // Si le nom est toujours trop long même avec la plus petite police, tronquer
      if (fontSize === 6 && nameWidth > rectWidth - 6) {
        let text = d.data.name;
        let nameElement = textGroup.select("text.name");
        while (text.length > 0 && nameNode?.getBBox().width > rectWidth - 6) {
          text = text.slice(0, -1);
          nameElement.text(text + "…");
        }
      }
      
      // Si le rectangle est trop petit malgré nos efforts, masquer tout le texte
      if (fontSize <= 6) {
        textGroup.selectAll("text").text("");
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

  // Vérifiez si l'écran est en mode portrait ou paysage et ajustez en conséquence
  function checkOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait) {
      container.style.height = `${window.innerHeight / 2}px`;
    } else {
      container.style.height = `${window.innerHeight - 20}px`;
    }
    resizeTreemap();
  }

  // Vérifie l'orientation au chargement et lors des rotations d'écran
  checkOrientation();
  window.addEventListener("orientationchange", checkOrientation);
});
