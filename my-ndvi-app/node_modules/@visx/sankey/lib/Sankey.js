"use strict";

exports.__esModule = true;
exports.default = Sankey;
var _propTypes = _interopRequireDefault(require("prop-types"));
var _react = _interopRequireDefault(require("react"));
var _classnames = _interopRequireDefault(require("classnames"));
var _group = require("@visx/group");
var _d3Sankey = require("d3-sankey");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
var DEFAULT_COLOR = '#000';
/**
 * Exposes d3-sankey as a React component.
 */
function Sankey(_ref) {
  var root = _ref.root,
    className = _ref.className,
    children = _ref.children,
    nodeId = _ref.nodeId,
    _ref$nodeWidth = _ref.nodeWidth,
    nodeWidth = _ref$nodeWidth === void 0 ? 2 : _ref$nodeWidth,
    nodePadding = _ref.nodePadding,
    nodeAlign = _ref.nodeAlign,
    extent = _ref.extent,
    size = _ref.size,
    iterations = _ref.iterations,
    nodeSort = _ref.nodeSort,
    linkSort = _ref.linkSort,
    _ref$nodeProps = _ref.nodeProps,
    nodeProps = _ref$nodeProps === void 0 ? {} : _ref$nodeProps,
    _ref$linkProps = _ref.linkProps,
    linkProps = _ref$linkProps === void 0 ? {} : _ref$linkProps,
    sourceAccessor = _ref.sourceAccessor,
    targetAccessor = _ref.targetAccessor;
  var sankey = (0, _d3Sankey.sankey)();
  if (nodeId) sankey.nodeId(nodeId);
  if (nodeWidth) sankey.nodeWidth(nodeWidth);
  if (nodePadding) sankey.nodePadding(nodePadding);
  if (nodeAlign) sankey.nodeAlign(nodeAlign);
  if (extent) sankey.extent(extent);
  if (size) sankey.size(size);
  if (iterations) sankey.iterations(iterations);
  if (nodeSort) sankey.nodeSort(nodeSort);
  if (linkSort) sankey.linkSort(linkSort);
  var graph = sankey(root);
  var createPath = (0, _d3Sankey.sankeyLinkHorizontal)();
  if (sourceAccessor) createPath.source(sourceAccessor);
  if (targetAccessor) createPath.target(targetAccessor);
  if (children) {
    return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, children({
      graph: graph,
      createPath: createPath
    }));
  }
  return /*#__PURE__*/_react.default.createElement(_group.Group, {
    className: (0, _classnames.default)('visx-sankey', className)
  }, /*#__PURE__*/_react.default.createElement(_group.Group, {
    className: "visx-sankey-links"
  }, graph.links.map(function (link, i) {
    var _createPath, _link$width;
    return /*#__PURE__*/_react.default.createElement("path", _extends({
      d: (_createPath = createPath(link)) != null ? _createPath : '',
      key: i,
      fill: "transparent",
      stroke: DEFAULT_COLOR,
      strokeWidth: Math.max(1, (_link$width = link.width) != null ? _link$width : 0),
      strokeOpacity: 0.5
    }, linkProps));
  })), /*#__PURE__*/_react.default.createElement(_group.Group, {
    className: "visx-sankey-nodes"
  }, graph.nodes.map(function (_ref2, i) {
    var y0 = _ref2.y0,
      y1 = _ref2.y1,
      x0 = _ref2.x0,
      x1 = _ref2.x1;
    return y0 !== undefined && y1 !== undefined && x0 !== undefined && x1 !== undefined ? /*#__PURE__*/_react.default.createElement("rect", _extends({
      fill: DEFAULT_COLOR,
      width: x1 - x0,
      height: y1 - y0,
      x: x0,
      y: y0,
      key: i
    }, nodeProps)) : null;
  })));
}
Sankey.propTypes = {
  className: _propTypes.default.string,
  children: _propTypes.default.func,
  nodeId: _propTypes.default.func,
  nodeWidth: _propTypes.default.number,
  nodePadding: _propTypes.default.number,
  nodeAlign: _propTypes.default.func,
  iterations: _propTypes.default.number,
  nodeSort: _propTypes.default.func,
  linkSort: _propTypes.default.func
};