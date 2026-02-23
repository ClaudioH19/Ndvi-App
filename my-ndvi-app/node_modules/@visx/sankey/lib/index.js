"use strict";

exports.__esModule = true;
exports.sankeyRight = exports.sankeyLinkHorizontal = exports.sankeyLeft = exports.sankeyJustify = exports.sankeyCenter = exports.sankey = exports.Sankey = void 0;
var _Sankey = _interopRequireDefault(require("./Sankey"));
exports.Sankey = _Sankey.default;
var _d3Sankey = require("d3-sankey");
exports.sankey = _d3Sankey.sankey;
exports.sankeyLinkHorizontal = _d3Sankey.sankeyLinkHorizontal;
exports.sankeyLeft = _d3Sankey.sankeyLeft;
exports.sankeyRight = _d3Sankey.sankeyRight;
exports.sankeyCenter = _d3Sankey.sankeyCenter;
exports.sankeyJustify = _d3Sankey.sankeyJustify;
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }