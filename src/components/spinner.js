let currentSpinnerElement = null;

function showSpinner(targetElement = null) {
  const container = targetElement || document.body;
  
  if (currentSpinnerElement) {
    currentSpinnerElement.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'spinner-overlay';
  overlay.id = 'spinner-overlay';
  overlay.style.position = container === document.body ? 'fixed' : 'absolute';
  overlay.style.inset = '0';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.backgroundColor = 'rgba(26, 26, 26, 0.7)';
  overlay.style.zIndex = '9999';
  
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.style.width = '40px';
  spinner.style.height = '40px';
  spinner.style.border = '4px solid rgba(253, 138, 24, 0.2)';
  spinner.style.borderTop = '4px solid #FD8A24';
  spinner.style.borderRadius = '50%';
  spinner.style.animation = 'spin 0.8s linear infinite';
  
  overlay.appendChild(spinner);
  container.appendChild(overlay);
  currentSpinnerElement = overlay;
}

function hideSpinner() {
  if (currentSpinnerElement) {
    currentSpinnerElement.remove();
    currentSpinnerElement = null;
  }
}

export { showSpinner, hideSpinner }
