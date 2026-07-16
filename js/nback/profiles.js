// Per-exercise profiles: N-Back keeps its own player list, independent of RRT's
// ProfileStore. Each profile's `data` holds the n-back settings and levels; the
// active profile's data is assigned to the global `savedata`, so game.js/page.js
// read and write it unchanged.

const nbackProfilesKey = 'sllgms-v3-nback-profiles';
const nbackSelectedKey = 'sllgms-v3-nback-selected-profile';

const NBACK_DEFAULT_DATA = {
    nbackMode: 'dual',
    nbackTrialTime: 2.8,
    nbackFeedback: true,
    nbackJaeggi: false,
    nbackManual: false,
    nbackManualN: 2,
    nbackVariable: false,
    nbackCrab: false,
    nbackSelfPaced: false,
    nbackThresholdAdvance: 80,
    nbackThresholdFallback: 50,
    nbackFallbackSessions: 3,
    nbackChanceMatch: 12.5,
    nbackChanceInterference: 12.5,
    nbackLevelDual: 2,
    nbackLevelPosition: 2,
    nbackLevelSound: 2,
    nbackLevelPC: 2,
    nbackLevelCA: 2,
    nbackLevelPCA: 2,
    nbackLevelDual2: 2,
    nbackLevelDual3: 2,
    nbackLevelDual4: 2,
    nbackLevelDC: 2,
    nbackLevelTC: 2,
    nbackLevelQC: 2,
    nbackLevelTCC: 2,
    nbackFailsDC: 0,
    nbackFailsTC: 0,
    nbackFailsQC: 0,
    nbackFailsTCC: 0,
    nbackFailsDual2: 0,
    nbackFailsDual3: 0,
    nbackFailsDual4: 0,
    nbackMultiStim: 1,
    nbackLevelA: 1,
    nbackLevelDA: 1,
    nbackLevelTA: 1,
    nbackFailsA: 0,
    nbackFailsDA: 0,
    nbackFailsTA: 0,
    nbackArithMaxNumber: 12,
    nbackArithNegatives: false,
    nbackArithAdd: true,
    nbackArithSub: true,
    nbackArithMul: true,
    nbackArithDiv: true,
    nbackResetLevel: false,
    nbackLastResetDay: 0,
    nbackFailsDual: 0,
    nbackFailsPosition: 0,
    nbackFailsSound: 0,
    nbackFailsPC: 0,
    nbackFailsCA: 0,
    nbackFailsPCA: 0,
};

const profileInput = document.getElementById('profile-input');
const profileArrow = document.getElementById('profile-arrow');
const profileList = document.getElementById('profile-list');
const profileDropdown = document.querySelector('.profile-dropdown');
const profilePlus = document.getElementById('profile-plus');

const NBACK_PROFILES = {
    profiles: [],
    selected: 0,

    startup() {
        this.profiles = getLocalStorageObj(nbackProfilesKey) || [this.seedProfile()];
        const sel = getLocalStorageObj(nbackSelectedKey);
        this.selected = (Number.isInteger(sel) && 0 <= sel && sel < this.profiles.length) ? sel : 0;
        // backfill new keys into stored profiles
        this.profiles.forEach(p => { p.data = Object.assign(structuredClone(NBACK_DEFAULT_DATA), p.data); });
        this.apply();
        this.persist();
    },

    // first run: adopt n-back values that older versions stored inside the RRT profile
    seedProfile() {
        const rrtProfiles = getLocalStorageObj(profilesKey) || [];
        const rrtSelected = getLocalStorageObj(selectedProfileKey) || 0;
        const old = (rrtProfiles[rrtSelected] || {}).savedata || {};
        const data = structuredClone(NBACK_DEFAULT_DATA);
        for (const key in data) {
            if (old.hasOwnProperty(key)) data[key] = old[key];
        }
        return { name: 'Default', data };
    },

    current() {
        return this.profiles[this.selected];
    },

    apply() {
        savedata = this.current().data;
        populateSettings();
        init();
        this.renderDropdown();
    },

    persist() {
        setLocalStorageObj(nbackProfilesKey, this.profiles);
        setLocalStorageObj(nbackSelectedKey, this.selected);
    },

    select(index) {
        this.selected = index;
        profileList.style.display = 'none';
        this.apply();
        this.persist();
    },

    add() {
        this.profiles.push({
            name: this.current().name + ' (copy)',
            data: structuredClone(this.current().data),
        });
        this.select(this.profiles.length - 1);
        profileInput.select();
    },

    remove(index) {
        this.profiles.splice(index, 1);
        if (this.selected >= this.profiles.length) this.selected = 0;
        this.select(this.selected);
    },

    rename(newName) {
        this.current().name = newName;
        this.persist();
    },

    renderDropdown() {
        profileInput.value = this.current().name;
        profileList.innerHTML = '';
        this.profiles.forEach((profile, index) => {
            const selectButton = document.createElement('div');
            selectButton.classList.add('profile-select');
            selectButton.textContent = profile.name || '(no name)';
            if (this.selected === index) selectButton.classList.add('highlight');
            selectButton.addEventListener('click', event => {
                event.stopPropagation();
                this.select(index);
            });
            if (this.profiles.length > 1) {
                const deleteButton = document.createElement('div');
                deleteButton.className = 'profile-delete';
                deleteButton.textContent = 'X';
                deleteButton.addEventListener('click', event => {
                    event.stopPropagation();
                    if (confirm(`Delete ${profile.name}?`)) this.remove(index);
                });
                selectButton.appendChild(deleteButton);
            }
            profileList.appendChild(selectButton);
        });
    },
};

// on this page, save() persists the n-back profiles instead of the RRT ones
save = function () {
    NBACK_PROFILES.persist();
    setLocalStorageObj(appStateKey, appState);
};

profileArrow.addEventListener('click', () => {
    profileList.style.display = profileList.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', event => {
    if (!profileDropdown.contains(event.target)) profileList.style.display = 'none';
});
profilePlus.addEventListener('click', () => NBACK_PROFILES.add());
profileInput.addEventListener('input', e => NBACK_PROFILES.rename(e.target.value));
