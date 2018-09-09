/**
 * Common database helper functions.
 */

const _dbPromise = idb.open('mws-restaurant', 2, function(upgradeDb) {
  switch (upgradeDb.oldVersion) {
    case 0:
      const restStore = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
      const extraStore = upgradeDb.createObjectStore('extraInfo', {keyPath: 'name'});
      // restStore.createIndex('id', 'id');
    case 1:
      const reviewsStore = upgradeDb.createObjectStore('reviews', {keyPath: 'id'});
      const networkQueue = upgradeDb.createObjectStore('networkQueue', {keyPath: 'id', autoIncrement: true});
      reviewsStore.createIndex('by-restaurant', 'restaurant_id');
      // reviewsStore.createIndex('by-time', 'updatedAt');

  }
});
 
class DBHelper {

  /**
   * Database URL.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static get REVIEWS_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/reviews`;
  }
  
  static get dbPromise() {
    return _dbPromise;
  }

  /**
   * Promise based getData. No callbacks
   */

  static getJsonData(url) {
    return fetch(url)
    .then(function(response) {
      if (!response.ok) {
        const errMessage = `${response.status} : ${response.statusText}`;
        return Promise.reject(errMessage);
      }
      return response.json();
    })
    .catch(function(error) {
      const errMessage = `getData error. Status : ${error}`;
      return Promise.reject(errMessage);
    });
  }

  /**
   * Fetch all restaurants UPDATED.
   */
  static fetchRestaurants() {
    return DBHelper.dbPromise
      .then(db => {
        const tx = db.transaction('restaurants');
        const store = tx.objectStore('restaurants');
        return store.getAll();
      })
      .then(restaurants => {
        if (restaurants.length !== 0) {
          // console.log('served restaurants from DB');
          return restaurants.map(i => i.data);
        }
        // if restaurants are not in DB yet, then reject the promise and fetch network inside catch
        return Promise.reject('No restaurants in DB yet or DB error');
      })
      .catch(() => {
        return this.getRestaurantsFromServer();
      });
  }

  /**
   * Helper function to sync server DB with local DB
   */
  static getRestaurantsFromServer() {
    return this.getJsonData(DBHelper.DATABASE_URL)
      .then(restaurants => {
        DBHelper.dbPromise
        .then(db => {
          const tx = db.transaction('restaurants', 'readwrite');
          const store = tx.objectStore('restaurants');
          restaurants.forEach(restaurant => store.put({id: restaurant.id + '', data: restaurant}));
          return tx.complete;
        })
        .then(() => {
          console.log('all restaurants are added to DB');
        })
        .catch(() => {
          console.log('there was an error while trying to add restaurants to DB');
        });
        return restaurants;
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling.
    return DBHelper.dbPromise
      .then(db => {
        const store = db.transaction('restaurants').objectStore('restaurants');
        return store.get(id);
      })
      .then(restaurant => {
        if (restaurant)
          return restaurant.data;
        return Promise.reject(`Restaurant ID#${id} not found in DB`);
      })
      .catch(err => {
        console.log(err);
        // if restaurant ID not found in DB try fetching network:
        return this.getJsonData(`${DBHelper.DATABASE_URL}/${id}`)
          .catch(this.notFound);
      });
  }

  // returns JSON: restaurant does not exist
  static notFound() {
    const restaurantNotFound = {
      name: "Restaurant Not Found",
      photograph: "rest-nf.png",
    };
    return restaurantNotFound;
  }

  static fetchRestaurantByCuisine(cuisine) {
    // Fetch all restaurants  with proper error handling
    return this.fetchRestaurants()
    .then(restaurants => {
      const results = restaurants.filter(rest => rest.cuisine_type === cuisine);
      return results;
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    // Fetch all restaurants
    return this.fetchRestaurants()
    .then(restaurants => {
      const results = restaurants.filter(r => r.neighborhood === neighborhood);
      return results;
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return this.fetchRestaurants()
    .then(restaurants => {
      let results = restaurants;
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      return results;
    });
  }

  /**
   * Fetch all neighborhoods from DB with proper error handling.
   */
  static fetchNeighborhoods() {
    return DBHelper.dbPromise
      .then(db => {
        const store = db.transaction('extraInfo').objectStore('extraInfo');
        return store.get('neighborhoods');
      })
      .then(neighborhoods => {
        if (neighborhoods.data.length !== 0) {
          // console.log('neighborhoods list served from DB');
          return neighborhoods.data;
        }
        // if neighborhoods list is not found in DB need to create it in .catch
        return Promise.reject('neighborhoods list is not in DB yet');
      })
      .catch(err => {
        console.log(err);
        return this.fetchRestaurants()
          .then(restaurants => {
            // Get all neighborhoods from all restaurants
            const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
            // Remove duplicates from neighborhoods
            const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
            // add neighborhoods list to DB:
            DBHelper.dbPromise
            .then(db => {
              const tx = db.transaction('extraInfo', 'readwrite');
              const store = tx.objectStore('extraInfo');
              store.put({name: 'neighborhoods', data: uniqueNeighborhoods});
              return tx.complete;
            })
            .then(() => {
              // console.log('neighborhoods list added to DB');
            })
            .catch(() => {
              console.log('error adding neighborhoods list to DB');
            });
            return uniqueNeighborhoods;
          });

      });
  }

  /**
   * Fetch all cuisines from DB with proper error handling.
   */
  static fetchCuisines() {
    return DBHelper.dbPromise
      .then(db => {
        const store = db.transaction('extraInfo').objectStore('extraInfo');
        return store.get('cuisines');
      })
      .then(cuisines => {
        if (cuisines.data.length !== 0) {
          // console.log('cuisines list served from DB');
          return cuisines.data;
        }
        // if cuisines list is not found in DB need to create it in .catch
        return Promise.reject('cuisines list is not in DB yet');
      })
      .catch(err => {
        console.log(err);
        return this.fetchRestaurants()
          .then(restaurants => {
            // Get all cuisines from all restaurants
            const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
            // Remove duplicates from cuisines
            const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i);
            // add cuisines list to DB:
            DBHelper.dbPromise
            .then(db => {
              const tx = db.transaction('extraInfo', 'readwrite');
              const store = tx.objectStore('extraInfo');
              store.put({name: 'cuisines', data: uniqueCuisines});
              return tx.complete;
            })
            .then(() => {
              // console.log('cuisines list added to DB');
            })
            .catch(() => {
              console.log('error adding cuisines list to DB');
            });
            return uniqueCuisines;
          });

      });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
    {
      title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
    })
    marker.addTo(newMap);
    return marker;
  }
  
  static updateRestaurantDB(restaurantId, newRecord) {
    return this.dbPromise
      .then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        const store = tx.objectStore('restaurants');
        store.put({id: restaurantId + '', data: newRecord});
        return tx.complete;
      });
  }

  static fetchRestaurantReviews(restaurantId, forceNetwork = false) {
    return this.dbPromise
      .then(db => {
        if (forceNetwork) return Promise.reject('network fetch requested');

        const reviews = db.transaction('reviews').objectStore('reviews');
        const reviewsIndex = reviews.index('by-restaurant');
        return reviewsIndex.getAll(restaurantId);
      })
      .then(dbReviews => {
        if (!dbReviews.length) {
          const err = 'no reviews found in DB ' + dbReviews.length;
          // reviews not found, we will fetch reviews from server in .catch()
          return Promise.reject(err);
        }
        console.log('found reviews in DB', dbReviews.length);
        return dbReviews.reverse();
      })
      .catch(err => {
        console.log('my error', err);
        const reviewsRequest = `${DBHelper.REVIEWS_URL}/?restaurant_id=${restaurantId}`;
        return this.getJsonData(reviewsRequest)
          .then(networkReviews => {
            this.dbPromise
              .then(db => {
                const tx = db.transaction('reviews', 'readwrite');
                const store = tx.objectStore('reviews');
                networkReviews.forEach(review => store.put(review));
                return tx.complete;
              })
              .then(_ => console.log('reviews added'))
              .catch(_ => console.log('error adding reviews'));
            return networkReviews;
          });
      });
  }

  static addToNetworkQueue(data){
    return this.dbPromise
      .then(db => {
        const tx = db.transaction('networkQueue', 'readwrite');
        const store = tx.objectStore('networkQueue');
        store.put({data: data});
        return tx.complete;
      });
  }

  static uploadFromQueue() {
    let uploadPromise = Promise.resolve();
    let counter = 0;

    return this.dbPromise
      .then(db => {
        const tx = db.transaction('networkQueue', 'readwrite');
        const store = tx.objectStore('networkQueue');
        return store.openCursor();
      })
      .then(function processQueue(cursor) {
        if (!cursor) {
          return uploadPromise.then(() => Promise.resolve(counter));
        }
        counter += 1;
        const dataToUpload = cursor.value.data;
        uploadPromise = uploadPromise
        .then(() => {
          return DBHelper.uploadData(dataToUpload)
            .then(response => {
              if (!response.ok) {
                // server error. Need to re-add review to networkQueue. reject promise
                // and take care of re-adding in .catch
                const err = 'unable to upload : ' + dataToUpload;
                return Promise.reject(err);
              }
              // uploaded fine . delete the entry at the cursor
              console.log('review uploaded to server : ', dataToUpload) 
            })
            .catch(err => {
              // since idb transaction supports only microtransactions (no async calls)
              // by this time transaction is closed. so need to add review back to queue
              console.log('uploadFromQueue >> uploadData : ', err);
              DBHelper.addToNetworkQueue(dataToUpload);
            })
        });
        cursor.delete();
        return cursor.continue().then(processQueue);
      })
      // .catch(err => {
      //   console.log('unable to clear the network queue ', err);
      // });
  }

  static uploadData(data) {
    const url = data.url;
    const method = data.method;
    const body = JSON.stringify(data.body);
    return fetch(data.url, {method: data.method, body: JSON.stringify(data.body)});
  }

  // v v v do I NEED THESE TWO ?? v v v CHECK !
  static addNewReviewLocalDB(review) {
    if (!review) {
      return Promise.reject('no review to add');
    }
    return this.dbPromise
      .then(db => {
        const tx = db.transaction('reviews', 'readwrite');
        const store = tx.objectStore('reviews');
        console.log('review : ', review);
        store.put(review);
        return tx.complete;
      });
  }

  /*
   * Helper function that searches server's DB for the id of a newly added review
   */
  static newReviewID(reviewInfo) {
    const restaurantId = reviewInfo.restaurant_id;
    return this.fetchRestaurantReviews(restaurantId,)
      .then(networkReviews => {
        if (!networkReviews) {
          const err = 'reviews not found ' + networkReviews;
          console.log(err);
          return Promise.reject(err);
        }
        console.log('network reviews : ', networkReviews);
        console.log('review to find : ', reviewInfo);
        let matchingReviews = networkReviews.filter(review => (review.name === reviewInfo.name) && 
            (review.rating === reviewInfo.rating) &&
            (review.reviews === reviewInfo.reviews));
        return matchingReviews;
      });
  }

  static changeFavorite(restaurantId, newFavFlag) {
    this.fetchRestaurantById(restaurantId)
    .then(restaurant => {
      // console.log(typeof restaurant.is_favorite, restaurant.is_favorite, newFavFlag);
      let updatedRecord = restaurant;
      updatedRecord.is_favorite = newFavFlag;
  
      DBHelper.updateRestaurantDB(restaurantId, updatedRecord)
      .then(() => {
        console.log('db Updated');
      })
      .catch((err) => {
        console.log('db Update error', err);
      });
 
      const requestUrl = `http://localhost:1337/restaurants/${restaurantId}/?is_favorite=${newFavFlag}`;
      const method = 'PUT';
      const body = null;

      fetch(requestUrl, {method: 'PUT'})
      .then(response => {
        if (!response.ok) {
          // some server error, reject and add to networkQueue
          return Promise.reject(`some server error : ${response.status} text: ${response.statusText}`);
        }
        console.log('all good', response);
      })
      .catch(err => {
        // if request did not go through, add it to networkQueue
        const dataToUpload = {
          url: requestUrl,
          method: method,
          body: body,
        }
        DBHelper.addToNetworkQueue(dataToUpload);
        console('added fav. data to queue : ', err);
      })
  
  
    });
  } 

}


