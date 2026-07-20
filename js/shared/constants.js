const oldSettingsKey = "sllgms-v3";
const imageKey = 'sllgms-v3-background';
const profilesKey = 'sllgms-v3-profiles';
const selectedProfileKey = 'sllgms-v3-selected-profile';
const appStateKey = 'sllgms-v3-app-state';

let appState = {
    "score": 0,
    "questions": [],
    "backgroundImage": null,
    "gameAreaColor": "transparent",
    "gameAreaLightColor": "transparent",
    "isExperimentalOpen": false,
    "isLegacyOpen": false,
    "sfx": "none",
    "fastUi": true,
    "staticButtons": true,
    "darkMode": true,
    "accentHue": 165, // sage default; one hue, S/L locked in styles.css
    "mainFont": "default",
};

function getLocalStorageObj(key) {
    const entry = localStorage.getItem(key);
    if (entry) {
        return JSON.parse(entry);
    } else {
        return null;
    }
}

function setLocalStorageObj(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
}

function save() {
    // PROFILE_STORE only exists on pages that load profile.js (rrt.html)
    if (typeof PROFILE_STORE !== 'undefined') PROFILE_STORE.saveProfiles();
    setLocalStorageObj(appStateKey, appState);
}

function appStateStartup() {
    const appStateObj = getLocalStorageObj(appStateKey);
    if (appStateObj) {
        Object.assign(appState, appStateObj);
        // Migrate old game-area color defaults to the new transparent default
        if (appState.gameAreaColor === "#293247CC") appState.gameAreaColor = "transparent";
        if (appState.gameAreaLightColor === "#EFEFEF") appState.gameAreaLightColor = "transparent";
        setLocalStorageObj(appStateKey, appState);
    }
}

let savedata = {
    "version": 3,
    "premises": 2,
    "timer": 30,
    "enableDistinction": true,
    "enableLinear": true,
    "linearWording": 'topunder,comparison,contains',
    "enableSyllogism": false,
    "enableAnalogy": false,
    "enableDirection": true,
    "enableDirection3D": false,
    "enableDirection4D": false,
    "enableAnchorSpace": false,
    "enableBinary": false,
    "useMeaningfulWords": false,
    "enableCarouselMode": false,
    "enableNegation": false,
    "enableMeta": false,
    "onlyAnalogy": false,
    "onlyBinary": false,
    "maxNestedBinaryDepth": 1,
    "removeNegationExplainer": false,
    "nonsenseWordLength": 3,
    "useNonsenseWords": true,
    "garbageWordLength": 3,
    "useGarbageWords": false,
    "useEmoji": false,
    "meaningfulWordNouns": true,
    "meaningfulWordAdjectives": false,
    "overrideDistinctionPremises": null,
    "overrideLinearPremises": null,
    "overrideSyllogismPremises": null,
    "offsetAnalogyPremises": null,
    "overrideBinaryPremises": null,
    "overrideDirectionPremises": null,
    "overrideDirection3DPremises": null,
    "overrideDirection4DPremises": null,
    "overrideAnchorSpacePremises": null,
    "overrideDistinctionTime": null,
    "overrideLinearTime": null,
    "overrideSyllogismTime": null,
    "offsetAnalogyTime": null,
    "overrideBinaryTime": null,
    "overrideDirectionTime": null,
    "overrideDirection3DTime": null,
    "overrideDirection4DTime": null,
    "overrideAnchorSpaceTime": null,
    "overrideDistinctionWeight": 150,
    "overrideLeftRightWeight": 100,
    "overrideTopUnderWeight": 100,
    "overrideComparisonWeight": 100,
    "overrideTemporalWeight": 100,
    "overrideContainsWeight": 100,
    "overrideSyllogismWeight": 100,
    "overrideDirectionWeight": 100,
    "overrideDirection3DWeight": 100,
    "overrideDirection4DWeight": 100,
    "overrideAnchorSpaceWeight": 100,
    "useJunkEmoji": false,
    "useVisualNoise": false,
    "visualNoiseSplits": 5,
    "space2DHardModeLevel": 0,
    "space3DHardModeLevel": 0,
    "space4DHardModeLevel": 0,
    "scrambleFactor": 80,
    "enableConnectionBranching": true,
    "enableTransformSet": true,
    "enableTransformMirror": true,
    "enableTransformScale": true,
    "enableTransformRotate": false,
    "enableTransformInterleave": false,
    "autoProgression": false,
    "autoProgressionGoal": 10,
    "autoProgressionTrailing": 20,
    "autoProgressionPercentSuccess": 90,
    "autoProgressionPercentFail": 65,
    "autoProgressionGrouping": 'separate',
    "spoilerConclusion": false,
    "enableBacktrackingLinear": false,
    "minimalMode": false,
    "dailyProgressGoal": null,
    "weeklyProgressGoal": null,
    "widePremises": false,
    "autoProgressionChange": 'auto',
    "autoProgressionTimeDrop": 5,
    "autoProgressionTimeBump": 5,
};

const defaultSavedata = structuredClone(savedata);

const compressedSettings = {
    "enableDistinction": "dist",
    "enableComparison": "comp",
    "enableSyllogism": "syll",
    "enableAnalogy": "ana",
    "enableDirection": "dir2D",
    "enableDirection3D": "dir3D",
    "enableDirection4D": "dir4D",
    "enableAnchorSpace": "anc",
    "enableBinary": "bin",
    "useMeaningfulWords": "words",
    "enableCarouselMode": "carousel",
    "enableTemporal": "temp",
    "enableNegation": "neg",
    "enableMeta": "meta",
    "onlyAnalogy": "onlyAna",
    "onlyBinary": "onlyBin",
    "maxNestedBinaryDepth": "binDepth",
    "removeNegationExplainer": "negExp",
    "nonsenseWordLength": "nonsenseLen",
    "useNonsenseWords": "nonsense",
    "garbageWordLength": "garbageLen",
    "useGarbageWords": "garbage",
    "useEmoji": "emoji",
    "meaningfulWordNouns": "nouns",
    "meaningfulWordAdjectives": "adjectives",
    "overrideDistinctionPremises": "distP",
    "overrideComparisonPremises": "compP",
    "overrideTemporalPremises": "tempP",
    "overrideSyllogismPremises": "syllP",
    "offsetAnalogyPremises": "anaP",
    "overrideBinaryPremises": "binP",
    "overrideDirectionPremises": "dir2DP",
    "overrideDirection3DPremises": "dir3DP",
    "overrideDirection4DPremises": "dir4DP",
    "overrideAnchorSpacePremises": "ancP",
    "overrideDistinctionTime": "distT",
    "overrideComparisonTime": "compT",
    "overrideTemporalTime": "tempT",
    "overrideSyllogismTime": "syllT",
    "offsetAnalogyTime": "anaT",
    "overrideBinaryTime": "binT",
    "overrideDirectionTime": "dir2DT",
    "overrideDirection3DTime": "dir3DT",
    "overrideDirection4DTime": "dir4DT",
    "overrideAnchorSpaceTime": "ancT",
    "overrideDistinctionWeight": "distW",
    "overrideLeftRightWeight": "lrW",
    "overrideTopUnderWeight": "tuW",
    "overrideComparisonWeight": "compW",
    "overrideTemporalWeight": "tempW",
    "overrideContainsWeight": "contW",
    "overrideSyllogismWeight": "syllW",
    "overrideDirectionWeight": "dir2DW",
    "overrideDirection3DWeight": "dir3DW",
    "overrideDirection4DWeight": "dir4DW",
    "overrideAnchorSpaceWeight": "ancW",
    "useJunkEmoji": "junk",
    "useVisualNoise": "vnoise",
    "visualNoiseSplits": "vsplits",
    "space2DHardModeLevel": "transform2D",
    "space3DHardModeLevel": "transform3D",
    "space4DHardModeLevel": "transform4D",
    "scrambleFactor": "scrambleF",
    "enableConnectionBranching": "branch",
    "enableTransformSet": "tset",
    "enableTransformMirror": "tMirror",
    "enableTransformScale": "tScale",
    "enableTransformRotate": "tRotate",
    "enableTransformInterleave": "tInterleave",
    "autoProgression": "auto",
    "autoProgressionGoal": "goal",
    "autoProgressionTrailing": "autoT",
    "autoProgressionPercentSuccess": "autoS",
    "autoProgressionPercentFail": "autoF",
    "autoProgressionGrouping": 'autoG',
    "autoProgressionChange": 'autoC',
    "autoProgressionTimeDrop": 'autoTD',
    "autoProgressionTimeBump": 'autoTB',
    "spoilerConclusion": "spoiler",
    "enableBacktrackingComparison": "backC",
    "enableBacktrackingTemporal": "backT",
    "enableLinear": "lin",
    "linearWording": 'linW',
    "overrideLinearPremises": "linP",
    "overrideLinearTime": "linT",
    "enableBacktrackingLinear": "backL",
    "minimalMode": "min",
    "dailyProgressGoal": "dGoal",
    "weeklyProgressGoal": "wGoal",
    "widePremises": "wide",
};

const keySettingMap = {
    "p-1": "enableDistinction",
    "p-1-premises": "overrideDistinctionPremises",
    "p-1-time": "overrideDistinctionTime",
    "p-2": "enableLinear",
    "p-2-premises": "overrideLinearPremises",
    "p-2-time": "overrideLinearTime",
    "p-3": "enableSyllogism",
    "p-3-premises": "overrideSyllogismPremises",
    "p-3-time": "overrideSyllogismTime",
    "p-4": "enableAnalogy",
    "p-4-premises": "offsetAnalogyPremises",
    "p-4-time": "offsetAnalogyTime",
    "p-5": "premises",
    "p-6": "enableDirection",
    "p-6-premises": "overrideDirectionPremises",
    "p-6-time": "overrideDirectionTime",
    "p-7": "enableBinary",
    "p-7-premises": "overrideBinaryPremises",
    "p-7-time": "overrideBinaryTime",
    "p-8": "useMeaningfulWords",
    "p-9": "enableCarouselMode",
    "p-11": "enableNegation",
    "p-12": "enableDirection3D",
    "p-12-premises": "overrideDirection3DPremises",
    "p-12-time": "overrideDirection3DTime",
    "p-13": "enableDirection4D",
    "p-13-premises": "overrideDirection4DPremises",
    "p-13-time": "overrideDirection4DTime",
    "p-14": "onlyAnalogy",
    "p-15": "onlyBinary",
    "p-16": "enableMeta",
    "p-17": "maxNestedBinaryDepth",
    "p-18": "removeNegationExplainer",
    "p-19": "nonsenseWordLength",
    "p-20": "useNonsenseWords",
    "p-21": "useEmoji",
    "p-22": "meaningfulWordNouns",
    "p-23": "meaningfulWordAdjectives",
    "p-26": "garbageWordLength",
    "p-27": "useGarbageWords",
    "p-28": "useJunkEmoji",
    "p-29": "space2DHardModeLevel",
    "p-30": "space3DHardModeLevel",
    "p-31": "scrambleFactor",
    "p-32": "enableConnectionBranching",
    "p-33": "space4DHardModeLevel",
    "p-34": "enableTransformSet",
    "p-35": "enableTransformMirror",
    "p-36": "enableTransformScale",
    "p-37": "enableTransformRotate",
    "p-38": "useVisualNoise",
    "p-39": "visualNoiseSplits",
    "p-40": "enableTransformInterleave",
    "p-41": "autoProgression",
    "p-42": "autoProgressionGoal",
    "p-43": "enableAnchorSpace",
    "p-44-premises": "overrideAnchorSpacePremises",
    "p-45-time": "overrideAnchorSpaceTime",
    "p-46": "spoilerConclusion",
    "p-47": "enableBacktrackingLinear",
    "p-48": "minimalMode",
    "p-49": "autoProgressionTrailing",
    "p-50": "autoProgressionPercentSuccess",
    "p-51": "autoProgressionPercentFail",
    "p-52": "autoProgressionGrouping",
    "p-53": "overrideDistinctionWeight",
    "p-54": "overrideLeftRightWeight",
    "p-55": "overrideTopUnderWeight",
    "p-56": "overrideComparisonWeight",
    "p-57": "overrideTemporalWeight",
    "p-58": "overrideSyllogismWeight",
    "p-59": "overrideDirectionWeight",
    "p-60": "overrideDirection3DWeight",
    "p-61": "overrideDirection4DWeight",
    "p-62": "overrideAnchorSpaceWeight",
    "p-63-optional": "dailyProgressGoal",
    "p-64-optional": "weeklyProgressGoal",
    "p-65": "overrideContainsWeight",
    "p-66": "widePremises",
    "p-67": "autoProgressionChange",
    "p-68": "autoProgressionTimeDrop",
    "p-69": "autoProgressionTimeBump",
};

const legacySettings = [
    "enableDirection4D",
    "enableAnchorSpace",
    "enableBinary",
    "enableCarouselMode",
    "enableNegation",
    "enableMeta",
    "onlyAnalogy",
    "onlyBinary",
    "maxNestedBinaryDepth",
    "removeNegationExplainer",
    "offsetAnalogyPremises",
    "overrideBinaryPremises",
    "overrideDirection4DPremises",
    "overrideAnchorSpacePremises",
    "offsetAnalogyTime",
    "overrideBinaryTime",
    "overrideDirection4DTime",
    "overrideAnchorSpaceTime",
    "overrideDirection4DWeight",
    "overrideAnchorSpaceWeight",
    "space2DHardModeLevel",
    "space3DHardModeLevel",
    "space4DHardModeLevel",
    "enableTransformSet",
    "enableTransformMirror",
    "enableTransformScale",
    "enableTransformRotate",
    "enableTransformInterleave",
];

const validRules = [
    "0001",
    "1011",
    "0221",
    "1231",
    "0021",
    "1031",
    "0112",
    "1012",
    "1232",
    "0332",
    "0132",
    "1032",
    "0223",
    "2023",
    "3033",
    "1233",
    "0023",
    "1033",
    "0114",
    "2024",
    "1234",
    "0134",
    "1034",
    "0024"
];

// This seems such a stupid idea but it opens the possibility of variants
const forms = [
    [
        'All <span class="subject">$</span> is <span class="subject">$</span>',
        'No <span class="subject">$</span> is <span class="subject">$</span>',
        'Some <span class="subject">$</span> is <span class="subject">$</span>',
        'Some <span class="subject">$</span> is not <span class="subject">$</span>'
    ],
    [
        '<span class="is-negated">No</span> <span class="subject">$</span> is <span class="subject">$</span>',
        '<span class="is-negated">All</span> <span class="subject">$</span> is <span class="subject">$</span>',
        'Some <span class="subject">$</span> <span class="is-negated">is not</span> <span class="subject">$</span>',
        'Some <span class="subject">$</span> <span class="is-negated">is</span> <span class="subject">$</span>'
    ],
];

const dirCoords = [
    [ 0,  0],
    [ 0,  1],
    [ 1,  1],
    [ 1,  0],
    [ 1, -1],
    [ 0, -1],
    [-1, -1],
    [-1,  0],
    [-1,  1]
];

const dirString = (x, y, z) => {
    let str = '';
    if (z === 1) str = 'Above';
    if (z === -1) str = 'Below';
    if (z && (x || y)) str += ' and ';
    if (y === 1) str += 'North';
    if (y === -1) str += 'South';
    if (y && x) str += '-';
    if (x === 1) str += 'East';
    if (x === -1) str += 'West';
    return str;
}

const dirStringFromCoord = (coord) => {
    return dirString.apply(null, coord);
}

function twoDToArrow(coord) {
    const arrowMap = {
        "1,0": `<i class="ci-Arrow_Left_MD"></i>`,
        "1,1": `<i class="ci-Arrow_Down_Left_MD"></i>`,
        "1,-1": `<i class="ci-Arrow_Up_Left_MD"></i>`,
        "0,1": `<i class="ci-Arrow_Down_LG"></i>`,
        "0,-1": `<i class="ci-Arrow_Up_LG"></i>`,
        "-1,0": `<i class="ci-Arrow_Right_LG"></i>`,
        "-1,1": `<i class="ci-Arrow_Down_Right_LG"></i>`,
        "-1,-1": `<i class="ci-Arrow_Up_Right_LG"></i>`,
    };

    return arrowMap[coord.slice(0, 2).join(",")] || '<i class="ci-Wifi_None"></i>';
}

function threeDToTriangle(coord) {
    if (coord.length < 3) {
        return '';
    }

    if (coord[2] === 1) {
        return '▼';
    } else if (coord[2] === -1) {
        return '▲';
    } else {
        return '<i class="ci-Wifi_None"></i>';
    }
}

function fourDToArrow(coord) {
    if (coord.length < 4) {
        return '';
    }

    if (coord[3] === 1) {
        return '◀';
    } else if (coord[3] === -1) {
        return '▶';
    } else {
        return '<i class="ci-Wifi_None"></i>';
    }
}

const dirStringMinimal = (coord) => {
    let str = '';
    str += fourDToArrow(coord);
    str += threeDToTriangle(coord);
    str += twoDToArrow(coord);
    return str;
}

const dirCoords3D = [];
const dirNames3D = [];
const nameInverseDir3D = {};

const xs = Array(3).fill(0).map((_, i) => i-1)
xs.map(x =>
    xs.map(y =>
        xs.map(z => {
            if (x === 0 && y === 0 && z === 0) return;
            dirCoords3D.push([ x, y, z ]);
            dirNames3D.push(dirString(x, y, z));
            nameInverseDir3D[dirString(x, y, z)] = dirString(-x, -y, -z);
        })
    )
);

const dirCoords4D = [];
xs.map(x =>
    xs.map(y =>
        xs.map(z => {
            xs.map(time => {
                if (x === 0 && y === 0 && z === 0 && time === 0) return;
                dirCoords4D.push([ x, y, z, time ]);
            })
        })
    )
);

const timeMapping = {
    [-1]: 'was',
    [0]: 'is',
    [1]: 'will be'
}
const reverseTimeNames = {
    'was': 'will be',
    'is': 'is',
    'will be': 'was'
}

const dimensionNames = {
    [0]: 'X',
    [1]: 'Y',
    [2]: 'Z',
    [3]: 'T'
}
