"use strict";

exports.__esModule = true;
exports.default = delaunay;
var _d3Delaunay = require("@visx/vendor/d3-delaunay");
/**
 * Returns a configured d3 delaunay triangulation. See d3-delaunay for the complete API reference.
 */
function delaunay(_ref) {
  var _ref$data = _ref.data,
    data = _ref$data === void 0 ? [] : _ref$data,
    x = _ref.x,
    y = _ref.y;
  return _d3Delaunay.Delaunay.from(data, x, y);
}