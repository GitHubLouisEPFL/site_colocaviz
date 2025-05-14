document.addEventListener('DOMContentLoaded', () => {
  // Variables globales
  let fullCarbonData = null;
  let fullWaterData = null;
  let flatFoodList = [];
  let selectedFoods = [];
  let chartInstance = null;
  let currentPath = ['root'];

  // Éléments DOM fréquemment utilisés
  const breadcrumbEl = document.getElementById('breadcrumb');
  const categoryListEl = document.getElementById('categoryList');
  const selectedFoodsEl = document.getElementById('selectedFoods');
  const compareBtn = document.getElementById('compareBtn');

  // Charger les données
  Promise.all([
    fetch('data/data_carbon.json').then(res => res.json()),
    fetch('data/data_water.json').then(res => res.json())
  ]).then(([carbonJson, waterJson]) => {
    fullCarbonData = carbonJson;
    fullWaterData = waterJson;

    // Créer une liste plate des aliments avec leurs valeurs carbone et eau
    flatFoodList = extractLeaves(carbonJson).map(c => {
      const w = extractLeaves(waterJson).find(w => w.name === c.name);
      return {
        name: c.name,
        carbon: c.value,
        water: w ? w.value : null,
        path: findPath(carbonJson, c.name)
      };
    });

    // Initialiser l'interface
    showCategoriesAtCurrentPath();
  });

  // Extraire toutes les feuilles (aliments) d'un arbre de données
  function extractLeaves(node, path = []) {
    if (!node.children || node.children.length === 0) {
      return [{ name: node.name, value: node.value }];
    }
    return node.children.flatMap(child => extractLeaves(child, [...path, node.name]));
  }

  // Trouver le chemin complet pour accéder à un aliment
  function findPath(node, targetName, currentPath = ['root']) {
    if (node.name === targetName) {
      return currentPath;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const path = findPath(child, targetName, [...currentPath, child.name]);
        if (path) return path;
      }
    }
    
    return null;
  }

  // Obtenir le nœud correspondant au chemin actuel
  function getNodeAtPath(node, path, depth = 1) {
    if (depth >= path.length) {
      return node;
    }
    
    const childName = path[depth];
    const childNode = node.children.find(child => child.name === childName);
    
    if (!childNode) return null;
    
    return getNodeAtPath(childNode, path, depth + 1);
  }

  // Afficher les catégories ou aliments au niveau du chemin actuel
  function showCategoriesAtCurrentPath() {
    // Mettre à jour le fil d'Ariane
    updateBreadcrumb();
    
    // Trouver le nœud pour le chemin actuel
    const currentNode = currentPath.length === 1 
      ? fullCarbonData 
      : getNodeAtPath(fullCarbonData, currentPath);
    
    // Vider la liste actuelle
    categoryListEl.innerHTML = '';
    
    if (!currentNode) {
      categoryListEl.innerHTML = '<div class="loading">Catégorie non trouvée</div>';
      return;
    }
    
    // Afficher les enfants (catégories ou aliments)
    if (currentNode.children && currentNode.children.length > 0) {
      currentNode.children.forEach(child => {
        const isCategory = child.children && child.children.length > 0;
        
        if (isCategory) {
          // C'est une catégorie
          const categoryItem = document.createElement('div');
          categoryItem.className = 'category-item';
          categoryItem.textContent = child.name;
          categoryItem.addEventListener('click', () => {
            currentPath.push(child.name);
            showCategoriesAtCurrentPath();
          });
          categoryListEl.appendChild(categoryItem);
        } else {
          // C'est un aliment
          const foodItem = document.createElement('div');
          foodItem.className = 'food-item';
          
          const nameSpan = document.createElement('span');
          nameSpan.textContent = child.name;
          
          const selectBtn = document.createElement('button');
          selectBtn.className = 'select-btn';
          selectBtn.textContent = 'Sélectionner';
          selectBtn.addEventListener('click', () => {
            addFoodToSelection(child.name);
          });
          
          foodItem.appendChild(nameSpan);
          foodItem.appendChild(selectBtn);
          categoryListEl.appendChild(foodItem);
        }
      });
    } else {
      categoryListEl.innerHTML = '<div class="loading">Aucun élément dans cette catégorie</div>';
    }
  }

  // Mettre à jour le fil d'Ariane
  function updateBreadcrumb() {
    breadcrumbEl.innerHTML = '';
    
    currentPath.forEach((part, index) => {
      const breadcrumbItem = document.createElement('span');
      breadcrumbItem.className = 'breadcrumb-item';
      if (index === currentPath.length - 1) {
        breadcrumbItem.classList.add('active');
      }
      breadcrumbItem.textContent = part === 'root' ? 'Accueil' : part;
      breadcrumbItem.setAttribute('data-path', part);
      
      breadcrumbItem.addEventListener('click', () => {
        // Naviguer jusqu'à ce niveau du fil d'Ariane
        currentPath = currentPath.slice(0, index + 1);
        showCategoriesAtCurrentPath();
      });
      
      breadcrumbEl.appendChild(breadcrumbItem);
    });
  }

  // Ajouter un aliment à la sélection
  function addFoodToSelection(foodName) {
    // Vérifier si l'aliment est déjà sélectionné
    if (selectedFoods.some(f => f.name === foodName)) {
      return;
    }
    
    const foodData = flatFoodList.find(f => f.name === foodName);
    if (foodData) {
      selectedFoods.push(foodData);
      updateSelectedFoodsList();
      updateCompareButtonState();
    }
  }

  // Retirer un aliment de la sélection
  function removeFoodFromSelection(foodName) {
    selectedFoods = selectedFoods.filter(f => f.name !== foodName);
    updateSelectedFoodsList();
    updateCompareButtonState();
  }

  // Mettre à jour la liste des aliments sélectionnés
  function updateSelectedFoodsList() {
    selectedFoodsEl.innerHTML = '';
    
    if (selectedFoods.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-basket';
      emptyMsg.textContent = 'Aucun aliment sélectionné';
      selectedFoodsEl.appendChild(emptyMsg);
      return;
    }
    
    selectedFoods.forEach(food => {
      const foodItem = document.createElement('div');
      foodItem.className = 'selected-food';
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = food.name;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = 'Retirer';
      removeBtn.addEventListener('click', () => {
        removeFoodFromSelection(food.name);
      });
      
      foodItem.appendChild(nameSpan);
      foodItem.appendChild(removeBtn);
      selectedFoodsEl.appendChild(foodItem);
    });
  }

  // Activer/désactiver le bouton de comparaison
  function updateCompareButtonState() {
    compareBtn.disabled = selectedFoods.length < 2;
  }

  // Gérer le clic sur le bouton de comparaison
  compareBtn.addEventListener('click', () => {
    if (selectedFoods.length < 2) {
      alert('Veuillez sélectionner au moins deux aliments.');
      return;
    }
    renderChart(selectedFoods);
  });

  // Afficher le graphique de comparaison - avec hauteur adaptative correctement appliquée
  function renderChart(foods) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    // Utiliser la formule: max(100px * nombre d'éléments, 700px)
    const calculatedHeight = Math.max(100 * foods.length, 400);
    
    // Appliquer la nouvelle hauteur au canvas
    document.getElementById('comparisonChart').height = calculatedHeight;
    document.getElementById('comparisonChart').style.height = `${calculatedHeight}px`;
    
    // Appliquer la même hauteur au conteneur du graphique
    document.querySelector('.chart-container-comp').style.minHeight = `${calculatedHeight}px`;

    const labels = foods.map(f => f.name);
    const carbonValues = foods.map(f => f.carbon);
    const waterValues = foods.map(f => f.water);

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
        labels: labels,
        datasets: [
            {
            label: 'Carbone (kg CO₂)',
            data: carbonValues,
            backgroundColor: 'rgba(109, 138, 96, 0.7)',
            xAxisID: 'xCarbon'
            },
            {
            label: 'Eau (L)',
            data: waterValues,
            backgroundColor: 'rgba(142, 202, 230, 0.7)',
            xAxisID: 'xWater'
            }
        ]
        },
        options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            title: {
            display: true,
            text: 'Comparaison multi-alimentaire : carbone vs eau'
            }
        },
        scales: {
            xCarbon: {
            position: 'top',
            beginAtZero: true,
            title: {
                display: true,
                text: 'Carbone (kg CO₂)'
            }
            },
            xWater: {
            position: 'bottom',
            beginAtZero: true,
            grid: {
                drawOnChartArea: false
            },
            title: {
                display: true,
                text: 'Eau (L)'
            }
            },
            y: {
            stacked: false,
            ticks: {
                autoSkip: false
            }
            }
        }
        }
    });
  }
});