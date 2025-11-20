import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';

function handleLogin(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      const errEl = document.getElementById('login-error-message');
      if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
      window.location.href = '/pages/dashboard.html';
    })
    .catch(() => {
      const errEl = document.getElementById('login-error-message');
      if (errEl) { errEl.textContent = 'E-mail ou senha inválidos'; errEl.style.display = 'block'; setTimeout(()=>{ errEl.style.display = 'none'; }, 3000); }
    });
}

function initAuthListeners() {
  const form = document.getElementById('login-form');
  const toggle = document.getElementById('mode-toggle');
  const submitBtn = document.getElementById('login-submit');
  const registerFields = document.querySelectorAll('.register-only');
  if (!form) return;
  if (toggle && submitBtn && registerFields.length) {
    const applyMode = () => {
      const isRegister = toggle.checked;
      registerFields.forEach(el => { el.style.display = isRegister ? 'block' : 'none'; });
      submitBtn.textContent = isRegister ? 'CRIAR CONTA' : 'ENTRAR';
    };
    toggle.addEventListener('change', applyMode);
    applyMode();
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const isRegister = Boolean(document.getElementById('mode-toggle')?.checked);
    const email = /** @type {HTMLInputElement} */(document.getElementById('login-email')).value.trim();
    const password = /** @type {HTMLInputElement} */(document.getElementById('login-password')).value;
    if (isRegister) {
      window.location.href = '/pages/register.html';
      return;
    }
    handleLogin(email, password);
  });
}

document.addEventListener('DOMContentLoaded', initAuthListeners);

export { initAuthListeners, handleLogin };