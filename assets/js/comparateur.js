document.addEventListener('DOMContentLoaded', () => {
  // Global variables
  let fullCarbonData = null;
  let fullWaterData = null;
  let flatFoodList = [];
  let selectedFoods = [];
  let chartInstance = null;
  let currentPath = ['root'];

  // Frequently used DOM elements
  const breadcrumbEl = document.getElementById('breadcrumb');
  const categoryListEl = document.getElementById('categoryList');
  const selectedFoodsEl = document.getElementById('selectedFoods');
  const compareBtn = document.getElementById('compareBtn');

  // Load data
  Promise.all([
    fetch('data/data_carbon.json').then(res => res.json()),
    fetch('data/data_water.json').then(res => res.json())
  ]).then(([carbonJson, waterJson]) => {
    fullCarbonData = carbonJson;
    fullWaterData = waterJson;

    // Create a flat list of food items with carbon and water values
    flatFoodList = extractLeaves(carbonJson).map(c => {
      const w = extractLeaves(waterJson).find(w => w.name === c.name);
      return {
        name: c.name,
        carbon: c.value,
        water: w ? w.value : null,
        path: findPath(carbonJson, c.name)
      };
    });

    // Initialize interface
    showCategoriesAtCurrentPath();
  });

  // Extract all leaf nodes (food items) from a data tree
  function extractLeaves(node, path = []) {
    if (!node.children || node.children.length === 0) {
      return [{ name: node.name, value: node.value }];
    }
    return node.children.flatMap(child => extractLeaves(child, [...path, node.name]));
  }

  // Find the full path to a food item
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

  // Get the node corresponding to the current path
  function getNodeAtPath(node, path, depth = 1) {
    if (depth >= path.length) {
      return node;
    }

    const childName = path[depth];
    const childNode = node.children.find(child => child.name === childName);

    if (!childNode) return null;

    return getNodeAtPath(childNode, path, depth + 1);
  }

  // Display categories or food items at the current path
  function showCategoriesAtCurrentPath() {
    updateBreadcrumb();

    const currentNode = currentPath.length === 1 
      ? fullCarbonData 
      : getNodeAtPath(fullCarbonData, currentPath);

    categoryListEl.innerHTML = '';

    if (!currentNode) {
      categoryListEl.innerHTML = '<div class="loading">Category not found</div>';
      return;
    }

    if (currentNode.children && currentNode.children.length > 0) {
      currentNode.children.forEach(child => {
        const isCategory = child.children && child.children.length > 0;

        if (isCategory) {
          const categoryItem = document.createElement('div');
          categoryItem.className = 'category-item';
          categoryItem.textContent = child.name;
          categoryItem.addEventListener('click', () => {
            currentPath.push(child.name);
            showCategoriesAtCurrentPath();
          });
          categoryListEl.appendChild(categoryItem);
        } else {
          const foodItem = document.createElement('div');
          foodItem.className = 'food-item';

          const nameSpan = document.createElement('span');
          nameSpan.textContent = child.name;

          const selectBtn = document.createElement('button');
          selectBtn.className = 'select-btn';
          selectBtn.textContent = 'Select';
          selectBtn.addEventListener('click', () => {
            addFoodToSelection(child.name);
          });

          foodItem.appendChild(nameSpan);
          foodItem.appendChild(selectBtn);
          categoryListEl.appendChild(foodItem);
        }
      });
    } else {
      categoryListEl.innerHTML = '<div class="loading">No items in this category</div>';
    }
  }

  // Update breadcrumb navigation
  function updateBreadcrumb() {
    breadcrumbEl.innerHTML = '';

    currentPath.forEach((part, index) => {
      const breadcrumbItem = document.createElement('span');
      breadcrumbItem.className = 'breadcrumb-item';
      if (index === currentPath.length - 1) {
        breadcrumbItem.classList.add('active');
      }
      breadcrumbItem.textContent = part === 'root' ? 'Home' : part;
      breadcrumbItem.setAttribute('data-path', part);

      breadcrumbItem.addEventListener('click', () => {
        currentPath = currentPath.slice(0, index + 1);
        showCategoriesAtCurrentPath();
      });

      breadcrumbEl.appendChild(breadcrumbItem);
    });
  }

  // Add food to selection
  function addFoodToSelection(foodName) {
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

  // Remove food from selection
  function removeFoodFromSelection(foodName) {
    selectedFoods = selectedFoods.filter(f => f.name !== foodName);
    updateSelectedFoodsList();
    updateCompareButtonState();
  }

  // Update selected food list
  function updateSelectedFoodsList() {
    selectedFoodsEl.innerHTML = '';

    if (selectedFoods.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-basket';
      emptyMsg.textContent = 'No food selected';
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
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        removeFoodFromSelection(food.name);
      });

      foodItem.appendChild(nameSpan);
      foodItem.appendChild(removeBtn);
      selectedFoodsEl.appendChild(foodItem);
    });
  }

  // Enable/disable compare button
  function updateCompareButtonState() {
    compareBtn.disabled = selectedFoods.length < 2;
  }

  // Handle compare button click
  compareBtn.addEventListener('click', () => {
    if (selectedFoods.length < 2) {
      alert('Please select at least two food items.');
      return;
    }
    renderChart(selectedFoods);
  });

  // Render comparison chart with adaptive height
  function renderChart(foods) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const calculatedHeight = Math.max(100 * foods.length, 400);

    document.getElementById('comparisonChart').height = calculatedHeight;
    document.getElementById('comparisonChart').style.height = `${calculatedHeight}px`;

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
            label: 'Carbon (kg CO₂e / kg)',
            data: carbonValues,
            backgroundColor: 'rgba(109, 138, 96, 0.7)',
            xAxisID: 'xCarbon'
          },
          {
            label: 'Water (L / kg)',
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
            text: 'Food Comparison: Carbon vs Water Footprint',
          }
        },
        scales: {
          xCarbon: {
            position: 'top',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Carbon (kg CO₂e / kg)'
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
              text: 'Water (L / kg)'
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
