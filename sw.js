
const projectCacheName = 'restaurant-project-v7';
const projectImgCacheName = 'restaurant-images-v6';
const projectMapCacheName = 'restaurant-maps-v6'; // 11ssssssss
const allCaches = [
  projectCacheName,
  projectImgCacheName,
  projectMapCacheName,
];

'use strict';

// import idb from 'idb';
(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      // Don't create iterateKeyCursor if openKeyCursor doesn't exist.
      if (!(funcName in Constructor.prototype)) return;

      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      if (request) {
        request.onupgradeneeded = function(event) {
          if (upgradeCallback) {
            upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
          }
        };
      }

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());

let dbPromise = idb.open('mws-reviews', 1, function(upgradeDb) {
  let restStore = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
  restStore.createIndex('id', 'id');
});   




self.addEventListener('install', (event) => {
  const urlsToCache = [
    '/',
    //'sw.js',
    'restaurant.html',
    '/js/controller.js',
    '/js/main.js',
    '/js/dbhelper.js',
    '/js/restaurant_info.js',
    '/css/styles.css',
    '/img/image-na.png',
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

  if (requestUrl.port === '1337') {
    let id = requestUrl.pathname.match(/\d+$/);
    id = (id === null) ? 'main' : id[0];
    
    event.respondWith(
      dbPromise
      .then(db => {
        return db.transaction('restaurants').objectStore('restaurants').get(id);
      })
      .then(dbEntry => {
        if (dbEntry) {
          console.log(dbEntry.data);
          const response = new Response(JSON.stringify(dbEntry.data));
          console.log('db response: ', response.clone());
          return response;
        }
        return fetch(event.request)
          .then(networkResponse => {
            console.log('requested from network !');
            networkResponse.clone().json()
            .then(json => {
              dbPromise
              .then(db => {
                let tx = db.transaction('restaurants', 'readwrite');
                let store = tx.objectStore('restaurants');
                store.put({
                  id: id,
                  data: json,
                });
                return tx.complete;
              })
              .catch(() => {
                console.log('There was an error adding to DB');
              });
            });
            console.log('network response: ', networkResponse.clone());
            return networkResponse;
          });
      })
      .catch(err => {
        const error = `sw: you are offline or restaurantId#${id} does not exist.`;
        // console.log(error);
        return Promise.reject(error);
      })
    );
    return;
  }


  if (requestUrl.pathname.includes('map')) {
    event.respondWith(
      caches.open(projectMapCacheName)
      .then(cache => {
        return cache.match(requestUrl)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then((networkResponse) => {
              cache.put(requestUrl, networkResponse.clone());
              return networkResponse;
            });
        })
      })
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
        console.log(`request = ${request.clone()}`);

        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse.ok) {
              console.log('image not ok');
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
