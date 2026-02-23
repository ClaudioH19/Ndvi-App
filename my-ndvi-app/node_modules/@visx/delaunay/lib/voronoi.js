"use strict";

exports.__esModule = true;
exports.default = voronoi;
var _d3Delaunay = require("@visx/vendor/d3-delaunay");
var CLIP_PADDING = 1;
/**
 * Returns a configured d3 voronoi diagram for the given data. See d3-delaunay
 * for the complete API reference.
 */
function voronoi(_ref) {
  var _ref$data = _ref.data,
    data = _ref$data === void 0 ? [] : _ref$data,
    _ref$width = _ref.width,
    width = _ref$width === void 0 ? 0 : _ref$width,
    _ref$height = _ref.height,
    height = _ref$height === void 0 ? 0 : _ref$height,
    x = _ref.x,
    y = _ref.y;
  var delaunay = _d3Delaunay.Delaunay.from(data, x, y);
  return delaunay.voronoi([-CLIP_PADDING, -CLIP_PADDING, width + CLIP_PADDING, height + CLIP_PADDING]);
}