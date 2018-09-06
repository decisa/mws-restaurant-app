
let restaurants,
  neighborhoods,
  cuisines;
var map;
var markers = [];
let optionID = 1;

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  try {
    initMap();
  }
  catch(error) {
    // if map is not loaded, display : maps offline
    const mapElement = document.getElementById('map')
    const image = document.createElement('img');
    image.className = 'restaurant-img';
    image.src = '/img/no-map.png';
    image.alt = "Maps are offline";
    mapElement.append(image);
    console.log('unable to start maps', error);
  }
  // console.log("document loaded");
  updateRestaurants();
  fetchNeighborhoods();
  fetchCuisines();
});



/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods()
  .then(neighborhoods => {
    self.neighborhoods = neighborhoods;
    fillNeighborhoodsHTML();
  })
  .catch(console.error);
}

/**
 * Set neighborhoods HTML. Using default parameters
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    option.setAttribute('aria-label', neighborhood);
    select.append(option);
  });
  
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines()
  .then(cuisines => {
    self.cuisines = cuisines;
    fillCuisinesHTML();
  })
  .catch(console.error);
}

/**
 * Set cuisines HTML. using default parameters. 
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: config.mapBox,
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);  
}


/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
  .then(restaurants => {
    resetRestaurants(restaurants);
    fillRestaurantsHTML();
    const liveAlert = document.getElementsByClassName('results-alert');
    liveAlert[0].innerHTML = `${restaurants.length} result${restaurants.length === 1 ? '' : 's'}
                              for ${cuisine} in ${neighborhood}`;
  })
  .catch(console.error);
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.remove());
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  let counter = 1;
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant, counter, restaurants.length));
    counter += 1;
  });
  try {
    addMarkersToMap();
  }
  catch(error) {
    console.log('map is offline');
  }
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant, current, total) => {
  const li = document.createElement('li');
  li.setAttribute('aria-label', restaurant.name);
  li.setAttribute('aria-posinset', current);
  li.setAttribute('aria-setsize', total);

  

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const picture = document.createElement('picture');
  picture.className = 'restaurant-img';
  let imgSrc = DBHelper.imageUrlForRestaurant(restaurant).replace(/\.[^/.]+$/, "");
  const source1 = document.createElement('source');
  source1.media = '(min-width: 1280px)';
  source1.sizes = '400px';
  source1.srcset = `${imgSrc}-400-1x.jpg 400w, ${imgSrc}-800-2x.jpg 800w`;

  const source2 = document.createElement('source');
  source2.media = '(min-width: 960px)';
  source2.sizes = '31vw';
  source2.srcset = `${imgSrc}-400-1x.jpg 400w, ${imgSrc}-800-2x.jpg 800w`;

  const source3 = document.createElement('source');
  source3.media = '(min-width: 640px)';
  source3.sizes = '49vw';
  source3.srcset = `${imgSrc}-400-1x.jpg 400w, ${imgSrc}-800-2x.jpg 800w`;

  const source4 = document.createElement('source');
  source4.media = '(max-width: 639px)';
  source4.sizes = '98vw';
  source4.srcset = `${imgSrc}-400-1x.jpg 400w, ${imgSrc}-800-2x.jpg 800w`;

  picture.append(source1);
  picture.append(source2);
  picture.append(source3);
  picture.append(source4);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = `${imgSrc}-400-1x.jpg`;
  image.alt = restaurant.name;
  picture.append(image);


  li.append(picture);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  neighborhood.className = 'neighborhood';
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  address.className = 'address entypo-location';
  li.append(address);

  const more = document.createElement('button');
  more.innerHTML = 'View Details';
  more.setAttribute('aria-label', `${restaurant.name} restaurant details` );
  more.onclick = () => {
    window.location = DBHelper.urlForRestaurant(restaurant);
  };
  li.append(more);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
}
