'use strict';

const projectCacheName = 'restaurant-project-v7';
const projectImgCacheName = 'restaurant-images-v7'; 
const allCaches = [
  projectCacheName,
  projectImgCacheName,
];



self.addEventListener('install', (event) => {
  const urlsToCache = [
    '/',
    'favicon.ico',
    'restaurant.html',
    'manifest.json',
    '/js/controller.js',
    '/js/idb.js',
    '/js/main.js',
    '/js/dbhelper.js',
    '/js/restaurant_info.js',
    '/css/styles.css',
    '/img/image-na.png',
  ];

  // add restaurant-not-available image to cache in the background:
  caches.open(projectImgCacheName).then(cache => cache.addAll(['/img/rest-nf.png', '/img/no-map.png']));

  event.waitUntil(
    caches.open(projectCacheName).then(cache => cache.addAll(urlsToCache)).then(() => {
    //  console.log('everything cached OK!!!');
    }).catch(() => {
      console.error('could not cache all files, aborting installation');
    }),
  );
});


self.addEventListener('activate', (event) => {
  // console.log('finishing activation .. deleting old caches');
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

  // handle index.html and restaurant.html
  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/'));
      return;
    }
    if (requestUrl.pathname === '/restaurant.html') {
      event.respondWith(caches.match(requestUrl.pathname));
      return;
    }
  }

  // check if request is in cache and serve without caching
  event.respondWith(
    caches.match(requestUrl)
    .then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // if not in cache, just fetch from network:
      return fetch(event.request)
        .catch(err => {
          const error = `sw: failed to fetch the rest ${requestUrl} ,error: ${err}.`;
          console.log(error);
          return Promise.reject(error);
        });
    })
  )
  ;
});

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

        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse.ok) {
              // fetching failed. most likely 404 error
              return Promise.reject();
            }
            cache.put(storageURL, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => {
            return imageNotAvailable();
          });
      }));
}

function imageNotAvailable() {
  return caches.open(projectCacheName)
    .then(cache => cache.match('/img/image-na.png'));
}
