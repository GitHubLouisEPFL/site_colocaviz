let waterData, carbonData;
let currentNode = null;
let path = [];
let cart = [];

async function loadData() {
    const [waterResponse, carbonResponse] = await Promise.all([
        fetch('data/data_water.json'),
        fetch('data/data_carbon.json')
    ]);

    const waterJson = await waterResponse.json();
    const carbonJson = await carbonResponse.json();

    waterData = waterJson;
    carbonData = carbonJson;

    currentNode = waterData;
    path = [];
    showLevel(currentNode.children);
    updateBreadcrumb();
    
    // Ajouter l'écouteur d'événement pour le bouton de vidage du panier
    document.getElementById('clear-cart').addEventListener('click', clearCart);
}

function showLevel(items) {
    toggleVisibility(items.length > 0 ? 'category-container' : null);
    const container = document.getElementById('category-container');
    container.innerHTML = '';

    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        
        if (item.children) {
            // C'est une catégorie - afficher seulement le nom
            card.textContent = item.name;
            card.className = 'card category-card';
            card.addEventListener('click', () => {
                const waterChild = item;
                currentNode = waterChild;
                path.push(item.name);
                showLevel(waterChild.children);
                updateBreadcrumb();
            });
        } else {
            // C'est un aliment - afficher avec contrôles sur la même ligne
            card.className = 'card food-card';
            
            const foodName = document.createElement('span');
            foodName.textContent = item.name;
            foodName.className = 'food-name';
            
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.value = '100';
            input.step = '50';
            input.placeholder = 'g';
            input.className = 'quantity-input';
            
            const carbonChild = findMatchingNode(carbonData, [...path, item.name]);
            const carbonValue = carbonChild?.value || 0;
            
            const addButton = document.createElement('button');
            addButton.textContent = 'Ajouter';
            addButton.className = 'add-button';
            addButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Empêcher la propagation au card
                const grams = parseFloat(input.value);
                if (isNaN(grams) || grams <= 0) {
                    alert('Veuillez entrer une quantité valide.');
                    return;
                }
                
                addToCart({
                    name: item.name,
                    water: item.value,
                    carbon: carbonValue
                }, grams);
            });
            
            // Ajouter tous les éléments sur la même ligne
            card.appendChild(foodName);
            card.appendChild(input);
            card.appendChild(addButton);
        }
        
        container.appendChild(card);
    });
}

function toggleVisibility(visibleId) {
    ['category-container', 'subcategory-container', 'item-container'].forEach(id => {
        document.getElementById(id).classList.toggle('hidden', id !== visibleId);
    });
}

function updateBreadcrumb() {
    const container = document.getElementById('breadcrumb');
    container.innerHTML = '';

    const root = document.createElement('span');
    root.className = 'breadcrumb-item';
    root.textContent = 'food category';
    root.addEventListener('click', () => {
        path = [];
        currentNode = waterData;
        showLevel(currentNode.children);
        updateBreadcrumb();
    });
    container.appendChild(root);

    let current = waterData;
    path.forEach((label, index) => {
        const span = document.createElement('span');
        span.className = 'breadcrumb-item';
        span.textContent = label;
        span.addEventListener('click', () => {
            path = path.slice(0, index + 1);
            current = navigateToNode(waterData, path);
            currentNode = current;
            showLevel(current.children || []);
            updateBreadcrumb();
        });
        container.appendChild(span);
    });
}

function addToCart(item, grams) {
    const existing = cart.find(entry => entry.name === item.name);
    if (existing) {
        existing.grams += grams;
    } else {
        cart.push({ ...item, grams });
    }
    updateCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function clearCart() {
    cart = [];
    updateCart();
}

function updateCart() {
    const list = document.getElementById('cart-list');
    list.innerHTML = '';

    let totalWater = 0;
    let totalCarbon = 0;

    cart.forEach((entry, index) => {
        const factor = entry.grams / 1000;
        totalWater += entry.water * factor;
        totalCarbon += entry.carbon * factor;

        const li = document.createElement('li');
        
        // Créer le contenu du texte
        const itemText = document.createElement('span');
        itemText.textContent = `${entry.name} – ${entry.grams}g`;
        
        // Créer le bouton de suppression
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '❌';
        removeBtn.className = 'remove-item';
        removeBtn.addEventListener('click', () => removeFromCart(index));
        
        // Ajouter les éléments à la liste
        li.appendChild(itemText);
        li.appendChild(removeBtn);
        list.appendChild(li);
    });

    document.getElementById('water-total').textContent = totalWater.toFixed(2);
    document.getElementById('carbon-total').textContent = totalCarbon.toFixed(2);
}

function findMatchingNode(tree, names) {
    let node = tree;
    for (const name of names) {
        if (!node.children) return null;
        node = node.children.find(child => child.name === name);
        if (!node) return null;
    }
    return node;
}

function navigateToNode(tree, names) {
    let node = tree;
    for (const name of names) {
        node = node.children.find(child => child.name === name);
    }
    return node;
}

document.addEventListener('DOMContentLoaded', loadData);