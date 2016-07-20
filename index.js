var TileMap = require('./tile-map.js');
var cacheName = 'tiles';
var defaultZoom = 12;
var geolocateZoom = 20;
var zoomRangeCache = [10, 11, 12, 13, 14, 15];
var defaultCenter = [-98.5795, 39.828175];
var cacheRadius = 10000;
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
      // update current zoom
      map.zoomTo(map.projection([position.coords.longitude, position.coords.latitude]), (1 << geolocateZoom) / 2 / Math.PI);

      // cache nearby vector tiles if accuracy is within 10km
      if (!tilesCached && position.coords.accuracy <= cacheRadius) {
         requestTiles(tileSrc, map.image.data(), zoomRangeCache);
         tilesCached = true;
      }

      // update location marker
   });
}

// make requests for tiles given a set of coordinates and zoom ranges
// these requests will trigger the service worker to cache responses
function requestTiles(src, imageCoordinates, zoomRange) {
   zoomRange.forEach(function(zoom) {
      imageCoordinates.forEach(function(coordinate) {
         var request = new XMLHttpRequest();
         var tileSrc = src;
         tileSrc = tileSrc.replace('{z}', zoom);
         tileSrc = tileSrc.replace('{x}', coordinate[0]);
         tileSrc = tileSrc.replace('{y}', coordinate[1]);

         request.open('GET', tileSrc);
         request.send();
      });
   });
}
