// Studies browser: fetches data/studies.md (the community's study list) and
// renders it as searchable, filterable cards. Edit the markdown, refresh here.

const searchEl = document.getElementById('studies-search');
const categoryEl = document.getElementById('studies-category');
const controlEl = document.getElementById('studies-control');
const countEl = document.getElementById('studies-count');
const listEl = document.getElementById('studies-list');

let studies = [];

const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const boldToHtml = s => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

// Category display order; also drives the filter dropdown. Any category a study
// resolves to must appear here (else it sorts to the end of the dropdown).
const CATEGORY_ORDER = ['Relational reasoning', 'Working memory', '3D MOT', 'Cognitive control', 'Brain endurance', 'Cognitive priming', 'Posner task', 'UFOV', 'Other'];

// Map a study to one training modality from its title + summary. Ordered: the
// first match wins, so more-specific paradigms are checked before general ones
// (e.g. the brain-endurance pilot mentions "cognitive and exercise" but is BET;
// a 3D MOT study that also transfers to working memory is still 3D MOT).
function deriveCategory(text) {
    const t = text.toLowerCase();
    if (t.includes('brain endurance')) return 'Brain endurance';
    if (t.includes('relational')) return 'Relational reasoning';
    if (t.includes('multiple object tracking')) return '3D MOT';
    if (t.includes('useful field of view')) return 'UFOV';
    if (t.includes('priming') || t.includes('warmup') || t.includes('warm-up') || t.includes('calisthenics') || t.includes('cognitive exercise')) return 'Cognitive priming';
    if (t.includes('posner')) return 'Posner task';
    if (t.includes('cognitive control')) return 'Cognitive control';
    if (t.includes('working memory')) return 'Working memory';
    return 'Other';
}

// Entries start with "# Title". Field lines may be bolded (**24**), the control
// line sometimes lacks its colon, one entry has no summary or link, and some
// entries include supplementary figures as markdown images (relative to data/).
function parseStudies(md) {
    return md.split(/^# /m).slice(1).map(block => {
        const lines = block.split('\n');
        const study = {
            title: lines[0].replace(/\*\*/g, '').trim(),
            sampleSize: null, sampleNote: '',
            control: '', controlDetail: '',
            url: '', summary: [], images: [],
        };
        for (const raw of lines.slice(1)) {
            const line = raw.replace(/\*\*/g, '').trim();
            if (!line) continue;
            const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
            if (/^sample size\b/i.test(line)) {
                const m = line.match(/(\d+)\s*(.*)$/);
                if (m) { study.sampleSize = +m[1]; study.sampleNote = m[2].trim(); }
            } else if (/^control group\b/i.test(line)) {
                const m = line.match(/^control group:?\s*(passive|active|none)\s*(.*)$/i);
                if (m) { study.control = m[1].toLowerCase(); study.controlDetail = m[2].trim(); }
            } else if (/^https?:\/\//.test(line)) {
                study.url = line.split(/\s/)[0];
            } else if (image) {
                study.images.push({ alt: image[1], src: 'data/' + image[2] });
            } else {
                study.summary.push(raw.trim());
            }
        }
        study.summary = study.summary.join(' ');
        study.category = deriveCategory(study.title + ' ' + study.summary);
        return study;
    });
}

function cardHtml(study) {
    const meta = [
        study.sampleSize !== null ? 'n=' + study.sampleSize + (study.sampleNote ? ' ' + escapeHtml(study.sampleNote) : '') : null,
        study.control ? study.control + ' control' + (study.controlDetail ? ' - ' + escapeHtml(study.controlDetail) : '') : null,
        study.category,
    ].filter(Boolean).join(' &middot; ');
    const title = study.url
        ? `<a href="${escapeHtml(study.url)}" target="_blank" rel="noopener">${escapeHtml(study.title)}</a>`
        : escapeHtml(study.title);
    const figures = study.images.length
        ? `<div class="study-card__figures">${study.images.map(img =>
            `<img class="study-card__figure" src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" loading="lazy">`).join('')}</div>`
        : '';
    return `<article class="study-card">
        <h2 class="study-card__title">${title}</h2>
        <div class="study-card__meta">${meta}</div>
        ${study.summary ? `<p class="study-card__summary">${boldToHtml(study.summary)}</p>` : ''}
        ${figures}
    </article>`;
}

function render() {
    const query = searchEl.value.trim().toLowerCase();
    const shown = studies.filter(s =>
        (!query || (s.title + ' ' + s.summary).toLowerCase().includes(query))
        && (categoryEl.value === 'all' || s.category === categoryEl.value)
        && (controlEl.value === 'all' || s.control === controlEl.value));
    countEl.textContent = `${shown.length} of ${studies.length} studies`;
    listEl.innerHTML = shown.length
        ? shown.map(cardHtml).join('')
        : '<p class="studies-empty">No studies match.</p>';
}

searchEl.addEventListener('input', render);
categoryEl.addEventListener('change', render);
controlEl.addEventListener('change', render);

appStateStartup();
document.body.classList.toggle('light-mode', appState.darkMode === false);
applySavedBackground();

function populateCategories() {
    const present = new Set(studies.map(s => s.category));
    const ordered = CATEGORY_ORDER.filter(c => present.has(c))
        .concat([...present].filter(c => !CATEGORY_ORDER.includes(c)));
    for (const cat of ordered) {
        const opt = document.createElement('option');
        opt.value = opt.textContent = cat;
        categoryEl.append(opt);
    }
}

fetch('data/studies.md')
    .then(r => r.text())
    .then(md => { studies = parseStudies(md); populateCategories(); render(); });
