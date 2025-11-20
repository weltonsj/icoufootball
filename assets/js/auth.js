document.addEventListener('DOMContentLoaded', () => {
  const modeToggle = document.getElementById('mode-toggle');
  const registerFieldsContainer = document.getElementById('register-fields');
  const loginSubmitButton = document.getElementById('login-submit');
  const registerUsername = document.getElementById('register-username');
  const registerConfirm = document.getElementById('register-confirm');
  const loginForm = document.getElementById('login-form');

  // Early exit if essential elements are not found
  if (!modeToggle || !registerFieldsContainer || !loginSubmitButton || !loginForm) {
    console.error('Auth script could not find one or more essential elements.');
    return;
  }

  modeToggle.addEventListener('change', () => {
    const isRegisterMode = modeToggle.checked;

    if (isRegisterMode) {
      // Switch to Register mode
      registerFieldsContainer.style.display = 'block';
      loginSubmitButton.textContent = 'REGISTRAR';
      // Make registration fields required
      registerUsername.required = true;
      registerConfirm.required = true;
    } else {
      // Switch to Login mode
      registerFieldsContainer.style.display = 'none';
      loginSubmitButton.textContent = 'ENTRAR';
      // Remove requirement from registration fields
      registerUsername.required = false;
      registerConfirm.required = false;
    }
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const isRegisterMode = modeToggle.checked;
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (isRegisterMode) {
      // Handle registration logic
      const username = registerUsername.value;
      const confirmPassword = registerConfirm.value;
      console.log('Attempting to register:', { email, password, username, confirmPassword });
      // TODO: Implement Firebase registration logic here
      if (password !== confirmPassword) {
        // Handle password mismatch
        const errEl = document.getElementById('login-error-message');
        if (errEl) { 
          errEl.textContent = 'As senhas não correspondem.';
          errEl.style.display = 'block';
          setTimeout(() => { errEl.style.display = 'none'; }, 3000);
        }
        return;
      }
      // Placeholder for actual registration
      alert('Funcionalidade de registro ainda não implementada.');

    } else {
      // Handle login logic
      console.log('Attempting to log in:', { email, password });
      // TODO: Implement Firebase login logic here
       alert('Funcionalidade de login ainda não implementada.');
    }
  });

  // Set initial state based on the toggle's default state (unchecked)
  registerFieldsContainer.style.display = 'none';
  loginSubmitButton.textContent = 'ENTRAR';
  registerUsername.required = false;
  registerConfirm.required = false;
});