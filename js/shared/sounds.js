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
