// Offcanvas panel behavior shared by all pages:
// - close any open offcanvas when clicking outside it
// - let corner labels and ✕ labels be toggled with Enter/Space (labels don't get
//   native keyboard activation)
// - close the graph popup (#graph-popup, opened by #graph-label) on ESC or
//   an outside click - same dismissal on every game page
// Pairs are discovered from the DOM: input#offcanvas-X + div#sidebar-X.
(() => {
    const pairs = [...document.querySelectorAll('input[id^="offcanvas-"]')]
        .map(cb => [cb, document.getElementById('sidebar-' + cb.id.slice('offcanvas-'.length))])
        .filter(([, sidebar]) => sidebar);

    document.addEventListener('click', event => {
        for (const [checkbox, sidebar] of pairs) {
            if (!checkbox.contains(event.target) && !sidebar.contains(event.target)) {
                checkbox.checked = false;
            }
        }
    });

    for (const el of document.querySelectorAll('[role="button"]')) {
        el.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            el.click();
        });
    }

    const graphPopup = document.getElementById('graph-popup');
    const graphLabel = document.getElementById('graph-label');
    if (graphPopup && graphLabel) {
        document.addEventListener('click', event => {
            if (graphPopup.classList.contains('visible')
                    && !graphPopup.contains(event.target) && !graphLabel.contains(event.target)) {
                graphPopup.classList.remove('visible');
            }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') graphPopup.classList.remove('visible');
        });
    }

    for (const label of document.querySelectorAll('label.open, label.offcanvas-close')) {
        label.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            const target = document.getElementById(label.htmlFor);
            if (target && target.type === 'checkbox') {
                target.checked = !target.checked;
                target.dispatchEvent(new Event('change'));
            } else {
                label.click();
            }
        });
    }
})();
