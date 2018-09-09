var restaurant;

var map;
var dataLoaded = false;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    initMap()
    .then(() => {
      const reviewForm = document.getElementById("reviews-form");
      const inputID = document.getElementById('restaurantID');
      inputID.value = restaurant.id;
      restaurantID = restaurant

      reviewForm.addEventListener('submit', submitReview);
      // add online/offline notification
      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);
      updateNetworkStatus();
    });
});


updateNetworkStatus = () => {
let networkStatus = navigator.onLine ? 'online' : 'offline';
const statusLabel = document.getElementById('status');

statusLabel.innerHTML = networkStatus.toUpperCase();
statusLabel.className = networkStatus;
console.log('new network status: ', networkStatus);

if (networkStatus === 'online') {
  DBHelper.uploadFromQueue()
  .then(counter => {
    console.log('finished going through queue');
    // time to sync localDB with server:
    console.log('fetching for restaurant #', restaurant.id);
    DBHelper.fetchRestaurantReviews(restaurant.id, true)
    .then(_ => {
      console.log('localDB updated with new reviews');
      // refresh reviews:
      console.log('refreshing page');
      fillReviewsHTML();
      if (counter)
        document.getElementById('message').innerHTML = `You are back Online. ${counter} postponed request${counter === 1 ? ' was' : 's were'}  processed`;
    })
    .catch(_ => {console.log('localDB updated with new reviews')});

  })
  .catch(err => console.log('error : ', err));
}
}

submitReview = (event) => {
  event.preventDefault();
  const inputId = document.getElementById('restaurantID');
  const inputName = document.getElementById('name');
  const inputRating = document.getElementById('rating');
  const inputReview = document.getElementById('reviews');
  const message = document.getElementById('message');

  if (inputName.value === '') {
    message.innerHTML = 'Please enter your name';
    addRedBorder(inputName);
    return;
  }
  if (inputRating.value === '0') {
    message.innerHTML = 'Need to select rating !';
    addRedBorder(inputRating);
    return;
  }
  if (inputReview.value === '') {
    message.innerHTML = 'Cannot submit without review. Please add a few words !';
    addRedBorder(inputReview);
    return;
  }


  
  const reviewData = {
    restaurant_id: parseInt(inputId.value),
    name: inputName.value,
    rating: inputRating.value,
    comments: inputReview.value,
  };

  // UPLOAD the review to server :
  fetch(DBHelper.REVIEWS_URL, {method: 'POST', body: JSON.stringify(reviewData)})
  .then(response => {
    // response.clone().json()
    // .then(newReview => console.log('new review : ', newReview))
    // .catch(err => console.log('catch new review : ', err));

    if (!response.ok) {
      const err = `unable to upload review to the server. error ${response.status}. desription: ${response.statusText}`;
      return Promise.reject(err);
    }

    // time to sync localDB with server:
    DBHelper.fetchRestaurantReviews(reviewData.restaurant_id, true)
    .then(_ => {
      console.log('localDB updated with new reviews');
      // refresh reviews:
      console.log('refreshing page');
      fillReviewsHTML();
    })
    .catch(_ => {console.log('localDB updated with new reviews')});
    // console.log('review uploaded ', reviewData);

    // reset form on successfull completion
    console.log('resetting form');
    document.getElementById('reviews-form').reset();
    document.getElementById('message').innerHTML = "review successfully submited";
    
  })
  .catch(err => {
    // could not upload review to server or server replied with bad status
    // need to put the review into queue for upload
    const dataToUpload = {
      url: DBHelper.REVIEWS_URL,
      method: 'POST',
      body: reviewData,
    };
    DBHelper.addToNetworkQueue(dataToUpload)
    .then(_ => {
      postMessage('Browser is Offline. Your review is added to queue');
      document.getElementById('reviews-form').reset();
    })
    .catch(_ => postMessage('Error. Browser is Offline. Could not add to queue. Retry later.'));
  });
}

postMessage = (message) => {
  document.getElementById('message').innerHTML = message;
}

addRedBorder = (element) => {
  element.classList.add('red-border');
  element.addEventListener('focus', removeRedBorder);
}

removeRedBorder = (event) => {
  event.target.classList.remove('red-border');
  event.target.removeEventListener('focus', removeRedBorder);
  document.getElementById('message').innerHTML = '';
}

/**
 * Initialize leaflet map
 */
initMap = () => {
  return fetchRestaurantFromURL()
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
      // if map is not loaded, display : maps offline
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
  
  return DBHelper.fetchRestaurantById(id)
  .then(restaurant => {
    // save info about the restaurant
    self.restaurant = restaurant;
    fillRestaurantHTML();
    return restaurant;
  })
  .catch(err => console.log(err));
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const nameWrapper = document.getElementById('name-wrapper');

  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name || '';

  const heartIcon = favoriteIcon(restaurant);
  nameWrapper.append(heartIcon);

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
  fillReviewsHTML(restaurant.id);
}

/**
 * Create Favorite icon for a specific restaurant
 */
favoriteIcon = (restaurant) => {
  let icon = document.createElement('i');
  icon.innerHTML = '&hearts;';  
  icon.dataset.id = restaurant.id;

  if (restaurant.is_favorite === true || restaurant.is_favorite === 'true') {
    icon.dataset.fav = "yes";
    icon.className = 'heart';
  }
  else {
    icon.className = 'no-heart';
    icon.dataset.fav = "no";
  }
  icon.onclick = onHeartClick;

  return icon;
}

onHeartClick = (event) => {
  const icon = event.target;
  const restaurantId = icon.dataset.id;
  

  if (icon.dataset.fav === 'yes') {
    icon.dataset.fav = 'no';
    icon.className = 'no-heart';
    DBHelper.changeFavorite(restaurantId, false);  
  } else {
    icon.dataset.fav = 'yes';
    icon.className = 'heart';
    DBHelper.changeFavorite(restaurantId, true);
  }
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
fillReviewsHTML = (id = restaurant.id) => {
  DBHelper.fetchRestaurantReviews(id)
  .then(reviews => {
    const ul = document.getElementById('reviews-list');
    ul.innerHTML = '';

    if (!reviews) {
      const noReviews = document.createElement('li');
      noReviews.innerHTML = 'No reviews yet!';
      noReviews.className = 'review';
      ul.appendChild(noReviews);
      return;
    }
    
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
  });
}

// addNewReview(data)

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
  // can compare updatedAt and createdAt and let user know if the review is updated or original
  const dateOfReview = new Date(review.updatedAt);
  date.innerHTML = '';
  if (review.createdAt != review.updatedAt) {
    date.innerHTML = 'updated ';
  }
  date.innerHTML += `${dateOfReview.toDateString()} at ${dateOfReview.getHours()}:${dateOfReview.getMinutes()}`;
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
