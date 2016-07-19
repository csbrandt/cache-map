var TileMap = require('./tile-map.js');
var cacheName = 'tiles';
var defaultZoom = 12;
var defaultCenter = [-98.5795, 39.828175];
var cacheRadius = 50;
var tilesCached = false;
var geolocationElId = 'geolocate';
var tileSrc = 'https://vector.mapzen.com/osm/all/{z}/{x}/{y}.topojson?api_key=vector-tiles-6P76sAK';
var el = document.getElementById(geolocationElId);

el.addEventListener("touchstart", handleGeolocation, false);
el.addEventListener("click", handleGeolocation, false);

var map = new TileMap({
   center: defaultCenter,
   layers: ['water', 'landuse', 'roads', 'buildings'],
   selector: '.map',
   url: tileSrc,
   zoom: defaultZoom
});

navigator.serviceWorker.register('sw-tile.js');

function handleGeolocation() {
   navigator.geolocation.watchPosition(function(position) {
      // cache nearby vector tiles
      if (!tilesCached) {
         cacheRequests(getTileRequests(position.coords.longitude, position.coords.latitude, cacheRadius, [9, 10, 11]));
         tilesCached = true;
      }

      // update location marker
   });
}

function getTileRequests(longitude, latitude, radius, zoomRange) {

}

function cacheRequests(requests) {
   requests.forEach(function(request) {
      fetch(request).then(function(response) {
         caches.open(cacheName).then(function(cache) {
            cache.put(request, response);
         });
      });
   });
}
