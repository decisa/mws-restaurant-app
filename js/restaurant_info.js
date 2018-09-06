var restaurant;
var map;
var dataLoaded = false;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL()
  .then(restaurant => {
    try { 
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
    catch(error) {
      const mapElement = document.getElementById('map')
      const image = document.createElement('img');
      image.className = 'restaurant-img';
      image.src = '/img/no-map.png';
      image.alt = "Maps are offline";
      mapElement.append(image);
      console.log('unable to start maps', error);
    }
    fillBreadcrumb();
  })
  .catch(console.error);
} 



/**
 * Initialize Google map, called from HTML.

window.initMap = () => { 
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(`fetchRestaurantFromUrl ${error}`);
    } else {
      // console.log('loading restaurant through Map');
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
      google.maps.event.addListenerOnce(self.map, 'idle', function() {
        document.getElementsByTagName('iframe')[0].title = "Google Maps Application";
      });
    }
  });

}
 */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = () => {
  if (self.restaurant) { // restaurant already fetched!
    return self.restaurant;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    const error = 'No restaurant id in URL';
    return Promise.reject(error);
  }
  console.log(typeof id);
  
  return DBHelper.fetchRestaurantById(id)
  .then(restaurant => {
    // save info about the restaurant
    self.restaurant = restaurant;
    // console.log(`restik #${id}:`, restaurant);
    // dbPromise
    // .then(db => {
    //   let tx = db.transaction('restaurants', 'readwrite');
    //   let store  = tx.objectStore('restaurants');
    //   store.put(restaurant);

    //   return tx.complete;  
    // });


    fillRestaurantHTML();
    return restaurant;
  })
  .catch(err => console.log(err));
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name || '';

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address || '';

  const image = document.getElementById('restaurant-img');
  let imgSrc = DBHelper.imageUrlForRestaurant(restaurant);
  if (imgSrc.endsWith('.png')) {
    image.src = imgSrc;
  } else {
    imgSrc = imgSrc.replace(/\.[^/.]+$/, "");
    image.srcset = `${imgSrc}-400-1x.jpg 400w, ${imgSrc}-800-2x.jpg 800w`;
    image.sizes = '(min-width: 800px) 465px, (min-width: 640px) 50vw, (max-width: 639px) 98vw';  
    image.src = `${imgSrc}-400-1x.jpg`;
  }
  image.alt = restaurant.name;
  image.className = 'restaurant-img';

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type || '';

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    let workHours = operatingHours[key];
    time.innerHTML = workHours.replace(/,/g, '<br>');
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    noReviews.className = 'review';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.className = 'reviewer';
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  date.className = 'date';
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.className = 'review';
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  //breadcrumb.setAttribute('aria-label', 'Breadcrumb');
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = window.location.href;
  a.innerHTML = restaurant.name;
  a.setAttribute('aria-current','page');
  a.setAttribute('aria-label', restaurant.name + ' restaurant');
  li.appendChild(a); 
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
