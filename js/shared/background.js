// Apply the profile's saved background image to .background-image.
// For pages without rrt's upload/refresh pipeline (menu, n-back) - read-only.
async function applySavedBackground() {
    const div = document.querySelector('.background-image');
    if (!div || !appState.backgroundImage) return;
    const base64 = await getImage(imageKey);
    if (base64) div.style.backgroundImage = `url(${base64})`;
}
