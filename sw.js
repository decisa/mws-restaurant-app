
const projectCacheName = 'restaurant-project-v4';
const projectImgCacheName = 'restaurant-images-v4';
const projectMapCacheName = 'restaurant-maps-v4'; // aasaas
const allCaches = [
  projectCacheName,
  projectImgCacheName,
  projectMapCacheName,
];

function servePhoto(request) {
  // images have format  1-400-1x.jpg 1-800-2x.jpg
  const storageURL = request.url.replace(/-\d+-\d+x\.jpg$/, '');

  return caches.open(projectImgCacheName)
    .then(cache => cache.match(storageURL)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // return image from cache
          return cachedResponse;
        }
        console.log(`request = ${request.clone()}`);

        return fetch(request)
          .then((networkResponse) => {
            cache.put(storageURL, networkResponse.clone());
            return networkResponse;
          });
      }));
}

self.addEventListener('install', (event) => {
  const urlsToCache = [
    '/',
    'sw.js',
    'restaurant.html',
    '/js/controller.js',
    '/js/main.js',
    '/js/dbhelper.js',
    '/js/restaurant_info.js',
    '/css/styles.css',
    // '/data/restaurants.json',
    // 'http://weloveiconfonts.com/api/?family=entypo'
  ];

  event.waitUntil(
    caches.open(projectCacheName).then(cache => cache.addAll(urlsToCache)).then(() => {
      console.log('everything cached OK!!!');
    }).catch(() => {
      console.error('could not cache all files, aborting installation');
    }),
  );
});


self.addEventListener('activate', (event) => {
  console.log('finishing activation .. deleting old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      cacheNames.filter(name => name.startsWith('restaurant-') && (!allCaches.includes(name))).map(cacheName => caches.delete(cacheName));
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.startsWith('/img/')) {
    event.respondWith(servePhoto(event.request));
    return;
  }


  if (requestUrl.pathname.includes('map')) {
    event.respondWith(
      caches.open(projectMapCacheName)
        .then(cache => cache.match(requestUrl)
          .then((response) => {
            if (response) {
              return response;
            }
            return fetch(event.request)
              .then((networkResponse) => {
                cache.put(requestUrl, networkResponse.clone());
                return networkResponse;
              });
          })),
    );
    return;
  }

  // check if request is in cache and serve without caching
  event.respondWith(
    caches.match(requestUrl)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // if not in cache, just fetch from network:
        return fetch(event.request);
      }),
  );
});
