// Initialize Lenis
const lenis = new Lenis({
    orientation: 'vertical', // Replaces the deprecated 'direction' option
    smoothWheel: true,       // Replaces the deprecated 'smooth' option
    smoothTouch: false,      // Optional: Enable/disable smooth scrolling on touch devices
    duration: 1.5,           // Adjust for smoothness
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom easing function
});

// Update scroll position on each animation frame
function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

// Start the animation loop
requestAnimationFrame(raf);
