# 🚀 Guia Rápido - Como Usar

## Para Desenvolvedores

### 1. Entender o Flow de Autenticação

```javascript
// Quando a página carrega:
// src/app.js → initAuthManager()
//    └─ Registra listener Firebase
//       └─ Monitora mudanças de autenticação

// Quando usuário faz login:
// Firebase Auth → onAuth() callback
//    └─ authManager busca role no Firestore
//       └─ updateMenuVisibility() ajusta menu
```

### 2. Adicionar Novo Item ao Menu

Se você quiser adicionar um novo item ao menu:

**Passo 1: Adicione no index.html**
```html
<a href="./src/pages/newpage.html" id="navNewpage" class="nav-item hidden">New Page</a>
```

**Passo 2: Atualize authManager.js**
```javascript
const NAV_ITEMS = {
  home: 'navHome',
  // ... outros items
  newpage: 'navNewpage',  // ← Adicione aqui
  logout: 'btnLogout'
};
```

**Passo 3: Configure a visibilidade em updateMenuVisibility()**
```javascript
const navNewpage = getNavElement('newpage');

if (role === 'Admin') {
  navNewpage && navNewpage.classList.remove('hidden'); // ← Adicione
} else {
  navNewpage && navNewpage.classList.add('hidden');
}
```

### 3. Modificar Controle de Acesso

**Exemplo: Novo papel de usuário "Moderador"**

```javascript
// Em authManager.js → updateMenuVisibility()

else if (role === 'Moderador') {
  // Mostra: Home, Dashboard, Chat, Sair
  navHome && navHome.classList.remove('hidden');
  navLogin && navLogin.classList.add('hidden');
  navDashboard && navDashboard.classList.remove('hidden');
  navMatches && navMatches.classList.add('hidden');
  navChat && navChat.classList.remove('hidden');
  navProfile && navProfile.classList.add('hidden');
  navAdmin && navAdmin.classList.add('hidden');
  btnLogout && btnLogout.classList.remove('hidden');
}
```

### 4. Customizar Estilo Active

O estilo é definido em `assets/css/main.css`:

```css
.nav-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--highlight-color);  /* Laranja #FD8A24 */
}
```

Para mudar a cor ou estilo:
```css
/* Opção 1: Mudar cor */
background-color: #FF0000; /* Vermelho */

/* Opção 2: Mudar altura */
height: 3px; /* Mais grosso */

/* Opção 3: Adicionar efeito */
box-shadow: 0 0 10px var(--highlight-color);
transition: all 0.3s ease;
```

---

## Para Testadores

### Teste 1: Verificar Menu Sem Login

```
1. Abra http://localhost:3000 (ou seu servidor)
2. Verifique se vê apenas:
   - Home
   - Login
3. Verifique se NÃO vê:
   - Dashboard
   - Partidas
   - Chat
   - Perfil
   - Admin
   - Sair
```

### Teste 2: Fazer Login como Jogador

```
1. Clique em "Login"
2. Insira credenciais de Jogador
3. Clique "Entrar"
4. Verifique se agora vê:
   - Home
   - Dashboard
   - Partidas
   - Chat
   - Perfil
   - Sair
5. Verifique se NÃO vê:
   - Login (desapareceu)
   - Admin (oculto para Jogador)
```

### Teste 3: Active Class em Navegação

```
1. Clique em "Dashboard"
   ✓ Deve haver um sublinhado laranja sob "Dashboard"
   ✓ Conteúdo muda para Dashboard
   
2. Clique em "Partidas"
   ✓ Sublinhado move para "Partidas"
   
3. Clique em "Home"
   ✓ Sublinhado volta para "Home"
   
4. Recarregue a página (F5)
   ✓ Sublinhado continua na mesma página
```

### Teste 4: Logout Completo

```
1. Estando logado como Jogador
2. Clique em "Sair"
3. Verifique:
   ✓ Modal aparece: "Deseja sair da sua conta?"
   ✓ Botões [Cancelar] e [Confirmar]
   
4. Clique "Confirmar"
5. Verifique:
   ✓ Spinner aparece
   ✓ Modal: "Sessão encerrada"
   ✓ Redireciona para Home
   ✓ Menu volta a "não autenticado" (só Home e Login visíveis)
```

### Teste 5: Login como Admin

```
1. Faça login com conta Admin
2. Verifique se agora vê:
   - Home
   - Dashboard
   - Partidas
   - Chat
   - Perfil
   - Admin ← NOVO (só para Admin)
   - Sair
3. Clique em "Admin"
   ✓ Deve carregar página de Admin
   ✓ Sublinhado sob "Admin"
```

### Teste 6: Teste de Cancelamento

```
1. Clique em "Sair"
2. Modal aparece
3. Clique "Cancelar"
   ✓ Modal fecha
   ✓ Continua logado
   ✓ Menu mantém os itens visíveis
```

### Teste 7: Browser Back/Forward

```
1. Navegue: Home → Dashboard → Partidas
2. Clique Back no navegador
   ✓ Volta para Dashboard
   ✓ Sublinhado atualiza corretamente
   
3. Clique Forward
   ✓ Volta para Partidas
   ✓ Sublinhado atualiza corretamente
```

---

## Problemas Comuns & Soluções

### Problema 1: Menu não muda após login

**Causa:** Firebase Auth não está inicializado
**Solução:**
```javascript
// Verifique em src/services/firebase.js
// Se a config está correta e exportada

// Teste no console:
// firebase.auth().currentUser
```

### Problema 2: Admin não aparece mesmo sendo Admin

**Causa:** Role 'Admin' não está no Firestore
**Solução:**
```javascript
// Verifique Firestore > users > [userId]
// Campo 'funcao' deve ter valor 'Admin' (exato)
// NÃO use 'admin', 'ADMIN', 'Administrador'
```

### Problema 3: Spinner não desaparece

**Causa:** hideSpinner() não está sendo chamado
**Solução:**
```javascript
// Verifique route.js linha 64
// hideSpinner() deve estar no setTimeout
// Se não estiver, adicione:
setTimeout(() => {
  target.classList.remove("fade-in");
  hideSpinner(); // ← Deve estar aqui
}, 400);
```

### Problema 4: Classe active não aparece

**Causa:** CSS não está carregando
**Solução:**
```css
/* Verifique em assets/css/main.css */
.nav-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--highlight-color);
}

/* Se não aparece, adicione debugging no console */
document.querySelector('.nav-item.active')
// Deve retornar elemento
```

### Problema 5: Logout não funciona

**Causa:** Listener não está registrado ou Modal falha
**Solução:**
```javascript
// Verifique em authManager.js
// btnLogout listener deve estar ativo
const btnLogout = getNavElement('logout');
if (btnLogout) {
  // Listener deve estar aqui
}

// Teste no console:
document.getElementById('btnLogout').addEventListener('click', () => {
  console.log('Logout clicado'); // Deve aparecer
});
```

---

## Checklist de Validação

- [ ] Página carrega sem erros no console
- [ ] Menu aparece (apenas Home e Login se não logado)
- [ ] Criar conta funciona
- [ ] Login funciona
- [ ] Dashboard aparece após login
- [ ] Admin aparece apenas para Admin
- [ ] Sublinhado laranja em "Home" inicialmente
- [ ] Sublinhado muda ao clicar em outro link
- [ ] Clique em "Sair" mostra confirmação
- [ ] Confirmar "Sair" mostra spinner
- [ ] Após logout volta para Home
- [ ] Menu volta a mostrar apenas Home e Login
- [ ] Recarregar página mantém estado de login
- [ ] Back/Forward navegação funciona

---

## Console Debugging

```javascript
// Verificar usuário atual
console.log(getCurrentUser());

// Verificar role atual
console.log(getCurrentRole());

// Verificar elementos do menu
Object.values(NAV_ITEMS).forEach(id => {
  console.log(`${id}:`, document.getElementById(id));
});

// Verificar classes hidden
document.querySelectorAll('.hidden').forEach(el => {
  console.log('Hidden:', el.id || el.textContent);
});

// Forçar atualizar menu (para debug)
updateMenuVisibility(getCurrentUser(), getCurrentRole());
```

---

## Links Úteis

- **Documentação Técnica:** `docs/FEATURES_IMPLEMENTED.md`
- **Arquitetura:** `docs/ARCHITECTURE.md`
- **Checklist:** `IMPLEMENTATION_CHECKLIST.md`
- **PRD:** `docs/PRD_iCouFootball.md`

---

## Suporte Rápido

**Se algo não funciona:**

1. Abra o Console (F12)
2. Procure por erros em vermelho
3. Copie a mensagem de erro
4. Procure em ARCHITECTURE.md pela solução
5. Se não encontrar, verifique:
   - Firebase está inicializado?
   - Firestore tem dados corretos?
   - HTML IDs estão corretos?

---

✨ **Sistema pronto e funcionando!** ✨

