/**
 * Common database helper functions.
 */

const _dbPromise = idb.open('mws-restaurant', 1, function(upgradeDb) {
  const restStore = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
  const extraStore = upgradeDb.createObjectStore('extraInfo', {keyPath: 'name'});
  // restStore.createIndex('id', 'id');
});
 
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
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
        // console.log(`rejecting getData ${response.status}: response not Ok`);
        return Promise.reject(errMessage);
      }
      return response.json();
    })
    .catch(function(error) {
      // console.log('caught error in getData');
      const errMessage = `getData error. Status : ${error}`;
      return Promise.reject(errMessage);
    });
  }

  /**
   * Fetch all restaurants UPDATED.
   */
  static fetchRestaurants() {
    // const dbPromise = idb.open('mws-restaurant', 1, function(upgradeDb) {
    //   let restStore = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
    //   // restStore.createIndex('id', 'id');
    // });

    return DBHelper.dbPromise
    .then(db => {
      const tx = db.transaction('restaurants');
      const store = tx.objectStore('restaurants');
      return store.getAll();
    })
    .then(restaurants => {
      if (restaurants.length !== 0) {
        console.log('served restaurants from DB');
        return restaurants.map(i => i.data);
      }
      // if restaurants are not in DB yet, then reject the promise and fetch network inside catch
      return Promise.reject('No restaurants in DB yet or DB error');
    })
    .catch(() => {
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
            console.log('all restaurants are added to DB v5');
          })
          .catch(() => {
            console.log('there was an error while trying to add restaurants to DB');
          });
          return restaurants;
        });
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

  static notFound() {
    const restaurantNotFound = {
      name: "Restaurant Not Found",
      photograph: "rest-nf.png",
    };
    return restaurantNotFound;
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  // static fetchRestaurantByCuisine(cuisine, callback) {
  //   // Fetch all restaurants  with proper error handling
  //   this.fetchRestaurants((error, restaurants)=> {
  //     if (error) {
  //       callback(error, null);
  //     } else {
  //       const results = restaurants.filter(rest => rest.cuisine_type === cuisine);
  //       callback(null, results);
  //     }
  //   });
  // }
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
          console.log('neighborhoods list served from DB');
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
              console.log('neighborhoods list added to DB');
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
          console.log('cuisines list served from DB');
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
              console.log('cuisines list added to DB');
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
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
    {
      title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
    })
    marker.addTo(newMap);
    return marker;
  } 
//   static mapMarkerForRestaurant(restaurant, map) {
//     const marker = new google.maps.Marker({
//       position: restaurant.latlng,
//       title: restaurant.name,
//       url: this.urlForRestaurant(restaurant),
//       map: map,
//       animation: google.maps.Animation.DROP}
//     );
//     return marker;
//   }
}