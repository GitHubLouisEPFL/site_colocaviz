
document.addEventListener('DOMContentLoaded', () => {
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.5,
};

const sections = document.querySelectorAll('#chosen-food-name, #area-harvested-container, #animals-slaughtered-container');
const menuLinks = document.querySelectorAll('.menu a');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.id;
            menuLinks.forEach(link => {
                if (link.dataset.target === id) {
                    link.classList.add('active-visible');
                } else {
                    link.classList.remove('active-visible');
                }
            });
        }
    });
}, observerOptions);

sections.forEach(section => observer.observe(section));
});
