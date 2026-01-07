let currentSpinnerElement = null;

function showSpinner(targetElement = null, message = 'Carregando...') {
  const container = targetElement || document.body;
  
  if (currentSpinnerElement) {
    currentSpinnerElement.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'spinner-overlay';
  overlay.id = 'spinner-overlay';
  
  // SEMPRE usar position: fixed para garantir centralização na viewport inteira
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: rgba(10, 10, 10, 0.95);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 999999;
    animation: spinnerFadeIn 0.3s ease;
  `;
  
  // Container do spinner com efeito de brilho
  const spinnerContainer = document.createElement('div');
  spinnerContainer.style.cssText = `
    position: relative;
    width: 60px;
    height: 60px;
  `;
  
  // Círculo externo com gradiente
  const spinnerOuter = document.createElement('div');
  spinnerOuter.style.cssText = `
    position: absolute;
    width: 60px;
    height: 60px;
    border: 3px solid rgba(253, 138, 36, 0.1);
    border-radius: 50%;
    box-sizing: border-box;
  `;
  
  // Spinner principal
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.style.cssText = `
    position: absolute;
    width: 60px;
    height: 60px;
    border: 4px solid transparent;
    border-top: 4px solid #FD8A24;
    border-right: 4px solid #FD8A24;
    border-radius: 50%;
    animation: spinnerRotate 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    box-sizing: border-box;
  `;
  
  // Ícone central (bola de futebol)
  const iconCenter = document.createElement('div');
  iconCenter.innerHTML = '<i class="fas fa-futbol"></i>';
  iconCenter.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #FD8A24;
    font-size: 20px;
    animation: spinnerPulse 1.5s ease-in-out infinite;
  `;
  
  // Texto de carregamento
  const loadingText = document.createElement('div');
  loadingText.textContent = message;
  loadingText.style.cssText = `
    color: rgba(224, 224, 224, 0.9);
    font-family: 'Google Sans Flex', 'Rubik', sans-serif;
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-align: center;
  `;
  
  // Adicionar estilos de animação
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spinnerFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes spinnerRotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes spinnerPulse {
      0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
    }
  `;
  
  spinnerContainer.appendChild(spinnerOuter);
  spinnerContainer.appendChild(spinner);
  spinnerContainer.appendChild(iconCenter);
  
  overlay.appendChild(styleSheet);
  overlay.appendChild(spinnerContainer);
  overlay.appendChild(loadingText);
  container.appendChild(overlay);
  currentSpinnerElement = overlay;
}

function hideSpinner() {
  if (currentSpinnerElement) {
    // Animação de saída suave
    currentSpinnerElement.style.animation = 'spinnerFadeIn 0.2s ease reverse';
    setTimeout(() => {
      if (currentSpinnerElement) {
        currentSpinnerElement.remove();
        currentSpinnerElement = null;
      }
    }, 200);
  }
}

export { showSpinner, hideSpinner }
