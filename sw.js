
var projectCacheName = 'restaurant-project-v4'; 
var projectImgCacheName = 'restaurant-images-v4';
var projectMapCacheName = 'restaurant-maps-v4';
var allCaches = [
    projectCacheName,
    projectImgCacheName,
    projectMapCacheName
];

self.addEventListener('install', function(event) {
    let urlsToCache = [
        '/',
        'sw.js',
        'restaurant.html',
        '/js/controller.js',
        '/js/main.js',
        '/js/dbhelper.js',
        '/js/restaurant_info.js',
        '/css/styles.css',
        '/data/restaurants.json',
        // 'http://weloveiconfonts.com/api/?family=entypo'
    ];
    
    event.waitUntil(
        caches.open(projectCacheName).then(function(cache) {
            return cache.addAll(urlsToCache);
        }).then(function() {
            console.log('everything cached OK!!!')
        }).catch( function() {
            console.error('could not cache all files, aborting installation')
        })    
    );
});



self.addEventListener('activate', function(event) {
    console.log('finishing activation .. deleting old caches')
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            cacheNames.filter(function(name) {
                return name.startsWith('restaurant-') && (!allCaches.includes(name));
            }).map(function(cacheName) {
                return caches.delete(cacheName);
            }) 
        })
    );
});

self.addEventListener('fetch', function(event) {
    let requestUrl = new URL(event.request.url);

    if (requestUrl.pathname.startsWith('/img/')) {
        event.respondWith(servePhoto(event.request));
        return;
    }


    if (requestUrl.pathname.includes('map')){
        event.respondWith(
            caches.open(projectMapCacheName)
            .then(function(cache) {
                return cache.match(requestUrl)
                .then(function(response) {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request)
                    .then(function(networkResponse) {
                        cache.put(requestUrl, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }  

    // check if request is in cache and serve without caching
    event.respondWith(
        caches.match(requestUrl)
        .then(function(cachedResponse) {
            if (cachedResponse) {
                return cachedResponse;
            }
            // if not in cache, just fetch from network:
            return fetch(event.request);
        })
    );

});

function servePhoto(request) {
    // images have format  1-400-1x.jpg 1-800-2x.jpg
    var storageURL = request.url.replace(/-\d+-\d+x\.jpg$/, '');

    return caches.open(projectImgCacheName)
    .then(function(cache) {
        return cache.match(storageURL)
        .then(function(cachedResponse) {
            if (cachedResponse) {
                // return image from cache
                return cachedResponse;
            }
            console.log(`request = ${request.clone()}`); 

            return fetch(request)
            .then(function(networkResponse) {
                cache.put(storageURL, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}