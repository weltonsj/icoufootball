# 🏗️ Arquitetura do Sistema - Controle de Acesso e Navegação

## Fluxo Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     APP INITIALIZATION                           │
│                        (index.html)                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      src/app.js                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. initAuthManager()                                       │  │
│  │    - Registra listener Firebase                           │  │
│  │    - Inicia gerenciamento de autenticação                 │  │
│  │                                                             │  │
│  │ 2. renderPages(initialRoute)                              │  │
│  │    - Renderiza página inicial                             │  │
│  │                                                             │  │
│  │ 3. setupRouter()                                          │  │
│  │    - Configura listeners de navegação                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌─────────────────────┐ ┌────────────────────┐ ┌──────────────────┐
│  authManager.js     │ │   route.js         │ │  Firebase Auth   │
│  ┌───────────────┐  │ │  ┌──────────────┐  │ │  ┌────────────┐  │
│  │ onAuth()      │  │ │  │ renderPages()│  │ │  │ onAuth()   │  │
│  │ updateMenu()  │  │ │  │ setActive()  │  │ │  │ signOut()  │  │
│  │ setActive()   │  │ │  │ setupRouter()│  │ │  │            │  │
│  │ logout()      │  │ │  └──────────────┘  │ │  └────────────┘  │
│  └───────────────┘  │ │                    │ │                  │
└─────────────────────┘ └────────────────────┘ └──────────────────┘
```

---

## Ciclo de Vida - Não Autenticado

```
┌─ PÁGINA CARREGA
│  └─ initAuthManager()
│     └─ Listener Firebase ativa
│        └─ user = null
│           └─ updateMenuVisibility(null)
│              │
│              ├─ Home ✅ (visível)
│              ├─ Login ✅ (visível)
│              ├─ Dashboard ❌ (hidden)
│              ├─ Partidas ❌ (hidden)
│              ├─ Chat ❌ (hidden)
│              ├─ Perfil ❌ (hidden)
│              ├─ Admin ❌ (hidden)
│              └─ Sair ❌ (hidden)
│
└─ ESTADO: Não Autenticado
```

---

## Ciclo de Vida - Login (Jogador)

```
┌─ USUÁRIO FOCA LOGIN
│  └─ Firebase valida credenciais
│     └─ signInWithEmailAndPassword()
│        └─ Listener Firebase dispara
│           └─ user = { uid, email, ... }
│              │
│              ├─ Busca profile no Firestore
│              │  └─ role = 'Jogador'
│              │
│              └─ updateMenuVisibility(user, 'Jogador')
│                 │
│                 ├─ Home ✅ (visível)
│                 ├─ Login ❌ (hidden)
│                 ├─ Dashboard ✅ (visível)
│                 ├─ Partidas ✅ (visível)
│                 ├─ Chat ✅ (visível)
│                 ├─ Perfil ✅ (visível)
│                 ├─ Admin ❌ (hidden)
│                 └─ Sair ✅ (visível)
│
└─ ESTADO: Autenticado como Jogador
```

---

## Ciclo de Vida - Login (Admin)

```
┌─ USUÁRIO FOCA LOGIN
│  └─ Firebase valida credenciais
│     └─ signInWithEmailAndPassword()
│        └─ Listener Firebase dispara
│           └─ user = { uid, email, ... }
│              │
│              ├─ Busca profile no Firestore
│              │  └─ role = 'Admin'
│              │
│              └─ updateMenuVisibility(user, 'Admin')
│                 │
│                 ├─ Home ✅ (visível)
│                 ├─ Login ❌ (hidden)
│                 ├─ Dashboard ✅ (visível)
│                 ├─ Partidas ✅ (visível)
│                 ├─ Chat ✅ (visível)
│                 ├─ Perfil ✅ (visível)
│                 ├─ Admin ✅ (visível) ← NOVO
│                 └─ Sair ✅ (visível)
│
└─ ESTADO: Autenticado como Admin
```

---

## Ciclo de Vida - Navegação com Active Class

```
┌─ USUÁRIO CLICA EM "Dashboard"
│  └─ setupRouter() captura evento
│     └─ e.preventDefault()
│     └─ renderPages('dashboard')
│        │
│        ├─ Mostra spinner
│        ├─ Fade-out em 300ms
│        │
│        ├─ Renderiza conteúdo
│        ├─ Carrega CSS dinâmico
│        ├─ Carrega JS dinâmico
│        │
│        ├─ Fade-in em 400ms
│        ├─ Esconde spinner
│        │
│        └─ setActiveNavItem('dashboard')
│           │
│           ├─ Remove 'active' de todos os links
│           └─ Adiciona 'active' ao link Dashboard
│              └─ CSS mostra sublinhado laranja
│
└─ RESULTADO VISUAL
   │
   ├─ Página Dashboard carregada
   └─ Menu: "Home | Dashboard← | Partidas | ..."
            ↑ sublinhado laranja
```

---

## Ciclo de Vida - Logout

```
┌─ USUÁRIO CLICA EM "Sair"
│  └─ authManager captura evento
│     └─ e.preventDefault()
│     └─ showConfirmModal('Encerrar sessão?')
│        │
│        ├─ Se "Cancelar"
│        │  └─ Fecha modal, continua logado
│        │
│        └─ Se "Confirmar"
│           │
│           ├─ showSpinner()
│           ├─ logout() ← Firebase signOut()
│           │  │
│           │  ├─ sessionStorage.clear()
│           │  ├─ localStorage.removeItem()
│           │  └─ Aguarda conclusão
│           │
│           ├─ hideSpinner()
│           ├─ showModal('success', 'Sessão encerrada')
│           │
│           ├─ setTimeout 800ms
│           │
│           └─ window.location = '#homepage'
│              └─ Listener Firebase dispara
│                 └─ user = null
│                    └─ updateMenuVisibility(null)
│                       └─ Menu volta ao estado inicial
│
└─ RESULTADO VISUAL
   │
   ├─ Spinner desaparece
   ├─ Modal de sucesso
   ├─ Redireciona para Home
   └─ Menu: "Home | Login | ..." (apenas não autenticado)
```

---

## Estrutura de Componentes

```
index.html
├─ Header
│  └─ main-nav (Navigation)
│     ├─ navHome          (id, não pode remover)
│     ├─ navLogin         (id, varia com auth)
│     ├─ navDashboard     (id, varia com auth)
│     ├─ navMatches       (id, varia com auth)
│     ├─ navChat          (id, varia com auth)
│     ├─ navProfile       (id, varia com auth)
│     ├─ navAdmin         (id, varia com auth + role)
│     └─ btnLogout        (id, varia com auth)
│
├─ Main (app-content)
│  └─ Conteúdo renderizado dinamicamente
│
└─ Footer
```

---

## Fluxo de Data - Autenticação

```
USER INPUT
   │
   ▼
Firebase Auth
   │
   ├─ Valida credenciais
   ├─ Cria sessão
   └─ Dispara onAuth()
      │
      ▼
   authManager.js
      │
      ├─ Recebe user object
      ├─ Busca profile no Firestore
      └─ Extrai role
         │
         ▼
      updateMenuVisibility(user, role)
         │
         ├─ Iteração sobre NAV_ITEMS
         └─ Add/remove classe 'hidden'
            │
            ▼
         DOM atualizado
            │
            ▼
         MENU VISÍVEL AO USUÁRIO
```

---

## Estado Local do authManager

```
authManager.js (Escopo Global)
│
├─ currentUser
│  └─ Null ou { uid, email, ... }
│
├─ currentRole
│  └─ Null, 'Jogador', ou 'Admin'
│
├─ NAV_ITEMS
│  └─ Mapa de IDs dos elementos
│
└─ Funções Exportadas
   ├─ initAuthManager()
   ├─ updateMenuVisibility()
   ├─ setActiveNavItem()
   ├─ getCurrentUser()
   └─ getCurrentRole()
```

---

## Fluxo de Classe Active

```
setupRouter()
   │
   ├─ Listener 'click'
   ├─ Extrai rota do href
   └─ renderPages(route)
      │
      └─ Após renderizar
         │
         ▼
      setActiveNavItem(route)
         │
         ├─ Loop sobre NAV_ITEMS
         ├─ Remove 'active' de todos
         │
         └─ Encontra match com route
            │
            ├─ 'homepage' → navHome
            ├─ 'dashboard' → navDashboard
            ├─ 'matches' → navMatches
            └─ Adiciona 'active' ao match
               │
               ▼
            CSS: .nav-item.active::after
               └─ Sublinhado laranja
```

---

## Matriz de Permissões

```
                 ANÔNIMO  JOGADOR  ADMIN
┌────────────────────────────────────────┐
│ Home             ✅       ✅       ✅   │
│ Login            ✅       ❌       ❌   │
│ Dashboard        ❌       ✅       ✅   │
│ Partidas         ❌       ✅       ✅   │
│ Chat             ❌       ✅       ✅   │
│ Perfil           ❌       ✅       ✅   │
│ Admin            ❌       ❌       ✅   │ ← ÚNICO POR ROLE
│ Sair (Logout)    ❌       ✅       ✅   │
└────────────────────────────────────────┘
```

---

## Tratamento de Erros

```
initAuthManager()
   │
   ├─ onAuth()
   │  └─ Error: Firebase não inicializado
   │     └─ Console: erro, sem crash
   │
   ├─ getUser()
   │  └─ Error: Firestore indisponível
   │     └─ Role default: 'Jogador'
   │
   ├─ logout()
   │  └─ Error: logout falhou
   │     └─ showModal('error', ...)
   │
   └─ setActiveNavItem()
      └─ Error: elemento não encontrado
         └─ Silencioso (verificação com &&)
```

---

## Performance

```
initAuthManager()
   │
   ├─ Listeners registrados UMA VEZ
   ├─ Não duplica listeners
   ├─ Sem polling
   │
   └─ Event-driven (Só reage a mudanças)
      │
      ├─ Firebase onAuth() → Uma chamada
      ├─ Click em link → Uma renderização
      └─ Logout → Uma sequência

Resultado: ⚡ Rápido e eficiente
```

---

✨ Arquitetura robusta, segura e performática! ✨

