var tileDomain = 'vector.mapzen.com';

function unableToResolve() {
   return new Response('', {status: 503, statusText: 'service unavailable'});
}

self.addEventListener('fetch', function(event) {
   var request = event.request;
   // if the cached response does not exist perform a fetch for that resource
   // and return the response, otherwise return response from cache
   var queriedCache = function(cached) {
      var response = cached || fetch(request)
         .then(fetchedFromNetwork, unableToResolve)
         .catch(unableToResolve);

      return response;
   };

   var fetchedFromNetwork = function(response) {
      // cache response if request was successful
      if (response.status === 200) {
         caches.open(tileDomain).then(function(cache) {
            // store response in cache keyed by original request
            cache.put(event.request, response);
         });
      }
      // cache.put consumes response body
      return response.clone();
   };
   
   // only cache requests from tile server
   if (request.url.indexOf(tileDomain) === -1) {
      event.respondWith(fetch(request));
   } else {
      event.respondWith(caches.match(request).then(queriedCache));
   }
});
