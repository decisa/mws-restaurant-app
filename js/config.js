var config = {
    mapKey: 'AIzaSyB_1yTrlWAJ5ucSKSGH0FgPc2haXzoarUk' 
};

var myKey = config.mapKey;



initMap = () => {
    self.newMap = L.map('map', {
          center: [40.722216, -73.987501],
          zoom: 12,
          scrollWheelZoom: false
        });
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token=' + apiKey, {
      mapboxToken: '<your MAPBOX API KEY HERE>',
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'
    }).addTo(newMap);
  
    updateRestaurants();
  }