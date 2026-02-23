"use strict";

exports.__esModule = true;
exports.voronoi = exports.delaunay = exports.Polygon = void 0;
var _delaunay = _interopRequireDefault(require("./delaunay"));
exports.delaunay = _delaunay.default;
var _voronoi = _interopRequireDefault(require("./voronoi"));
exports.voronoi = _voronoi.default;
var _Polygon = _interopRequireDefault(require("./components/Polygon"));
exports.Polygon = _Polygon.default;
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }