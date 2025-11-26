// Quando o Service Worker é instalado pela primeira vez, esse evento é disparado.
// Aqui abrimos um cache chamado 'icoufootball-v1' e adicionamos todos os arquivos
// essenciais do app (HTML, CSS) para que possam ser acessados offline.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('icoufootball-v1')
      .then(cache => cache.addAll([
        '/',
        '/index.html',
        '/pages/login.html',
        '/pages/dashboard.html',
        '/pages/admin.html',
        '/pages/history.html',
        '/pages/matches.html',
        '/pages/standings.html',
        '/assets/css/main.css',
        '/assets/css/components.css',
        '/assets/css/theme.css'
      ]))
  );
});

// Quando o Service Worker é ativado (após instalado), esse evento é disparado.
// Aqui removemos caches antigos que não sejam o 'icoufootball-v1' atual,
// garantindo que apenas os arquivos mais recentes fiquem armazenados.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== 'icoufootball-v1')
            .map(k => caches.delete(k))
      ))
  );
});

// Em cada requisição feita pelo navegador, esse evento é disparado.
// Aqui tentamos primeiro responder com o recurso em cache; se não existir,
// fazemos a requisição normal à rede (fetch).
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(response => response || fetch(e.request))
  );
});