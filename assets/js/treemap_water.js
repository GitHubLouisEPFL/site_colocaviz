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

  let globalRoot;
  let breadcrumbHeight = 20;

  d3.json("data/data_water.json").then(data => {
    // Créer la hiérarchie à partir des données
    const hierarchy = d3.hierarchy(data);
    
    // Stocker les valeurs propres de chaque nœud
    hierarchy.each(node => {
      node.ownValue = node.data.value !== undefined ? node.data.value : 0;
    });
    
    // Fonction pour préparer la structure de données
    function prepareHierarchy(node, parent = null, depth = 0) {
      const result = {
        name: node.data.name,
        value: node.ownValue,
        ownValue: node.ownValue,
        has_production: node.data.has_production || false, // Add has_production field
        depth: depth,
        parent: parent
      };
      
      if (node.children && node.children.length > 0) {
        result.children = node.children
          .map(child => prepareHierarchy(child, result.name, depth + 1))
          .sort((a, b) => b.value - a.value); // Tri par valeur décroissante
      }
      
      return result;
    }
    
    // Préparer les données
    const preparedData = prepareHierarchy(hierarchy);
    
    // Créer une nouvelle hiérarchie pour la navigation
    globalRoot = d3.hierarchy(preparedData);
    
    // Initialiser l'affichage avec la racine
    drawCustomTreemap(globalRoot);
  });

  // Algorithme squarified treemap - optimise le ratio d'aspect des rectangles
  function computeCustomTreemap(node, rect) {
    if (!node.children || node.children.length === 0) {
      node.x0 = rect.x;
      node.y0 = rect.y;
      node.x1 = rect.x + rect.width;
      node.y1 = rect.y + rect.height;
      return;
    }
    
    // Calculer la somme totale des valeurs des enfants
    const totalValue = d3.sum(node.children, d => d.data.value);
    
    // Si la somme est zéro, répartir l'espace également
    if (totalValue === 0) {
      const childCount = node.children.length;
      const childWidth = rect.width / childCount;
      
      node.children.forEach((child, i) => {
        child.x0 = rect.x + i * childWidth;
        child.y0 = rect.y;
        child.x1 = rect.x + (i + 1) * childWidth;
        child.y1 = rect.y + rect.height;
      });
      
      return;
    }
    
    // Algorithme "squarified treemap" modifié
    squarifyImproved(node.children, rect, totalValue);
  }
  
  // Version améliorée de l'algorithme squarified
  function squarifyImproved(children, rect, totalValue) {
    // Si aucun enfant, sortir
    if (children.length === 0) return;

    // Copier le tableau des enfants et trier par valeur décroissante
    const nodes = [...children].sort((a, b) => b.data.value - a.data.value);
    
    // S'il n'y a qu'un seul nœud, il prend tout l'espace
    if (nodes.length === 1) {
      nodes[0].x0 = rect.x;
      nodes[0].y0 = rect.y;
      nodes[0].x1 = rect.x + rect.width;
      nodes[0].y1 = rect.y + rect.height;
      return;
    }
    
    // Rectangle courant pour le placement
    let currentRect = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
    
    // Nœuds restants à placer
    let remainingNodes = nodes;
    
    // S'assurer qu'on utilise les valeurs correctes pour le calcul de l'espace
    let remainingValue = d3.sum(remainingNodes, d => d.data.value);
    
    // Continuer tant qu'il reste des nœuds à placer
    while (remainingNodes.length > 0) {
      // Déterminer si on divise horizontalement ou verticalement
      const isWide = currentRect.width >= currentRect.height;
      
      // Cas spécial: s'il ne reste qu'un nœud, lui donner tout l'espace restant
      if (remainingNodes.length === 1) {
        remainingNodes[0].x0 = currentRect.x;
        remainingNodes[0].y0 = currentRect.y;
        remainingNodes[0].x1 = currentRect.x + currentRect.width;
        remainingNodes[0].y1 = currentRect.y + currentRect.height;
        break;
      }
      
      // Déterminer combien de nœuds placer dans cette division
      const { usedNodes, usedSpace } = layoutRowOrColumn(
        remainingNodes, 
        currentRect, 
        isWide, 
        remainingValue
      );
      
      // Mettre à jour le rectangle restant pour la prochaine itération
      if (isWide) {
        // Division horizontale, ajuster la hauteur
        currentRect.y += usedSpace;
        currentRect.height -= usedSpace;
      } else {
        // Division verticale, ajuster la largeur
        currentRect.x += usedSpace;
        currentRect.width -= usedSpace;
      }
      
      // Mettre à jour les nœuds restants et leur valeur totale
      remainingNodes = remainingNodes.slice(usedNodes.length);
      remainingValue = d3.sum(remainingNodes, d => d.data.value);
      
      // Si l'espace restant est trop petit, ajuster pour éviter les problèmes numériques
      if (currentRect.width < 1 || currentRect.height < 1) {
        // S'il reste des nœuds, leur donner un espace minimal
        if (remainingNodes.length > 0) {
          for (const node of remainingNodes) {
            node.x0 = currentRect.x;
            node.y0 = currentRect.y;
            node.x1 = currentRect.x + Math.max(1, currentRect.width);
            node.y1 = currentRect.y + Math.max(1, currentRect.height);
          }
        }
        break;
      }
    }
  }
  
  // Fonction pour disposer une rangée ou une colonne de nœuds
  function layoutRowOrColumn(nodes, rect, isWide, totalValue) {
    if (nodes.length === 0) return { usedNodes: [], usedSpace: 0 };
    
    const area = rect.width * rect.height;
    let bestRatio = Infinity;
    let bestCount = 1;
    
    // Traiter le cas où il ne reste qu'un seul nœud
    if (nodes.length === 1) {
      const node = nodes[0];
      node.x0 = rect.x;
      node.y0 = rect.y;
      node.x1 = rect.x + rect.width;
      node.y1 = rect.y + rect.height;
      return { usedNodes: nodes, usedSpace: isWide ? rect.height : rect.width };
    }
    
    // Déterminer combien de nœuds placer pour maximiser l'aspect ratio
    for (let i = 1; i <= nodes.length; i++) {
      const subNodes = nodes.slice(0, i);
      const subNodesValue = d3.sum(subNodes, d => d.data.value);
      
      // Si la valeur est nulle ou trop petite, continuer
      if (subNodesValue <= 0.001) continue;
      
      const subNodesArea = (subNodesValue / totalValue) * area;
      
      let ratio;
      if (isWide) {
        // Rangée horizontale
        const rowHeight = subNodesArea / rect.width;
        const rowWidth = rect.width;
        ratio = calcAspectRatio(subNodes, rowWidth, rowHeight, subNodesValue, isWide);
      } else {
        // Colonne verticale
        const colWidth = subNodesArea / rect.height;
        const colHeight = rect.height;
        ratio = calcAspectRatio(subNodes, colWidth, colHeight, subNodesValue, isWide);
      }
      
      if (ratio < bestRatio) {
        bestRatio = ratio;
        bestCount = i;
      } else {
        // Si le ratio commence à se dégrader, on s'arrête
        // Mais on continue si on n'a encore trouvé qu'un seul nœud
        if (bestCount > 1) break;
      }
    }
    
    // S'assurer qu'on utilise au moins un nœud
    bestCount = Math.max(1, bestCount);
    
    // Sous-ensemble de nœuds à placer
    const usedNodes = nodes.slice(0, bestCount);
    const usedNodesValue = d3.sum(usedNodes, d => d.data.value);
    
    // Gérer le cas où la valeur totale utilisée est nulle
    if (usedNodesValue <= 0) {
      // Distribuer uniformément
      if (isWide) {
        const equalHeight = rect.height / nodes.length;
        usedNodes.forEach((node, i) => {
          node.x0 = rect.x;
          node.y0 = rect.y + i * equalHeight;
          node.x1 = rect.x + rect.width;
          node.y1 = rect.y + (i + 1) * equalHeight;
        });
        return { usedNodes, usedSpace: equalHeight * usedNodes.length };
      } else {
        const equalWidth = rect.width / nodes.length;
        usedNodes.forEach((node, i) => {
          node.x0 = rect.x + i * equalWidth;
          node.y0 = rect.y;
          node.x1 = rect.x + (i + 1) * equalWidth;
          node.y1 = rect.y + rect.height;
        });
        return { usedNodes, usedSpace: equalWidth * usedNodes.length };
      }
    }
    
    // Calculer l'espace utilisé proportionnellement
    const usedNodesArea = (usedNodesValue / totalValue) * area;
    
    // Placer les nœuds
    let usedSpace;
    if (isWide) {
      // Rangée horizontale
      usedSpace = usedNodesArea / rect.width;
      // S'assurer que la hauteur a une valeur minimale
      usedSpace = Math.max(usedSpace, 1);
      placeRow(usedNodes, rect, usedSpace, usedNodesValue, true);
    } else {
      // Colonne verticale
      usedSpace = usedNodesArea / rect.height;
      // S'assurer que la largeur a une valeur minimale
      usedSpace = Math.max(usedSpace, 1);
      placeRow(usedNodes, rect, usedSpace, usedNodesValue, false);
    }
    
    return { usedNodes, usedSpace };
  }
  
  // Calculer l'aspect ratio moyen pour un ensemble de nœuds
  function calcAspectRatio(nodes, width, height, totalValue, isWide) {
    let maxRatio = 0;
    
    nodes.forEach(node => {
      const nodeValue = node.data.value;
      const ratio = nodeValue / totalValue;
      
      let aspectRatio;
      if (isWide) {
        // Pour une rangée horizontale
        const nodeWidth = ratio * width;
        aspectRatio = Math.max(nodeWidth / height, height / nodeWidth);
      } else {
        // Pour une colonne verticale
        const nodeHeight = ratio * height;
        aspectRatio = Math.max(width / nodeHeight, nodeHeight / width);
      }
      
      maxRatio = Math.max(maxRatio, aspectRatio);
    });
    
    return maxRatio;
  }
  
  // Placer une rangée ou une colonne de nœuds
  function placeRow(nodes, rect, size, totalValue, isWide) {
    let position = 0;
    
    // Gestion du cas où la valeur totale est nulle
    if (totalValue <= 0) {
      if (nodes.length === 0) return;
      
      if (isWide) {
        // Répartir horizontalement de manière égale
        const nodeWidth = rect.width / nodes.length;
        nodes.forEach((node, i) => {
          node.x0 = rect.x + i * nodeWidth;
          node.y0 = rect.y;
          node.x1 = rect.x + (i + 1) * nodeWidth;
          node.y1 = rect.y + size;
        });
      } else {
        // Répartir verticalement de manière égale
        const nodeHeight = rect.height / nodes.length;
        nodes.forEach((node, i) => {
          node.x0 = rect.x;
          node.y0 = rect.y + i * nodeHeight;
          node.x1 = rect.x + size;
          node.y1 = rect.y + (i + 1) * nodeHeight;
        });
      }
      return;
    }
    
    // Placer chaque nœud proportionnellement à sa valeur
    nodes.forEach((node, index) => {
      const ratio = node.data.value / totalValue;
      
      // S'assurer que même les petites valeurs obtiennent un espace minimal
      let dimension = ratio > 0 ? ratio : 1 / (nodes.length * 100);
      
      if (isWide) {
        // Rangée horizontale
        let nodeWidth = dimension * rect.width;
        
        // Ajustement pour le dernier élément pour éviter les problèmes d'arrondi
        if (index === nodes.length - 1) {
          nodeWidth = rect.width - position;
        }
        
        // S'assurer d'une largeur minimale
        nodeWidth = Math.max(nodeWidth, 0.5);
        
        node.x0 = rect.x + position;
        node.y0 = rect.y;
        node.x1 = rect.x + position + nodeWidth;
        node.y1 = rect.y + size;
        
        position += nodeWidth;
      } else {
        // Colonne verticale
        let nodeHeight = dimension * rect.height;
        
        // Ajustement pour le dernier élément pour éviter les problèmes d'arrondi
        if (index === nodes.length - 1) {
          nodeHeight = rect.height - position;
        }
        
        // S'assurer d'une hauteur minimale
        nodeHeight = Math.max(nodeHeight, 0.5);
        
        node.x0 = rect.x;
        node.y0 = rect.y + position;
        node.x1 = rect.x + size;
        node.y1 = rect.y + position + nodeHeight;
        
        position += nodeHeight;
      }
    });
  }

  function drawCustomTreemap(node) {
    svg.selectAll("*").remove();
    
    // Récupérer la hiérarchie des ancêtres pour le fil d'Ariane
    const ancestors = node.ancestors().reverse();
    
    // Calculer l'espace disponible pour la treemap
    const availableHeight = height - breadcrumbHeight - 5;
    
    // Groupe principal pour la treemap
    const group = svg.append("g")
      .attr("class", "root")
      .attr("transform", `translate(0, ${breadcrumbHeight + 5})`);
    
    // Dessiner le fil d'Ariane (breadcrumb)
    drawBreadcrumb(ancestors);
    
    // Vérifier si le nœud a des enfants
    if (node.children && node.children.length > 0) {
      // Calculer la disposition treemap personnalisée pour les nœuds avec enfants
      computeCustomTreemap(node, {
        x: 0,
        y: 0,
        width: width,
        height: availableHeight
      });
      
      // Obtenir les nœuds enfants
      const nodes = node.children;
      
      // Créer l'échelle de couleur basée sur les valeurs propres
      const ownValues = nodes.map(d => d.data.ownValue).filter(v => v > 0);
      const minValue = ownValues.length > 0 ? d3.min(ownValues) : 0;
      const maxValue = ownValues.length > 0 ? d3.max(ownValues) : 1;
      
      // Échelle de couleur pour les valeurs propres
      const color = d3.scaleSequential()
        .domain([minValue, maxValue])
        .interpolator(d3.interpolateRgb("#A7C8D9", "#5C7E91"));
      
      // Création des cellules
      const cell = group.selectAll("g")
        .data(nodes)
        .enter().append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .attr("data-name", d => d.data.name)  // Ajouter un attribut data-name pour l'identification
        .on("click", (event, d) => {
          // Permettre la navigation même sans enfants
          drawCustomTreemap(d);
          // Créer le chemin basé sur les noms des ancêtres
          const path = d.ancestors().reverse().map(n => n.data.name);
          path.push(d.data.name); // Ajouter le nœud actuel au chemin
          updateCarbonTreemap(path, "water");
          if (d.data.has_production) {
            window.viz.then(viz => {
              for (let i = 0; i < elements.length; i++) {
                  elements[i].hidden = false;
                }
              viz.update();
              return window.viz_slaughtered;
              })
              .then(viz_slaughtered => {
                  viz_slaughtered.update();
              })
              ;}
              else {
                for (let i = 0; i < elements.length; i++) {
                  elements[i].hidden = true;
                }
              }
          
        })
        // Ajouter ces gestionnaires d'événements
        .on("mouseenter", (event, d) => {
          // Mettre en évidence cette cellule
          d3.select(event.currentTarget).select("rect")
            .attr("fill-opacity", 1)
            .transition().duration(50)
            .attr("fill-opacity", 0.3)
            .attr("stroke", null)
            .attr("stroke-width", null);
          
          // Mettre en évidence la cellule correspondante dans l'autre treemap
          highlightCorrespondingCell(d.data.name, "water");
        })
        .on("mouseleave", (event, d) => {
          // Restaurer cette cellule
          d3.select(event.currentTarget).select("rect")
            .transition().duration(50)
            .attr("fill-opacity", 1)
            .attr("stroke", "none")
            .attr("stroke-width", 0);
          
          // Restaurer la cellule correspondante dans l'autre treemap
          unhighlightCorrespondingCell("water");
        });
      
      // Rectangles des cellules
      cell.append("rect")
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("fill", d => color(d.data.ownValue));
      
      // Infobulles
      cell.append("title").text(d => `${d.data.name}: ${d.data.ownValue}`);
      
      // Groupe pour le texte
      const textGroup = cell.append("g")
        .attr("class", "text-group")
        .attr("transform", d => `translate(${(d.x1 - d.x0) / 2}, ${(d.y1 - d.y0) / 2})`)
        .style("pointer-events", "none");
      
      // Texte du nom
      textGroup.append("text")
        .attr("class", "label name")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("dy", "-0.5em")
        .style("opacity", 0)
        .text(d => d.data.name)
        .transition().duration(500)
        .style("opacity", 1);
      
      // Texte de la valeur
      textGroup.append("text")
        .attr("class", "label value")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("dy", "0.7em")
        .style("opacity", 0)
        .text(d => d.data.ownValue)
        .transition().duration(500)
        .style("opacity", 1);

      // Production data indicator (only if has_production is true)
      textGroup.append("text")
        .attr("class", "label production")
        .attr("text-anchor", "middle")
        // .attr("dominant-baseline", "middle")
        .attr("dy", "2em")
        .style("font-size", "0.2em") // Slightly smaller font
        .text(d => d.data.has_production ? "✔" : "")
        .transition().duration(500)
        .style("opacity", d => d.data.has_production ? 1 : 0);
      
      // Ajustement de la taille du texte
      adjustTextSize(cell);
    } else {
      // Cas d'un nœud sans enfants (feuille) - afficher un seul rectangle pour ce nœud
      
      // Créer un seul rectangle qui occupe toute la zone
      const leaf = group.append("g")
        .attr("transform", `translate(0, 0)`)
        .attr("data-name", node.data.name);
        
      // Rectangle pour le nœud feuille
      leaf.append("rect")
        .attr("width", width)
        .attr("height", availableHeight)
        .attr("fill", "#A7C8D9"); // Couleur pour les nœuds feuilles
        
      // Infobulle
      leaf.append("title").text(`${node.data.name}: ${node.data.ownValue}`);
      
      // Groupe pour le texte
      const textGroup = leaf.append("g")
        .attr("class", "text-group")
        .attr("transform", `translate(${width / 2}, ${availableHeight / 2})`)
        .style("pointer-events", "none");
      
      // Texte du nom
      textGroup.append("text")
        .attr("class", "label name")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("dy", "-0.5em")
        .style("font-size", "24px")
        .style("opacity", 0)
        .text(node.data.name)
        .transition().duration(500)
        .style("opacity", 1);
      
      // Texte de la valeur
      textGroup.append("text")
        .attr("class", "label value")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("dy", "1em")
        .style("font-size", "20px")
        .style("opacity", 0)
        .text(node.data.ownValue)
        .transition().duration(500)
        .style("opacity", 1);

              
      // Production data indicator for leaf nodes, for now we don't write anything, but we let the space for it
      textGroup.append("text")
        .attr("class", "label production")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("dy", "3.25em")
        .style("font-size", "12px")
        .style("opacity", 0)
        .text(node.data.has_production ? "✔" : "") // add here something if you want to display something for the final leaf nodes
        .transition().duration(500)
        .style("opacity", node.data.has_production ? 1 : 0);

      
    }
  } 
  
  function drawBreadcrumb(ancestors) {
    const breadcrumbWidth = 130;
    
    const breadcrumb = svg.append("g")
      .attr("class", "breadcrumb")
      .attr("transform", "translate(0, 0)");
    
    const crumb = breadcrumb.selectAll("g")
      .data(ancestors)
      .enter().append("g")
      .attr("transform", (d, i) => `translate(${i * breadcrumbWidth}, 0)`)
      .on("click", (event, d) => {
        drawCustomTreemap(d);
        // Créer le chemin basé sur les noms des ancêtres
        const path = d.ancestors().reverse().map(n => n.data.name);
        updateCarbonTreemap(path, "water");
        if (d.data.has_production) {
        window.viz.then(viz => {
          for (let i = 0; i < elements.length; i++) {
              elements[i].hidden = false;
            }
          viz.update();
          return window.viz_slaughtered;
          })
          .then(viz_slaughtered => {
              viz_slaughtered.update();
          })
          ;}
          else {
            for (let i = 0; i < elements.length; i++) {
              elements[i].hidden = true;
            }
          }
      });
    
    crumb.append("rect")
      .attr("width", breadcrumbWidth)
      .attr("height", breadcrumbHeight)
      .attr("fill", "#6B8794");
    
    crumb.append("text")
      .attr("x", breadcrumbWidth / 2)
      .attr("y", breadcrumbHeight / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(d => d.data.name)
      .style("opacity", 0)
      .transition().duration(300)
      .style("opacity", 1);
  }
  
  function adjustTextSize(cell) {
    cell.selectAll("g.text-group").each(function(d) {
      const textGroup = d3.select(this);
      const nameNode = textGroup.select("text.name").node();
      const valueNode = textGroup.select("text.value").node();
      const productionNode = textGroup.select("text.production").node();
      const rectWidth = Math.max(0, d.x1 - d.x0);
      const rectHeight = Math.max(0, d.y1 - d.y0);
      
      const availableHeight = rectHeight;
      let fontSize = 17;
      
      textGroup.selectAll("text").style("font-size", fontSize + "px");
      
      let nameWidth = nameNode.getBBox().width;
      let valueWidth = valueNode.getBBox().width;
      let productionWidth = productionNode ? productionNode.getBBox().width : 0;
      let totalHeight = nameNode.getBBox().height + valueNode.getBBox().height;
      
      while ((Math.max(nameWidth, valueWidth) > rectWidth - 6 || totalHeight > availableHeight) && fontSize > 3) {
        fontSize -= 1;
        textGroup.selectAll("text").style("font-size", fontSize + "px");
        nameWidth = nameNode.getBBox().width;
        valueWidth = valueNode.getBBox().width;
        productionWidth = productionNode ? productionNode.getBBox().width : 0;
        totalHeight = nameNode.getBBox().height + valueNode.getBBox().height;
        if (productionNode && d.data.has_production) {
          totalHeight += productionNode.getBBox().height;
        }
      }
      
      // Fonction pour tronquer le texte
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
        truncateText(String(d.data.ownValue), valueNode, rectWidth - 6);
      }
 
      // Tronquer le texte de production si nécessaire
      if (productionNode && d.data.has_production && productionNode.getBBox().width > rectWidth - 6) {
        truncateText("✔", productionNode, rectWidth - 6);
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
    drawCustomTreemap(node, e.detail.source);
  });


  function highlightCorrespondingCell(name, source) {
    const event = new CustomEvent("highlightCell", { 
      detail: { name: name, source: source } 
    });
    document.dispatchEvent(event);
  }
  
  function unhighlightCorrespondingCell(source) {
    const event = new CustomEvent("unhighlightCell", { 
      detail: { source: source } 
    });
    document.dispatchEvent(event);
  }


  document.addEventListener("highlightCell", function(e) {
    if (e.detail.source === "water") return;
    
    // Trouver la cellule correspondante dans cette treemap et la mettre en évidence
    svg.selectAll(`g[data-name="${e.detail.name}"]`).select("rect")
      .attr("fill-opacity", 1)
      .transition().duration(50)
      .attr("fill-opacity", 0.3)
      .attr("stroke", null)
      .attr("stroke-width", null);
  });
  
  document.addEventListener("unhighlightCell", function(e) {
    if (e.detail.source === "water") return;
    
    // Restaurer toutes les cellules dans cette treemap
    svg.selectAll("g.root g").select("rect")
      .transition().duration(50)
      .attr("fill-opacity", 1)
      .attr("stroke", "none")
      .attr("stroke-width", 0);
  });



});








