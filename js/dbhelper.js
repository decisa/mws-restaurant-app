/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
  static getData(url) {
    return fetch(url)
    // .then(response => response.json())
    .then(function(response) {
      if (!response.ok) {
        console.log(response.clone());
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

  static fetchRestaurants() {
    console.log("version XXXXX");
    return this.getData(DBHelper.DATABASE_URL);
    // fetch(DBHelper.DATABASE_URL)
    // .then(function(response) {
    //   response.json()
    //   .then(restaurants => callback(null, restaurants));
    // })
    // .catch(function(error) {
    //   console.log(error);
    //   callback(error, null);
    // });


    // let xhr = new XMLHttpRequest();
    // xhr.open('GET', DBHelper.DATABASE_URL);
    // xhr.onload = () => {
    //   if (xhr.status === 200) { // Got a success response from server!
    //     const json = JSON.parse(xhr.responseText);
    //     const restaurants = json;//.restaurants;
    //     callback(null, restaurants);
    //   } else { // Oops!. Got an error from server.
    //     const error = (`Request failed. Returned status of ${xhr.status}`);
    //     callback(error, null);
    //   }
    // };
    // xhr.send();
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling.
    return this.getData(`${DBHelper.DATABASE_URL}/${id}`);

    // this.fetchRestaurants((error, restaurants) => {
    //   if (error) {
    //     callback(error, null);
    //   } else {
    //     // cannot use === in find, because r.id is a number , id is a string
    //     const result = restaurants.find(r => r.id == id);
    //     if (result) {
    //       callback(null, result);
    //     } else {
    //       callback('Restaurant does not exist', null);
    //     }
    //   }
    // });
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
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods() {
    // Fetch all restaurants
    return this.fetchRestaurants()
    .then(restaurants => {
      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      // Remove duplicates from neighborhoods
      const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
      return uniqueNeighborhoods;
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines() {
    // Fetch all restaurants
    return this.fetchRestaurants()
    .then(restaurants => {
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      // Remove duplicates from cuisines
      const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i);
      return uniqueCuisines;
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