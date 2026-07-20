const DEFAULT_SOUNDS = {
    success: { audio: new Audio('sounds/default/success.mp3'), time: 2000},
    failure: { audio: new Audio('sounds/default/failure.mp3'), time: 1400},
    missed: { audio: new Audio('sounds/default/missed.mp3'), time: 1400},
}

const ZEN_SOUNDS = {
    success: { audio: new Audio('sounds/zen/success.mp3'), time: 2000 },
    failure: { audio: new Audio('sounds/zen/failure.mp3'), time: 1400 },
    missed: { audio: new Audio('sounds/zen/missed.mp3'), time: 1400 },
}

function playSoundFor(sound, duration) {
    sound.currentTime = 0;
    sound.volume = 0.6;
    sound.play();

    setTimeout(() => {
        let fadeOut = setInterval(() => {
            if (sound.volume > 0.10) {
                sound.volume -= 0.10;
            } else {
                clearInterval(fadeOut);
                sound.pause();
                sound.currentTime = 0;
                sound.volume = 0.6;
            }
        }, 100);
    }, duration - 600);
}

// iOS Safari only allows programmatic play() on elements that have started
// once inside a user gesture. Success/failure fire on answer taps (a
// gesture), but the missed sound fires from the question timer - so unlock
// every clip muted during the first tap/keypress on the page.
let cvSfxUnlocked = false;
function cvUnlockSounds() {
    if (cvSfxUnlocked) return;
    cvSfxUnlocked = true;
    for (const pack of [DEFAULT_SOUNDS, ZEN_SOUNDS]) {
        for (const { audio } of Object.values(pack)) {
            audio.muted = true;
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
                audio.muted = false;
            }).catch(() => {
                audio.muted = false;
                cvSfxUnlocked = false; // no gesture credit - retry next input
            });
        }
    }
}
document.addEventListener('pointerdown', cvUnlockSounds);
document.addEventListener('keydown', cvUnlockSounds);

function getCurrentSoundPack() {
    if (appState.sfx === 'sfx1') {
        return DEFAULT_SOUNDS;
    } else if (appState.sfx === 'sfx2') {
        return ZEN_SOUNDS;
    }
    return null;
}

function playSound(property) {
    const sounds = getCurrentSoundPack();
    if (sounds) {
        playSoundFor(sounds[property].audio, sounds[property].time);
    }
}
