var d3 = require('d3');
var topojson = require('topojson');
var url;
var layers;
var tilePath;
require('./d3.geo.tile.js');

function TileMap(options) {
   this.options = options;
   url = options.url;
   layers = options.layers;
   this.width = d3.select(options.selector)[0][0].offsetWidth;
   this.height = d3.select(options.selector)[0][0].offsetHeight;
   this.prefix = prefixMatch(["webkit", "ms", "Moz", "O"]);

   this.tile = d3.geo.tile()
      .size([this.width, this.height]);

   this.projection = d3.geo.mercator()
      .scale((1 << options.zoom) / 2 / Math.PI) // change scale here, 21 is about z13
      .translate([-this.width / 2, -this.height / 2]); // just temporary

   var tileProjection = d3.geo.mercator();

   tilePath = d3.geo.path()
      .projection(tileProjection);

   this.zoom = d3.behavior.zoom()
      .scale(this.projection.scale() * 2 * Math.PI)
      .scaleExtent([1 << 12, 1 << 25]) // 12 to 25 is roughly z4-z5 to z17
      .translate(this.projection(options.center).map(function(x) {
         return -x;
      }))
      .on("zoom", this.zoomed.bind(this));

   var map = d3.select(options.selector).call(this.zoom);

   this.layer = map.append("div")
      .attr("class", "layer");

   var zoom_controls = map.append("div")
      .attr("class", "zoom-container");

   var zoom_in = zoom_controls.append("a")
      .attr("class", "zoom")
      .attr("id", "zoom_in")
      .text("+");

   var zoom_out = zoom_controls.append("a")
      .attr("class", "zoom")
      .attr("id", "zoom_out")
      .text("-");

   // Hide zoom control on touch devices, which interferes with project page navigation overlay
   if (('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch)) {
      document.getElementsByClassName('zoom-container')[0].style.display = 'none';
   }

   d3.selectAll('a.zoom').on('click', this.zoomClick);
   this.zoomed();
}

TileMap.prototype.zoomed = function() {
   var tiles = this.tile
      .scale(this.zoom.scale())
      .translate(this.zoom.translate())
      ();

   this.projection
      .scale(this.zoom.scale() / 2 / Math.PI)
      .translate(this.zoom.translate());

   var image = this.layer
      .style(this.prefix + "transform", matrix3d(tiles.scale, tiles.translate))
      .selectAll(".tile")
      .data(tiles, function(d) {
         return d;
      });

   image.exit()
      .each(function(d) {
         this._xhr.abort();
      })
      .remove();

   image.enter().append("svg")
      .attr("class", "tile")
      .style("left", function(d) {
         return d[0] * 256 + "px";
      })
      .style("top", function(d) {
         return d[1] * 256 + "px";
      })
      .each(this.renderTiles);
};

TileMap.prototype.interpolateZoom = function(translate, scale) {
   var self = this;
   return d3.transition().duration(350).tween("zoom", function() {
      var iTranslate = d3.interpolate(self.zoom.translate(), translate),
         iScale = d3.interpolate(self.zoom.scale(), scale);
      return function(t) {
         self.zoom
            .scale(iScale(t))
            .translate(iTranslate(t));
         self.zoomed();
      };
   });
};

TileMap.prototype.zoomClick = function() {
   var clicked = d3.event.target,
      direction = 1,
      factor = 0.2,
      target_zoom = 1,
      center = [this.width / 2, this.height / 2],
      extent = this.zoom.scaleExtent(),
      translate = this.zoom.translate(),
      translate0 = [],
      l = [],
      view = {
         x: translate[0],
         y: translate[1],
         k: this.zoom.scale()
      };

   d3.event.preventDefault();
   direction = (this.id === 'zoom_in') ? 1 : -1;
   target_zoom = this.zoom.scale() * (1 + factor * direction);

   if (target_zoom < extent[0] || target_zoom > extent[1]) {
      return false;
   }

   translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
   view.k = target_zoom;
   l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];

   view.x += center[0] - l[0];
   view.y += center[1] - l[1];

   this.interpolateZoom([view.x, view.y], view.k);
};

TileMap.prototype.renderTiles = function(d) {
   var svg = d3.select(this);
   var zoom = d[2];
   var tileSrc = url;
   tileSrc = tileSrc.replace('{z}', zoom);
   tileSrc = tileSrc.replace('{x}', d[0]);
   tileSrc = tileSrc.replace('{y}', d[1]);
   this._xhr = d3.json(tileSrc, function(error, json) {
      var k = Math.pow(2, d[2]) * 256; // size of the world in pixels
      tilePath.projection()
         .translate([k / 2 - d[0] * 256, k / 2 - d[1] * 256]) // [0°,0°] in pixels
         .scale(k / 2 / Math.PI)
         .precision(0);

      var data = {};
      for (var key in json.objects) {
         data[key] = topojson.feature(json, json.objects[key]);
      }

      // build up a single concatenated array of all tile features from all tile layers
      var features = [];
      layers.forEach(function(layer) {
         if (data[layer]) {
            for (var i in data[layer].features) {
               // Don't include any label placement points
               if (data[layer].features[i].properties.label_placement == 'yes') {
                  continue
               }

               // Don't show large buildings at z13 or below.
               if (zoom <= 13 && layer == 'buildings') {
                  continue
               }

               // Don't show small buildings at z14 or below.
               if (zoom <= 14 && layer == 'buildings' && data[layer].features[i].properties.area < 2000) {
                  continue
               }

               data[layer].features[i].layer_name = layer;
               features.push(data[layer].features[i]);
            }
         }
      });

      // put all the features into SVG paths
      svg.selectAll("path")
         .data(features.sort(function(a, b) {
            return a.properties.sort_key ? a.properties.sort_key - b.properties.sort_key : 0
         }))
         .enter().append("path")
         .attr("class", function(d) {
            var kind = d.properties.kind || '';
            if (d.properties.boundary == 'yes') {
               kind += '_boundary';
            }
            return d.layer_name + '-layer ' + kind;
         })
         .attr("d", tilePath);
   });
};

function matrix3d(scale, translate) {
   var k = scale / 256,
      r = scale % 1 ? Number : Math.round;
   return "matrix3d(" + [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, r(translate[0] * scale), r(translate[1] * scale), 0, 1] + ")";
}

function prefixMatch(p) {
   var i = -1,
      n = p.length,
      s = document.body.style;
   while (++i < n)
      if (p[i] + "Transform" in s) return "-" + p[i].toLowerCase() + "-";
   return "";
}

module.exports = TileMap;
