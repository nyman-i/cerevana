// Graph popup wiring for rrt.html. Chart rendering lives in the shared
// <rrt-graphs> component (js/rrt/graphs.js), also used by stats.html.

const graphPopup = document.getElementById('graph-popup');
const rrtGraphs = document.querySelector('rrt-graphs');

document.getElementById('graph-label').addEventListener('click', async () => {
    graphPopup.classList.add('visible');
    rrtGraphs.update(await getAllRRTProgress());
});

document.getElementById('graph-close-popup').addEventListener('click', () => {
    graphPopup.classList.remove('visible');
});

// dismissal (ESC + outside click) is shared: js/shared/sidebar-events.js
