const CACHE_NAME = 'loup-garou-v1';
const urlsToCache = [
  '/',
  '/joueur.html',
  '/groupe.html',
  '/Esprit.html',
  '/index.html',
  '/style.css',
  '/network.js'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log('Erreur lors de la mise en cache:', err);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourner le cache si disponible, sinon faire la requête réseau
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Ne pas mettre en cache les requêtes non-GET ou les réponses non-valides
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Cloner la réponse car elle ne peut être consommée qu'une fois
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // En cas d'erreur réseau, retourner une page offline si disponible
          return caches.match('/joueur.html');
        });
      })
  );
});
