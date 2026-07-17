const errorPopup = document.getElementById('error-popup');
const errorMessage = document.getElementById('error-message');
const errorStack = document.getElementById('error-stack');
const closePopupButton = document.getElementById('error-close-popup');

function showErrorPopup(message, stack) {
  errorMessage.textContent = message;
  errorStack.value = stack;
  errorPopup.style.display = 'flex';
}

function hideErrorPopup() {
  errorPopup.style.display = 'none';
}

window.onerror = function (message, source, lineno, colno, error) {
  const errorDetails = `Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}`;
  const stackTrace = error ? error.stack : 'No stack trace available.';
  showErrorPopup(errorDetails, stackTrace);
};

// window.onerror does NOT catch promise rejections: without this, a failed
// async path (e.g. Quad Box audio) fails silently and can strand the page.
window.addEventListener('unhandledrejection', function (event) {
  const reason = event.reason;
  showErrorPopup(`Error: ${reason?.message ?? String(reason)}`,
                 reason?.stack ?? 'No stack trace available.');
});

closePopupButton.addEventListener('click', hideErrorPopup);
