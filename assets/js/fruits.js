// fruits.js

const emojis = [
    '🍎', '🍌', '🍇', '🍓', '🍍',
    '🥕', '🥦', '🥒', '🌽', '🍆',
    '🧀', '🥛', '🧈',
    '🥩', '🍗', '🍖',
    '🐟', '🦐',
    '🍷', '🍺', '☕',
    '🥚',
    '🍝', '🍔', '🍕'
  ];
  
  function dropEmojis(count = 20) {
    const positions = Array.from({ length: count }, (_, i) =>
      (i + Math.random()) * (100 / count)
    );
  
    positions.sort(() => Math.random() - 0.5); // Mélanger pour éviter l’ordre linéaire
  
    const offset = 10; // Décalage vers la gauche
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'falling';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = positions[i] - offset + 'vw'; // Appliquer le décalage à gauche
      el.style.fontSize = (Math.random() * 100 + 28) + 'px'; // Taille aléatoire des emojis
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000); // Enlever l'élément après 2 secondes
    }
  }
  
  // Exécuter l'animation dès que la page est complètement chargée
  document.addEventListener('DOMContentLoaded', () => {
    dropEmojis(); // Lancer l'animation des aliments dès que le DOM est prêt
  });
  